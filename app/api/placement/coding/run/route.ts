import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api-auth'

const MAX_SOURCE_BYTES = 100_000
const MAX_STDIN_BYTES = 64_000
const PISTON_HTTP_TIMEOUT_MS = 15_000
const VHDL_HTTP_TIMEOUT_MS = 30_000
const MAX_VHDL_RESPONSE_BYTES = 140_000

type TestCase = { input: string; expected_output: string; is_hidden?: boolean }
type PersistedStatus = 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded' | 'compilation_error'
type RunStatus = PersistedStatus | 'executed'
type RunResult = {
  status: RunStatus
  test_cases_passed: number
  test_cases_total: number
  execution_time_ms: number
  output: string
  details: Array<{ case_index: number; passed: boolean; input?: string; expected?: string; actual?: string; error?: string }>
  graded: boolean
}

const PISTON_LANGUAGES = {
  javascript: { language: 'javascript', version: '20.11.1', filename: 'main.js' },
  python: { language: 'python', version: '3.12.0', filename: 'main.py' },
  java: { language: 'java', version: '15.0.2', filename: 'Main.java' },
  c: { language: 'c', version: '10.2.0', filename: 'main.c' },
  cpp: { language: 'c++', version: '10.2.0', filename: 'main.cpp' },
  verilog: { language: 'iverilog', version: '11.0.0', filename: 'main.v' },
} as const
type PistonLanguage = keyof typeof PISTON_LANGUAGES
type PistonStage = { stdout?: unknown; stderr?: unknown; output?: unknown; code?: unknown; signal?: unknown }
type PistonResponse = { run?: PistonStage; compile?: PistonStage }
type VhdlStage = { stdout: string; stderr: string; exit_code: number | null; timed_out: boolean; output_limited: boolean }
type VhdlResponse = { ok: boolean; error?: string; message?: string; compile?: VhdlStage | null; simulation?: VhdlStage | null }

function parseJavascriptTwoSumArguments(input: string): [number[], number] | null {
  const match = input.trim().match(/^(\[[\s\S]*\])\s*,\s*(?:target\s*=\s*)?(-?(?:0|[1-9]\d*)(?:\.\d+)?)\s*$/)
  if (!match) return null

  try {
    const nums: unknown = JSON.parse(match[1])
    const target = Number(match[2])
    if (!Array.isArray(nums) || !nums.every((value) => typeof value === 'number' && Number.isFinite(value)) || !Number.isFinite(target)) return null
    return [nums, target]
  } catch {
    return null
  }
}

function javascriptGradingProgram(code: string, serializedArguments: string, marker: string): string {
  return `
"use strict";
const __ccWrite = process.stdout.write.bind(process.stdout);
const __ccStringify = JSON.stringify.bind(JSON);
const __ccMarker = ${JSON.stringify(marker)};
${code}
const __ccFunction = typeof twoSum === "function" ? twoSum : typeof solution === "function" ? solution : null;
if (!__ccFunction) throw new Error("Expected a twoSum(nums, target) or solution(...) function.");
const __ccArguments = JSON.parse(${JSON.stringify(serializedArguments)});
const __ccResult = __ccFunction(...__ccArguments);
const __ccSerialized = __ccStringify(__ccResult);
__ccWrite(__ccMarker + (__ccSerialized === undefined ? "" : __ccSerialized) + "\\n");
`
}

function extractJavascriptResult(stdout: string, marker: string): string | null {
  const line = stdout.split(/\r?\n/).find((outputLine) => outputLine.startsWith(marker))
  return line === undefined ? null : line.slice(marker.length)
}

