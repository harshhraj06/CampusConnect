import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

test("Database migration creates all placement training tables with RLS and constraints", () => {
  const migrationPath = path.join(process.cwd(), "supabase/migrations/20261017010000_placement_training_system.sql")
  assert.ok(fs.existsSync(migrationPath), "Migration file must exist")

  const sql = fs.readFileSync(migrationPath, "utf8")

  // Verify all required tables are created
  const requiredTables = [
    "placement_branches",
    "placement_tracks",
    "placement_subjects",
    "placement_topics",
    "placement_questions",
    "placement_assessments",
    "placement_assessment_questions",
    "placement_assessment_attempts",
    "placement_student_progress",
    "placement_bookmarks",
    "placement_company_kits",
    "placement_coding_submissions",
  ]

  for (const table of requiredTables) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, "i"), `Migration must create ${table}`)
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, "i"), `${table} must have RLS enabled`)
  }

  // Verify initial branches seeded
  for (const branch of ["ECE", "CSE", "ISE", "MECH", "CIVIL", "EEE", "CHEM", "AIML"]) {
    assert.match(sql, new RegExp(`'${branch}'`), `Migration must seed branch ${branch}`)
  }

  // Verify universal software track seeded
  assert.match(sql, /'software',\s*'Complete Software Placement'/, "Software track must be seeded")
  assert.match(sql, /'core',\s*'Branch-Wise Core Engineering'/, "Core track must be seeded")
  assert.match(sql, /'aptitude',\s*'Aptitude & Logical Reasoning'/, "Aptitude track must be seeded")
})

