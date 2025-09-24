import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie or header
    const authToken = request.cookies.get('auth_token')?.value ||
                     request.headers.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify the auth token with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Fetch only name and role from users table
    const userData = await prisma.user.findUnique({
      where: {
        id: user.id
      },
      select: {
        name: true,
        role: true
      }
    })

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Capitalize first letter of role
    const capitalizedRole = userData.role.charAt(0).toUpperCase() + userData.role.slice(1).toLowerCase()

    return NextResponse.json({
      name: userData.name,
      role: capitalizedRole
    })

  } catch (error) {
    console.error('User profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}