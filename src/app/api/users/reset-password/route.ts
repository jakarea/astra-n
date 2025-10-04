import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate input
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    // Use Supabase's built-in password reset functionality
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.nextUrl.origin}/auth/reset-password`
    })

    if (error) {
      // Don't reveal if user exists or not for security reasons
      // Always return success to prevent email enumeration
      return NextResponse.json({
        message: 'If an account with this email exists, a password reset email has been sent.'
      })
    }
    return NextResponse.json({
      message: 'If an account with this email exists, a password reset email has been sent.'
    })

  } catch (error: any) {
    return NextResponse.json({
      message: 'If an account with this email exists, a password reset email has been sent.'
    })
  }
}