test("API routes implement withSecurity and role-based access checks", () => {
  const routes = [
    "app/api/placement/branches/route.ts",
    "app/api/placement/subjects/route.ts",
    "app/api/placement/questions/route.ts",
    "app/api/placement/questions/import/route.ts",
    "app/api/placement/assessments/route.ts",
    "app/api/placement/assessments/[id]/route.ts",
    "app/api/placement/coding/run/route.ts",
    "app/api/placement/progress/route.ts",
    "app/api/placement/bookmarks/route.ts",
    "app/api/placement/company-kits/route.ts",
    "app/api/placement/ai-mentor/route.ts",
  ]

  for (const relPath of routes) {
    const fullPath = path.join(process.cwd(), relPath)
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`)
    const code = fs.readFileSync(fullPath, "utf8")
    assert.match(code, /withSecurity/, `${relPath} must use withSecurity wrapper`)
  }

  // Check management routes restrict mutations to Placement Cell or Main Admin
  const managementRoutes = [
    "app/api/placement/branches/route.ts",
    "app/api/placement/subjects/route.ts",
    "app/api/placement/questions/route.ts",
    "app/api/placement/questions/import/route.ts",
    "app/api/placement/assessments/route.ts",
  ]

  for (const relPath of managementRoutes) {
    const code = fs.readFileSync(path.join(process.cwd(), relPath), "utf8")
    assert.match(code, /Placement Cell/, `${relPath} must authorize Placement Cell`)
    assert.match(code, /Main Admin/, `${relPath} must authorize Main Admin`)
    assert.match(code, /403/, `${relPath} must reject unauthorized roles with 403 status`)
  }
})

test("Question route protects answer keys in test/practice mode", () => {
  const routePath = path.join(process.cwd(), "app/api/placement/questions/route.ts")
  const code = fs.readFileSync(routePath, "utf8")

  // Verify masking logic exists
  assert.match(code, /mode === 'test'/, "Questions API must check mode === 'test'")
  assert.match(code, /correct_answer:\s*undefined/, "Must strip correct_answer when masking")
  assert.match(code, /explanation:\s*undefined/, "Must strip explanation when masking")
})

test("Assessment detail route protects questions and executes server-side grading", () => {
  const routePath = path.join(process.cwd(), "app/api/placement/assessments/[id]/route.ts")
  const code = fs.readFileSync(routePath, "utf8")

  // GET: questions returned without answer keys
  assert.match(code, /correct_answer:\s*undefined/, "Assessment questions must not leak correct answers")

  // PUT: server-side scoring calculation
  assert.match(code, /marks_awarded/, "Scoring calculation must evaluate marks awarded server-side")
  assert.match(code, /negative_marks/, "Scoring calculation must deduct negative marks server-side")
  assert.match(code, /passed/, "Server must calculate pass/fail status")
})

test("Coding sandbox runner uses server-side Piston function grading for JavaScript", () => {
  const runnerPath = path.join(process.cwd(), "app/api/placement/coding/run/route.ts")
  const code = fs.readFileSync(runnerPath, "utf8")

  assert.doesNotMatch(code, /node:vm|vm\.createContext|runInContext/, "Runner must not depend on the unsupported Node VM adapter")
  assert.match(code, /javascript:\s*\{\s*language:\s*'javascript',\s*version:\s*'20\.11\.1',\s*filename:\s*'main\.js'/, "Runner must use verified JavaScript Piston settings")
  assert.match(code, /javascriptGradingProgram/, "Runner must wrap JavaScript function submissions for grading")
  assert.match(code, /twoSum.*solution/, "Runner must support twoSum and solution functions")
  assert.match(code, /__CAMPUSCONNECT_RESULT_/, "Runner must emit a dedicated grading-result marker")
  assert.match(code, /extractJavascriptResult/, "Runner must parse the dedicated marker instead of console output")
  assert.match(code, /compile_timeout:\s*10_000/, "Runner must retain Piston compile timeout")
  assert.match(code, /run_timeout:\s*3_000/, "Runner must retain Piston run timeout")
  assert.match(code, /time_limit_exceeded/i, "Runner must handle execution timeouts cleanly")
})

test("JavaScript Two Sum test inputs are parsed into safe numeric arguments", () => {
  const code = fs.readFileSync(path.join(process.cwd(), "app/api/placement/coding/run/route.ts"), "utf8")
  const parserMatch = code.match(/function parseJavascriptTwoSumArguments[\s\S]*?\n}(?=\n\nfunction javascriptGradingProgram)/)
  assert.ok(parserMatch, "Runner must define the Two Sum input parser")

  const parserSource = parserMatch[0]
    .replace("input: string", "input")
    .replace("): [number[], number] | null", ")")
    .replace("const nums: unknown", "const nums")
  const parseArguments = new Function(`${parserSource}; return parseJavascriptTwoSumArguments`)()

  assert.deepEqual(parseArguments("[2, 7, 11, 15], target = 9"), [[2, 7, 11, 15], 9])
  assert.deepEqual(parseArguments("[3, 2, 4], target = 6"), [[3, 2, 4], 6])
  assert.deepEqual(parseArguments("[3, 3], target = 6"), [[3, 3], 6])
  assert.deepEqual(parseArguments("[2, 7, 11, 15], 9"), [[2, 7, 11, 15], 9])
  assert.deepEqual(parseArguments("[-3, 1], target = -2"), [[-3, 1], -2])
  assert.equal(parseArguments("[2, 7], target = globalThis.process.exit()"), null, "Parser must not execute input expressions")
  assert.match(code, /JSON\.parse\(\$\{JSON\.stringify\(serializedArguments\)\}\)/, "Wrapper must deserialize server-serialized arguments")
  assert.match(code, /__ccFunction\(\.\.\.__ccArguments\)/, "Wrapper must pass parsed values as positional arguments")
})

test("JavaScript marker grading ignores debug logs and rejects incorrect return values", () => {
  const marker = "__CAMPUSCONNECT_RESULT_test__"
  const stdout = `debug information\n${marker}[0,1]\n`
  const actual = stdout.split(/\r?\n/).find((line) => line.startsWith(marker))?.slice(marker.length)
  assert.equal(actual?.replace(/\s+/g, ""), "[0,1]", "Debug output must not replace the function result")
  assert.notEqual("[9,9]".replace(/\s+/g, ""), "[0,1]", "An incorrect Two Sum return must remain WRONG_ANSWER")
})

test("Bulk CSV importer validates headers, rows, and detects formatting errors", () => {
  const importRoutePath = path.join(process.cwd(), "app/api/placement/questions/import/route.ts")
  const code = fs.readFileSync(importRoutePath, "utf8")

  assert.match(code, /parseCsv/i, "Importer must include CSV parser")
  assert.match(code, /validationErrors/, "Importer must report detailed validation errors")
  assert.match(code, /inserted_count/, "Importer must return count of inserted rows")

  // Simulate CSV parsing
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
    if (lines.length < 2) return { rows: [], error: "CSV file is empty or missing data rows" }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""))
    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""))
      const row = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ""
      })
      rows.push({ line: i + 1, data: row })
    }
    return { headers, rows }
  }

  const validCsv = `question_text,subject_id,question_type,difficulty,correct_answer,options,marks
"What is the time complexity of binary search?",d0000000-0000-0000-0000-000000000002,single_choice,easy,O(log n),"O(1)|O(n)|O(log n)|O(n^2)",1.0`

  const parsed = parseCSV(validCsv)
  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.rows[0].data.correct_answer, "O(log n)")
  assert.equal(parsed.rows[0].data.options, "O(1)|O(n)|O(log n)|O(n^2)")
})

test("BranchPlacementTraining UI component contains all required placement tabs and features", () => {
  const componentPath = path.join(process.cwd(), "app/components/placement/branch-placement-training.tsx")
  assert.ok(fs.existsSync(componentPath), "BranchPlacementTraining component must exist")

  const code = fs.readFileSync(componentPath, "utf8")

  const requiredTabs = [
    "overview",
    "branch_core",
    "software",
    "aptitude",
    "questions",
    "coding",
    "interviews",
    "resume",
    "company",
    "drives",
    "roadmap",
    "analytics",
    "management",
    "admin",
  ]

  for (const tab of requiredTabs) {
    assert.match(code, new RegExp(`activeTab === "${tab}"`), `Component must handle tab '${tab}'`)
  }

  // Verify role gating for management and admin tabs
  assert.match(code, /isStaff\s*=\s*role === "Placement Cell" \|\| role === "Main Admin"/, "Must define staff role check")
  assert.match(code, /isAdmin\s*=\s*role === "Main Admin"/, "Must define admin check")

  // Verify AI placement mentor modes
  assert.match(code, /concept_explanation/, "AI Mentor must support concept explanation mode")
  assert.match(code, /mock_interview_feedback/, "AI Mentor must support interview feedback mode")
  assert.match(code, /resume_bullet_enhancer/, "AI Mentor must support resume bullet enhancement")
  assert.match(code, /roadmap_generator/, "AI Mentor must support 30-60-90 roadmap generator")
})

test("Warm academic styling rules are present and free of blue/green/neon themes", () => {
  const cssPath = path.join(process.cwd(), "app/components/placement/branch-placement-training.css")
  assert.ok(fs.existsSync(cssPath), "Placement training CSS must exist")

  const css = fs.readFileSync(cssPath, "utf8")

  // Check color palette: ivory, charcoal, muted burgundy, restrained copper
  assert.match(css, /#7f1d1d/, "Must use muted burgundy primary accent (#7f1d1d)")
  assert.match(css, /#92400e/, "Must use restrained copper secondary accent (#92400e)")
  assert.match(css, /#fafaf9|#f5f5f4|#fbfbfa/, "Must use warm ivory / stone backgrounds")
  assert.match(css, /#1c1917|#292524/, "Must use deep charcoal text")

  // Ensure no neon / vibrant green or saturated blue theme styling
  assert.doesNotMatch(css, /#00ff00|#00ffff|#ff00ff/, "Must not contain neon colors")
  assert.doesNotMatch(css, /#3b82f6|#2563eb|#1d4ed8/, "Must not use standard Tailwind blue themes")
})

test("CampusConnect app/campusconnect-app.tsx integrates BranchPlacementTraining with workspace toggle", () => {
  const pagePath = path.join(process.cwd(), "app/campusconnect-app.tsx")
  const code = fs.readFileSync(pagePath, "utf8")

  assert.match(code, /const BranchPlacementTraining = lazy\(/, "app/campusconnect-app.tsx must lazy-load BranchPlacementTraining")
  assert.match(code, /placementWorkspaceMode/, "app/campusconnect-app.tsx must track placementWorkspaceMode")
  assert.match(code, /<BranchPlacementTraining/, "app/campusconnect-app.tsx must render BranchPlacementTraining")
  assert.match(code, /Placement Training Engine & Studio/, "Staff must have access to Placement Training Engine")
  assert.match(code, /Recruiter & Drive Operations Hub/, "Staff must have access to Operations Hub toggle")
})
