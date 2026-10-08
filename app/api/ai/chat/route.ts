import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api-auth'
import { buildCampusAiContext, type CampusAiSource } from '@/lib/ai-campus-context'
import { buildRoleAiContext } from '@/lib/ai-role-context'
import { auditLog } from '@/lib/audit'

const AI_URL = process.env.AI_CHAT_COMPLETIONS_URL?.trim() || ''
const AI_API_KEY = process.env.AI_API_KEY?.trim() || ''
const AI_MODEL = process.env.AI_MODEL?.trim() || ''

type DbRow = Record<string, unknown>
type HistoryMessage = { role: 'user' | 'assistant'; content: string }
type ClaimRow = { allowed: boolean; usage_id: string | null; hourly_used: number; daily_used: number }
type ConversationRow = { id: string }
type NotesAiChunkRow = { title?: string; subject?: string; content?: string; metadata?: Record<string, unknown>; score?: number; chunk_index?: number }
type NotesAiDocumentRow = { id: string; title: string; subject: string; source_id: string; chunk_count: number }
type ProviderResponse = { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number } }

const SYSTEM_PROMPT = `...` // truncated for brevity - keep existing system prompts
const GENERAL_ASSISTANT_PROMPT = `...`
const ACADEMIC_ADVISOR_PROMPT = `...`
const ATTENDANCE_ADVISOR_PROMPT = `...`
const PERFORMANCE_COACH_PROMPT = `...`
const DAILY_BRIEFING_PROMPT = `...`
const NOTES_AI_PROMPT = `...`
const PLACEMENT_COACH_PROMPT = `...`
const RESUME_ANALYZER_PROMPT = `...`
const CAREER_ROADMAP_PROMPT = `...`
const STAFF_WORKSPACE_PROMPT = `...`

function bearerToken(request: Request): string {
  const auth = request.headers.get('authorization') || ''
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
}

async function database<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase server configuration is missing.')
  }
  const headers = new Headers(init.headers)
  headers.set('apikey', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
  headers.set('Authorization', `Bearer ${accessToken}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, { ...init, headers, cache: 'no-store' })
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${(await response.text()).slice(0, 500)}`)
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return text ? JSON.parse(text) as T : undefined as T
}

async function loadNotesAiContext(accessToken: string, query: string, sourceId: string): Promise<{ context: string; sources: CampusAiSource[] }> {
  const fullCoverageRequested = Boolean(sourceId && /\b(summar(?:y|ize|ise)|overview|entire|whole|full|module|key concepts)\b/i.test(query))
  let indexedChunkCount = 0
  let chunks = await database<NotesAiChunkRow[]>(`rpc/search_ai_document_chunks`, accessToken, { method: 'POST', body: JSON.stringify({ p_query: query, p_match_count: 8, p_source_id: sourceId || null }) })
  if (sourceId && (fullCoverageRequested || !chunks.length)) {
    const documents = await database<NotesAiDocumentRow[]>(`ai_documents?select=id,title,subject,source_id,chunk_count&source_id=eq.${encodeURIComponent(sourceId)}&status=eq.ready&order=updated_at.desc&limit=1`, accessToken)
    const document = documents?.[0]
    if (document) {
      indexedChunkCount = Number(document.chunk_count || 0)
      const fallbackChunks = await database<NotesAiChunkRow[]>(`ai_document_chunks?select=content,metadata,chunk_index&document_id=eq.${encodeURIComponent(document.id)}&order=chunk_index.asc&limit=120`, accessToken)
      chunks = fallbackChunks.map(chunk => ({ ...chunk, title: document.title, subject: document.subject }))
    }
  }
  const excerptLimit = fullCoverageRequested ? chunks.length : 10
  const excerptCharacters = fullCoverageRequested ? Math.max(80, Math.floor(6000 / Math.max(excerptLimit, 1))) : 2200
  const excerpts = chunks.slice(0, excerptLimit).map((chunk, index) => ({ resource_title: String(chunk.title || 'Indexed learning resource').slice(0, 500), subject: String(chunk.subject || '').slice(0, 300), excerpt_number: index + 1, content: String(chunk.content || '').slice(0, excerptCharacters), retrieval_score: Number(chunk.score || 0) }))
  const sourceCounts = new Map<string, number>()
  for (const excerpt of excerpts) sourceCounts.set(excerpt.resource_title, (sourceCounts.get(excerpt.resource_title) || 0) + 1)
  return { context: JSON.stringify({ retrieval: fullCoverageRequested ? 'authenticated_sequential_coverage' : 'authenticated_full_text', complete_indexed_chunk_coverage: fullCoverageRequested && indexedChunkCount > 0 && excerpts.length === indexedChunkCount, indexed_chunk_count: indexedChunkCount || undefined, included_chunk_count: excerpts.length, scope: sourceId ? 'selected_resource' : 'all_visible_indexed_resources', excerpts }, null, 2), sources: Array.from(sourceCounts.entries()).map(([title, count]) => ({ key: `indexed_document_${title}`, label: `Indexed resource: ${title}`, count })) }
}

