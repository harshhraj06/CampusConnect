import { NextRequest, NextResponse } from 'next/server'
import { withSecurity, getUserRole } from '@/lib/api-auth'

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient, user } = session
    const role = await getUserRole(adminClient, user.id)
    const isStaff = Boolean(role && ['Placement Cell', 'Main Admin'].includes(role))

    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branch_id')
    const trackId = searchParams.get('track_id')

    let query = adminClient
      .from('placement_assessments')
      .select(`
        id,
        title,
        description,
        track_id,
        branch_id,
        subject_id,
        duration_minutes,
        total_marks,
        passing_percentage,
        negative_marking,
        randomize_questions,
        feedback_release,
        eligible_branches,
        target_batches,
        max_attempts,
        status,
        starts_at,
        ends_at,
        created_by_name,
        created_at,
        placement_assessment_questions (
          question_id,
          order_index,
          marks,
          negative_marks
        )
      `)
      .order('created_at', { ascending: false })

    if (!isStaff) {
      query = query.eq('status', 'published')
    }

    if (trackId && trackId !== 'all') {
      query = query.eq('track_id', trackId)
    }

    if (branchId && branchId !== 'all') {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
    }

    const { data: assessments, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: attempts } = await adminClient
      .from('placement_assessment_attempts')
      .select('id, assessment_id, score, total_marks, percentage, passed, status, started_at, submitted_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    const attemptsByAssessment = new Map<string, Array<Record<string, unknown>>>()
    for (const att of attempts || []) {
      const existing = attemptsByAssessment.get(att.assessment_id) || []
      existing.push(att as Record<string, unknown>)
      attemptsByAssessment.set(att.assessment_id, existing)
    }

    const enriched = (assessments || []).map((ass) => ({
      ...ass,
      question_count: ass.placement_assessment_questions?.length || 0,
      my_attempts: attemptsByAssessment.get(ass.id) || [],
    }))

    return NextResponse.json({ assessments: enriched }, { headers: { 'Cache-Control': 'no-store' } })
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 120, keyPrefix: 'placement-assessments-get' },
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
    if (!payload.title || !payload.track_id) {
      return NextResponse.json({ error: 'Title and track_id are required.' }, { status: 400 })
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()

    const authorName = profile?.name || 'Placement Officer'
    const questionIds: string[] = Array.isArray(payload.question_ids) ? payload.question_ids : []

    const { data: assessment, error: createError } = await adminClient
      .from('placement_assessments')
      .insert({
        title: String(payload.title).trim(),
        description: String(payload.description || '').trim(),
        track_id: payload.track_id,
        branch_id: payload.branch_id || null,
        subject_id: payload.subject_id || null,
        duration_minutes: Number(payload.duration_minutes || 30),
        total_marks: Number(payload.total_marks || 0),
        passing_percentage: Number(payload.passing_percentage || 50),
        negative_marking: Boolean(payload.negative_marking),
        randomize_questions: Boolean(payload.randomize_questions),
        feedback_release: payload.feedback_release || 'immediate',
        eligible_branches: Array.isArray(payload.eligible_branches) && payload.eligible_branches.length ? payload.eligible_branches : ['ALL'],
        target_batches: Array.isArray(payload.target_batches) && payload.target_batches.length ? payload.target_batches : ['ALL'],
        max_attempts: Number(payload.max_attempts || 1),
        status: payload.status || 'published',
        starts_at: payload.starts_at || null,
        ends_at: payload.ends_at || null,
        created_by: user.id,
        created_by_name: authorName,
      })
      .select()
      .single()

    if (createError || !assessment) {
      return NextResponse.json({ error: createError?.message || 'Failed to create assessment.' }, { status: 400 })
    }

    if (questionIds.length > 0) {
      const mappings = questionIds.map((qId, idx) => ({
        assessment_id: assessment.id,
        question_id: qId,
        order_index: idx + 1,
        marks: 1.0,
        negative_marks: payload.negative_marking ? 0.25 : 0.0,
      }))

      await adminClient.from('placement_assessment_questions').insert(mappings)
    }

    return NextResponse.json({ ok: true, assessment })
  },
  {
    requireAuth: true,
    allowedRoles: ['Placement Cell', 'Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 40, keyPrefix: 'placement-assessments-post' },
    requireBody: true,
  }
)
