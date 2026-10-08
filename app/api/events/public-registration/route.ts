import { NextResponse } from 'next/server'

import {
  createAdminClient,
  withSecurity,
} from '@/lib/api-auth'

import {
  sanitizeString,
} from '@/lib/security'

type PublicRegistrationBody = {
  slug?: unknown
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
          'no-store, max-age=0',
      },
    }
  )
}

export const POST = withSecurity(
  async (_request, { body }) => {
    const input =
      body as PublicRegistrationBody

    const slug =
      sanitizeString(
        input.slug,
        180
      )

    if (!slug) {
      return jsonError(
        'Registration link is invalid.',
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
        'get_public_event_registration',
        {
          p_slug:
            slug,
        }
      )

    if (error) {
      console.error(
        '[Public Event Registration]',
        error
      )

      return jsonError(
        'Unable to load this event.',
        400
      )
    }

    const result =
      data as {
        success?: boolean
        error?: string
        event?: unknown
      } | null

    if (
      !result ||
      !result.success ||
      !result.event
    ) {
      return jsonError(
        result?.error ||
          'This registration link is unavailable.',
        404
      )
    }

    return NextResponse.json(
      data,
      {
        headers: {
          'Cache-Control':
            'no-store, max-age=0',
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
        60,

      keyPrefix:
        'public-event-registration',
    },

    maxBodySize:
      2 * 1024,

    requireBody:
      true,
  }
)
