import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api-auth'
import { sanitizeString, isValidEmail, isValidPhone } from '@/lib/security'

export const GET = withSecurity(
  async (_request, { session }) => {
    const { adminClient } = session

    const [profileResult, guardianResult] = await Promise.all([
      adminClient
        .from('profiles')
        .select('id,full_name,email,role,department,graduation_year,usn,created_at')
        .order('created_at', { ascending: false })
        .limit(300),

      adminClient
        .from('student_guardian_contacts')
        .select('student_id,guardian_name,relationship,email,phone,sms_enabled,email_enabled'),
    ])

    if (profileResult.error) {
      return NextResponse.json(
        { error: profileResult.error.message },
        { status: 400 }
      )
    }

    if (guardianResult.error) {
      return NextResponse.json(
        { error: guardianResult.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        users: profileResult.data || [],
        guardianContacts: guardianResult.data || [],
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'admin-users-get' },
  }
)

export const PATCH = withSecurity(
  async (request, { session, body }) => {
    const { adminClient } = session

    const {
      student_id,
      usn,
      guardian,
    } = body as {
      student_id?: string
      usn?: string
      guardian?: {
        guardian_name?: string
        relationship?: string
        email?: string
        phone?: string
        sms_enabled?: boolean
        email_enabled?: boolean
      }
    }

    const studentId = sanitizeString(student_id || '')

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student account is required.' },
        { status: 400 }
      )
    }

    // Verify student exists and is a Student
    const { data: student, error: studentError } = await adminClient
      .from('profiles')
      .select('id,role')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json(
        { error: studentError?.message || 'Student account was not found.' },
        { status: 404 }
      )
    }

    if (student.role !== 'Student') {
      return NextResponse.json(
        { error: 'Only Student identity records can be managed here.' },
        { status: 400 }
      )
    }

    // Validate USN
    const cleanUsn = sanitizeString(usn || '', 80).toUpperCase()

    // Validate guardian data
    const guardianData = guardian || {}
    const guardianName = sanitizeString(guardianData.guardian_name || '')
    const relationship = sanitizeString(guardianData.relationship || 'Parent') || 'Parent'
    const email = sanitizeString(guardianData.email || '').toLowerCase()
    const phone = sanitizeString(guardianData.phone || '').replace(/[\s()-]/g, '')

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Enter a valid guardian email address.' },
        { status: 400 }
      )
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'Enter a valid guardian mobile number.' },
        { status: 400 }
      )
    }

    // Update student profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        usn: cleanUsn,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    // Upsert guardian contact
    const { data: savedGuardian, error: guardianError } = await adminClient
      .from('student_guardian_contacts')
      .upsert(
        {
          student_id: studentId,
          guardian_name: guardianName,
          relationship,
          email,
          phone,
          sms_enabled: guardianData.sms_enabled !== false,
          email_enabled: guardianData.email_enabled !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      )
      .select('student_id,guardian_name,relationship,email,phone,sms_enabled,email_enabled')
      .single()

    if (guardianError) {
      return NextResponse.json(
        { error: guardianError.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        student: { id: studentId, usn: cleanUsn },
        guardian: savedGuardian,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: 'admin-users-patch' },
    maxBodySize: 50 * 1024,
  }
)

export const POST = withSecurity(
  async (request, { session, body }) => {
    const { adminClient } = session

    const {
      full_name,
      email,
      password,
      role,
      department,
      graduation_year,
      employee_id,
    } = body as {
      full_name?: string
      email?: string
      password?: string
      role?: string
      department?: string
      graduation_year?: string
      employee_id?: string
    }

    const fullName = sanitizeString(full_name || '')
    const cleanEmail = sanitizeString(email || '').toLowerCase()
    const cleanPassword = sanitizeString(password || '')
    const cleanRole = sanitizeString(role || '')
    const cleanDepartment = sanitizeString(department || 'ECE')
    const cleanGraduationYear = sanitizeString(graduation_year || '')
    const cleanEmployeeId = sanitizeString(employee_id || '')

    if (fullName.length < 2) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
    }

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'A valid institutional email is required.' },
        { status: 400 }
      )
    }

    if (cleanPassword.length < 8) {
      return NextResponse.json(
        { error: 'Temporary password must contain at least 8 characters.' },
        { status: 400 }
      )
    }

    const validRoles = ['Student', 'Faculty', 'Coordinator', 'Volunteer', 'Placement Cell', 'Main Admin']
    if (!validRoles.includes(cleanRole)) {
      return NextResponse.json({ error: 'Invalid CampusConnect role.' }, { status: 400 })
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: cleanRole !== 'Student',
      user_metadata: {
        full_name: fullName,
        department: cleanDepartment,
        graduation_year: cleanRole === 'Student' ? cleanGraduationYear : '',
      },
    })

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || 'Unable to create account.' },
        { status: 400 }
      )
    }

    const userId = created.user.id

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name: fullName,
        email: cleanEmail,
        role: cleanRole,
        department: cleanDepartment,
        graduation_year: cleanRole === 'Student' ? cleanGraduationYear : '',
        employee_id: cleanEmployeeId || null,
        account_status: 'Active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (profileError) {
      // Cleanup orphan auth account
      await adminClient.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        full_name: fullName,
        email: cleanEmail,
        role: cleanRole,
        department: cleanDepartment,
        graduation_year: cleanRole === 'Student' ? cleanGraduationYear : '',
        account_status: 'Active',
      },
    })
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 10, keyPrefix: 'admin-users-post' },
    maxBodySize: 50 * 1024,
  }
)