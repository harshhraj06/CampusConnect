import { NextResponse, type NextRequest } from 'next/server'
import { withSecurity } from '@/lib/api-auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STORAGE_PATH_RE = /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/profile-media\/(.+)$/

export const GET = withSecurity(
  async (request: NextRequest, { session }) => {
    const userId = request.nextUrl.searchParams.get('userId')?.trim() || ''
    const suppliedUrl = request.nextUrl.searchParams.get('url') || ''

    if (!UUID_RE.test(userId) || !suppliedUrl) {
      return NextResponse.json({ error: 'Invalid photo request.' }, { status: 400 })
    }

    const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!configuredUrl) {
      return NextResponse.json({ error: 'Storage is not configured.' }, { status: 500 })
    }

    let parsedUrl: URL
    let configuredOrigin: string

    try {
      parsedUrl = new URL(suppliedUrl)
      configuredOrigin = new URL(configuredUrl).origin
    } catch {
      return NextResponse.json({ error: 'Invalid photo URL.' }, { status: 400 })
    }

    // Never let this endpoint fetch arbitrary hosts or paths.
    if (parsedUrl.origin !== configuredOrigin) {
      return NextResponse.json({ error: 'Photo URL is not permitted.' }, { status: 400 })
    }

    const match = parsedUrl.pathname.match(STORAGE_PATH_RE)
    if (!match) {
      return NextResponse.json({ error: 'Unsupported profile photo URL.' }, { status: 400 })
    }

    let objectPath: string
    try {
      objectPath = decodeURIComponent(match[1])
    } catch {
      return NextResponse.json({ error: 'Invalid storage path.' }, { status: 400 })
    }

    // Permit only the two known avatar layouts for the requested profile.
    // Never accept arbitrary paths from the profile-media bucket.
    const pathParts = objectPath.split('/')
    const isProfileAvatar =
      pathParts.length === 2 &&
      pathParts[0] === userId &&
      /^avatar-\d+\.(?:jpe?g|png|webp|gif)$/i.test(pathParts[1])

    const dossierFilename = pathParts[1] || ''
    const isDossierAvatar =
      pathParts.length === 2 &&
      pathParts[0] === 'dossier-avatars' &&
      dossierFilename.startsWith(`${userId}-`) &&
      /^\d+\.(?:jpe?g|png|webp|gif)$/i.test(
        dossierFilename.slice(`${userId}-`.length)
      )

    if (
      (!isProfileAvatar && !isDossierAvatar) ||
      pathParts.some((part) => !part || part === '.' || part === '..') ||
      objectPath.includes('\\\\')
    ) {
      return NextResponse.json({ error: 'Photo path is not permitted.' }, { status: 403 })
    }

    const { data: profile, error: profileError } = await session.adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Campus member not found.' }, { status: 404 })
    }

    const { data: photo, error } = await session.adminClient
      .storage
      .from('profile-media')
      .download(objectPath)

    if (error || !photo) {
      console.error('[Admin dossier photo] Storage download failed:', error?.message)
      return NextResponse.json({ error: 'Profile photo could not be loaded.' }, { status: 404 })
    }

    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Stored file is not an image.' }, { status: 415 })
    }

    return new NextResponse(new Uint8Array(await photo.arrayBuffer()), {
      status: 200,
      headers: {
        'Content-Type': photo.type,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Cookie',
      },
    })
  },
  {
    requireAuth: true,
    allowedRoles: ['Main Admin'],
    rateLimit: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'admin-dossier-photo' },
    requireBody: false,
  }
)
