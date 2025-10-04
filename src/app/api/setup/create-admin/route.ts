import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email = 'admin@example.com', password = 'admin123', name = 'Administrator' } = await request.json()

    // Create Supabase clients
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const _supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for admin operations')
    }
    // Use service role key for admin operations
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Step 1: Create user in Supabase Auth  
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for dev
      user_metadata: {
        name,
        role: 'admin'
      }
    })

    if (authError) {      if (authError.message.includes('already registered')) {
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
    // Step 2: Create user in database  
        const { data: _dbUser, error: dbError } = await supabaseAdmin
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
      // If database insert fails, try to clean up auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)      } catch (cleanupError) {      }

      if (dbError.code === '23505') {
        return NextResponse.json({
          error: 'User already exists in database',
          details: dbError.message
        }, { status: 400 })
      }

      throw new Error(`Database user creation failed: ${dbError.message}`)
    }
    // Step 3: Verify the user was created properly
        const { data: verifyUser, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role')
      .eq('id', authData.user.id)
      .single()

    if (verifyError || !verifyUser) {      throw new Error('User creation verification failed')
    }
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
    return NextResponse.json({
      error: 'Failed to create admin user',
      details: error.message
    }, { status: 500 })
  }
}