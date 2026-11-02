import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api-auth'
import { normalizeLegalSections, validateLegalContent } from '@/lib/legal-content'

/**
 * POST /api/admin/legal/[slug]/revisions/[version]/restore
 * Admin endpoint to restore a previous revision as a new draft
 */
export const POST = withSecurity(
  async (_request, { session, params }) => {
    const { slug, version } = params

    if (!['privacy', 'terms'].includes(slug)) {
      return NextResponse.json(
        { error: 'Invalid legal document slug' },
        { status: 400 }
      )
    }

    const versionNum = parseInt(version, 10)
    if (isNaN(versionNum) || versionNum < 1) {
      return NextResponse.json(
        { error: 'Invalid revision version' },
        { status: 400 }
      )
    }

    const { data: revision, error: revError } = await session.userClient.rpc(
      'get_legal_document_revision_by_slug',
      { p_slug: slug, p_version: versionNum }
    )
    if (revError || !revision) {
      return NextResponse.json(
        { error: 'Revision not found' },
        { status: 404 }
      )
    }

    try {
      const legacyRevision = revision as Record<string, unknown>
      const content = validateLegalContent({
        ...legacyRevision,
        sections: normalizeLegalSections(legacyRevision.sections),
      })
      const { data, error } = await session.userClient.rpc('update_legal_document_by_slug', {
        p_slug: slug,
        p_title: content.title,
        p_introduction: content.introduction,
        p_sections: content.sections,
        p_meta_description: content.meta_description,
        p_action: 'save_draft',
        p_edit_summary: `Restored from revision v${versionNum}`,
      })
      if (error) throw error
      return NextResponse.json({ success: true, document: data }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return NextResponse.json(
        { error: 'Could not restore this revision' },
        { status: 400 }
      )
    }
  },
  {
    requireAuth: true,
    requireBody: false,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 10, keyPrefix: 'admin-legal-restore' },
  }
)