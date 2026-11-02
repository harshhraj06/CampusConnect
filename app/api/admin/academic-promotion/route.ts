import { NextResponse, type NextRequest } from 'next/server'
import { withSecurity } from '@/lib/api-auth'
import {
  ACADEMIC_PROMOTION_UUID_RE,
  compareAcademicSemesters,
  eligibilityReason,
  normalizeAcademicSemester,
  normalizeAcademicYear,
  parseSemesterNumber,
  parseUuidList,
  sanitizePromotionError,
  uniqueSortedSemesters,
  validateCreditRule,
  validateOverrideReason,
  validateOverrideSelection,
  type EligibilityReason,
} from '@/lib/academic-promotion'

const PAGE_SIZE = 1000
const HARD_CAP = 40_000

type BatchRow = {
  id: string
  batch_name: string
  section: string
  department: string
  academic_year: string
  semester: string
  total_students: number
}

const activeAdmin = async (session: { adminClient: any; user: { id: string } }) => {
  const { data: actor } = await session.adminClient
    .from('profiles')
    .select('role,account_status')
    .eq('id', session.user.id)
    .maybeSingle()

  return Boolean(
    actor &&
    actor.role === 'Main Admin' &&
    (actor.account_status || 'Active') === 'Active'
  )
}

async function fetchAllPages<T>(
  label: string,
  query: () => any
): Promise<{ rows: T[]; error?: string }> {
  const rows: T[] = []
  let from = 0

  for (;;) {
    const { data, error } = await query().range(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error(`[Academic promotion] ${label} failed:`, error.message)
      return { rows: [], error: `Could not load ${label}.` }
    }
    const chunk = (data || []) as T[]
    rows.push(...chunk)
    if (chunk.length < PAGE_SIZE) break
    if (rows.length >= HARD_CAP) {
      return { rows: [], error: `${label} exceeded the safe load limit. Split the academic data before promoting.` }
    }
    from += PAGE_SIZE
  }

  return { rows }
}

function targetKey(department: string, section: string) {
  return `${String(department || '').trim().toLowerCase()}::${String(section || '').trim().toLowerCase()}`
}

function resolveTargets(source: BatchRow, allBatches: BatchRow[]) {
  const nextNumber = (parseSemesterNumber(source.semester) || 0) + 1
  const matches = allBatches.filter(batch =>
    targetKey(batch.department, batch.section) === targetKey(source.department, source.section) &&
    parseSemesterNumber(batch.semester) === nextNumber
  )
  if (matches.length === 1) return { status: 'ok' as const, target: matches[0], matches }
  if (matches.length === 0) return { status: 'missing' as const, target: null, matches }
  const sameYear = matches.filter(batch =>
    normalizeAcademicYear(batch.academic_year) === normalizeAcademicYear(source.academic_year)
  )
  if (sameYear.length === 1) return { status: 'ok' as const, target: sameYear[0], matches: sameYear }
  return { status: 'ambiguous' as const, target: null, matches }
}

