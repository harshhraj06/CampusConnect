import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api-auth'

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient, user } = session

    const { data: profile } = await adminClient
      .from('profiles')
      .select('department, name, cgpa')
      .eq('id', user.id)
      .maybeSingle()

    const branch = profile?.department || 'ECE'

    const { data: progressRows } = await adminClient
      .from('placement_student_progress')
      .select('*')
      .eq('student_id', user.id)

    const { data: attempts } = await adminClient
      .from('placement_assessment_attempts')
      .select('id, assessment_id, score, total_marks, percentage, passed, status, started_at, submitted_at, placement_assessments(title, track_id, branch_id)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    const { count: bookmarkCount } = await adminClient
      .from('placement_bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)

    const { data: codingSubmissions } = await adminClient
      .from('placement_coding_submissions')
      .select('id, question_id, language, status, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    let totalQuestionsAttempted = 0
    let totalQuestionsCorrect = 0
    let totalCodingSolved = 0

    let coreAttempted = 0
    let coreCorrect = 0

    let softwareAttempted = 0
    let softwareCorrect = 0

    let aptitudeAttempted = 0
    let aptitudeCorrect = 0

    const topicStats: Record<string, { topic_id: string; attempted: number; correct: number }> = {}

    for (const row of progressRows || []) {
      const att = Number(row.questions_attempted || 0)
      const corr = Number(row.questions_correct || 0)
      totalQuestionsAttempted += att
      totalQuestionsCorrect += corr
      totalCodingSolved += Number(row.coding_problems_solved || 0)

      if (row.track_id === 'core') {
        coreAttempted += att
        coreCorrect += corr
      } else if (row.track_id === 'software') {
        softwareAttempted += att
        softwareCorrect += corr
      } else if (row.track_id === 'aptitude') {
        aptitudeAttempted += att
        aptitudeCorrect += corr
      }

      if (row.topic_id) {
        const cur = topicStats[row.topic_id] || { topic_id: row.topic_id, attempted: 0, correct: 0 }
        cur.attempted += att
        cur.correct += corr
        topicStats[row.topic_id] = cur
      }
    }

    for (const a of attempts || []) {
      if (a.status === 'evaluated' && a.total_marks > 0) {
        const p = a.percentage
        const assRecord = (Array.isArray(a.placement_assessments) ? a.placement_assessments[0] : a.placement_assessments) as Record<string, any> | null
        const track = assRecord?.track_id
        if (track === 'core') {
          coreAttempted += 10
          coreCorrect += Math.round((p / 100) * 10)
        } else {
          softwareAttempted += 10
          softwareCorrect += Math.round((p / 100) * 10)
        }
      }
    }

    const coreReadiness = coreAttempted > 0 ? Math.min(100, Math.round((coreCorrect / coreAttempted) * 100)) : 0
    const softwareReadiness = softwareAttempted > 0 ? Math.min(100, Math.round((softwareCorrect / softwareAttempted) * 100)) : 0
    const aptitudeReadiness = aptitudeAttempted > 0 ? Math.min(100, Math.round((aptitudeCorrect / aptitudeAttempted) * 100)) : 0

    const weakTopics = Object.values(topicStats)
      .filter((t) => t.attempted >= 2 && (t.correct / t.attempted) < 0.6)
      .map((t) => t.topic_id)

    return NextResponse.json(
      {
        branch,
        metrics: {
          core_readiness: coreReadiness,
          software_readiness: softwareReadiness,
          aptitude_readiness: aptitudeReadiness,
          total_questions_attempted: totalQuestionsAttempted,
          total_questions_correct: totalQuestionsCorrect,
          total_coding_solved: totalCodingSolved,
          bookmarks_count: bookmarkCount || 0,
        },
        weak_topics: weakTopics,
        recent_assessments: attempts || [],
        recent_coding: codingSubmissions || [],
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 120, keyPrefix: 'placement-progress-get' },
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
    const isCorrect = Boolean(payload.is_correct)

    const { data: question } = await adminClient
      .from('placement_questions')
      .select('branch_id, track_id, subject_id, topic_id')
      .eq('id', questionId)
      .single()

    if (!question) {
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 })
    }

    const { data: existing } = await adminClient
      .from('placement_student_progress')
      .select('id, questions_attempted, questions_correct')
      .eq('student_id', user.id)
      .eq('track_id', question.track_id)
      .eq('subject_id', question.subject_id)
      .eq('topic_id', question.topic_id)
      .maybeSingle()

    if (existing) {
      await adminClient
        .from('placement_student_progress')
        .update({
          questions_attempted: (existing.questions_attempted || 0) + 1,
          questions_correct: (existing.questions_correct || 0) + (isCorrect ? 1 : 0),
          last_practiced_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await adminClient.from('placement_student_progress').insert({
        student_id: user.id,
        track_id: question.track_id,
        branch_id: question.branch_id,
        subject_id: question.subject_id,
        topic_id: question.topic_id,
        questions_attempted: 1,
        questions_correct: isCorrect ? 1 : 0,
        last_practiced_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ ok: true })
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 120, keyPrefix: 'placement-progress-post' },
    requireBody: true,
  }
)
