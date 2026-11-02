import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const { data: active, error } = await adminClient
      .from('branding_assets')
      .select('id, name, public_url, is_active')
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        active: active || null,
        heroImageUrl: active?.public_url || '/branding/rnsit-login-20260930-191123.webp',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    )
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch branding' },
      { status: 500 }
    )
  }
}
