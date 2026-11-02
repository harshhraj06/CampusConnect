import { NextRequest, NextResponse } from 'next/server'
import { withSecurity, getUserRole } from '@/lib/api-auth'

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient } = session

    const { data: kits, error } = await adminClient
      .from('placement_company_kits')
      .select('*')
      .order('company_name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ company_kits: kits || [] }, { headers: { 'Cache-Control': 'no-store' } })
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'placement-company-kits-get' },
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
    if (!payload.company_name) {
      return NextResponse.json({ error: 'company_name is required.' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('placement_company_kits')
      .upsert(
        {
          company_name: String(payload.company_name).trim(),
          logo_label: String(payload.logo_label || payload.company_name.slice(0, 2)).toUpperCase(),
          industry: String(payload.industry || '').trim(),
          recruitment_pattern: String(payload.recruitment_pattern || '').trim(),
          eligibility_criteria: String(payload.eligibility_criteria || '').trim(),
          interview_stages: Array.isArray(payload.interview_stages) ? payload.interview_stages : [],
          frequently_asked_topics: Array.isArray(payload.frequently_asked_topics) ? payload.frequently_asked_topics : [],
          sample_questions: Array.isArray(payload.sample_questions) ? payload.sample_questions : [],
          is_verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_name' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, company_kit: data })
  },
  {
    requireAuth: true,
    allowedRoles: ['Placement Cell', 'Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'placement-company-kits-post' },
    requireBody: true,
  }
)
