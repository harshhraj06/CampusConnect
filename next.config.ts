import type { NextConfig } from 'next'

const isProduction =
  process.env.NODE_ENV === 'production'

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '0',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  ...(isProduction
    ? [
        {
          key:
            'Strict-Transport-Security',
          value:
            'max-age=31536000; includeSubDomains; preload',
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  poweredByHeader:
    false,

  compress:
    true,

  reactStrictMode:
    true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers:
          securityHeaders,
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname:
          'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname:
          'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname:
          'drive.usercontent.google.com',
      },
      {
        protocol: 'https',
        hostname:
          'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname:
          'commons.wikimedia.org',
      },
    ],

    dangerouslyAllowSVG:
      false,

    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
  },

  experimental: {
    serverActions: {
      allowedOrigins: [
        process.env
          .NEXT_PUBLIC_APP_URL ||
          'localhost:3000',
      ],
    },
  },

  webpack(
    config,
    { isServer }
  ) {
    config.resolve.alias = {
      ...config.resolve.alias,
      protobufjs: false,
    }

    if (
      isProduction &&
      !isServer
    ) {
      config.optimization.minimizer =
        config.optimization
          .minimizer || []
    }

    return config
  },
}

export default nextConfig
