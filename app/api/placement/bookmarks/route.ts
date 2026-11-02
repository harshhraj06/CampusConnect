import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api-auth'

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient, user } = session

    const { data: bookmarks, error } = await adminClient
      .from('placement_bookmarks')
      .select(`
        id,
        note,
        created_at,
        placement_questions (
          id,
          title,
          question_text,
          question_type,
          branch_id,
          track_id,
          subject_id,
          difficulty,
          options,
          correct_answer,
          explanation,
          tags
        )
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bookmarks: bookmarks || [] }, { headers: { 'Cache-Control': 'no-store' } })
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'placement-bookmarks-get' },
    requireBody: false,
  }
)

export const POST = withSecurity(
  async (request: NextRequest, { session, body }) => {
    const { adminClient, user } = session
    const payload = (body || {}) as Record<string, any>

    if (!payload.question_id) {
      return NextResponse.json({ error: 'question_id is required.' }, { status: 400 })
    }

    const questionId = payload.question_id
    const note = String(payload.note || '').trim()

    const { data: existing } = await adminClient
      .from('placement_bookmarks')
      .select('id')
      .eq('student_id', user.id)
      .eq('question_id', questionId)
      .maybeSingle()

    if (existing) {
      await adminClient.from('placement_bookmarks').delete().eq('id', existing.id)
      return NextResponse.json({ ok: true, bookmarked: false })
    }

    const { data, error } = await adminClient
      .from('placement_bookmarks')
      .insert({
        student_id: user.id,
        question_id: questionId,
        note,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, bookmarked: true, bookmark: data })
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'placement-bookmarks-post' },
    requireBody: true,
  }
)
