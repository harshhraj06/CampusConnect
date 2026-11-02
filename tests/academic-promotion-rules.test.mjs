import test from 'node:test'
import assert from 'node:assert/strict'
import {
  compareAcademicSemesters,
  eligibilityReason,
  nextAcademicSemester,
  normalizeAcademicSemester,
  parseUuidList,
  sanitizePromotionError,
  uniqueSortedSemesters,
  validateCreditRule,
  validateOverrideReason,
  validateOverrideSelection,
} from '../lib/academic-promotion.ts'

test('semester normalization collapses case and spacing', () => {
  assert.equal(normalizeAcademicSemester('Semester 5'), 'Semester 5')
  assert.equal(normalizeAcademicSemester('semester 5'), 'Semester 5')
  assert.equal(normalizeAcademicSemester('Semester  5'), 'Semester 5')
  assert.equal(nextAcademicSemester('Semester 5'), 'Semester 6')
  assert.equal(normalizeAcademicSemester(''), null)
})

test('semester 10 does not sort before semester 2', () => {
  assert.deepEqual(
    uniqueSortedSemesters(['Semester 10', 'Semester 2', 'semester 1']),
    ['Semester 1', 'Semester 2', 'Semester 10']
  )
  assert.ok(compareAcademicSemesters('Semester 2', 'Semester 10') < 0)
})

test('credit rule validation', () => {
  assert.equal(validateCreditRule(24, 20), null)
  assert.match(validateCreditRule(0, 0) || '', /positive/)
  assert.match(validateCreditRule(20, 21) || '', /exceed/)
  assert.match(validateCreditRule(20, -1) || '', /greater than or equal to zero/)
})

test('eligibility reasons cover missing, failed, unverified, and credit outcomes', () => {
  const rule = { total_credits: 24, minimum_credits: 20 }
  assert.equal(eligibilityReason({ hasResult: false, rule }), 'result_missing')
  assert.equal(eligibilityReason({ hasResult: true, resultVerified: false, examStatus: 'pass', creditsEarned: 24, rule }), 'result_not_verified')
  assert.equal(eligibilityReason({ hasResult: true, resultVerified: true, examStatus: 'fail', creditsEarned: 24, rule }), 'exam_failed')
  assert.equal(eligibilityReason({ hasResult: true, resultVerified: true, examStatus: 'pass', creditsEarned: 10, rule }), 'insufficient_credits')
  assert.equal(eligibilityReason({ hasResult: true, resultVerified: true, examStatus: 'pass', creditsEarned: 24, rule }), 'eligible')
  assert.equal(eligibilityReason({ hasResult: true, resultVerified: true, examStatus: 'pass', creditsEarned: 24, rule, alreadyPromoted: true }), 'already_promoted')
})

test('null selection is distinct from an empty array', () => {
  assert.equal(parseUuidList(null, 'Student selection').ids, null)
  assert.match(parseUuidList([], 'Student selection').error || '', /empty/)
  const duplicate = parseUuidList([
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
  ], 'Student selection')
  assert.equal(duplicate.ids?.length, 1)
  assert.match(parseUuidList(['not-a-uuid'], 'Student selection').error || '', /invalid/)
})

test('override subset is required only for explicit selection', () => {
  const a = '11111111-1111-4111-8111-111111111111'
  const b = '22222222-2222-4222-8222-222222222222'
  assert.equal(validateOverrideSelection(null, [a]), null)
  assert.equal(validateOverrideSelection([a], [a]), null)
  assert.match(validateOverrideSelection([a], [b]) || '', /part of the selected/)
  assert.match(validateOverrideReason([a], 'short'), /8 characters/)
  assert.equal(validateOverrideReason([a], 'Approved after committee review'), null)
})

test('invalid source semester and duplicate IDs are rejected predictably', () => {
  assert.equal(normalizeAcademicSemester('Autumn'), null)
  assert.equal(sanitizePromotionError('No next-semester batch found').message, 'Target batch missing.')
  assert.equal(sanitizePromotionError('Multiple next-semester batches found').message, 'Target batch ambiguous.')
  assert.equal(sanitizePromotionError('relation pg_catalog.pg_class does not exist').message, 'The academic promotion request could not be completed.')
})
