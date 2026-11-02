import { NextRequest, NextResponse } from 'next/server'
import { withSecurity, createAdminClient, getUserRole, authenticateRequest } from '@/lib/api-auth'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BUCKET = 'campus-content'
const FOLDER = 'branding'

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.+/g, '.')
}

export const GET = withSecurity(
  async (request, { session }) => {
    let adminClient = session?.adminClient
    let isMainAdmin = false

    if (!adminClient) {
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        const authResult = await authenticateRequest(request)
        if (!(authResult instanceof NextResponse)) {
          adminClient = authResult.adminClient
          const role = await getUserRole(adminClient, authResult.user.id)
          isMainAdmin = role === 'Main Admin'
        }
      }
    } else if (session?.user?.id) {
      const role = await getUserRole(adminClient, session.user.id)
      isMainAdmin = role === 'Main Admin'
    }

    if (!adminClient) {
      adminClient = createAdminClient()
    }

    const { data: assets, error } = await adminClient
      .from('branding_assets')
      .select('id, name, storage_path, public_url, is_active, file_size, mime_type, created_at')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const active = assets?.find(a => a.is_active) || null

    return NextResponse.json(
      {
        active,
        assets: isMainAdmin ? (assets || []) : (active ? [active] : []),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  },
  {
    requireAuth: false,
    rateLimit: { windowMs: 60_000, maxRequests: 60, keyPrefix: 'admin-branding-get' },
    requireBody: false,
  }
)

export const POST = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient } = session

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string | null)?.trim() || ''

    if (!file) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG and WebP images are supported.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image must be 20 MB or smaller.' },
        { status: 400 }
      )
    }

    const safeName = safeFileName(file.name || 'upload.webp')
    const objectPath = `${FOLDER}/${crypto.randomUUID()}-${Date.now()}-${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(objectPath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Admin branding upload] Storage upload failed:', uploadError.message)
      return NextResponse.json(
        { error: 'Failed to store image in storage.' },
        { status: 500 }
      )
    }

    const { data: urlData } = adminClient.storage
      .from(BUCKET)
      .getPublicUrl(objectPath)

    // Deactivate any existing active asset, then insert the new one as active
    const { error: deactivateError } = await adminClient
      .from('branding_assets')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true)

    if (deactivateError) {
      // Rollback storage upload
      await adminClient.storage.from(BUCKET).remove([objectPath])
      return NextResponse.json(
        { error: deactivateError.message },
        { status: 500 }
      )
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('branding_assets')
      .insert({
        name: name || safeName,
        storage_path: objectPath,
        public_url: urlData.publicUrl,
        is_active: true,
        file_size: file.size,
        mime_type: file.type,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError || !inserted) {
      // Rollback storage upload
      await adminClient.storage.from(BUCKET).remove([objectPath])
      return NextResponse.json(
        { error: insertError?.message || 'Failed to record branding asset.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ok: true, asset: inserted },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 10, keyPrefix: 'admin-branding-post' },
    maxBodySize: MAX_FILE_SIZE + 64 * 1024,
    requireBody: false,
  }
)

export const PATCH = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient } = session
    const body = await request.json()

    const { assetId } = body as { assetId?: string }

    if (!assetId) {
      return NextResponse.json({ error: 'assetId is required.' }, { status: 400 })
    }

    // Deactivate all, then activate the requested one
    const { error: deactivateError } = await adminClient
      .from('branding_assets')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true)

    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 500 })
    }

    const { data: updated, error } = await adminClient
      .from('branding_assets')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', assetId)
      .select()
      .single()

    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message || 'Branding asset not found.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true, asset: updated })
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: 'admin-branding-patch' },
    maxBodySize: 8 * 1024,
  }
)

export const DELETE = withSecurity(
  async (request: NextRequest, { session }) => {
    const { adminClient } = session
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('id')?.trim()

    if (!assetId) {
      return NextResponse.json({ error: 'id query parameter is required.' }, { status: 400 })
    }

    const { data: asset, error: fetchError } = await adminClient
      .from('branding_assets')
      .select('storage_path, is_active, public_url')
      .eq('id', assetId)
      .maybeSingle()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Branding asset not found.' }, { status: 404 })
    }

    // Delete the storage object
    await adminClient.storage.from(BUCKET).remove([asset.storage_path])

    const wasActive = asset.is_active

    // Delete the DB row
    const { error: deleteError } = await adminClient
      .from('branding_assets')
      .delete()
      .eq('id', assetId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // If we deleted the active asset, no active branding remains — login falls back to default
    return NextResponse.json({
      ok: true,
      deletedActive: wasActive,
    })
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 20, keyPrefix: 'admin-branding-delete' },
    requireBody: false,
  }
)
