/**
 * CampusConnect Security Utilities
 * Common validation, sanitization, and security helpers
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Sanitize string input - remove null bytes, trim, limit length
 */
export function sanitizeString(input: unknown, maxLength = 2000): string {
  return String(input ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate phone number (E.164 format)
 */
export function isValidPhone(phone: string): boolean {
  return /^\+?[0-9]{8,15}$/.test(phone.replace(/[\s()-]/g, ''))
}

/**
 * Validate UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
}

/**
 * Validate file type by magic bytes
 */
export function detectMimeType(bytes: Uint8Array): string {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return 'application/pdf'
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg'
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp'
  }

  return ''
}

/**
 * Allowed file types for uploads
 */
export const ALLOWED_UPLOAD_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

/**
 * Validate file upload
 */
export async function validateFileUpload(
  file: File,
  maxSize = 20 * 1024 * 1024
): Promise<{
  valid: boolean
  error?: string
  mimeType?: string
  safeFilename?: string
}> {
  if (!file) {
    return {
      valid: false,
      error: 'File is required.',
    }
  }

  if (
    !Number.isFinite(file.size) ||
    file.size <= 0
  ) {
    return {
      valid: false,
      error: 'File is empty or invalid.',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error:
        `File size exceeds ${Math.floor(maxSize / 1024 / 1024)}MB limit`,
    }
  }

  const safeFilename =
    sanitizeFilename(
      file.name || 'upload'
    )

  const bytes =
    new Uint8Array(
      await file
        .slice(0, 64)
        .arrayBuffer()
    )

  const detected =
    detectMimeType(bytes)

  if (
    !detected ||
    !ALLOWED_UPLOAD_TYPES.has(
      detected
    )
  ) {
    return {
      valid: false,
      error:
        'File contents do not match an allowed file type.',
    }
  }

  const declared =
    String(file.type || '')
      .split(';')[0]
      .trim()
      .toLowerCase()

  if (
    declared &&
    declared !==
      'application/octet-stream' &&
    declared !== detected
  ) {
    return {
      valid: false,
      error:
        'Declared MIME type does not match file contents.',
    }
  }

  const extension =
    safeFilename
      .split('.')
      .pop()
      ?.toLowerCase() || ''

  const extensions:
    Record<string, string[]> = {
      'application/pdf': [
        'pdf',
      ],
      'image/jpeg': [
        'jpg',
        'jpeg',
      ],
      'image/png': [
        'png',
      ],
      'image/webp': [
        'webp',
      ],
    }

  if (
    !extensions[
      detected
    ]?.includes(extension)
  ) {
    return {
      valid: false,
      error:
        'Filename extension does not match file contents.',
    }
  }

  return {
    valid: true,
    mimeType:
      detected,
    safeFilename,
  }
}

/**
 * Extract bearer token from Authorization header
 */
export function getBearerToken(request: NextRequest | Request): string {
  const auth = request.headers.get('authorization') || ''
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: Record<string, unknown> = { error: message }
  if (details && process.env.NODE_ENV !== 'production') {
    body.details = details
  }
  return NextResponse.json(body, { status })
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyPrefix: string
}

/**
 * Simple in-memory rate limiter (for development)
 * In production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()

  if (rateLimitStore.size > 5000) {
    for (const [storedKey, storedValue] of rateLimitStore) {
      if (storedValue.resetAt <= now) {
        rateLimitStore.delete(storedKey)
      }
    }
  }

  const entry = rateLimitStore.get(key)

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

/**
 * Rate limit for API routes
 */
export function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const ip =
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  const key = `${config.keyPrefix}:${ip}`

  const result = checkRateLimit(key, config)

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
        },
      }
    )
  }

  // Add rate limit headers to response
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString())

  return null
}

/**
 * Validate required environment variables
 */
export function validateEnv(required: string[]): void {
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

/**
 * Secure JSON parse with size limit
 */
export function safeJsonParse<T>(text: string, maxSize = 1024 * 1024): T | null {
  if (text.length > maxSize) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/**
 * Content Security Policy nonce generator
 */
export function generateCspNonce(): string {
  const array =
    crypto.getRandomValues(
      new Uint8Array(16)
    )

  let binary = ''

  for (const byte of array) {
    binary +=
      String.fromCharCode(byte)
  }

  return btoa(binary)
}

/**
 * Validate and sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255)
}

/**
 * Check if origin is allowed (for CORS)
 */
export function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) return false
  try {
    const url = new URL(origin)
    return allowedOrigins.some((allowed) => {
      if (allowed === '*') return true
      const allowedUrl = new URL(allowed)
      return url.hostname === allowedUrl.hostname && url.protocol === allowedUrl.protocol
    })
  } catch {
    return false
  }
}