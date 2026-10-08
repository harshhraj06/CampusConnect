import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isWorkspacePathname } from './lib/workspace-route-slugs'

const PUBLIC_ROUTES = [
  '/',
  '/upcoming',
  '/login',
  '/signup',
  '/auth/callback',
  '/auth/reset-password',
  '/auth/confirm',
  '/auth/verified',
  '/auth/verify-otp',
  '/campusconnect-logo.png',
  '/api/health',
  '/api/webhooks',
  '/events/join',
  '/events/pass',
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  )
}

function createNonce(): string {
  const bytes = crypto.getRandomValues(
    new Uint8Array(16)
  )

  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function buildCsp(nonce: string): string {
  const development =
    process.env.NODE_ENV === 'development'
      ? " 'unsafe-eval'"
      : ''

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development} https://apis.google.com https://www.gstatic.com https://cdn.21st.dev`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://jeplvkzqkcutxbcgcsgh.supabase.co wss://jeplvkzqkcutxbcgcsgh.supabase.co https://www.google.com https://drive.google.com https://drive.usercontent.google.com",
    "frame-src 'self' https://*.supabase.co https://drive.google.com https://docs.google.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
}

function secureHeaders(
  response: NextResponse,
  csp: string
): NextResponse {
  response.headers.set(
    'Content-Security-Policy',
    csp
  )

  response.headers.set(
    'X-Content-Type-Options',
    'nosniff'
  )

  response.headers.set(
    'X-Frame-Options',
    'DENY'
  )

  response.headers.set(
    'X-XSS-Protection',
    '0'
  )

  response.headers.set(
    'Referrer-Policy',
    'no-referrer'
  )

  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  )

  response.headers.set(
    'Cross-Origin-Opener-Policy',
    'same-origin'
  )

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}

export async function middleware(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname

  const forwardedProtocol =
    request.headers
      .get('x-forwarded-proto')
      ?.split(',')[0]
      ?.trim()
      .toLowerCase()

  const requestHostname =
    request.nextUrl.hostname
      .toLowerCase()

  const isLocalDevelopmentHost =
    requestHostname === 'localhost' ||
    requestHostname === '127.0.0.1' ||
    requestHostname === '::1'

  if (
    process.env.NODE_ENV === 'production' &&
    !isLocalDevelopmentHost &&
    (
      request.nextUrl.protocol === 'http:' ||
      forwardedProtocol === 'http'
    )
  ) {
    const secureUrl =
      request.nextUrl.clone()

    secureUrl.protocol =
      'https:'

    secureUrl.port =
      ''

    return NextResponse.redirect(
      secureUrl,
      308
    )
  }

  const nonce =
    createNonce()

  const csp =
    buildCsp(nonce)

  const requestHeaders =
    new Headers(request.headers)

  requestHeaders.set(
    'x-nonce',
    nonce
  )

  requestHeaders.set(
    'Content-Security-Policy',
    csp
  )

  let response =
    NextResponse.next({
      request: {
        headers:
          requestHeaders,
      },
    })

  if (
    pathname.startsWith('/api/')
  ) {
    return secureHeaders(
      response,
      csp
    )
  }

  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL

  const supabaseKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    console.error(
      '[Middleware] Missing Supabase authentication configuration.'
    )

    if (
      isPublicRoute(pathname)
    ) {
      return secureHeaders(
        response,
        csp
      )
    }

    return secureHeaders(
      new NextResponse(
        'Authentication service unavailable.',
        {
          status: 503,
        }
      ),
      csp
    )
  }

  const supabase =
    createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({
                name,
                value,
              }) => {
                request.cookies.set(
                  name,
                  value
                )
              }
            )

            response =
              NextResponse.next({
                request: {
                  headers:
                    requestHeaders,
                },
              })

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                )
              }
            )
          },
        },
      }
    )

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser()

  if (
    !user &&
    isWorkspacePathname(
      pathname
    )
  ) {
    const login =
      new URL(
        '/login',
        request.url
      )

    login.searchParams.set(
      'redirectTo',
      pathname
    )

    return secureHeaders(
      NextResponse.redirect(
        login
      ),
      csp
    )
  }

  if (
    user &&
    (
      pathname === '/login' ||
      pathname === '/signup'
    )
  ) {
    return secureHeaders(
      NextResponse.redirect(
        new URL(
          '/dashboard',
          request.url
        )
      ),
      csp
    )
  }

  if (
    pathname.startsWith(
      '/events/pass/'
    )
  ) {
    response.headers.set(
      'X-Robots-Tag',
      'noindex, nofollow, noarchive'
    )

    response.headers.set(
      'Cache-Control',
      'private, no-store, max-age=0'
    )
  }

  return secureHeaders(
    response,
    csp
  )
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|public/).*)',
  ],
}
