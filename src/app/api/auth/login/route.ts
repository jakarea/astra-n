import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('Login API called for:', email)

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create Supabase client that sets cookies
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Sign in with Supabase Auth
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      console.error('Login error:', signInError)

      // Map Supabase errors to user-friendly messages
      let errorMessage = signInError.message
      if (signInError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid login credentials'
      } else if (signInError.message.includes('Email not confirmed')) {
        errorMessage = 'Email not confirmed'
      } else if (signInError.message.includes('Too many requests')) {
        errorMessage = 'Too many requests'
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    console.log('Login successful for:', email)

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session
    })

  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}