import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Supabase logout error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('User logged out successfully')

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    }, {
      status: 200,
      headers: {
        // Clear any auth cookies
        'Set-Cookie': [
          'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly',
          'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly'
        ].join(', ')
      }
    })

  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json({
      error: 'Logout failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}