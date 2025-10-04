import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()
    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Get the current origin for email confirmation redirect
        const origin = request.nextUrl.origin
    const redirectUrl = `${origin}/auth/callback`
    // Create a client-side Supabase client for this request with proper redirect URL
        const supabaseWithRedirect = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          redirectTo: redirectUrl
        }
      }
    )

    // Sign up with Supabase Auth
        const { data, error: signUpError } = await supabaseWithRedirect.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'seller' // Default role for CRM users
        },
        emailRedirectTo: redirectUrl
      }
    })

    if (signUpError) {
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
    // Directly create user in public.users table (no trigger dependency)
    if (data.user?.id) {
      try {
      // Create or update user record in public.users using UPSERT
        const { data: userData, error: userInsertError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: data.user.id,
            name: name,
            email: email,
            role: 'seller',
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (userInsertError) {
      // This is important - if we can't create the user record,
          // the CRM won't work for this user
          throw new Error(`Failed to create user record: ${userInsertError.message}`)
        }
      } catch (error) {
      // Clean up - delete the auth user if we can't create the app user
        try {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id)        } catch (cleanupError) {        }

        return NextResponse.json(
          {
            error: 'Registration failed - could not create user profile',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
      needsEmailConfirmation: !data.session
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}