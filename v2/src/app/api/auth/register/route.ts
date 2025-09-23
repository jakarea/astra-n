import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    console.log('Registration API called for:', email)

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Sign up with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'admin' // Default role for admin dashboard
        }
      }
    })

    if (signUpError) {
      console.error('Registration error:', {
        message: signUpError.message,
        code: signUpError.code,
        status: signUpError.status,
        fullError: signUpError
      })

      // Map Supabase errors to user-friendly messages
      let errorMessage = signUpError.message
      let errorCode = 'REGISTRATION_FAILED'

      if (signUpError.message.includes('User already registered') ||
          signUpError.message.includes('already been registered') ||
          signUpError.message.includes('already registered') ||
          signUpError.code === 'user_already_exists' ||
          signUpError.code === 'email_address_not_available' ||
          signUpError.status === 422) {
        errorMessage = 'User already registered'
        errorCode = 'EMAIL_ALREADY_EXISTS'
      } else if (signUpError.message.includes('Password should be') ||
                 signUpError.message.includes('Password is too short')) {
        errorMessage = 'Password should be at least 8 characters'
        errorCode = 'WEAK_PASSWORD'
      } else if (signUpError.message.includes('Invalid email') ||
                 signUpError.message.includes('Unable to validate email')) {
        errorMessage = 'Invalid email'
        errorCode = 'INVALID_EMAIL'
      } else if (signUpError.message.includes('Too many requests') ||
                 signUpError.message.includes('rate limit')) {
        errorMessage = 'Too many requests'
        errorCode = 'RATE_LIMITED'
      }

      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
          details: signUpError.message
        },
        { status: 400 }
      )
    }

    console.log('Registration successful for:', email)

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
      needsEmailConfirmation: !data.session
    })

  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}