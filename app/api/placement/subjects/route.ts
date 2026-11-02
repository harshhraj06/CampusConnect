import { NextRequest, NextResponse } from 'next/server'
import { withSecurity, getUserRole } from '@/lib/api-auth'

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient } = session
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const trackId = searchParams.get('track_id')

    let query = adminClient
      .from('placement_subjects')
      .select(`
        id,
        branch_id,
        track_id,
        name,
        code,
        description,
        icon,
        display_order,
        placement_topics (
          id,
          name,
          description,
          learning_content,
          display_order
        )
      `)
      .order('display_order', { ascending: true })

    if (trackId) {
      query = query.eq('track_id', trackId)
    }

    if (branchId) {
      if (branchId === 'ALL') {
        query = query.is('branch_id', null)
      } else {
        query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
      }
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subjects: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 120, keyPrefix: 'placement-subjects-get' },
    requireBody: false,
  }
)

export const POST = withSecurity(
  async (request: NextRequest, { session, body }) => {
    const { adminClient, user } = session
    const role = await getUserRole(adminClient, user.id)

    if (!role || !['Placement Cell', 'Main Admin'].includes(role)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
    }

    const payload = (body || {}) as Record<string, any>
    if (!payload.name || !payload.track_id) {
      return NextResponse.json({ error: 'Subject name and track_id are required.' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('placement_subjects')
      .insert({
        branch_id: payload.branch_id || null,
        track_id: payload.track_id,
        name: String(payload.name).trim(),
        code: String(payload.code || '').trim(),
        description: String(payload.description || '').trim(),
        icon: String(payload.icon || 'BookOpen').trim(),
        display_order: Number(payload.display_order || 0),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, subject: data })
  },
  {
    requireAuth: true,
    allowedRoles: ['Placement Cell', 'Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 40, keyPrefix: 'placement-subjects-post' },
    requireBody: true,
  }
)

export const DELETE = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient, user } = session
    const role = await getUserRole(adminClient, user.id)

    if (!role || !['Placement Cell', 'Main Admin'].includes(role)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Subject id is required.' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('placement_subjects')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deleted: id })
  },
  {
    requireAuth: true,
    allowedRoles: ['Placement Cell', 'Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'placement-subjects-delete' },
    requireBody: false,
  }
)