async function authenticatedUser(accessToken: string): Promise<{ id: string }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
  if (!response.ok) throw new Error('UNAUTHORIZED')
  const user = await response.json() as { id?: string }
  if (!user.id) throw new Error('UNAUTHORIZED')
  return { id: user.id }
}

function conversationTitle(text: string): string { return text.replace(/\s+/g, ' ').trim().slice(0, 72) || 'CampusConnect AI' }

function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputRate = Math.max(0, Number(process.env.AI_INPUT_COST_PER_1M || 0) || 0)
  const outputRate = Math.max(0, Number(process.env.AI_OUTPUT_COST_PER_1M || 0) || 0)
  return inputTokens / 1_000_000 * inputRate + outputTokens / 1_000_000 * outputRate
}

export const POST = withSecurity(
  async (request, { session, body }) => {
    let usageId: string | null = null
    try {
      const accessToken = session.accessToken
      const user = session.user

      if (!AI_URL || !AI_API_KEY || !AI_MODEL) {
        return NextResponse.json({ error: 'AI is temporarily unavailable. Your CampusConnect data is still available normally.' }, { status: 503 })
      }

      const { message, conversationId, timeZone, assistantMode, sourceId } = body as {
        message?: string; conversationId?: string; timeZone?: string; assistantMode?: string; sourceId?: string
      }

      if (!message || typeof message !== 'string' || !message.trim()) {
        return NextResponse.json({ error: 'Enter a question for CampusConnect AI.' }, { status: 400 })
      }
      if (message.length > 4000) {
        return NextResponse.json({ error: 'Your question is too long. Keep it below 4,000 characters.' }, { status: 400 })
      }

      const cleanTimeZone = typeof timeZone === 'string' ? timeZone.slice(0, 80) : ''
      const cleanSourceId = typeof sourceId === 'string' && /^[0-9a-f-]{36}$/i.test(sourceId) ? sourceId : ''

      const assistantModeValue = assistantMode === 'academic_advisor' ? 'academic_advisor' :
        assistantMode === 'attendance_advisor' ? 'attendance_advisor' :
        assistantMode === 'performance_coach' ? 'performance_coach' :
        assistantMode === 'daily_briefing' ? 'daily_briefing' :
        assistantMode === 'notes_ai' ? 'notes_ai' :
        assistantMode === 'placement_coach' ? 'placement_coach' :
        assistantMode === 'resume_analyzer' ? 'resume_analyzer' :
        assistantMode === 'career_roadmap' ? 'career_roadmap' : 'general'

      const roleProfileRows = await database<Array<{ role?: string }>>(`profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`, accessToken)
      const authenticatedRole = String(roleProfileRows?.[0]?.role || 'Student')
      const isProfessionalRole = authenticatedRole !== 'Student'

      const claim = await database<ClaimRow[]>(`rpc/ai_claim_request`, accessToken, { method: 'POST', body: JSON.stringify({ p_request_type: 'chat', p_model: AI_MODEL, p_hourly_limit: 20, p_daily_limit: 100 }) })
      const claimRow = claim?.[0]
      if (!claimRow?.allowed) {
        return NextResponse.json({ error: "You've reached your current CampusConnect AI usage limit. Please try again later.", hourlyUsed: claimRow?.hourly_used ?? 20, dailyUsed: claimRow?.daily_used ?? 100 }, { status: 429 })
      }
      usageId = claimRow.usage_id

      let conversationIdValue = typeof conversationId === 'string' ? conversationId.trim() : ''
      if (conversationIdValue) {
        const conversations = await database<ConversationRow[]>(`ai_conversations?select=id&id=eq.${encodeURIComponent(conversationIdValue)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, accessToken)
        if (!conversations.length) return NextResponse.json({ error: 'AI conversation not found.' }, { status: 404 })
      } else {
        const created = await database<ConversationRow[]>(`ai_conversations?select=id`, accessToken, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ user_id: user.id, title: conversationTitle(message) }) })
        conversationIdValue = created?.[0]?.id || ''
        if (!conversationIdValue) throw new Error('Conversation creation failed.')
      }

      const historyRows = await database<Array<{ role: 'user' | 'assistant'; content: string }>>(`ai_messages?select=role,content&conversation_id=eq.${encodeURIComponent(conversationIdValue)}&order=created_at.desc&limit=10`, accessToken)
      const history: HistoryMessage[] = (historyRows || []).reverse().filter(item => item.role === 'user' || item.role === 'assistant').map(item => ({ role: item.role, content: String(item.content).slice(0, 6000) }))

      await database<DbRow[]>(`ai_messages`, accessToken, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ conversation_id: conversationIdValue, user_id: user.id, role: 'user', content: message, sources: [] }) })

      const contextQuestion = assistantModeValue === 'academic_advisor' ? [`Academic advisor comprehensive study plan.`, `Retrieve attendance, marks, results, assignments, submissions, subjects, timetable, exams and academic events when available.`, `Student question: ${message}`].join(' ') :
        assistantModeValue === 'attendance_advisor' ? [`Academic attendance advisor review.`, `Retrieve attendance records, connected college attendance and attendance session statuses when available.`, `Student question: ${message}`].join(' ') :
        assistantModeValue === 'performance_coach' ? [`Academic performance coach review.`, `Retrieve marks, semester results, subjects, assignments and submissions when available.`, `Student question: ${message}`].join(' ') :
        assistantModeValue === 'daily_briefing' ? [`Daily academic briefing for today and this week.`, `Retrieve timetable, subjects, assignments, submissions, exams, academic events, attendance, marks, results and announcements when available.`, `Student question: ${message}`].join(' ') :
        assistantModeValue === 'notes_ai' ? `Grounded indexed notes question: ${message}` :
        assistantModeValue === 'placement_coach' ? [`Placement career application drive eligibility match skills resume interview review.`, `Retrieve authenticated career profile, resume records, applications and current deterministic drive matches.`, `Student question: ${message}`].join(' ') :
        assistantModeValue === 'resume_analyzer' ? [`Resume career projects experience achievements certifications portfolio job alignment review.`, `Retrieve authenticated Resume Studio records, deterministic resume signals and current placement skill matches.`, `Student question: ${message}`].join(' ') :
        assistantModeValue === 'career_roadmap' ? [`Career placement job resume project experience certification portfolio roadmap skill plan.`, `Retrieve authenticated career profile, resume evidence, applications and current deterministic placement gaps.`, `Student question: ${message}`].join(' ') : message

      const { context: campusContext, sources: campusSources } = assistantModeValue === 'notes_ai' ? { context: '', sources: [] as CampusAiSource[] } : await buildCampusAiContext(accessToken, user.id, contextQuestion, cleanTimeZone)
      let context = campusContext
      const sources = [...campusSources]

      if (isProfessionalRole && assistantModeValue !== 'notes_ai') {
        const roleContext = await buildRoleAiContext(accessToken, user.id, authenticatedRole)
        if (roleContext.context) context = [campusContext, '', 'AUTHORIZED PROFESSIONAL ROLE DATA:', roleContext.context].join('\n')
        sources.push(...roleContext.sources)
      }

      if (assistantModeValue === 'notes_ai') {
        const notesContext = await loadNotesAiContext(accessToken, message, cleanSourceId)
        context = ['INDEXED DOCUMENT EXCERPTS:', notesContext.context].join('\n')
        sources.push(...notesContext.sources)
      }

      const providerResponse = await fetch(AI_URL, { method: 'POST', headers: { Authorization: `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: AI_MODEL, max_completion_tokens: assistantModeValue === 'notes_ai' ? 700 : 1200, include_reasoning: false, messages: [
        { role: 'system', content: assistantModeValue === 'general' ? GENERAL_ASSISTANT_PROMPT : SYSTEM_PROMPT },
        ...(assistantModeValue === 'academic_advisor' ? [{ role: 'system', content: ACADEMIC_ADVISOR_PROMPT }] : []),
        ...(assistantModeValue === 'attendance_advisor' ? [{ role: 'system', content: ATTENDANCE_ADVISOR_PROMPT }] : []),
        ...(assistantModeValue === 'performance_coach' ? [{ role: 'system', content: PERFORMANCE_COACH_PROMPT }] : []),
        ...(assistantModeValue === 'daily_briefing' ? [{ role: 'system', content: DAILY_BRIEFING_PROMPT }] : []),
        ...(assistantModeValue === 'notes_ai' ? [{ role: 'system', content: NOTES_AI_PROMPT }] : []),
        ...(assistantModeValue === 'placement_coach' ? [{ role: 'system', content: PLACEMENT_COACH_PROMPT }] : []),
        ...(assistantModeValue === 'resume_analyzer' ? [{ role: 'system', content: RESUME_ANALYZER_PROMPT }] : []),
        ...(assistantModeValue === 'career_roadmap' ? [{ role: 'system', content: CAREER_ROADMAP_PROMPT }] : []),
        ...(isProfessionalRole && assistantModeValue !== 'general' ? [{ role: 'system', content: STAFF_WORKSPACE_PROMPT }] : []),
        ...(assistantModeValue === 'notes_ai' ? history.slice(-2).map(item => ({ ...item, content: item.content.slice(0, 1200) })) : history),
        { role: 'system', content: ['AUTHORIZED CAMPUSCONNECT DATA:', `AUTHENTICATED ROLE: ${authenticatedRole}`, context, '', 'AVAILABLE SOURCE GROUPS:', JSON.stringify(sources), '', `CLIENT TIME ZONE: ${cleanTimeZone || 'not supplied'}`, `CURRENT SERVER TIME: ${new Date().toISOString()}`].join('\n') },
        { role: 'user', content: message }
      ] }) })

      if (!providerResponse.ok) {
        const detail = await providerResponse.text()
        console.error('[CampusConnect AI] provider error:', providerResponse.status, detail.slice(0, 500))
        if (providerResponse.status === 413 || providerResponse.status === 429) throw new Error('AI_PROVIDER_RATE_LIMIT')
        throw new Error('AI_PROVIDER_ERROR')
      }

      const providerData = await providerResponse.json() as ProviderResponse
      const answer = String(providerData.choices?.[0]?.message?.content ?? '').trim()
      if (!answer) throw new Error('AI_EMPTY_RESPONSE')

      const inputTokens = Number(providerData.usage?.prompt_tokens ?? providerData.usage?.input_tokens ?? 0) || 0
      const outputTokens = Number(providerData.usage?.completion_tokens ?? providerData.usage?.output_tokens ?? 0) || 0
      const estimatedCost = calculateCost(inputTokens, outputTokens)

      await database<DbRow[]>(`ai_messages`, accessToken, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ conversation_id: conversationIdValue, user_id: user.id, role: 'assistant', content: answer, sources, model: AI_MODEL, input_tokens: inputTokens, output_tokens: outputTokens }) })

      if (usageId) {
        await database<DbRow[]>(`ai_usage?id=eq.${encodeURIComponent(usageId)}`, accessToken, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ conversation_id: conversationIdValue, status: 'completed', model: AI_MODEL, input_tokens: inputTokens, output_tokens: outputTokens, estimated_cost: estimatedCost }) })
      }

      auditLog({ event_type: 'ai.chat', user_id: user.id, success: true, metadata: { assistantMode: assistantModeValue, tokens: inputTokens + outputTokens } })

      return NextResponse.json({ ok: true, conversationId: conversationIdValue, answer, sources, usage: { inputTokens, outputTokens } })
    } catch (error) {
      if (usageId && session.accessToken) {
        try {
          await database<DbRow[]>(`ai_usage?id=eq.${encodeURIComponent(usageId)}`, session.accessToken, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', error_code: 'AI_REQUEST_FAILED' }) })
        } catch { /* ignore */ }
      }
      if (error instanceof Error && error.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 })
      if (error instanceof Error && error.message === 'AI_PROVIDER_RATE_LIMIT') return NextResponse.json({ error: 'Campus AI reached the free provider token limit. Wait about 30 seconds, then try again.' }, { status: 429 })
      if (error instanceof Error && error.message === 'AI_PROVIDER_ERROR') return NextResponse.json({ error: 'The AI provider rejected the request. Check the server log for the provider status.' }, { status: 502 })
      if (error instanceof Error && error.message === 'AI_EMPTY_RESPONSE') return NextResponse.json({ error: 'The AI returned an empty response. Please try again.' }, { status: 422 })
      console.error('[CampusConnect AI] request failed:', error)
      auditLog({ event_type: 'security.suspicious_activity', user_id: session.user.id, success: false, metadata: { error: error instanceof Error ? error.message : 'unknown' } })
      return NextResponse.json({ error: 'AI is temporarily unavailable. Your CampusConnect data is still available normally.' }, { status: 503 })
    }
  },
  { requireAuth: true, rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'ai-chat' }, maxBodySize: 100 * 1024 }
)