async function executeJavascript(code: string, testCases: TestCase[]): Promise<RunResult> {
  const startTime = Date.now()
  const details: RunResult['details'] = []
  let passedCount = 0
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i]
    const argumentsForTest = parseJavascriptTwoSumArguments(tc.input)
    if (!argumentsForTest) {
      details.push({ case_index: i + 1, passed: false, input: tc.is_hidden ? '<Hidden Test Case>' : tc.input, error: 'Test case input is not a valid Two Sum array and numeric target.' })
      return { status: 'runtime_error', test_cases_passed: passedCount, test_cases_total: testCases.length, execution_time_ms: Date.now() - startTime, output: 'Unable to parse the configured JavaScript test case.', details, graded: true }
    }
    const marker = `__CAMPUSCONNECT_RESULT_${Date.now()}_${Math.random().toString(36).slice(2)}__`
    const result = await executePistonRun('javascript', javascriptGradingProgram(code, JSON.stringify(argumentsForTest), marker), '')
    if (result.status) {
      details.push({ case_index: i + 1, passed: false, input: tc.is_hidden ? '<Hidden Test Case>' : tc.input, error: result.output })
      return { status: result.status, test_cases_passed: passedCount, test_cases_total: testCases.length, execution_time_ms: Date.now() - startTime, output: result.output, details, graded: true }
    }
    const actualOutput = extractJavascriptResult(result.actual, marker)
    if (actualOutput === null) {
      details.push({ case_index: i + 1, passed: false, input: tc.is_hidden ? '<Hidden Test Case>' : tc.input, error: 'The program did not return a grading result.' })
      return { status: 'runtime_error', test_cases_passed: passedCount, test_cases_total: testCases.length, execution_time_ms: Date.now() - startTime, output: result.output, details, graded: true }
    }
    const didPass = actualOutput.replace(/\s+/g, '') === tc.expected_output.replace(/\s+/g, '')
    if (didPass) passedCount++
    details.push({ case_index: i + 1, passed: didPass, input: tc.is_hidden ? '<Hidden Test Case>' : tc.input, expected: tc.is_hidden ? '<Hidden>' : tc.expected_output, actual: tc.is_hidden ? (didPass ? '<Hidden Pass>' : '<Hidden Fail>') : actualOutput })
  }
  const allPassed = passedCount === testCases.length
  return { status: allPassed ? 'accepted' : 'wrong_answer', test_cases_passed: passedCount, test_cases_total: testCases.length, execution_time_ms: Date.now() - startTime, output: allPassed ? 'All test cases passed successfully!' : `${passedCount}/${testCases.length} test cases passed.`, details, graded: true }
}

function asText(value: unknown): string { return typeof value === 'string' ? value : '' }
function stageOutput(stage: PistonStage): string { return asText(stage.output) || [asText(stage.stdout), asText(stage.stderr)].filter(Boolean).join('') }
function isPistonResponse(value: unknown): value is PistonResponse { return Boolean(value && typeof value === 'object' && (value as PistonResponse).run && typeof (value as PistonResponse).run === 'object') }
function statusForStage(stage: PistonStage, compilation = false): PersistedStatus | null {
  const signal = asText(stage.signal).toUpperCase()
  const stderr = asText(stage.stderr).toLowerCase()
  if (signal.includes('KILL') || signal.includes('TERM') || stderr.includes('timed out') || stderr.includes('time limit')) return 'time_limit_exceeded'
  if (typeof stage.code === 'number' && stage.code !== 0) return compilation ? 'compilation_error' : 'runtime_error'
  return null
}

