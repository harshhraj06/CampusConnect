import { NextRequest, NextResponse } from 'next/server'
import { withSecurity, getUserRole } from '@/lib/api-auth'

type RawImportRow = {
  title?: string
  question_text?: string
  question_type?: string
  branch_id?: string
  track_id?: string
  subject_id?: string
  topic_id?: string
  difficulty?: string
  options?: unknown
  correct_answer?: string
  explanation?: string
  marks?: number | string
  negative_marks?: number | string
  tags?: unknown
  status?: string
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let cur = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim())
        cur = ''
      } else {
        cur += char
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''))
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
}

export const POST = withSecurity(
  async (request: NextRequest, { session, body }) => {
    const { adminClient, user } = session
    const role = await getUserRole(adminClient, user.id)

    if (!role || !['Placement Cell', 'Main Admin'].includes(role)) {
      return NextResponse.json({ error: 'Access denied. Placement Officer or Admin role required.' }, { status: 403 })
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()

    const authorName = profile?.name || 'Placement Officer'

    let rawItems: RawImportRow[] = []

    if (Array.isArray(body)) {
      rawItems = body as RawImportRow[]
    } else if (body && typeof body === 'object' && Array.isArray((body as Record<string, any>).questions)) {
      rawItems = (body as Record<string, any>).questions as RawImportRow[]
    } else if (typeof body === 'string') {
      rawItems = parseCsv(body)
    }

    if (!rawItems.length) {
      return NextResponse.json({ error: 'No questions found in import payload.' }, { status: 400 })
    }

    const VALID_TYPES = [
      'mcq_single',
      'mcq_multiple',
      'true_false',
      'short_answer',
      'numerical',
      'coding',
      'interview',
      'scenario',
      'subjective',
      'collection',
    ]

    const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

    const validPayloads: Record<string, unknown>[] = []
    const validationErrors: Array<{ row: number; error: string }> = []

    for (let i = 0; i < rawItems.length; i++) {
      const row = rawItems[i]
      const rowNum = i + 1

      if (!row.title || !String(row.title).trim()) {
        validationErrors.push({ row: rowNum, error: 'Missing required field: title' })
        continue
      }

      if (!row.question_text || !String(row.question_text).trim()) {
        validationErrors.push({ row: rowNum, error: 'Missing required field: question_text' })
        continue
      }

      const qType = String(row.question_type || 'mcq_single').toLowerCase().trim()
      if (!VALID_TYPES.includes(qType)) {
        validationErrors.push({ row: rowNum, error: `Invalid question_type: ${qType}` })
        continue
      }

      const trackId = String(row.track_id || 'core').toLowerCase().trim()
      const difficulty = String(row.difficulty || 'intermediate').toLowerCase().trim()
      if (!VALID_DIFFICULTIES.includes(difficulty)) {
        validationErrors.push({ row: rowNum, error: `Invalid difficulty: ${difficulty}` })
        continue
      }

      let optionsList: Array<{ id: string; text: string; is_correct: boolean; explanation?: string }> = []
      if (Array.isArray(row.options)) {
        optionsList = row.options
      } else if (typeof row.options === 'string' && row.options.trim()) {
        try {
          const parsed = JSON.parse(row.options)
          if (Array.isArray(parsed)) optionsList = parsed
        } catch {
          const split = row.options.split('|').map((s) => s.trim()).filter(Boolean)
          const correctKey = String(row.correct_answer || '').trim()
          optionsList = split.map((opt, idx) => {
            const optId = String.fromCharCode(97 + idx)
            return {
              id: optId,
              text: opt,
              is_correct: optId === correctKey || opt === correctKey,
            }
          })
        }
      }

      let tagsArray: string[] = []
      if (Array.isArray(row.tags)) {
        tagsArray = row.tags.map(String)
      } else if (typeof row.tags === 'string' && row.tags.trim()) {
        tagsArray = row.tags.split(',').map((t) => t.trim()).filter(Boolean)
      }

      validPayloads.push({
        title: String(row.title).trim(),
        question_text: String(row.question_text).trim(),
        question_type: qType,
        branch_id: row.branch_id ? String(row.branch_id).trim().toUpperCase() : null,
        track_id: trackId,
        subject_id: row.subject_id || null,
        topic_id: row.topic_id || null,
        difficulty,
        options: optionsList,
        correct_answer: String(row.correct_answer || '').trim(),
        explanation: String(row.explanation || '').trim(),
        marks: Number(row.marks || 1.0),
        negative_marks: Number(row.negative_marks || 0.0),
        tags: tagsArray,
        status: row.status || 'published',
        author_id: user.id,
        author_name: authorName,
      })
    }

    if (validPayloads.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid rows found in import data.',
          validationErrors,
        },
        { status: 400 }
      )
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('placement_questions')
      .insert(validPayloads)
      .select('id')

    if (insertError) {
      return NextResponse.json({ error: insertError.message, validationErrors }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      total_rows: rawItems.length,
      inserted_count: inserted?.length || 0,
      validationErrors,
    })
  },
  {
    requireAuth: true,
    allowedRoles: ['Placement Cell', 'Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: 'placement-questions-import' },
    maxBodySize: 10 * 1024 * 1024,
    requireBody: true,
  }
)
