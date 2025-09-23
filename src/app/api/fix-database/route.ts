import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the logged in user from a regular supabase client
    const cookieStore = await (await import('next/headers')).cookies()
    const { createRouteHandlerClient } = await import('@supabase/auth-helpers-nextjs')
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 })
    }

    console.log('Fixing database for user:', session.user.id, session.user.email)

    // Try to create or update the user in our database using Supabase admin client
    try {
      // First, try to get the user with admin client to bypass RLS
      const { data: existingUser, error: getUserError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (getUserError && getUserError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error getting user:', getUserError)
        throw new Error(`Database error: ${getUserError.message}`)
      }

      if (existingUser) {
        console.log('User already exists:', existingUser)
        return NextResponse.json({
          success: true,
          message: 'User already exists',
          user: existingUser
        })
      } else {
        // Create the user using admin client
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert([{
            id: session.user.id,
            name: session.user.email?.split('@')[0] || 'User',
            role: 'admin' // Make the first user an admin
          }])
          .select()
          .single()

        if (createError) {
          console.error('Error creating user:', createError)
          throw new Error(`Failed to create user: ${createError.message}`)
        }

        console.log('Created new user:', newUser)
        return NextResponse.json({
          success: true,
          message: 'User created successfully',
          user: newUser
        })
      }

    } catch (error) {
      console.error('Error fixing database:', error)

      if (error instanceof Error && error.message.includes('permission denied')) {
        return NextResponse.json({
          error: 'Database permissions error. You need to run the SQL permissions script in Supabase dashboard.',
          details: 'Go to Supabase Dashboard > SQL Editor and run the fix-schema-permissions.sql script'
        }, { status: 500 })
      }

      throw error
    }

  } catch (error) {
    console.error('Fix database error:', error)
    return NextResponse.json({
      error: 'Failed to fix database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}