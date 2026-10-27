import { NextResponse, type NextRequest } from 'next/server'
import { withSecurity } from '@/lib/api-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient } = session
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim() || searchParams.get('query')?.trim() || ''
    const userId = searchParams.get('userId')?.trim() || ''

    // Case 1: Search / list users by CC ID, USN, Name, Email, or Employee ID
    if (!userId) {
      let dbQuery = adminClient
        .from('profiles')
        .select('id,full_name,email,role,department,campus_uid,usn,employee_id,account_status,avatar_url,phone,created_at')
        .order('full_name', { ascending: true })
        .limit(60)

      if (query) {
        // PostgREST or filter
        const cleanQ = query.replace(/[%,()]/g, '')
        dbQuery = dbQuery.or(
          `full_name.ilike.%${cleanQ}%,campus_uid.ilike.%${cleanQ}%,usn.ilike.%${cleanQ}%,employee_id.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%`
        )
      }

      const { data: users, error } = await dbQuery

      if (error) {
        console.error('[Admin Dossier Search Error]:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        users: users || [],
      }, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    // Case 2: Load complete Dossier for a specific user ID
    if (!UUID_RE.test(userId)) {
      return NextResponse.json({ error: 'Valid user UUID is required.' }, { status: 400 })
    }

    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: profileErr?.message || 'Campus member not found.' },
        { status: 404 }
      )
    }

    // Parallel fetch relevant institutional records
    const isStudent = profile.role === 'Student' /* eslint-disable-line @typescript-eslint/no-unused-vars */
    const isFaculty = ['Faculty', 'Coordinator', 'Placement Cell'].includes(profile.role) /* eslint-disable-line @typescript-eslint/no-unused-vars */

    // 1. Academic Results & Marks (for students or anyone with results)
    const [
      resultsRes,
      resultSubjectsRes,
      marksRes,
      attendanceRes,
      attendanceRecordsRes,
      guardianRes,
      allocationsRes,
      sessionsRes,
      timetableRes,
    ] = await Promise.all([
      // Results (SGPA, CGPA, semester status)
      adminClient
        .from('college_results')
        .select('*')
        .eq('student_id', userId)
        .order('semester', { ascending: true }),

      // Subject breakdown for results
      adminClient
        .from('college_result_subjects')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: true }),

      // Internal marks
      adminClient
        .from('college_marks')
        .select('*')
        .eq('student_id', userId)
        .order('semester', { ascending: true })
        .limit(100),

      // College attendance overview
      adminClient
        .from('college_attendance')
        .select('*')
        .eq('student_id', userId)
        .order('semester', { ascending: true }),

      // Secondary / synced attendance records
      adminClient
        .from('attendance_records')
        .select('*')
        .eq('student_id', userId)
        .order('subject', { ascending: true }),

      // Guardian info
      adminClient
        .from('student_guardian_contacts')
        .select('*')
        .eq('student_id', userId)
        .maybeSingle(),

      // Faculty teaching allocations
      adminClient
        .from('faculty_teaching_allocations')
        .select('*, attendance_batches(id,batch_name,section,department,academic_year,semester), attendance_batch_subjects(id,subject_name,subject_code,credits,subject_type)')
        .eq('faculty_id', userId)
        .order('allocation_type', { ascending: true }),

      // Conducted attendance sessions by faculty
      adminClient
        .from('attendance_sessions')
        .select('id,subject,attendance_date,period_name,topic,status,created_at,batch_id')
        .eq('faculty_id', userId)
        .order('attendance_date', { ascending: false })
        .limit(50),

      // Timetable entries
      adminClient
        .from('batch_timetable_entries')
        .select('*')
        .eq('faculty_id', userId)
        .limit(60),
    ])

    // Merge attendance sources
    const rawAttendance = attendanceRes.data || []
    const rawAttendanceRecords = attendanceRecordsRes.data || []
    const mergedAttendance = [...rawAttendance]

    for (const rec of rawAttendanceRecords) {
      const match = mergedAttendance.find(
        (a) =>
          (a.subject_code && rec.subject && a.subject_code.toLowerCase() === rec.subject.toLowerCase()) ||
          (a.subject_name && rec.subject && a.subject_name.toLowerCase() === rec.subject.toLowerCase())
      )
      if (!match) {
        mergedAttendance.push({
          id: rec.id,
          subject_code: rec.subject,
          subject_name: rec.subject,
          semester: profile.semester || 1,
          attended: rec.attended || 0,
          total: rec.total || 0,
        })
      }
    }

    // Calculate faculty working hours / workload breakdown
    const rawAllocations = allocationsRes.data || []
    let theoryHours = 0
    let labHours = 0
    let tutorialHours = 0
    let projectHours = 0
    let mentoringHours = 0
    let totalWeeklyHours = 0

    for (const alloc of rawAllocations) {
      const hrs = Number(alloc.weekly_hours) || 0
      totalWeeklyHours += hrs
      switch (alloc.allocation_type) {
        case 'Theory':
          theoryHours += hrs
          break
        case 'Lab':
          labHours += hrs
          break
        case 'Tutorial':
          tutorialHours += hrs
          break
        case 'Project':
          projectHours += hrs
          break
        case 'Mentoring':
          mentoringHours += hrs
          break
        default:
          theoryHours += hrs
          break
      }
    }

    const facultyWorkload = {
      total_allocations: rawAllocations.length,
      theory_hours: Number(theoryHours.toFixed(2)),
      lab_hours: Number(labHours.toFixed(2)),
      tutorial_hours: Number(tutorialHours.toFixed(2)),
      project_hours: Number(projectHours.toFixed(2)),
      mentoring_hours: Number(mentoringHours.toFixed(2)),
      total_weekly_hours: Number(totalWeeklyHours.toFixed(2)),
      sessions_conducted_count: (sessionsRes.data || []).length,
    }

    return NextResponse.json({
      profile,
      studentData: {
        results: resultsRes.data || [],
        resultSubjects: resultSubjectsRes.data || [],
        marks: marksRes.data || [],
        attendance: mergedAttendance,
        guardian: guardianRes.data || null,
      },
      facultyData: {
        allocations: rawAllocations,
        workload: facultyWorkload,
        conductedSessions: sessionsRes.data || [],
        timetableEntries: timetableRes.data || [],
      },
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'admin-dossier-get' },
    requireBody: false,
  }
)

