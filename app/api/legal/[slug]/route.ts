import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/api-auth'

/**
 * GET /api/legal/[slug]
 * Public endpoint to fetch published legal document content
 * Used by the public privacy/terms pages
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!['privacy', 'terms'].includes(slug)) {
    return NextResponse.json(
      { error: 'Invalid legal document slug' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .rpc('get_published_legal_document', { p_slug: slug })

  if (error) {
    console.error('[Legal API] Failed to fetch published document:', error)
    return NextResponse.json(
      { error: 'Failed to load legal document' },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Legal document not found or not published' },
      { status: 404 }
    )
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    },
  })
}