import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(_request: NextRequest) {
  try {
    // Sign out from Supabase Auth
        const { error } = await supabase.auth.signOut()

    if (error) {      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}