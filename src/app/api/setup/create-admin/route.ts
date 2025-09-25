import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('[CREATE_ADMIN] Starting admin user creation')

    const { email = 'admin@example.com', password = 'admin123', name = 'Administrator' } = await request.json()

    // Create Supabase clients
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for admin operations')
    }

    console.log('[CREATE_ADMIN] Using service role key for admin user creation')

    // Use service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Step 1: Create user in Supabase Auth
    console.log('[CREATE_ADMIN] Creating auth user:', email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for dev
      user_metadata: {
        name,
        role: 'admin'
      }
    })

    if (authError) {
      console.error('[CREATE_ADMIN] Auth creation error:', authError)
      if (authError.message.includes('already registered')) {
        return NextResponse.json({
          error: 'User already exists in authentication system',
          details: authError.message
        }, { status: 400 })
      }
      throw new Error(`Auth user creation failed: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Auth user creation returned no user data')
    }

    console.log('[CREATE_ADMIN] Auth user created successfully:', authData.user.id)

    // Step 2: Create user in database
    console.log('[CREATE_ADMIN] Creating database user record')
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user.id,
        email: email,
        name: name,
        role: 'admin'
      }])
      .select()
      .single()

    if (dbError) {
      console.error('[CREATE_ADMIN] Database creation error:', dbError)

      // If database insert fails, try to clean up auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        console.log('[CREATE_ADMIN] Cleaned up auth user after database error')
      } catch (cleanupError) {
        console.error('[CREATE_ADMIN] Failed to cleanup auth user:', cleanupError)
      }

      if (dbError.code === '23505') {
        return NextResponse.json({
          error: 'User already exists in database',
          details: dbError.message
        }, { status: 400 })
      }

      throw new Error(`Database user creation failed: ${dbError.message}`)
    }

    console.log('[CREATE_ADMIN] Database user created successfully')

    // Step 3: Verify the user was created properly
    const { data: verifyUser, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role')
      .eq('id', authData.user.id)
      .single()

    if (verifyError || !verifyUser) {
      console.error('[CREATE_ADMIN] User verification failed:', verifyError)
      throw new Error('User creation verification failed')
    }

    console.log('[CREATE_ADMIN] Admin user created and verified successfully')

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: verifyUser.id,
        email: verifyUser.email,
        name: verifyUser.name,
        role: verifyUser.role
      },
      credentials: {
        email,
        password,
        note: 'Use these credentials to log in at /login'
      }
    })

  } catch (error: any) {
    console.error('[CREATE_ADMIN] Unexpected error:', error)
    return NextResponse.json({
      error: 'Failed to create admin user',
      details: error.message
    }, { status: 500 })
  }
}