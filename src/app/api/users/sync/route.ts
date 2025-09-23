import { createServerComponentSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const syncUserSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1),
  role: z.enum(['admin', 'seller'])
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, name, role } = syncUserSchema.parse(body)

    // Check if user exists in auth.users (verify with Supabase)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)

    if (authError || !authUser.user) {
      return NextResponse.json({ error: 'User not found in authentication system' }, { status: 404 })
    }

    // Upsert user in public users table
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { name, role },
      create: {
        id: userId,
        name,
        role
      }
    })

    // Ensure user settings exist
    await prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get current user info
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        settings: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}