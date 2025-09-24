import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assignWebhookSecretToUser } from '../../../../lib/webhook-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
          role: 'seller'
        }
      }
    })

    if (signUpError) {
      console.error('Registration error:', signUpError)

      // Map Supabase errors to user-friendly messages
      let errorMessage = signUpError.message
      let errorCode = 'REGISTRATION_FAILED'

      if (signUpError.message.includes('User already registered') ||
          signUpError.message.includes('already been registered') ||
          signUpError.code === 'user_already_exists') {
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

    // Generate and assign webhook secret to the new user
    let webhookSecret = null
    if (data.user?.id) {
      try {
        webhookSecret = await assignWebhookSecretToUser(data.user.id)
        console.log('Webhook secret assigned to new user:', email)
      } catch (webhookError) {
        console.error('Failed to assign webhook secret to new user:', email, webhookError)
        // Don't fail the registration if webhook secret assignment fails
        // User can get webhook secret later through other means
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