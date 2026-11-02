import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('dossier API and frontend files exist and export required handlers', () => {
  const apiRoutePath = path.join(process.cwd(), 'app/api/admin/dossier/route.ts')
  const componentPath = path.join(process.cwd(), 'app/campus-dossier-module.tsx')
  const cssPath = path.join(process.cwd(), 'app/campus-dossier-module.css')
  const standalonePagePath = path.join(process.cwd(), 'app/admin/dossier/page.tsx')

  assert.ok(fs.existsSync(apiRoutePath), 'Dossier API route must exist')
  assert.ok(fs.existsSync(componentPath), 'Dossier React component must exist')
  assert.ok(fs.existsSync(cssPath), 'Dossier CSS stylesheet must exist')
  assert.ok(fs.existsSync(standalonePagePath), 'Standalone admin/dossier page must exist')

  const apiContent = fs.readFileSync(apiRoutePath, 'utf8')
  assert.match(apiContent, /export const GET = withSecurity/, 'API must export secured GET handler')
  assert.match(apiContent, /export const PATCH = withSecurity/, 'API must export secured PATCH handler')
  assert.match(apiContent, /admin_modify_profile/, 'API must log audit trail for profile modifications')
})

test('dossier UI includes official RNSIT branding, CampusConnect logo, and institutional header', () => {
  const componentPath = path.join(process.cwd(), 'app/campus-dossier-module.tsx')
  const content = fs.readFileSync(componentPath, 'utf8')

  assert.match(content, /rnsit-logo\.png/, 'Component must include official RNSIT logo')
  assert.match(content, /campusconnect-logo\.png/, 'Component must include official CampusConnect logo')
  assert.match(content, /R\.N\.S\. INSTITUTE OF TECHNOLOGY/, 'Component must feature R.N.S. Institute of Technology header')
  assert.match(content, /window\.print\(\)/, 'Component must provide print/download functionality')
  assert.match(content, /Download Official Dossier \(PDF\)/, 'Download button must be visible for admin')
})

test('dossier module is integrated in main admin workspace navigation', () => {
  const modulesPath = path.join(process.cwd(), 'app/campus-modules.tsx')
  const content = fs.readFileSync(modulesPath, 'utf8')

  assert.match(content, /import CampusDossierModule from "\.\/campus-dossier-module"/, 'Must import CampusDossierModule')
  assert.match(content, /"Campus Dossier & Records"/, 'Must have Campus Dossier in admin navigation')
  assert.match(content, /id="admin-panel-dossier"/, 'Must render admin-panel-dossier')
})

test('printable stylesheet has official @media print styles configured', () => {
  const cssPath = path.join(process.cwd(), 'app/campus-dossier-module.css')
  const content = fs.readFileSync(cssPath, 'utf8')

  assert.match(content, /@media print/, 'Must contain @media print rules')
  assert.match(content, /\.dossierOfficialHeader/, 'Must style official header')
  assert.match(content, /\.dossierSignatureBlock/, 'Must include signature block for certification')
})

test('student dossier hides Employee ID and faculty working hours while displaying photo and USN', () => {
  const componentPath = path.join(process.cwd(), 'app/campus-dossier-module.tsx')
  const content = fs.readFileSync(componentPath, 'utf8')

  // Separation of concerns: Student vs Faculty
  assert.match(content, /formData\.role === "Student"/, 'Must condition form fields based on Student role')
  assert.match(content, /formData\.role !== "Student"/, 'Must only render Employee ID for non-student roles')
  assert.match(content, /isStudent && \(activeSection === "all" || activeSection === "results"\)/, 'Must restrict student results to student profiles')
  assert.match(content, /!isStudent && \(activeSection === "all" || activeSection === "workload"\)/, 'Must hide faculty workload when viewing students')

  // Profile picture / Photo management
  assert.match(content, /dossierPassportPhoto/, 'Must render candidate passport photo frame')
  assert.match(content, /dossierPhotoEditorCard/, 'Must render photo management editor')
  assert.match(content, /handlePhotoFileChange/, 'Must provide photo file upload handler')
  assert.match(content, /compressAndEncodeImage/, 'Must provide client-side image compression for passport photos')

  // Backend avatar support
  const apiRoutePath = path.join(process.cwd(), 'app/api/admin/dossier/route.ts')
  const apiContent = fs.readFileSync(apiRoutePath, 'utf8')
  assert.match(apiContent, /payload\.avatar_url/, 'PATCH route must support avatar_url updates')
  assert.match(apiContent, /updates\.avatar_url =/, 'PATCH route must assign avatar_url to profile updates')
})

