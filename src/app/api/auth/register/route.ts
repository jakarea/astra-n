import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { assignWebhookSecretToUser } from '@/lib/webhook-utils'

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
          role: 'seller' // Default role for CRM users
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

    // Directly create user in public.users table (no trigger dependency)
    let webhookSecret = null
    if (data.user?.id) {
      try {
        console.log('[REGISTRATION] Creating user in public.users table for:', data.user.id, email)

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
          console.error('[REGISTRATION] Failed to create user in public.users:', {
            error: userInsertError,
            userId: data.user.id,
            email: email
          })

          // This is important - if we can't create the user record,
          // the CRM won't work for this user
          throw new Error(`Failed to create user record: ${userInsertError.message}`)
        }

        console.log('[REGISTRATION] ✅ User created successfully in public.users:', {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role
        })

        // Now assign webhook secret to the user
        try {
          webhookSecret = await assignWebhookSecretToUser(data.user.id)
          console.log('[REGISTRATION] ✅ Webhook secret assigned:', webhookSecret)
        } catch (webhookError) {
          console.error('[REGISTRATION] Failed to assign webhook secret:', webhookError)
          // Don't fail registration for webhook issue - user can regenerate later
        }

      } catch (error) {
        console.error('[REGISTRATION] Critical error in user creation:', error)

        // Clean up - delete the auth user if we can't create the app user
        try {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id)
          console.log('[REGISTRATION] Cleaned up auth user due to app user creation failure')
        } catch (cleanupError) {
          console.error('[REGISTRATION] Failed to cleanup auth user:', cleanupError)
        }

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
      needsEmailConfirmation: !data.session,
      webhookSecret: webhookSecret // Include webhook secret in response
    })

  } catch (error) {
    console.error('Registration API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}