export const GET = withSecurity(async (request: NextRequest, { session }) => {
  if (!(await activeAdmin(session))) {
    return NextResponse.json({ error: 'An active Main Admin account is required.' }, { status: 403 })
  }

  const requestedSemester = (request.nextUrl.searchParams.get('semester') || '').trim()
  const semesterKey = normalizeAcademicSemester(requestedSemester) || requestedSemester

  const batchesResult = await fetchAllPages<BatchRow>('academic batches', () =>
    session.adminClient
      .from('attendance_batches')
      .select('id,batch_name,section,department,academic_year,semester,total_students')
      .order('id')
  )

  if (batchesResult.error) {
    return NextResponse.json({ error: batchesResult.error }, { status: 500 })
  }

  const allBatches = batchesResult.rows
  const semesters = uniqueSortedSemesters(allBatches.map(batch => String(batch.semester || '')))

  if (!requestedSemester) {
    return NextResponse.json(
      {
        batches: allBatches,
        semesters,
        students: [],
        rule: null,
        results: [],
        promotions: [],
        targetReadiness: [],
        complete: true,
        pageSize: PAGE_SIZE,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const semesterBatches = allBatches.filter(
    batch => normalizeAcademicSemester(batch.semester) === semesterKey ||
      String(batch.semester || '').trim() === requestedSemester
  )
  const batchIds = semesterBatches.map(batch => batch.id)

  if (!batchIds.length) {
    return NextResponse.json(
      {
        batches: allBatches,
        semesters,
        semesterBatches: [],
        students: [],
        rule: null,
        results: [],
        promotions: [],
        targetReadiness: [],
        complete: true,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const membershipResult: { rows: any[]; error?: string } = { rows: [] }
  for (let i = 0; i < batchIds.length; i += 100) {
    const chunk = batchIds.slice(i, i + 100)
    const page = await fetchAllPages<any>('student memberships', () =>
      session.adminClient
        .from('attendance_batch_students')
        .select('batch_id,student_id,student_name,campus_uid,roll_number,department,graduation_year')
        .in('batch_id', chunk)
        .order('student_id')
    )
    if (page.error) {
      membershipResult.error = page.error
      membershipResult.rows = []
      break
    }
    membershipResult.rows.push(...page.rows)
  }
  // Read all rules and normalize in application code so legacy labels such as
  // 'semester 5' and 'Semester  5' cannot silently hide a conflicting rule.
  // The table should remain small; range pagination still prevents truncation.
  const ruleResult = await fetchAllPages<any>('credit rules', () =>
    session.adminClient
      .from('academic_promotion_credit_rules')
      .select('id,department,semester,total_credits,minimum_credits,updated_at')
      .order('updated_at', { ascending: false })
  )
  const resultRows = await fetchAllPages<any>('academic results', () =>
    session.adminClient
      .from('student_academic_results')
      .select('batch_id,student_id,credits_earned,exam_status,result_verified,updated_at')
      .in('batch_id', batchIds)
      .order('student_id')
  )
  const promotionRows = await fetchAllPages<any>('promotion history', () =>
    session.adminClient
      .from('student_academic_promotion_log')
      .select('student_id,source_batch_id,target_batch_id,promoted_at,override_reason,note')
      .in('source_batch_id', batchIds)
      .order('promoted_at', { ascending: false })
  )

  const loadError =
    membershipResult.error ||
    ruleResult.error ||
    resultRows.error ||
    promotionRows.error

  if (loadError) {
    return NextResponse.json(
      { error: 'Could not load a complete semester roster. Promotion is blocked until the full dataset is available.' },
      { status: 500 }
    )
  }

  const memberRows = membershipResult.rows
  const matchingRules = ruleResult.rows.filter((row: any) =>
    normalizeAcademicSemester(String(row.semester || '')) === semesterKey
  )
  if (matchingRules.length > 1) {
    return NextResponse.json(
      { error: 'Multiple shared credit rule records exist for this semester. Resolve the duplicate rules before recording results or promoting students.' },
      { status: 409 }
    )
  }
  const studentIds = [...new Set(memberRows.map((row: any) => row.student_id))]
  const profiles: any[] = []

  for (let i = 0; i < studentIds.length; i += 200) {
    const chunk = studentIds.slice(i, i + 200)
    const page = await fetchAllPages<any>('student accounts', () =>
      session.adminClient
        .from('profiles')
        .select('id,full_name,role,account_status')
        .in('id', chunk)
        .order('id')
    )
    if (page.error) {
      return NextResponse.json({ error: 'Could not verify student accounts.' }, { status: 500 })
    }
    profiles.push(...page.rows)
  }

  const activeProfiles = new Map(
    profiles
      .filter(profile =>
        profile.role === 'Student' &&
        (profile.account_status || 'Active') === 'Active'
      )
      .map(profile => [profile.id, profile.full_name])
  )

  const batchById = new Map(semesterBatches.map(batch => [batch.id, batch]))
  const resultByStudent = new Map(
    resultRows.rows.map((row: any) => [`${row.batch_id}:${row.student_id}`, row])
  )
  const promotedByStudent = new Map(
    promotionRows.rows.map((row: any) => [`${row.source_batch_id}:${row.student_id}`, row])
  )
  const rule = matchingRules[0] || null

  const targetReadiness = semesterBatches.map(batch => {
    const resolved = resolveTargets(batch, allBatches)
    return {
      source_batch_id: batch.id,
      source_batch_name: batch.batch_name,
      department: batch.department,
      section: batch.section,
      academic_year: batch.academic_year,
      semester: batch.semester,
      next_semester: parseSemesterNumber(batch.semester)
        ? `Semester ${(parseSemesterNumber(batch.semester) || 0) + 1}`
        : null,
      status: resolved.status,
      target_batch_id: resolved.target?.id || null,
      target_batch_name: resolved.target?.batch_name || null,
      match_count: resolved.matches.length,
    }
  })

  const readinessByBatch = new Map(targetReadiness.map(item => [item.source_batch_id, item]))

  const membershipCountByStudent = new Map<string, number>()
  for (const row of memberRows) {
    membershipCountByStudent.set(
      row.student_id,
      (membershipCountByStudent.get(row.student_id) || 0) + 1
    )
  }

  const students = memberRows
    .filter((row: any) => activeProfiles.has(row.student_id))
    .map((row: any) => {
      const batch = batchById.get(row.batch_id)
      const result = resultByStudent.get(`${row.batch_id}:${row.student_id}`) || null
      const promotion = promotedByStudent.get(`${row.batch_id}:${row.student_id}`) || null
      const readiness = readinessByBatch.get(row.batch_id)
      let reason: EligibilityReason = eligibilityReason({
        hasResult: Boolean(result),
        creditsEarned: result?.credits_earned,
        examStatus: result?.exam_status,
        resultVerified: result?.result_verified,
        alreadyPromoted: Boolean(promotion),
        targetStatus: readiness?.status,
        rule,
      })
      if ((membershipCountByStudent.get(row.student_id) || 0) > 1) {
        reason = 'duplicate_source_membership'
      }
      return {
        ...row,
        student_name: activeProfiles.get(row.student_id) || row.student_name,
        batch_name: batch?.batch_name || '',
        section: batch?.section || '',
        batch_department: batch?.department || row.department || '',
        academic_year: batch?.academic_year || '',
        semester: semesterKey || requestedSemester,
        has_result: Boolean(result),
        already_promoted: Boolean(promotion),
        promotion_at: promotion?.promoted_at || null,
        override_reason: promotion?.override_reason || '',
        target_status: readiness?.status || 'unknown',
        eligibility: reason,
      }
    })
    .sort((a: any, b: any) => {
      const dept = String(a.batch_department).localeCompare(String(b.batch_department))
      if (dept) return dept
      const section = String(a.section).localeCompare(String(b.section))
      if (section) return section
      return String(a.student_name).localeCompare(String(b.student_name))
    })

  return NextResponse.json(
    {
      batches: allBatches,
      semesters: semesters.sort(compareAcademicSemesters),
      semesterBatches,
      students,
      rule,
      results: resultRows.rows,
      promotions: promotionRows.rows,
      targetReadiness,
      complete: true,
      rosterCount: students.length,
      pageSize: PAGE_SIZE,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}, {
  requireAuth: true,
  allowedRoles: ['Main Admin'],
  rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'academic-promotion-read' },
  requireBody: false,
})

export const POST = withSecurity(async (_request, { session, body }) => {
  if (!(await activeAdmin(session))) {
    return NextResponse.json({ error: 'An active Main Admin account is required.' }, { status: 403 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const action = typeof payload.action === 'string' ? payload.action : 'promote'
  let rpc = ''
  let args: Record<string, unknown> = {}

  if (action === 'set_rule') {
    const semester = typeof payload.semester === 'string' ? payload.semester.trim() : ''
    const normalized = normalizeAcademicSemester(semester)
    const numericCredits =
      typeof payload.total_credits === 'number' && Number.isFinite(payload.total_credits) &&
      typeof payload.minimum_credits === 'number' && Number.isFinite(payload.minimum_credits)
    const creditError = numericCredits
      ? validateCreditRule(payload.total_credits, payload.minimum_credits)
      : 'Enter valid numeric total credits and minimum credits.'
    if (!normalized || creditError) {
      return NextResponse.json(
        { error: creditError || 'Choose a valid semester.' },
        { status: 400 }
      )
    }

    rpc = 'admin_set_academic_promotion_credit_rule'
    args = {
      p_department: 'All branches',
      p_semester: normalized,
      p_total_credits: payload.total_credits,
      p_minimum_credits: payload.minimum_credits,
    }
  } else if (action === 'save_result') {
    const batch = typeof payload.batch_id === 'string' ? payload.batch_id : ''
    const student = typeof payload.student_id === 'string' ? payload.student_id : ''
    // Require a JSON number. Number('') is 0, so coercing here would turn an
    // empty credits field into a real zero-credit result.
    const credits = payload.credits_earned

    if (
      !ACADEMIC_PROMOTION_UUID_RE.test(batch) ||
      !ACADEMIC_PROMOTION_UUID_RE.test(student) ||
      typeof credits !== 'number' ||
      !Number.isFinite(credits) ||
      credits < 0 ||
      !['pass', 'fail', 'pending'].includes(String(payload.exam_status)) ||
      typeof payload.result_verified !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Enter a valid student result with a non-negative numeric credit value and a supported exam status.' },
        { status: 400 }
      )
    }

    rpc = 'admin_save_student_academic_result'
    args = {
      p_batch_id: batch,
      p_student_id: student,
      p_credits_earned: credits,
      p_exam_status: payload.exam_status,
      p_result_verified: payload.result_verified,
    }
  } else if (action === 'promote_semester') {
    const semester = typeof payload.semester === 'string' ? payload.semester.trim() : ''
    const normalized = normalizeAcademicSemester(semester)
    if (!normalized) {
      return NextResponse.json({ error: 'Choose a valid semester.' }, { status: 400 })
    }

    const studentParsed = parseUuidList(payload.student_ids, 'Student selection')
    // The SQL RPC treats an empty override array as no overrides, but an empty
    // student selection is invalid. Keep those two cases semantically distinct.
    const overrideParsed = Array.isArray(payload.override_student_ids) && payload.override_student_ids.length === 0
      ? { ids: null as string[] | null }
      : parseUuidList(payload.override_student_ids, 'Override selection')
    if (studentParsed.error || overrideParsed.error) {
      return NextResponse.json(
        { error: studentParsed.error || overrideParsed.error },
        { status: 400 }
      )
    }

    const note = typeof payload.note === 'string' ? payload.note.trim() : ''
    const overrideReason = typeof payload.override_reason === 'string'
      ? payload.override_reason.trim()
      : ''

    if (note.length > 500) {
      return NextResponse.json({ error: 'Notes must be 500 characters or fewer.' }, { status: 400 })
    }

    const overrideReasonError = validateOverrideReason(overrideParsed.ids, overrideReason)
    const overrideSubsetError = validateOverrideSelection(studentParsed.ids, overrideParsed.ids)
    if (overrideReasonError || overrideSubsetError) {
      return NextResponse.json(
        { error: overrideReasonError || overrideSubsetError },
        { status: 400 }
      )
    }

    rpc = 'admin_promote_semester_students'
    args = {
      p_semester: normalized,
      p_student_ids: studentParsed.ids,
      p_note: note,
      p_override_student_ids: overrideParsed.ids,
      p_override_reason: overrideReason,
    }
  } else {
    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 })
  }

  const { data, error } = await session.userClient.rpc(rpc, args)

  if (error) {
    console.error(`[Academic promotion] ${rpc} failed:`, error.message)
    const sanitized = sanitizePromotionError(error.message)
    return NextResponse.json({ error: sanitized.message }, { status: sanitized.status })
  }

  return NextResponse.json(
    { result: data },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}, {
  requireAuth: true,
  allowedRoles: ['Main Admin'],
  rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: 'academic-promotion-write' },
  maxBodySize: 64_000,
})