test('student dossier displays course-wise attendance ledger and watertight print rules', () => {
  const componentPath = path.join(process.cwd(), 'app/campus-dossier-module.tsx')
  const content = fs.readFileSync(componentPath, 'utf8')

  // Student Attendance Section
  assert.match(content, /dossierAttendanceContainer/, 'Must render student attendance container')
  assert.match(content, /dossierProgressBar/, 'Must render attendance progress bar')
  assert.match(content, /overallAttendancePct/, 'Must compute overall attendance percentage')
  assert.match(content, /activeSection === "attendance"/, 'Must provide dedicated attendance tab filter')

  // Backend Merged Attendance Sources
  const apiRoutePath = path.join(process.cwd(), 'app/api/admin/dossier/route.ts')
  const apiContent = fs.readFileSync(apiRoutePath, 'utf8')
  assert.match(apiContent, /college_attendance/, 'API must query college_attendance')
  assert.match(apiContent, /attendance_records/, 'API must query attendance_records')
  assert.match(apiContent, /mergedAttendance/, 'API must merge attendance records')

  // Print Visibility Rules (Blank page fix)
  const cssPath = path.join(process.cwd(), 'app/campus-dossier-module.css')
  const cssContent = fs.readFileSync(cssPath, 'utf8')
  assert.match(cssContent, /\.dossierOfficialSheet\s*,\s*\.dossierOfficialSheet \*\s*{\s*visibility:\s*visible !important;/s, 'Dossier sheet must be forced visible in print')
  assert.match(cssContent, /position:\s*absolute !important;\s*top:\s*0 !important;/s, 'Dossier sheet must position at top of print canvas')

  const globalsPath = path.join(process.cwd(), 'app/globals.css')
  const globalsContent = fs.readFileSync(globalsPath, 'utf8')
  assert.match(globalsContent, /\.dossierOfficialSheet/, 'globals.css print rule must whitelist dossierOfficialSheet')
})

test('dossier print engine guarantees strict single-page isolation and executive table footers', () => {
  const componentPath = path.join(process.cwd(), 'app/campus-dossier-module.tsx')
  const componentContent = fs.readFileSync(componentPath, 'utf8')

  // Isolated host and clone mechanism
  assert.match(componentContent, /cc-dossier-print-host/, 'Must mount isolated print host directly on document.body')
  assert.match(componentContent, /cc-printing-dossier-active/, 'Must set cc-printing-dossier-active class on body during print')
  assert.match(componentContent, /window\.addEventListener\("afterprint"/, 'Must clean up print host on afterprint')

  // Executive summary footers
  assert.match(componentContent, /dossierTableFoot/, 'Must render executive table footers for aggregate stats')
  assert.match(componentContent, /Aggregate Compliance:/, 'Must display aggregate attendance compliance footer')
  assert.match(componentContent, /Cumulative Progression:/, 'Must display cumulative academic progression footer')

  // CSS Print Isolation Rules
  const cssPath = path.join(process.cwd(), 'app/campus-dossier-module.css')
  const cssContent = fs.readFileSync(cssPath, 'utf8')
  assert.match(cssContent, /body\.cc-printing-dossier-active > \*:not\(#cc-dossier-print-host\)/, 'CSS must purge exterior document elements during print')
  assert.match(cssContent, /#cc-dossier-print-host/, 'CSS must style isolated print host')
  assert.match(cssContent, /\.dossierTableFoot/, 'CSS must style print table footers')

  // Globals whitelist
  const globalsPath = path.join(process.cwd(), 'app/globals.css')
  const globalsContent = fs.readFileSync(globalsPath, 'utf8')
  assert.match(globalsContent, /#cc-dossier-print-host/, 'globals.css must whitelist #cc-dossier-print-host')
})
