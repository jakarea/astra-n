import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSessionFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    return { token, supabase }
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionInfo = getSessionFromRequest(request)
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { supabase } = sessionInfo

    // Get current user info
        const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    // Get user role from database
        const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError || !userData) {      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has permission to invite (admin or seller)
        const userRole = userData.role
    if (userRole !== 'admin' && userRole !== 'seller') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { email, role } = await request.json()

    // Validate input
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Sellers can only invite with 'seller' role, admins can invite with any role
        const inviteRole = userRole === 'admin' ? (role || 'seller') : 'seller'
    // Check if user already exists in auth.users or users table
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user already exists in our database
        const { data: existingUser } = await serviceClient
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Use Supabase Auth Admin API to invite user
        const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${request.nextUrl.origin}/auth/set-password?invited=true`,
        data: {
          invited: true,
          role: inviteRole,
          invitedBy: user.id,
          name: email.split('@')[0] // Default name from email
        }
      }
    )

    if (inviteError) {      if (inviteError.message.includes('already registered')) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: `Failed to send invitation: ${inviteError.message}` }, { status: 500 })
    }

    if (!inviteData.user) {
      return NextResponse.json({ error: 'Failed to create user invitation' }, { status: 500 })
    }

    // Create user record in database using service client to bypass RLS
        const { error: createError } = await serviceClient
      .from('users')
      .insert([{
        id: inviteData.user.id,
        email: email,
        name: email.split('@')[0],
        role: inviteRole
      }])

    if (createError && createError.code !== '23505') { // Ignore duplicate key errors
      console.warn('User creation error:', createError)
    }
    return NextResponse.json({
      message: 'Invitation sent successfully',
      user: {
        id: inviteData.user.id,
        email: email,
        role: inviteRole
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to send invitation',
      details: error.message
    }, { status: 500 })
  }
}