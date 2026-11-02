import { NextRequest, NextResponse } from 'next/server'
import { withSecurity, getUserRole } from '@/lib/api-auth'

export const GET = withSecurity(
  async (request: NextRequest, { session, params }) => {
    const { adminClient, user } = session
    const assessmentId = (params as Record<string, string>)?.id

    if (!assessmentId) {
      return NextResponse.json({ error: 'Assessment ID is required.' }, { status: 400 })
    }

    const role = await getUserRole(adminClient, user.id)
    const isStaff = Boolean(role && ['Placement Cell', 'Main Admin'].includes(role))

    const { data: assessment, error: assError } = await adminClient
      .from('placement_assessments')
      .select('*')
      .eq('id', assessmentId)
      .single()

    if (assError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })
    }

    const { data: mappings, error: mapError } = await adminClient
      .from('placement_assessment_questions')
      .select(`
        order_index,
        marks,
        negative_marks,
        placement_questions (
          id,
          title,
          question_text,
          question_type,
          difficulty,
          options,
          correct_answer,
          explanation,
          coding_template,
          tags
        )
      `)
      .eq('assessment_id', assessmentId)
      .order('order_index', { ascending: true })

    if (mapError) {
      return NextResponse.json({ error: mapError.message }, { status: 500 })
    }

    const { data: latestAttempt } = await adminClient
      .from('placement_assessment_attempts')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const isSubmitted = latestAttempt?.status === 'submitted' || latestAttempt?.status === 'evaluated'
    const allowFeedback = isStaff || (isSubmitted && assessment.feedback_release === 'immediate')

    const sanitizedQuestions = (mappings || []).map((m) => {
      const q = (Array.isArray(m.placement_questions) ? m.placement_questions[0] : m.placement_questions) as Record<string, any> | null
      if (!q) return null

      if (!allowFeedback) {
        const sanitizedOptions = Array.isArray(q.options)
          ? q.options.map((opt: Record<string, unknown>) => ({
              id: opt.id,
              text: opt.text,
            }))
          : []

        return {
          ...q,
          order_index: m.order_index,
          marks: m.marks,
          negative_marks: m.negative_marks,
          options: sanitizedOptions,
          correct_answer: undefined,
          explanation: undefined,
        }
      }

      return {
        ...q,
        order_index: m.order_index,
        marks: m.marks,
        negative_marks: m.negative_marks,
      }
    }).filter(Boolean)

    return NextResponse.json(
      {
        assessment,
        questions: sanitizedQuestions,
        current_attempt: latestAttempt || null,
        allow_feedback: allowFeedback,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 120, keyPrefix: 'placement-assessment-detail' },
    requireBody: false,
  }
)

export const POST = withSecurity(
  async (request: NextRequest, { session, params }) => {
    const { adminClient, user } = session
    const assessmentId = (params as Record<string, string>)?.id

    if (!assessmentId) {
      return NextResponse.json({ error: 'Assessment ID is required.' }, { status: 400 })
    }

    const { data: assessment, error: assError } = await adminClient
      .from('placement_assessments')
      .select('id, title, max_attempts, status, ends_at')
      .eq('id', assessmentId)
      .single()

    if (assError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })
    }

    if (assessment.status !== 'published') {
      return NextResponse.json({ error: 'This assessment is currently not available.' }, { status: 400 })
    }

    if (assessment.ends_at && new Date() > new Date(assessment.ends_at)) {
      return NextResponse.json({ error: 'Assessment deadline has passed.' }, { status: 400 })
    }

    const { data: existingAttempts } = await adminClient
      .from('placement_assessment_attempts')
      .select('id, attempt_number, status')
      .eq('assessment_id', assessmentId)
      .eq('student_id', user.id)

    const activeAttempt = existingAttempts?.find((a) => a.status === 'in_progress')
    if (activeAttempt) {
      return NextResponse.json({ ok: true, attempt: activeAttempt, resumed: true })
    }

    if ((existingAttempts?.length || 0) >= assessment.max_attempts) {
      return NextResponse.json(
        { error: `You have reached the maximum attempt limit (${assessment.max_attempts}) for this assessment.` },
        { status: 400 }
      )
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('name, department')
      .eq('id', user.id)
      .maybeSingle()

    const attemptNumber = (existingAttempts?.length || 0) + 1

    const { data: newAttempt, error: createError } = await adminClient
      .from('placement_assessment_attempts')
      .insert({
        assessment_id: assessmentId,
        student_id: user.id,
        student_name: profile?.name || 'Student',
        student_branch: profile?.department || '',
        attempt_number: attemptNumber,
        status: 'in_progress',
        responses: {},
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, attempt: newAttempt })
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'placement-assessment-start' },
    requireBody: false,
  }
)

