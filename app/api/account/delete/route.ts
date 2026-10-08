import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/api-auth'

export const DELETE = withSecurity(
  async (_request, { session }) => {
    const { adminClient, user } = session

    // Protect Main Admin from accidentally deleting themselves
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id,role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (profile?.role === 'Main Admin') {
      return NextResponse.json(
        { error: 'Main Admin accounts cannot delete themselves from this screen.' },
        { status: 403 }
      )
    }

    // Delete the user account
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  },
  {
    requireAuth: true,
    requireBody: false,
    rateLimit: { windowMs: 60_000, maxRequests: 5, keyPrefix: 'account-delete' },
  }
)