export const ACADEMIC_PROMOTION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const EXAM_STATUSES = ['pass', 'fail', 'pending'] as const
export type ExamStatus = (typeof EXAM_STATUSES)[number]

export type EligibilityReason =
  | 'eligible'
  | 'insufficient_credits'
  | 'result_not_verified'
  | 'exam_failed'
  | 'result_missing'
  | 'already_promoted'
  | 'target_batch_missing'
  | 'target_batch_ambiguous'
  | 'manual_override'
  | 'credit_rule_missing'
  | 'credits_exceed_total'
  | 'duplicate_source_membership'

export type CreditRuleInput = {
  totalCredits: number
  minimumCredits: number
}

export function parseSemesterNumber(value: string | null | undefined): number | null {
  const match = String(value || '').match(/(\d+)/)
  if (!match) return null
  const n = Number(match[1])
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

export function normalizeAcademicSemester(value: string | null | undefined): string | null {
  const n = parseSemesterNumber(value)
  return n == null ? null : `Semester ${n}`
}

export function nextAcademicSemester(value: string | null | undefined): string | null {
  const n = parseSemesterNumber(value)
  return n == null ? null : `Semester ${n + 1}`
}

export function compareAcademicSemesters(a: string, b: string): number {
  const an = parseSemesterNumber(a)
  const bn = parseSemesterNumber(b)
  if (an != null && bn != null && an !== bn) return an - bn
  return String(a).localeCompare(String(b))
}

export function uniqueSortedSemesters(values: Iterable<string>): string[] {
  const seen = new Set<string>()
  for (const raw of values) {
    const trimmed = String(raw || '').trim()
    if (!trimmed) continue
    seen.add(normalizeAcademicSemester(trimmed) || trimmed)
  }
  return [...seen].sort(compareAcademicSemesters)
}

function parseNumericInput(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return Number.NaN
}

export function validateCreditRule(total: unknown, minimum: unknown): string | null {
  const totalCredits = parseNumericInput(total)
  const minimumCredits = parseNumericInput(minimum)
  if (!Number.isFinite(totalCredits) || !Number.isFinite(minimumCredits)) {
    return 'Enter valid total credits and a minimum between zero and total credits.'
  }
  if (totalCredits <= 0) return 'Total credits must be a positive number.'
  if (minimumCredits < 0) return 'Minimum credits must be greater than or equal to zero.'
  if (minimumCredits > totalCredits) return 'Minimum credits must not exceed total credits.'
  return null
}

export function validateStudentResult(
  credits: unknown,
  examStatus: unknown,
  totalCredits: number | null | undefined
): string | null {
  const earned = parseNumericInput(credits)
  if (!Number.isFinite(earned) || earned < 0) return 'Credits must be a recorded non-negative number.'
  if (!EXAM_STATUSES.includes(String(examStatus) as ExamStatus)) {
    return 'Exam status must be Pass, Fail, or Pending.'
  }
  if (totalCredits == null || !Number.isFinite(Number(totalCredits))) {
    return 'Credit rule missing for this semester.'
  }
  if (earned > Number(totalCredits)) return 'Credits cannot exceed the semester total credits.'
  return null
}

export function eligibilityReason(input: {
  hasResult: boolean
  creditsEarned?: number | null
  examStatus?: string | null
  resultVerified?: boolean | null
  alreadyPromoted?: boolean
  targetStatus?: 'ok' | 'missing' | 'ambiguous' | 'unknown'
  rule?: { total_credits: number; minimum_credits: number } | null
  overridden?: boolean
}): EligibilityReason {
  if (input.alreadyPromoted) return 'already_promoted'
  if (input.targetStatus === 'missing') return 'target_batch_missing'
  if (input.targetStatus === 'ambiguous') return 'target_batch_ambiguous'
  if (!input.rule) return 'credit_rule_missing'
  if (!input.hasResult) return 'result_missing'
  if (input.overridden) return 'manual_override'
  if (!input.resultVerified) return 'result_not_verified'
  if (input.examStatus === 'fail') return 'exam_failed'
  if (input.examStatus !== 'pass') return 'result_not_verified'
  const credits = Number(input.creditsEarned)
  if (!Number.isFinite(credits)) return 'result_missing'
  if (credits > Number(input.rule.total_credits)) return 'credits_exceed_total'
  if (credits < Number(input.rule.minimum_credits)) return 'insufficient_credits'
  return 'eligible'
}

export function isNormallyEligible(reason: EligibilityReason): boolean {
  return reason === 'eligible'
}

export function parseUuidList(
  value: unknown,
  label: string
): { ids: string[] | null; error?: string } {
  if (value === undefined || value === null) return { ids: null }
  if (!Array.isArray(value)) {
    return { ids: null, error: `${label} must be an array of student IDs, or omitted.` }
  }
  if (value.length === 0) {
    return {
      ids: null,
      error: `${label} is empty. Omit the field to include all eligible students, or provide 1–500 IDs.`,
    }
  }
  if (value.length > 500) {
    return { ids: null, error: `${label} must contain 1–500 valid student IDs.` }
  }
  if (!value.every(id => typeof id === 'string' && ACADEMIC_PROMOTION_UUID_RE.test(id))) {
    return { ids: null, error: `${label} contains an invalid student ID.` }
  }
  const unique = [...new Set(value as string[])]
  return { ids: unique }
}

export function validateOverrideSelection(
  studentIds: string[] | null,
  overrideIds: string[] | null
): string | null {
  if (!overrideIds?.length) return null
  if (studentIds && overrideIds.some(id => !studentIds.includes(id))) {
    return 'Override students must be part of the selected student list.'
  }
  return null
}

export function validateOverrideReason(overrideIds: string[] | null, reason: string): string | null {
  if (!overrideIds?.length) return null
  if (reason.trim().length < 8) {
    return 'Admin override requires a reason of at least 8 characters.'
  }
  if (reason.trim().length > 500) return 'Notes must be 500 characters or fewer.'
  return null
}

const CLIENT_SAFE_RPC_ERRORS: Array<{ pattern: RegExp; message: string; status: number }> = [
  { pattern: /authentication required/i, message: 'Authentication required.', status: 401 },
  { pattern: /only main admin/i, message: 'Unauthorized action.', status: 403 },
  { pattern: /active main admin/i, message: 'Unauthorized action.', status: 403 },
  { pattern: /no shared credit rule|configure the shared credit rule|credit rule/i, message: 'Credit rule missing for this semester.', status: 400 },
  { pattern: /result is unverified|not verified|unverified/i, message: 'Student result is unverified.', status: 400 },
  { pattern: /already been promoted|already a member of the target/i, message: 'Student already promoted.', status: 409 },
  { pattern: /no next-semester batch|target batch missing|no target batch/i, message: 'Target batch missing.', status: 409 },
  { pattern: /multiple next-semester|ambiguous/i, message: 'Target batch ambiguous.', status: 409 },
  { pattern: /override/i, message: 'Invalid override request.', status: 400 },
  { pattern: /invalid academic result|credits earned cannot exceed|invalid credit/i, message: 'Invalid credit value.', status: 400 },
  { pattern: /choose a semester|semester must contain/i, message: 'Invalid source semester.', status: 400 },
  { pattern: /empty student selection|select at least one student/i, message: 'Student selection is empty.', status: 400 },
  { pattern: /contains duplicate student IDs/i, message: 'A student was selected more than once. Clear the duplicate selection and try again.', status: 400 },
  { pattern: /not active members/i, message: 'One or more selected students are not active in this semester.', status: 400 },
  { pattern: /duplicate source memberships|belongs to multiple source batches/i, message: 'A student belongs to multiple source batches in this semester. Resolve the duplicate membership before promoting.', status: 409 },
  { pattern: /not an active member|not active members/i, message: 'One or more selected students are not active members of this semester.', status: 400 },
  { pattern: /empty student selection/i, message: 'Select students or choose all eligible students.', status: 400 },
  { pattern: /numeric semester number/i, message: 'Invalid semester. Choose a valid semester from the list.', status: 400 },
  { pattern: /conflicting academic credit rules/i, message: 'Conflicting credit rules exist for this semester.', status: 409 },
]

export function sanitizePromotionError(raw: string | null | undefined): { message: string; status: number } {
  const text = String(raw || '')
  for (const entry of CLIENT_SAFE_RPC_ERRORS) {
    if (entry.pattern.test(text)) return { message: entry.message, status: entry.status }
  }
  return { message: 'The academic promotion request could not be completed.', status: 400 }
}

export function normalizeAcademicYear(value: string | null | undefined): string {
  return String(value || '').replace(/\s+/g, '').toLowerCase()
}