export const PUT = withSecurity(
  async (request: NextRequest, { session, params, body }) => {
    const { adminClient, user } = session
    const assessmentId = (params as Record<string, string>)?.id

    if (!assessmentId) {
      return NextResponse.json({ error: 'Assessment ID is required.' }, { status: 400 })
    }

    const payload = (body || {}) as Record<string, any>
    const responses: Record<string, { answer: string | string[]; time_spent_seconds?: number }> = payload.responses || {}
    const attemptId: string | undefined = payload.attempt_id

    const { data: mappings } = await adminClient
      .from('placement_assessment_questions')
      .select(`
        marks,
        negative_marks,
        placement_questions (
          id,
          question_type,
          correct_answer,
          options,
          track_id,
          subject_id,
          topic_id
        )
      `)
      .eq('assessment_id', assessmentId)

    if (!mappings || !mappings.length) {
      return NextResponse.json({ error: 'Assessment has no questions.' }, { status: 400 })
    }

    const { data: assessment } = await adminClient
      .from('placement_assessments')
      .select('passing_percentage, negative_marking')
      .eq('id', assessmentId)
      .single()

    let totalMarks = 0
    let earnedMarks = 0
    let correctCount = 0
    let attemptedCount = 0
    const evaluatedResponses: Record<string, unknown> = {}

    for (const m of mappings) {
      const q = (Array.isArray(m.placement_questions) ? m.placement_questions[0] : m.placement_questions) as Record<string, any> | null
      if (!q) continue

      const qId = String(q.id)
      const qMarks = Number(m.marks || 1.0)
      const qNegative = assessment?.negative_marking ? Number(m.negative_marks || 0.0) : 0.0
      totalMarks += qMarks

      const userResponse = responses[qId]
      const submittedAnswer = userResponse?.answer

      if (submittedAnswer !== undefined && submittedAnswer !== null && submittedAnswer !== '') {
        attemptedCount++
        let isCorrect = false

        if (q.question_type === 'mcq_single' || q.question_type === 'true_false') {
          let actualCorrect = String(q.correct_answer || '').trim().toLowerCase()
          if (!actualCorrect && Array.isArray(q.options)) {
            const correctOpt = (q.options as Array<{ id: string; text: string; is_correct?: boolean }>).find(
              (o) => o.is_correct
            )
            if (correctOpt) actualCorrect = String(correctOpt.id).toLowerCase()
          }

          isCorrect = String(submittedAnswer).trim().toLowerCase() === actualCorrect
        } else if (q.question_type === 'numerical' || q.question_type === 'short_answer') {
          const expected = String(q.correct_answer || '').trim().toLowerCase()
          isCorrect = String(submittedAnswer).trim().toLowerCase() === expected
        } else {
          isCorrect = Boolean(submittedAnswer)
        }

        let marksAwarded = 0
        if (isCorrect) {
          marksAwarded = qMarks
          earnedMarks += qMarks
          correctCount++
        } else {
          marksAwarded = -qNegative
          earnedMarks -= qNegative
        }

        evaluatedResponses[qId] = {
          answer: submittedAnswer,
          is_correct: isCorrect,
          marks_awarded: marksAwarded,
          time_spent_seconds: userResponse?.time_spent_seconds || 0,
        }
      } else {
        evaluatedResponses[qId] = {
          answer: null,
          is_correct: false,
          marks_awarded: 0,
          time_spent_seconds: 0,
        }
      }
    }

    const finalScore = Math.max(0, earnedMarks)
    const percentage = totalMarks > 0 ? (finalScore / totalMarks) * 100 : 0
    const passingThreshold = Number(assessment?.passing_percentage || 50)
    const passed = percentage >= passingThreshold

    let updateQuery = adminClient
      .from('placement_assessment_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        score: finalScore,
        total_marks: totalMarks,
        percentage: Number(percentage.toFixed(2)),
        passed,
        responses: evaluatedResponses,
        status: 'evaluated',
      })

    if (attemptId) {
      updateQuery = updateQuery.eq('id', attemptId)
    } else {
      updateQuery = updateQuery
        .eq('assessment_id', assessmentId)
        .eq('student_id', user.id)
        .eq('status', 'in_progress')
    }

    const { data: updatedAttempt, error: updateError } = await updateQuery.select().maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      score: finalScore,
      total_marks: totalMarks,
      percentage: Number(percentage.toFixed(2)),
      passed,
      attempted_count: attemptedCount,
      correct_count: correctCount,
      attempt: updatedAttempt,
    })
  },
  {
    requireAuth: true,
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'placement-assessment-submit' },
    requireBody: true,
  }
)
