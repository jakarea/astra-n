import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(_request: NextRequest) {
  try {
    console.log('Logout API called')

    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log('Logout successful')

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}