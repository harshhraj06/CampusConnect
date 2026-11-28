/**
 * CampusConnect API Authentication Helpers
 * Standardized auth validation for API routes
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, getBearerToken, createErrorResponse, validateEnv } from './security'

/**
 * Get Supabase client for user (with their access token)
 */
export function createUserClient(accessToken: string) {
  validateEnv(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  )
}

/**
 * Get Supabase admin client (service role - server only)
 */
export function createAdminClient() {
  validateEnv(['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

/**
 * Validated user session from request
 */
export interface ValidatedSession {
  user: { id: string; email?: string }
  accessToken: string
  role: string
  userClient: SupabaseClient
  adminClient: SupabaseClient
}

/**
 * Authenticate request and return validated session
 * Returns error response if authentication fails
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<ValidatedSession | NextResponse> {
  const accessToken = getBearerToken(request)

  if (!accessToken) {
    return createErrorResponse('Authentication required.', 401)
  }

  const userClient = createUserClient(accessToken)

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken)

  if (userError || !user) {
    return createErrorResponse('Your session is invalid or expired.', 401)
  }

  const adminClient = createAdminClient()

  const role = await getUserRole(adminClient, user.id)
  if (!role) {
    return createErrorResponse('An active campus account is required.', 403)
  }

  return { user, accessToken, role, userClient, adminClient }
}

/**
 * Get user's campus role
 */
export async function getUserRole(
  adminClient: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role, account_status')
    .eq('id', userId)
    .single()

  if (error || !profile || (profile.account_status ?? 'Active') !== 'Active') return null
  return profile.role
}

/**
 * Require specific role(s)
 */
export function requireRole(role: string, allowedRoles: string[]): NextResponse | null {
  return allowedRoles.includes(role) ? null : createErrorResponse('Access denied.', 403)
}

const DEFAULT_BODY_LIMIT = 1024 * 1024

async function readBodyBytes(request: NextRequest, maxSize: number) {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null && Number(declaredLength) > maxSize) {
    return createErrorResponse('Request body too large', 413)
  }
  if (!request.body) return new Uint8Array(0)

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxSize) {
        void reader.cancel().catch(() => {})
        return createErrorResponse('Request body too large', 413)
      }
      chunks.push(value)
    }
  } catch {
    return createErrorResponse('Unable to read request body', 400)
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

/** Parse JSON once, after enforcing the byte limit on the incoming stream. */
export async function validateRequestBody<T>(
  request: NextRequest,
  maxSize = DEFAULT_BODY_LIMIT
): Promise<T | NextResponse> {
  const bytes = await readBodyBytes(request, maxSize)
  if (bytes instanceof NextResponse) return bytes

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (!text.trim()) return createErrorResponse('Request body is empty', 400)
    return JSON.parse(text) as T
  } catch {
    return createErrorResponse('Invalid JSON in request body', 400)
  }
}

/**
 * API Route wrapper with common security checks
 */
export interface ApiHandlerOptions {
  requireAuth?: boolean
  allowedRoles?: string[]
  rateLimit?: { windowMs: number; maxRequests: number; keyPrefix: string }
  maxBodySize?: number
  requireBody?: boolean
}

export type ApiHandler = (
  request: NextRequest,
  context: {
    session: ValidatedSession;
    body: unknown;
    params: Record<string, string>;
  }
) => Promise<NextResponse>

export function withSecurity(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
) {
  return async (
    request: NextRequest,
    routeContext?: { params?: Promise<Record<string, string>> | Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      if (options.rateLimit) {
        const rateLimitResponse = applyRateLimit(request, options.rateLimit)
        if (rateLimitResponse) return rateLimitResponse
      }

      let session: ValidatedSession | null = null
      if (options.requireAuth !== false || options.allowedRoles?.length) {
        const authResult = await authenticateRequest(request)
        if (authResult instanceof NextResponse) return authResult
        session = authResult

        if (options.allowedRoles?.length) {
          const roleCheck = requireRole(session.role, options.allowedRoles)
          if (roleCheck) return roleCheck
        }
      }

      let body: unknown = {}
      let handlerRequest = request
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        if (options.requireBody !== false) {
          const bodyResult = await validateRequestBody(request, options.maxBodySize)
          if (bodyResult instanceof NextResponse) return bodyResult
          body = bodyResult
        } else if (request.body) {
          // Routes that consume their own JSON or multipart data still use the byte limit.
          const bytes = await readBodyBytes(request, options.maxBodySize ?? DEFAULT_BODY_LIMIT)
          if (bytes instanceof NextResponse) return bytes
          handlerRequest = new NextRequest(request, { body: bytes })
        }
      }

      const params = routeContext?.params ? await routeContext.params : {}
      return await handler(handlerRequest, { session: session!, body, params })
    } catch (error) {
      console.error('[API Error]', error)
      return createErrorResponse(
        process.env.NODE_ENV === 'production'
          ? 'Internal server error.'
          : error instanceof Error
          ? error.message
          : 'Internal server error.',
        500
      )
    }
  }
}
