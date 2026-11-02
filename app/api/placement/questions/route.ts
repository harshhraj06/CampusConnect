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
    const subjectId = searchParams.get('subject_id')
    const topicId = searchParams.get('topic_id')
    const difficulty = searchParams.get('difficulty')
    const questionType = searchParams.get('question_type')
    const search = searchParams.get('search')?.trim()
    const status = searchParams.get('status')
    const mode = searchParams.get('mode') // 'study' | 'test' | 'all'
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)))
    const offset = Math.max(0, Number(searchParams.get('offset') || 0))

    let query = adminClient
      .from('placement_questions')
      .select(`
        id,
        title,
        question_text,
        question_type,
        branch_id,
        track_id,
        subject_id,
        topic_id,
        difficulty,
        options,
        correct_answer,
        explanation,
        marks,
        negative_marks,
        coding_template,
        tags,
        status,
        author_name,
        source_notes,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Security: ordinary students only see published questions
    if (!isStaff) {
      query = query.eq('status', 'published')
    } else if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (trackId && trackId !== 'all') {
      query = query.eq('track_id', trackId)
    }

    if (branchId && branchId !== 'all') {
      query = query.or(`branch_id.eq.${branchId},branch_id.is.null`)
    }

    if (subjectId && subjectId !== 'all') {
      query = query.eq('subject_id', subjectId)
    }

    if (topicId && topicId !== 'all') {
      query = query.eq('topic_id', topicId)
    }

    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty', difficulty)
    }

    if (questionType && questionType !== 'all') {
      query = query.eq('question_type', questionType)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,question_text.ilike.%${search}%`)
    }

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mask answer keys if in test mode and user is not staff
    const questions = (data || []).map((q) => {
      if (!isStaff && mode === 'test') {
        const sanitizedOptions = Array.isArray(q.options)
          ? q.options.map((opt: Record<string, unknown>) => ({
              id: opt.id,
              text: opt.text,
            }))
          : []

        return {
          ...q,
          options: sanitizedOptions,
          correct_answer: undefined,
          explanation: undefined,
        }
      }
      return q
    })

    return NextResponse.json(
      { questions, total: count || 0, offset, limit },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 120, keyPrefix: 'placement-questions-get' },
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
    if (!payload.title || !payload.question_text || !payload.question_type || !payload.track_id) {
      return NextResponse.json(
        { error: 'title, question_text, question_type, and track_id are required fields.' },
        { status: 400 }
      )
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()

    const authorName = profile?.name || 'Placement Officer'

    const recordPayload = {
      title: String(payload.title).trim(),
      question_text: String(payload.question_text).trim(),
      question_type: payload.question_type,
      branch_id: payload.branch_id || null,
      track_id: payload.track_id,
      subject_id: payload.subject_id || null,
      topic_id: payload.topic_id || null,
      difficulty: payload.difficulty || 'intermediate',
      options: Array.isArray(payload.options) ? payload.options : [],
      correct_answer: String(payload.correct_answer || '').trim(),
      explanation: String(payload.explanation || '').trim(),
      marks: Number(payload.marks || 1.0),
      negative_marks: Number(payload.negative_marks || 0.0),
      coding_template: payload.coding_template || null,
      tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
      status: payload.status || 'published',
      author_id: user.id,
      author_name: authorName,
      source_notes: String(payload.source_notes || '').trim(),
    }

    const { data, error } = await adminClient
      .from('placement_questions')
      .insert(recordPayload)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, question: data })
  },
  {
    requireAuth: true,
    allowedRoles: ['Placement Cell', 'Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'placement-questions-post' },
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
      return NextResponse.json({ error: 'Question id is required.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    const fields = [
      'title', 'question_text', 'question_type', 'branch_id', 'track_id',
      'subject_id', 'topic_id', 'difficulty', 'options', 'correct_answer',
      'explanation', 'marks', 'negative_marks', 'coding_template', 'tags',
      'status', 'source_notes'
    ]

    for (const f of fields) {
      if (payload[f] !== undefined) updates[f] = payload[f]
    }

    const { data, error } = await adminClient
      .from('placement_questions')
      .update(updates)
      .eq('id', payload.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, question: data })
  },
  {
    requireAuth: true,
    allowedRoles: ['Placement Cell', 'Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'placement-questions-patch' },
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
      return NextResponse.json({ error: 'Question id is required.' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('placement_questions')
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
    rateLimit: { windowMs: 60_000, maxRequests: 40, keyPrefix: 'placement-questions-delete' },
    requireBody: false,
  }
)
