import { NextResponse, type NextRequest } from 'next/server'
import { withSecurity } from '@/lib/api-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const getActor = async (session: { adminClient: any; user: { id: string } }) => {
  const { data, error } = await session.adminClient
    .from('profiles')
    .select('id,full_name,role,account_status,campus_uid,department')
    .eq('id', session.user.id)
    .maybeSingle()
  if (error || !data || (data.account_status || 'Active') !== 'Active') return null
  return data
}

export const GET = withSecurity(async (request: NextRequest, { session }) => {
  const actor = await getActor(session)
  if (!actor) return NextResponse.json({ error: 'An active account is required.' }, { status: 403 })

  const isInboxExplicit = request.nextUrl.searchParams.get('inbox') === 'true'

  // If student or explicit inbox mode, return received messages
  if (actor.role === 'Student' || isInboxExplicit) {
    let inboxResult: any = await session.adminClient
      .from('student_personal_announcements')
      .select('id,sender_id,sender_role,student_id,title,message,attachment_url,attachment_name,attachment_type,attachment_size,created_at,read_at,recipient_deleted_at')
      .eq('student_id', actor.id)
      .is('archived_at', null)
      .is('recipient_deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200)

    // Fallback if recipient_deleted_at column is not yet present in database
    if (inboxResult.error && inboxResult.error.message?.includes('recipient_deleted_at')) {
      inboxResult = await session.adminClient
        .from('student_personal_announcements')
        .select('id,sender_id,sender_role,student_id,title,message,attachment_url,attachment_name,attachment_type,attachment_size,created_at,read_at')
        .eq('student_id', actor.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(200)
    }

    const { data, error } = inboxResult

    if (error) {
      console.error('[Personal announcements] Inbox failed:', error.message)
      return NextResponse.json({ error: 'Could not load your personal announcements.' }, { status: 500 })
    }

    const senderIds = [...new Set((data || []).map((row: any) => row.sender_id))]
    let senders: any[] = []
    if (senderIds.length) {
      const result = await session.adminClient.from('profiles').select('id,full_name,role,campus_uid').in('id', senderIds)
      senders = result.data || []
    }
    const senderMap = new Map(senders.map((s: any) => [s.id, s]))

    return NextResponse.json({
      mode: 'inbox',
      actor: { id: actor.id, role: actor.role, full_name: actor.full_name, campus_uid: actor.campus_uid },
      announcements: (data || []).map((row: any) => {
        const s = senderMap.get(row.sender_id)
        return {
          ...row,
          sender_name: s?.full_name || 'CampusConnect Staff',
          sender_cc_id: s?.campus_uid || null,
        }
      }),
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Senders: Main Admin, Faculty, Coordinators
  if (!['Main Admin', 'Faculty', 'Coordinator', 'Placement Cell'].includes(actor.role)) {
    // If not staff, default to inbox
    return NextResponse.redirect(new URL(`${request.nextUrl.pathname}?inbox=true`, request.url))
  }

  const [{ data: allUsers, error: usersError }, { data: sent, error: sentError }, { data: myInbox }] = await Promise.all([
    session.adminClient
      .from('profiles')
      .select('id,full_name,role,department,campus_uid,usn,employee_id,email,account_status')
      .order('full_name')
      .limit(2000),
    session.adminClient
      .from('student_personal_announcements')
      .select('id,student_id,sender_id,sender_role,title,message,attachment_url,attachment_name,attachment_type,attachment_size,created_at,read_at')
      .eq('sender_id', actor.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
    session.adminClient
      .from('student_personal_announcements')
      .select('id,student_id,sender_id,sender_role,title,message,attachment_url,attachment_name,attachment_type,attachment_size,created_at,read_at')
      .eq('student_id', actor.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (usersError || sentError) {
    console.error('[Personal announcements] Sender data failed:', usersError?.message || sentError?.message)
    return NextResponse.json({ error: 'Could not load users or sent messages.' }, { status: 500 })
  }

  const activeUsers = (allUsers || []).filter((s: any) => (s.account_status || 'Active') === 'Active')

  return NextResponse.json({
    mode: 'sender',
    actor: { id: actor.id, role: actor.role, full_name: actor.full_name, campus_uid: actor.campus_uid },
    users: activeUsers,
    students: activeUsers, // Backward compatibility
    announcements: sent || [],
    inboxAnnouncements: myInbox || [],
  }, { headers: { 'Cache-Control': 'no-store' } })
}, {
  requireAuth: true,
  allowedRoles: ['Student', 'Faculty', 'Coordinator', 'Volunteer', 'Placement Cell', 'Main Admin'],
  rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'personal-announcements-read' },
  requireBody: false,
})

export const POST = withSecurity(async (_request, { session, body }) => {
  const actor = await getActor(session)
  if (!actor) return NextResponse.json({ error: 'An active account is required.' }, { status: 403 })
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>

  // Action: Mark Read
  if (payload.action === 'mark_read') {
    const announcementId = typeof payload.announcement_id === 'string' ? payload.announcement_id : ''
    if (!UUID_RE.test(announcementId)) return NextResponse.json({ error: 'Invalid announcement ID.' }, { status: 400 })

    const { data, error } = await session.adminClient
      .from('student_personal_announcements')
      .update({ read_at: new Date().toISOString() })
      .eq('id', announcementId)
      .eq('student_id', actor.id)
      .is('read_at', null)
      .select('id')
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Could not mark announcement as read.' }, { status: 500 })
    return NextResponse.json({ ok: true, updated: Boolean(data) })
  }

  // Action: Edit
  if (payload.action === 'edit') {
    if (!['Main Admin', 'Faculty', 'Coordinator', 'Placement Cell'].includes(actor.role)) {
      return NextResponse.json({ error: 'Only staff can edit announcements.' }, { status: 403 })
    }
    const announcementId = typeof payload.announcement_id === 'string' ? payload.announcement_id : ''
    if (!UUID_RE.test(announcementId)) return NextResponse.json({ error: 'Invalid announcement ID.' }, { status: 400 })
    const title = typeof payload.title === 'string' ? payload.title.trim() : ''
    const message = typeof payload.message === 'string' ? payload.message.trim() : ''

    if (title.length < 1 || title.length > 160) return NextResponse.json({ error: 'Title must be between 1 and 160 characters.' }, { status: 400 })
    if (message.length < 1 || message.length > 5000) return NextResponse.json({ error: 'Message must be between 1 and 5000 characters.' }, { status: 400 })

    const updateFields: Record<string, any> = {
      title,
      message,
    }

    if ('attachment_url' in payload) updateFields.attachment_url = payload.attachment_url || null
    if ('attachment_name' in payload) updateFields.attachment_name = payload.attachment_name || null
    if ('attachment_type' in payload) updateFields.attachment_type = payload.attachment_type || null
    if ('attachment_size' in payload) updateFields.attachment_size = payload.attachment_size || null

    let query = session.adminClient
      .from('student_personal_announcements')
      .update(updateFields)
      .eq('id', announcementId)
      .is('archived_at', null)

    if (actor.role !== 'Main Admin') {
      query = query.eq('sender_id', actor.id)
    }

    const { data, error } = await query
      .select('id,student_id,sender_id,sender_role,title,message,attachment_url,attachment_name,attachment_type,attachment_size,created_at,read_at')
      .maybeSingle()

    if (error) {
      console.error('[Personal announcements] Edit failed:', error.message)
      return NextResponse.json({ error: 'Could not update announcement.' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Announcement not found or access denied.' }, { status: 404 })
    return NextResponse.json({ ok: true, announcement: data })
  }

  // Action: Delete / Archive (Maintaining College Hierarchy)
  if (payload.action === 'delete') {
    const announcementId = typeof payload.announcement_id === 'string' ? payload.announcement_id : ''
    if (!UUID_RE.test(announcementId)) return NextResponse.json({ error: 'Invalid announcement ID.' }, { status: 400 })

    const isInboxDelete = payload.target === 'inbox' || actor.role === 'Student'

    // Student / recipient only removes from their own personal inbox.
    // The institutional record in the Admin/Faculty sent history is ALWAYS PRESERVED.
    if (isInboxDelete) {
      let result = await session.adminClient
        .from('student_personal_announcements')
        .update({ recipient_deleted_at: new Date().toISOString() })
        .eq('id', announcementId)
        .eq('student_id', actor.id)
        .select('id')
        .maybeSingle()

      if (result.error && result.error.message?.includes('recipient_deleted_at')) {
        // Fallback if column migration not yet run: mark as read and leave record intact
        await session.adminClient
          .from('student_personal_announcements')
          .update({ read_at: new Date().toISOString() })
          .eq('id', announcementId)
          .eq('student_id', actor.id)
      } else if (result.error) {
        console.error('[Personal announcements] Inbox dismissal failed:', result.error.message)
        return NextResponse.json({ error: 'Could not remove announcement from inbox.' }, { status: 500 })
      }

      return NextResponse.json({ ok: true, deleted: true, scope: 'inbox_only' })
    }

    // Only authorized staff or administrators can archive sent institutional records
    if (!['Main Admin', 'Faculty', 'Coordinator', 'Placement Cell'].includes(actor.role)) {
      return NextResponse.json({ error: 'Students cannot delete official institutional records.' }, { status: 403 })
    }

    let query = session.adminClient
      .from('student_personal_announcements')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', announcementId)

    if (actor.role !== 'Main Admin') {
      query = query.eq('sender_id', actor.id)
    }

    const { data, error } = await query.select('id').maybeSingle()
    if (error) {
      console.error('[Personal announcements] Staff delete failed:', error.message)
      return NextResponse.json({ error: 'Could not archive announcement.' }, { status: 500 })
    }
    if (!data) return NextResponse.json({ error: 'Announcement not found or access denied.' }, { status: 404 })
    return NextResponse.json({ ok: true, deleted: true, scope: 'institutional_archive' })
  }

  // Default Action: Send New Announcement to ANY campus account
  if (!['Main Admin', 'Faculty', 'Coordinator', 'Placement Cell'].includes(actor.role)) {
    return NextResponse.json({ error: 'Only staff or administrators can dispatch personal announcements.' }, { status: 403 })
  }

  const recipientId = typeof payload.recipient_id === 'string'
    ? payload.recipient_id
    : typeof payload.student_id === 'string'
    ? payload.student_id
    : ''
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const message = typeof payload.message === 'string' ? payload.message.trim() : ''

  if (!UUID_RE.test(recipientId)) return NextResponse.json({ error: 'Select one valid campus recipient.' }, { status: 400 })
  if (title.length < 1 || title.length > 160) return NextResponse.json({ error: 'Title must be between 1 and 160 characters.' }, { status: 400 })
  if (message.length < 1 || message.length > 5000) return NextResponse.json({ error: 'Message must be between 1 and 5000 characters.' }, { status: 400 })

  const { data: recipient, error: recipientError } = await session.adminClient
    .from('profiles')
    .select('id,full_name,role,account_status,campus_uid')
    .eq('id', recipientId)
    .maybeSingle()

  if (recipientError || !recipient || (recipient.account_status || 'Active') !== 'Active') {
    return NextResponse.json({ error: 'The selected campus account is not active or does not exist.' }, { status: 400 })
  }

  const attachmentUrl = typeof payload.attachment_url === 'string' && payload.attachment_url ? payload.attachment_url : null
  const attachmentName = typeof payload.attachment_name === 'string' && payload.attachment_name ? payload.attachment_name : null
  const attachmentType = typeof payload.attachment_type === 'string' && payload.attachment_type ? payload.attachment_type : null
  const attachmentSize = typeof payload.attachment_size === 'number' ? payload.attachment_size : null

  const { data, error } = await session.adminClient
    .from('student_personal_announcements')
    .insert({
      student_id: recipientId, // stored in the recipient column
      sender_id: actor.id,
      sender_role: actor.role,
      title,
      message,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      attachment_type: attachmentType,
      attachment_size: attachmentSize,
    })
    .select('id,student_id,title,message,attachment_url,attachment_name,attachment_type,attachment_size,created_at,read_at')
    .single()

  if (error) {
    console.error('[Personal announcements] Send failed:', error.message)
    return NextResponse.json({ error: 'Could not send personal announcement.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, announcement: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
}, {
  requireAuth: true,
  allowedRoles: ['Student', 'Faculty', 'Coordinator', 'Volunteer', 'Placement Cell', 'Main Admin'],
  rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'personal-announcements-write' },
  maxBodySize: 25_000,
})
