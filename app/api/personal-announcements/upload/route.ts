import { NextResponse, type NextRequest } from 'next/server'
import { withSecurity } from '@/lib/api-auth'

export const POST = withSecurity(async (request: NextRequest, { session }) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 15 MB limit.' }, { status: 400 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `personal-announcements/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload using adminClient to bypass client-side RLS restrictions on storage bucket
    const { error: uploadError } = await session.adminClient.storage
      .from('campus-content')
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('[Personal announcements upload error]:', uploadError.message)
      return NextResponse.json({ error: 'Failed to store attachment in storage.' }, { status: 500 })
    }

    const { data: urlData } = session.adminClient.storage
      .from('campus-content')
      .getPublicUrl(path)

    return NextResponse.json({
      ok: true,
      url: urlData.publicUrl,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
    })
  } catch (error) {
    console.error('[Upload handler exception]:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed.' }, { status: 500 })
  }
}, {
  requireAuth: true,
  allowedRoles: ['Student', 'Faculty', 'Coordinator', 'Volunteer', 'Placement Cell', 'Main Admin'],
  rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: 'announcements-upload' },
  requireBody: false, // FormData parsed directly
})
