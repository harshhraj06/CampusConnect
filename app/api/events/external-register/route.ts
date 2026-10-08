import { NextResponse } from 'next/server'

import {
  createAdminClient,
  withSecurity,
} from '@/lib/api-auth'

import {
  isValidEmail,
  isValidPhone,
  sanitizeString,
} from '@/lib/security'

type ExternalRegistrationBody = {
  slug?: unknown
  full_name?: unknown
  email?: unknown
  phone?: unknown
  college_name?: unknown
  department?: unknown
  graduation_year?: unknown
}

function readLimitedText(
  value: unknown,
  maxLength: number
): {
  value: string
  tooLong: boolean
} {
  const cleaned =
    sanitizeString(
      value,
      maxLength + 1
    )

  return {
    value:
      cleaned.length > maxLength
        ? cleaned.slice(0, maxLength)
        : cleaned,
    tooLong:
      cleaned.length > maxLength,
  }
}

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
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
      body as ExternalRegistrationBody

    const slug =
      readLimitedText(
        input.slug,
        180
      )

    const fullName =
      readLimitedText(
        input.full_name,
        120
      )

    const email =
      readLimitedText(
        input.email,
        254
      )

    const phone =
      readLimitedText(
        input.phone,
        32
      )

    const collegeName =
      readLimitedText(
        input.college_name,
        180
      )

    const department =
      readLimitedText(
        input.department,
        120
      )

    const graduationYear =
      readLimitedText(
        input.graduation_year,
        32
      )

    if (
      slug.tooLong ||
      !slug.value
    ) {
      return jsonError(
        'Invalid registration link.',
        400
      )
    }

    if (
      fullName.tooLong ||
      fullName.value.length < 2
    ) {
      return jsonError(
        'Enter a valid full name.',
        400
      )
    }

    const normalizedEmail =
      email.value.toLowerCase()

    if (
      email.tooLong ||
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return jsonError(
        'Enter a valid email address.',
        400
      )
    }

    if (
      phone.tooLong ||
      !isValidPhone(
        phone.value
      ) ||
      phone.value.replace(
        /\D/g,
        ''
      ).length < 10
    ) {
      return jsonError(
        'Enter a valid phone number.',
        400
      )
    }

    if (
      collegeName.tooLong ||
      collegeName.value.length < 2
    ) {
      return jsonError(
        'Enter your college name.',
        400
      )
    }

    if (
      department.tooLong
    ) {
      return jsonError(
        'Department is too long.',
        400
      )
    }

    if (
      graduationYear.tooLong
    ) {
      return jsonError(
        'Graduation year is too long.',
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
        'register_external_event_attendee',
        {
          p_slug:
            slug.value,

          p_full_name:
            fullName.value,

          p_email:
            normalizedEmail,

          p_phone:
            phone.value,

          p_college_name:
            collegeName.value,

          p_department:
            department.value,

          p_graduation_year:
            graduationYear.value,
        }
      )

    if (error) {
      const message =
        error.message || ''

      if (
        message.includes(
          'event is full'
        )
      ) {
        return jsonError(
          'This event is full.',
          409
        )
      }

      if (
        message.includes(
          'deadline'
        )
      ) {
        return jsonError(
          'The registration deadline has passed.',
          400
        )
      }

      if (
        message.includes(
          'event has started'
        )
      ) {
        return jsonError(
          'Registration is closed because the event has started.',
          400
        )
      }

      if (
        message.includes(
          'registration link is unavailable'
        )
      ) {
        return jsonError(
          'This registration link is unavailable.',
          404
        )
      }

      if (
        message.includes(
          'already registered'
        )
      ) {
        return jsonError(
          'Registration could not be completed for these details.',
          409
        )
      }

      console.error(
        '[External Event Registration]',
        error
      )

      return jsonError(
        'Unable to complete registration.',
        400
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
        5,

      keyPrefix:
        'external-event-registration',
    },

    maxBodySize:
      8 * 1024,

    requireBody:
      true,
  }
)
