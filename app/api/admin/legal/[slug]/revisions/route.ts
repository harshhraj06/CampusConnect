import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api-auth'

/**
 * GET /api/admin/legal/[slug]/revisions
 * Admin endpoint to fetch revision history for a legal document
 */
export const GET = withSecurity(
  async (_request, { session, params }) => {
    const { slug } = params

    if (!['privacy', 'terms'].includes(slug)) {
      return NextResponse.json(
        { error: 'Invalid legal document slug' },
        { status: 400 }
      )
    }

    const { data, error } = await session.userClient
      .rpc('get_legal_document_revisions_by_slug', { p_slug: slug })

    if (error) {
      console.error('[Admin Legal API] Failed to fetch revisions:', error)
      return NextResponse.json(
        { error: 'Failed to load revision history' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { revisions: data || [] },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  },
  {
    requireAuth: true,
    requireBody: false,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'admin-legal-revisions-get' },
  }
)