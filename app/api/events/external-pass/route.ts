import { NextResponse } from 'next/server'

import {
  createAdminClient,
  withSecurity,
} from '@/lib/api-auth'

import {
  sanitizeString,
} from '@/lib/security'

type ExternalPassBody = {
  token?: unknown
}

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        'Cache-Control':
          'private, no-store, max-age=0',

        'X-Robots-Tag':
          'noindex, nofollow, noarchive',
      },
    }
  )
}

export const POST = withSecurity(
  async (_request, { body }) => {
    const input =
      body as ExternalPassBody

    const token =
      sanitizeString(
        input.token,
        80
      )

    if (
      !/^CCXP_[0-9a-fA-F]{64}$/.test(
        token
      )
    ) {
      return jsonError(
        'Invalid event pass.',
        400
      )
    }

    const adminClient =
      createAdminClient()

    const {
      data,
      error,
    } =
      await adminClient.rpc(
        'get_external_event_pass',
        {
          p_claim_token:
            token,
        }
      )

    if (error) {
      console.error(
        '[External Event Pass]',
        error
      )

      return jsonError(
        'Unable to load event pass.',
        400
      )
    }

    const result =
      data as {
        success?: boolean
        error?: string
      } | null

    if (
      !result ||
      !result.success
    ) {
      return jsonError(
        result?.error ||
          'This event pass is unavailable.',
        404
      )
    }

    return NextResponse.json(
      data,
      {
        headers: {
          'Cache-Control':
            'private, no-store, max-age=0',

          'X-Robots-Tag':
            'noindex, nofollow, noarchive',
        },
      }
    )
  },
  {
    requireAuth: false,

    rateLimit: {
      windowMs:
        60_000,

      maxRequests:
        30,

      keyPrefix:
        'external-event-pass',
    },

    maxBodySize:
      2 * 1024,

    requireBody:
      true,
  }
)
