import { NextResponse, type NextRequest } from 'next/server'
import { withSecurity } from '@/lib/api-auth'
import { detectMimeType } from '@/lib/security'

const officeTypes = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const

async function attachmentMime(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const detected = detectMimeType(bytes)
  if (detected) return detected

  const extension = file.name.split('.').pop()?.toLowerCase()
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  if (isZip && (extension === 'docx' || extension === 'xlsx')) return officeTypes[extension]
  return ''
}

export const POST = withSecurity(async (request: NextRequest, { session }) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 15 MB limit.' }, { status: 400 })
    }

    const mimeType = await attachmentMime(file)
    if (!mimeType) {
      return NextResponse.json({ error: 'Upload a PDF, JPEG, PNG, WebP, DOCX, or XLSX attachment.' }, { status: 415 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(-120)
    const path = `personal-announcements/${crypto.randomUUID()}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload using adminClient to bypass client-side RLS restrictions on storage bucket
    const { error: uploadError } = await session.adminClient.storage
      .from('campus-content')
      .upload(path, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
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
      type: mimeType,
      size: file.size,
    })
  } catch (error) {
    console.error('[Upload handler exception]:', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}, {
  requireAuth: true,
  allowedRoles: ['Faculty', 'Coordinator', 'Placement Cell', 'Main Admin'],
  rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: 'announcements-upload' },
  maxBodySize: 15 * 1024 * 1024 + 64 * 1024,
  requireBody: false, // FormData parsed directly
})