async function executeWithPiston(language: PistonLanguage, sourceCode: string, stdin: string): Promise<PistonResponse> {
  const spec = PISTON_LANGUAGES[language]
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PISTON_HTTP_TIMEOUT_MS)
  try {
    const baseUrl = (process.env.PISTON_API_URL || 'http://127.0.0.1:2000').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/api/v2/execute`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ language: spec.language, version: spec.version, files: [{ name: spec.filename, content: sourceCode }], stdin, args: [], compile_timeout: 10_000, run_timeout: 3_000 }),
    })
    if (!response.ok) throw new Error(`Execution provider returned HTTP ${response.status}.`)
    const body: unknown = await response.json().catch(() => null)
    if (!isPistonResponse(body)) throw new Error('Execution provider returned an invalid response.')
    return body
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Execution provider timed out.')
    throw error instanceof Error ? error : new Error('Unable to contact execution provider.')
  } finally { clearTimeout(timer) }
}


type Judge0ApiJob = {
  token?: unknown
  stdout?: unknown
  stderr?: unknown
  compile_output?: unknown
  message?: unknown
  status?: { id?: unknown; description?: unknown } | null
}

const JUDGE0_LANGUAGE_IDS: Record<Exclude<PistonLanguage, 'verilog'>, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  c: 50,
  cpp: 54,
}

function parseJudge0Payload(raw: string): Judge0ApiJob | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    return value as Judge0ApiJob
  } catch {
    return null
  }
}

async function executeWithJudge0(
  language: Exclude<PistonLanguage, 'verilog'>,
  sourceCode: string,
  stdin: string,
): Promise<PistonResponse> {
  const baseUrl = (
    process.env.JUDGE0_API_URL || 'https://ce.judge0.com'
  ).trim().replace(/\/+$/, '')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const apiKey = process.env.JUDGE0_API_KEY?.trim()
  if (apiKey) headers['X-Auth-Token'] = apiKey

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PISTON_HTTP_TIMEOUT_MS)
  const startedAt = Date.now()

  try {
    const createdResponse = await fetch(
      `${baseUrl}/submissions/?base64_encoded=false&wait=false`,
      {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          source_code: sourceCode,
          language_id: JUDGE0_LANGUAGE_IDS[language],
          stdin,
          cpu_time_limit: 3,
          cpu_extra_time: 1,
          wall_time_limit: 8,
          memory_limit: 256000,
        }),
      },
    )

    const createdText = await createdResponse.text()
    if (!createdResponse.ok) {
      throw new Error(
        `Judge0 submission returned HTTP ${createdResponse.status}: ${createdText.slice(0, 200)}`,
      )
    }

    const created = parseJudge0Payload(createdText)
    if (typeof created?.token !== 'string' || !created.token) {
      throw new Error('Judge0 returned no submission token.')
    }

    const token = created.token
    const fields = 'stdout,stderr,compile_output,message,status'

    while (Date.now() - startedAt < PISTON_HTTP_TIMEOUT_MS - 500) {
      await new Promise<void>((resolve) => setTimeout(resolve, 350))

      const pollResponse = await fetch(
        `${baseUrl}/submissions/${encodeURIComponent(token)}?base64_encoded=false&fields=${fields}`,
        { headers, signal: controller.signal },
      )

      const pollText = await pollResponse.text()
      if (!pollResponse.ok) {
        throw new Error(
          `Judge0 status check returned HTTP ${pollResponse.status}: ${pollText.slice(0, 200)}`,
        )
      }

      const job = parseJudge0Payload(pollText)
      if (!job) {
        throw new Error('Judge0 returned an invalid status response.')
      }
      const statusId = job.status?.id
      if (typeof statusId !== 'number') {
        throw new Error('Judge0 returned an invalid submission status.')
      }

      // Judge0 status 1 = In Queue; 2 = Processing.
      if (statusId === 1 || statusId === 2) continue

      const stdout = asText(job.stdout)
      const stderr = asText(job.stderr)
      const compileOutput = asText(job.compile_output)
      const message = asText(job.message)
      const statusText = asText(job.status?.description)

      if (statusId === 6) {
        const diagnostics = compileOutput || message || statusText || 'Compilation failed.'
        return {
          compile: {
            stdout: '',
            stderr: diagnostics,
            output: diagnostics,
            code: 1,
            signal: null,
          },
          run: { stdout: '', stderr: '', output: '', code: 0, signal: null },
        }
      }

      // Status 5 is time limit exceeded; statuses 7–14 are execution errors.
      const timedOut = statusId === 5
      const failed = timedOut || (statusId >= 7 && statusId <= 14)
      const failureText = failed ? statusText : ''
      const fullStderr = [stderr, message, failureText].filter(Boolean).join('\n')
      const output = [stdout, fullStderr].filter(Boolean).join('\n')

      return {
        run: {
          stdout,
          stderr: fullStderr,
          output: output || (statusId === 3 ? 'Program completed with no output.' : statusText),
          code: failed ? 1 : 0,
          signal: timedOut ? 'SIGKILL' : null,
        },
      }
    }

    throw new Error('Judge0 timed out while waiting for the execution result.')
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Judge0 execution request timed out.')
    }
    throw error instanceof Error ? error : new Error('Unable to contact Judge0.')
  } finally {
    clearTimeout(timer)
  }
}

async function executePistonRun(language: PistonLanguage, sourceCode: string, stdin: string) {
  const startedAt = Date.now()
  try {
    const provider = (
      process.env.CODE_EXECUTION_PROVIDER ||
      (process.env.NODE_ENV === 'production' ? 'judge0' : 'piston')
    ).trim().toLowerCase()

    if (provider === 'judge0' && language === 'verilog' &&
        !process.env.PISTON_API_URL?.trim()) {
      throw new Error(
        'Verilog needs a separately hosted Piston API. Configure PISTON_API_URL for this language.',
      )
    }

    const response =
      provider === 'judge0' && language !== 'verilog'
        ? await executeWithJudge0(language, sourceCode, stdin)
        : await executeWithPiston(language, sourceCode, stdin)
    const compileStatus = response.compile ? statusForStage(response.compile, true) : null
    const runStatus = statusForStage(response.run!)
    const javascriptSyntaxError = language === 'javascript' && runStatus === 'runtime_error' && /syntaxerror/i.test(asText(response.run!.stderr))
    const status = compileStatus || (javascriptSyntaxError ? 'compilation_error' : runStatus)
    const output = [response.compile && stageOutput(response.compile), stageOutput(response.run!)].filter(Boolean).join('\n') || 'Program completed with no output.'
    return { status, output, actual: asText(response.run!.stdout) || stageOutput(response.run!), execution_time_ms: Date.now() - startedAt }
  } catch (error) {
    return { status: 'runtime_error' as const, output: `Execution provider error: ${error instanceof Error ? error.message : 'Unknown error.'}`, actual: '', execution_time_ms: Date.now() - startedAt }
  }
}

function isVhdlStage(value: unknown): value is VhdlStage {
  if (!value || typeof value !== 'object') return false
  const stage = value as VhdlStage
  return typeof stage.stdout === 'string' && typeof stage.stderr === 'string' && (typeof stage.exit_code === 'number' || stage.exit_code === null) && typeof stage.timed_out === 'boolean' && typeof stage.output_limited === 'boolean'
}

function isVhdlResponse(value: unknown): value is VhdlResponse {
  if (!value || typeof value !== 'object' || typeof (value as VhdlResponse).ok !== 'boolean') return false
  const response = value as VhdlResponse
  return (response.compile === undefined || response.compile === null || isVhdlStage(response.compile)) && (response.simulation === undefined || response.simulation === null || isVhdlStage(response.simulation))
}

function formatVhdlStage(label: string, stage: VhdlStage | null | undefined): string {
  if (!stage) return ''
  const output = [stage.stdout, stage.stderr].filter(Boolean).join('\n') || '(no output)'
  return `${label}:\n${output}`
}

async function executeVhdl(sourceCode: string): Promise<RunResult> {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VHDL_HTTP_TIMEOUT_MS)
  try {
    const baseUrl = (process.env.VHDL_API_URL || 'http://127.0.0.1:2001').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ source: sourceCode }) })
    const declaredLength = Number(response.headers.get('content-length') || 0)
    if (Number.isFinite(declaredLength) && declaredLength > MAX_VHDL_RESPONSE_BYTES) throw new Error('VHDL runner response exceeds the allowed size.')
    const responseText = await response.text()
    if (Buffer.byteLength(responseText, 'utf8') > MAX_VHDL_RESPONSE_BYTES) throw new Error('VHDL runner response exceeds the allowed size.')
    const payload: unknown = JSON.parse(responseText)
    if (!isVhdlResponse(payload)) throw new Error('VHDL runner returned an invalid response.')
    const output = [formatVhdlStage('Compiler diagnostics', payload.compile), formatVhdlStage('Simulator output', payload.simulation)].filter(Boolean).join('\n\n') || payload.message || 'VHDL runner completed with no output.'
    if (payload.ok) return { status: 'executed', test_cases_passed: 0, test_cases_total: 0, execution_time_ms: Date.now() - startedAt, output: `Executed — not graded\n${output}`, details: [], graded: false }
    const status: PersistedStatus = payload.error === 'compile_failed' || payload.error === 'missing_testbench' ? 'compilation_error' : payload.error?.includes('timeout') ? 'time_limit_exceeded' : 'runtime_error'
    return { status, test_cases_passed: 0, test_cases_total: 0, execution_time_ms: Date.now() - startedAt, output, details: [], graded: false }
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'VHDL runner request timed out.' : error instanceof Error ? error.message : 'Unknown VHDL runner error.'
    return { status: 'runtime_error', test_cases_passed: 0, test_cases_total: 0, execution_time_ms: Date.now() - startedAt, output: `VHDL runner error: ${message}`, details: [], graded: false }
  } finally {
    clearTimeout(timer)
  }
}

function compatibleStdinTests(template: { execution_mode?: unknown; test_cases?: unknown }): TestCase[] | null {
  if (template.execution_mode !== 'stdin' || !Array.isArray(template.test_cases) || template.test_cases.length === 0) return null
  const cases = template.test_cases.filter((test): test is TestCase => Boolean(test) && typeof test.input === 'string' && typeof test.expected_output === 'string')
  return cases.length === template.test_cases.length ? cases : null
}

async function executePiston(language: PistonLanguage, sourceCode: string, stdin: string, testCases: TestCase[] | null): Promise<RunResult> {
  if (!testCases) {
    const result = await executePistonRun(language, sourceCode, stdin)
    return { status: result.status || 'executed', test_cases_passed: 0, test_cases_total: 0, execution_time_ms: result.execution_time_ms, output: result.status ? result.output : `Executed — not graded\n${result.output}`, details: [], graded: false }
  }
  const startedAt = Date.now()
  const details: RunResult['details'] = []
  let passed = 0
  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index]
    const result = await executePistonRun(language, sourceCode, testCase.input)
    if (result.status) {
      details.push({ case_index: index + 1, passed: false, input: testCase.is_hidden ? '<Hidden Test Case>' : testCase.input, error: result.output })
      return { status: result.status, test_cases_passed: passed, test_cases_total: testCases.length, execution_time_ms: Date.now() - startedAt, output: result.output, details, graded: true }
    }
    const passedCase = result.actual.replace(/\s+/g, '') === testCase.expected_output.replace(/\s+/g, '')
    if (passedCase) passed++
    details.push({ case_index: index + 1, passed: passedCase, input: testCase.is_hidden ? '<Hidden Test Case>' : testCase.input, expected: testCase.is_hidden ? '<Hidden>' : testCase.expected_output, actual: testCase.is_hidden ? (passedCase ? '<Hidden Pass>' : '<Hidden Fail>') : result.actual })
  }
  const accepted = passed === testCases.length
  return { status: accepted ? 'accepted' : 'wrong_answer', test_cases_passed: passed, test_cases_total: testCases.length, execution_time_ms: Date.now() - startedAt, output: accepted ? 'All test cases passed successfully!' : `${passed}/${testCases.length} test cases passed.`, details, graded: true }
}

export const POST = withSecurity(async (request: NextRequest, { session, body }) => {
  const { adminClient, user } = session
  const payload = (body || {}) as Record<string, unknown>
  if (!payload.source_code || !payload.question_id) return NextResponse.json({ error: 'source_code and question_id are required.' }, { status: 400 })
  const questionId = String(payload.question_id)
  const language = typeof payload.language === 'string' ? payload.language : 'javascript'
  const sourceCode = String(payload.source_code)
  const stdin = typeof payload.stdin === 'string' ? payload.stdin : ''
  const isSubmit = Boolean(payload.is_submit)
  if (Buffer.byteLength(sourceCode, 'utf8') > MAX_SOURCE_BYTES) return NextResponse.json({ error: 'Source code exceeds the 100 KB limit.' }, { status: 413 })
  if (Buffer.byteLength(stdin, 'utf8') > MAX_STDIN_BYTES) return NextResponse.json({ error: 'Standard input exceeds the 64 KB limit.' }, { status: 413 })
  if (language !== 'vhdl' && !(language in PISTON_LANGUAGES)) return NextResponse.json({ error: `Execution is not supported for ${language}. This language is available for AI assistance only.` }, { status: 400 })
  const { data: question, error: qError } = await adminClient.from('placement_questions').select('id, title, coding_template').eq('id', questionId).single()
  if (qError || !question) return NextResponse.json({ error: 'Coding question not found.' }, { status: 404 })
  const codingTemplate = (question.coding_template || {}) as { execution_mode?: unknown; test_cases?: TestCase[] }
  const runResult = language === 'javascript'
    ? await executeJavascript(sourceCode, codingTemplate.test_cases || [{ input: '[2, 7, 11, 15], 9', expected_output: '[0, 1]', is_hidden: false }, { input: '[3, 2, 4], 6', expected_output: '[1, 2]', is_hidden: false }])
    : language === 'vhdl'
      ? await executeVhdl(sourceCode)
    : await executePiston(language as PistonLanguage, sourceCode, stdin, language === 'verilog' ? null : compatibleStdinTests(codingTemplate))
  // The existing schema has no status for an ungraded execution, so do not persist it.
  if (isSubmit && runResult.graded) {
    await adminClient.from('placement_coding_submissions').insert({ student_id: user.id, question_id: questionId, language, source_code: sourceCode, status: runResult.status as PersistedStatus, test_cases_passed: runResult.test_cases_passed, test_cases_total: runResult.test_cases_total, execution_time_ms: runResult.execution_time_ms, output: runResult.output })
    if (runResult.status === 'accepted') {
      const { data: existingProgress } = await adminClient.from('placement_student_progress').select('id, coding_problems_solved').eq('student_id', user.id).eq('track_id', 'software').maybeSingle()
      if (existingProgress) await adminClient.from('placement_student_progress').update({ coding_problems_solved: (existingProgress.coding_problems_solved || 0) + 1, last_practiced_at: new Date().toISOString() }).eq('id', existingProgress.id)
      else await adminClient.from('placement_student_progress').insert({ student_id: user.id, track_id: 'software', coding_problems_solved: 1, last_practiced_at: new Date().toISOString() })
    }
  }
  return NextResponse.json({ ok: true, result: runResult })
}, { requireAuth: true, rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'placement-coding-run' }, requireBody: true })