export const PATCH = withSecurity(
  async (_request, { session, body }) => {
    const { adminClient, user: adminUser } = session

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid update payload.' }, { status: 400 })
    }

    const payload = body as Record<string, unknown>
    const userId = typeof payload.userId === 'string' ? payload.userId.trim() : ''

    if (!UUID_RE.test(userId)) {
      return NextResponse.json({ error: 'Valid user UUID is required.' }, { status: 400 })
    }

    // Check existing target profile
    const { data: existingUser, error: checkErr } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (checkErr || !existingUser) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    // Build sanitised updates
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof payload.full_name === 'string') {
      const fn = payload.full_name.trim()
      if (fn.length < 2 || fn.length > 120) {
        return NextResponse.json({ error: 'Full name must be between 2 and 120 characters.' }, { status: 400 })
      }
      updates.full_name = fn
    }

    if (typeof payload.usn === 'string') {
      const rawUsn = payload.usn.trim().toUpperCase()
      // Allow empty string to clear, or validate length. Never write NULL because
      // the profiles table defines usn text not null default ''.
      if (rawUsn.length > 30) {
        return NextResponse.json({ error: 'USN cannot exceed 30 characters.' }, { status: 400 })
      }
      updates.usn = rawUsn || ''
    }

    if (typeof payload.campus_uid === 'string') {
      const rawUid = payload.campus_uid.trim()
      if (rawUid.length > 40) {
        return NextResponse.json({ error: 'Campus UID / CC ID cannot exceed 40 characters.' }, { status: 400 })
      }
      updates.campus_uid = rawUid || null
    }

    if (typeof payload.employee_id === 'string') {
      const rawEmp = payload.employee_id.trim().toUpperCase()
      if (rawEmp.length > 30) {
        return NextResponse.json({ error: 'Employee ID cannot exceed 30 characters.' }, { status: 400 })
      }
      updates.employee_id = rawEmp || null
    }

    if (typeof payload.role === 'string') {
      const validRoles = ['Student', 'Faculty', 'Coordinator', 'Placement Cell', 'Volunteer', 'Main Admin']
      if (!validRoles.includes(payload.role)) {
        return NextResponse.json({ error: `Invalid role. Allowed: ${validRoles.join(', ')}` }, { status: 400 })
      }
      updates.role = payload.role
    }

    if (typeof payload.department === 'string') {
      const dep = payload.department.trim().toUpperCase()
      updates.department = dep || null
    }

    if (typeof payload.account_status === 'string') {
      const validStatuses = ['Active', 'Suspended', 'Pending']
      if (!validStatuses.includes(payload.account_status)) {
        return NextResponse.json({ error: 'Invalid account status. Allowed: Active, Suspended, Pending' }, { status: 400 })
      }
      updates.account_status = payload.account_status
    }

    if (typeof payload.phone === 'string') {
      const phone = payload.phone.trim()

      // A blank phone field must not block unrelated edits, such as
      // changing the student's current semester. Never write NULL here.
      if (phone) {
        updates.phone = phone
      }
    }

    if (typeof payload.semester === 'number' || typeof payload.semester === 'string') {
      const semNum = Number(payload.semester)
      if (Number.isInteger(semNum) && semNum >= 1 && semNum <= 10) {
        updates.semester = semNum
      }
    }

    if (typeof payload.academic_year === 'string') {
      updates.academic_year = payload.academic_year.trim() || null
    }

    if (typeof payload.avatar_url === 'string') {
      const av = payload.avatar_url.trim()
      if (av.length > 3_000_000) {
        return NextResponse.json({ error: 'Avatar payload is too large.' }, { status: 400 })
      }
      updates.avatar_url = av || null
    }

    // Perform database update using Admin Service Role client
    const { data: updated, error: updateErr } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single()

    if (updateErr) {
      console.error('[Admin Profile Update Error]:', updateErr.message)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Record audit trail
    try {
      await adminClient.from('audit_logs').insert({
        event_type: 'admin_modify_profile',
        actor_id: adminUser.id,
        target_id: userId,
        resource_type: 'profiles',
        resource_id: userId,
        metadata: {
          updated_fields: Object.keys(updates),
          previous: {
            full_name: existingUser.full_name,
            usn: existingUser.usn,
            campus_uid: existingUser.campus_uid,
            role: existingUser.role,
            department: existingUser.department,
            account_status: existingUser.account_status,
            avatar_url: existingUser.avatar_url,
          },
          current: {
            full_name: updated.full_name,
            usn: updated.usn,
            campus_uid: updated.campus_uid,
            role: updated.role,
            department: updated.department,
            account_status: updated.account_status,
            avatar_url: updated.avatar_url,
          },
        },
        success: true,
      })
    } catch (auditErr) {
      console.warn('[Audit Log Warning]:', auditErr)
    }

    return NextResponse.json({
      ok: true,
      message: 'Profile, USN, and photo details updated successfully.',
      user: updated,
    })
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'admin-dossier-patch' },
    maxBodySize: 5_000_000,
  }
)
