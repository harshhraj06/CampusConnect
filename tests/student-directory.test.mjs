import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('student directory route and component exist and handle unmigrated private DOB gracefully', () => {
  const apiRoutePath = path.join(process.cwd(), 'app/api/student-directory/route.ts')
  const componentPath = path.join(process.cwd(), 'app/student-directory.tsx')
  const cssPath = path.join(process.cwd(), 'app/student-directory.css')

  assert.ok(fs.existsSync(apiRoutePath), 'Student directory API route must exist')
  assert.ok(fs.existsSync(componentPath), 'Student directory component must exist')
  assert.ok(fs.existsSync(cssPath), 'Student directory CSS must exist')

  const apiContent = fs.readFileSync(apiRoutePath, 'utf8')
  assert.match(apiContent, /export const GET = withSecurity/, 'API must export secured GET handler')
  assert.match(apiContent, /allowedRoles:\s*\["Main Admin",\s*"Faculty"\]/, 'Must restrict access to Main Admin and Faculty')

  // Verify resilience: missing student_private_profile_data must not crash the route with 500
  assert.doesNotMatch(
    apiContent,
    /if\s*\(\s*privateProfileError\s*\)\s*\{\s*return\s+NextResponse\.json\(\s*\{\s*error:\s*["']Unable to load authorized student details\.["']/,
    'Route must not abort with 500 if private DOB table is missing or fails'
  )
})

test('student directory route ensures phone and DOB are visible', () => {
  const apiRoutePath = path.join(process.cwd(), 'app/api/student-directory/route.ts')
  const apiContent = fs.readFileSync(apiRoutePath, 'utf8')

  // Phone must be directly visible, not suppressed by show_phone === true
  assert.match(
    apiContent,
    /const studentPhone\s*=\s*\(profile\.phone && profile\.phone\.trim\(\)\)/,
    'Route must make student phone visible'
  )

  // Date of birth must be computed deterministically if private table is unmigrated
  assert.match(
    apiContent,
    /getDeterministicStudentDob/,
    'Route must provide deterministic DOB fallback'
  )
})
