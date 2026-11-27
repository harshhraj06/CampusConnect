import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('profile page contains dobSectionCard and edit functionality', () => {
  const pagePath = path.join(process.cwd(), 'app/campusconnect-app.tsx')
  assert.ok(fs.existsSync(pagePath), 'app/campusconnect-app.tsx must exist')

  const content = fs.readFileSync(pagePath, 'utf8')

  // Check DOB Section Card in ProfilePage
  assert.match(content, /dobSectionCard/, 'Profile page must include dobSectionCard')
  assert.match(content, /saveDobDirect/, 'Profile page must include saveDobDirect handler')
  assert.match(content, /dobEditing/, 'Profile page must handle dobEditing state')
  assert.match(content, /formatDisplayDate\(profile\.dateOfBirth\)/, 'Profile page must format DOB for display')

  // Check profileDetails includes Date of birth
  assert.match(content, /<small>\s*Date of birth\s*<\/small>/, 'profileDetails must include Date of birth field')

  // Check profileFromUser handles localStorage and deterministic fallback
  assert.match(content, /cc_student_dob_/, 'profileFromUser must check localStorage student DOB')
  assert.match(content, /getDeterministicStudentDob/, 'profileFromUser must fallback to deterministic DOB')
})

test('globals.css includes styles for dobSectionCard', () => {
  const cssPath = path.join(process.cwd(), 'app/globals.css')
  assert.ok(fs.existsSync(cssPath), 'app/globals.css must exist')

  const css = fs.readFileSync(cssPath, 'utf8')
  assert.match(css, /\.dobSectionCard/, 'globals.css must define .dobSectionCard')
  assert.match(css, /\.dobSectionCard::before/, 'globals.css must define top gradient accent for .dobSectionCard')
  assert.match(css, /\.dobDisplayGrid/, 'globals.css must define .dobDisplayGrid')
  assert.match(css, /\.dobVerifiedBadge/, 'globals.css must define .dobVerifiedBadge')
})

test('lib/utils DOB formatting and deterministic generation', async () => {
  const { formatDisplayDate, getDeterministicStudentDob } = await import('../lib/utils.ts')

  // Date formatting
  assert.equal(formatDisplayDate('2005-08-15'), '15 August 2005')
  assert.equal(formatDisplayDate('2006-01-01'), '1 January 2006')
  assert.equal(formatDisplayDate(''), '')
  assert.equal(formatDisplayDate(null), '')

  // Deterministic DOB generation
  const dob1 = getDeterministicStudentDob('1RN22CS001', 2026)
  const dob2 = getDeterministicStudentDob('1RN22CS001', 2026)
  assert.equal(dob1, dob2, 'Should be deterministic for same student')
  assert.match(dob1, /^2004-\d{2}-\d{2}$/, 'Birth year should be 2026 - 22 = 2004')
})

test('student directory synchronizes with student profile DOB changes', () => {
  const dirPath = path.join(process.cwd(), 'app/student-directory.tsx')
  assert.ok(fs.existsSync(dirPath), 'app/student-directory.tsx must exist')

  const content = fs.readFileSync(dirPath, 'utf8')
  assert.match(content, /cc_student_dob_updated/, 'StudentDirectory must listen for live DOB updates')
  assert.match(content, /localStorage\.getItem\(`cc_student_dob_\$\{st\.id\}`\)/, 'StudentDirectory must merge local DOB updates')
  assert.match(content, /formatDisplayDate/, 'StudentDirectory must use formatDisplayDate')

  const apiPath = path.join(process.cwd(), 'app/api/account/dob/route.ts')
  assert.ok(fs.existsSync(apiPath), 'app/api/account/dob/route.ts must exist')
  const apiContent = fs.readFileSync(apiPath, 'utf8')
  assert.match(apiContent, /student_private_profile_data/, 'API route must upsert into student_private_profile_data')
})
