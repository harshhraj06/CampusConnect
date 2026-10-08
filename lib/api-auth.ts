/**
 * CampusConnect API Authentication Helpers
 * Standardized auth validation for API routes
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getBearerToken, createErrorResponse, validateEnv } from './security'

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

  return { user, accessToken, userClient, adminClient }
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
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !profile) return null
  return profile.role
}

/**
 * Require specific role(s)
 */
export async function requireRole(
  adminClient: SupabaseClient,
  userId: string,
  allowedRoles: string[]
): Promise<NextResponse | null> {
  const role = await getUserRole(adminClient, userId)

  if (!role || !allowedRoles.includes(role)) {
    return createErrorResponse(
      `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      403
    )
  }

  return null
}

/**
 * Validate request body with size limit
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  maxSize = 1024 * 1024
): Promise<T | NextResponse> {
  try {
    const text = await request.text()
    if (text.length > maxSize) {
      return createErrorResponse('Request body too large', 413)
    }
    if (!text.trim()) {
      return createErrorResponse('Request body is empty', 400)
    }
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
  context: { session: ValidatedSession; body: unknown }
) => Promise<NextResponse>

export function withSecurity(
  handler: ApiHandler,
  options: ApiHandlerOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Rate limiting
    if (options.rateLimit) {
      const rateLimitResponse = applyRateLimit(request, options.rateLimit)
      if (rateLimitResponse) return rateLimitResponse
    }

    // Body validation
    let body: unknown = {}
    const shouldReadBody =
      request.method !== 'GET' &&
      request.method !== 'HEAD' &&
      options.requireBody !== false

    if (shouldReadBody) {
      const bodyResult = await validateRequestBody(
        request,
        options.maxBodySize
      )
      if (bodyResult instanceof NextResponse) return bodyResult
      body = bodyResult
    }

    // Authentication
    let session: ValidatedSession | null = null
    if (options.requireAuth) {
      const authResult = await authenticateRequest(request)
      if (authResult instanceof NextResponse) return authResult
      session = authResult

      // Role check
      if (options.allowedRoles && options.allowedRoles.length > 0) {
        const roleCheck = await requireRole(
          session.adminClient,
          session.user.id,
          options.allowedRoles
        )
        if (roleCheck) return roleCheck
      }
    }

    try {
      return await handler(request, { session: session!, body })
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

// Re-export rate limiter
import { applyRateLimit } from './security'