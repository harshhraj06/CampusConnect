import { NextRequest, NextResponse } from 'next/server'
import { withSecurity, getUserRole } from '@/lib/api-auth'

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient } = session
    const { searchParams } = new URL(request.url)
    const includeAll = searchParams.get('include_all') === 'true'

    let query = adminClient
      .from('placement_branches')
      .select(`
        id,
        name,
        description,
        is_active,
        display_order,
        placement_subjects (
          id,
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
            display_order
          )
        )
      `)
      .order('display_order', { ascending: true })

    if (!includeAll) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ branches: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 120, keyPrefix: 'placement-branches-get' },
    requireBody: false,
  }
)

export const POST = withSecurity(
  async (request: NextRequest, { session, body }) => {
    const { adminClient, user } = session
    const role = await getUserRole(adminClient, user.id)

    if (!role || !['Placement Cell', 'Main Admin'].includes(role)) {
      return NextResponse.json({ error: 'Access denied. Placement Officer or Admin role required.' }, { status: 403 })
    }

    const payload = (body || {}) as Record<string, any>
    if (!payload.id || !payload.name) {
      return NextResponse.json({ error: 'Branch code (id) and name are required.' }, { status: 400 })
    }

    const branchId = String(payload.id).trim().toUpperCase()
    const name = String(payload.name).trim()
    const description = String(payload.description || '').trim()
    const displayOrder = Number(payload.display_order || 0)

    const { data, error } = await adminClient
      .from('placement_branches')
      .insert({
        id: branchId,
        name,
        description,
        is_active: true,
        display_order: displayOrder,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, branch: data })
  },
  {
    requireAuth: true,
    allowedRoles: ['Placement Cell', 'Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'placement-branches-post' },
    requireBody: true,
  }
)

export const PATCH = withSecurity(
  async (request: NextRequest, { session, body }) => {
    const { adminClient, user } = session
    const role = await getUserRole(adminClient, user.id)

    if (!role || !['Placement Cell', 'Main Admin'].includes(role)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
    }

    const payload = (body || {}) as Record<string, any>
    if (!payload.id) {
      return NextResponse.json({ error: 'Branch code (id) is required.' }, { status: 400 })
    }

    const branchId = String(payload.id).trim().toUpperCase()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (payload.name !== undefined) updates.name = String(payload.name).trim()
    if (payload.description !== undefined) updates.description = String(payload.description).trim()
    if (payload.is_active !== undefined) updates.is_active = Boolean(payload.is_active)
    if (payload.display_order !== undefined) updates.display_order = Number(payload.display_order)

    const { data, error } = await adminClient
      .from('placement_branches')
      .update(updates)
      .eq('id', branchId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, branch: data })
  },
  {
    requireAuth: true,
    allowedRoles: ['Placement Cell', 'Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 40, keyPrefix: 'placement-branches-patch' },
    requireBody: true,
  }
)
