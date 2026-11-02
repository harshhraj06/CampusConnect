import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api-auth'
import { validateLegalContent } from '@/lib/legal-content'

const validSlug = (slug: string) => slug === 'privacy' || slug === 'terms'

export const GET = withSecurity(
  async (_request, { session, params }) => {
    if (!validSlug(params.slug)) {
      return NextResponse.json({ error: 'Invalid legal document slug' }, { status: 400 })
    }
    const { data, error } = await session.userClient.rpc(
      'get_legal_document_for_admin',
      { p_slug: params.slug }
    )
    if (error) {
      console.error('[Admin Legal API] Failed to load document:', error)
      return NextResponse.json({ error: 'Could not load legal document' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Legal document not found' }, { status: 404 })
    return NextResponse.json({ document: data }, { headers: { 'Cache-Control': 'no-store' } })
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    requireBody: false,
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'admin-legal-get' },
  }
)

export const POST = withSecurity(
  async (_request, { session, params, body }) => {
    const { slug } = params
    if (!validSlug(slug)) {
      return NextResponse.json(
        { error: 'Invalid legal document slug' },
        { status: 400 }
      )
    }

    const payload = body as Record<string, unknown>
    const action = payload.action
    if (typeof action !== 'string' || !['save_draft', 'publish'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "save_draft" or "publish"' },
        { status: 400 }
      )
    }

    let content
    try {
      content = validateLegalContent(payload)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Invalid sections format' },
        { status: 400 }
      )
    }

    const { data, error } = await session.userClient.rpc('update_legal_document_by_slug', {
        p_slug: slug,
        p_title: content.title,
        p_introduction: content.introduction,
        p_sections: content.sections,
        p_meta_description: content.meta_description,
        p_action: action,
        p_edit_summary: typeof payload.edit_summary === 'string' ? payload.edit_summary.slice(0, 500) : '',
      })

    if (error) {
      console.error('[Admin Legal API] Failed to update document:', error)
      return NextResponse.json(
        { error: 'Failed to update legal document' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, document: data },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: 'admin-legal-post' },
    maxBodySize: 100 * 1024, // 100KB for rich content
  }
)