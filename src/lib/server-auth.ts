import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface ServerAuthUser {
  id: string
  email: string
  name?: string
  role?: string
}

export async function getServerAuthUser(): Promise<ServerAuthUser | null> {
  try {
    const cookieStore = await cookies()

    // For now, get session from local storage approach
    // In a real app, you'd use server-side session management
    // This is a simplified approach for the migration

    // Create supabase client with cookies
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce'
      }
    })

    // Get the session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session?.user) {
      return null
    }

    // Get user data from our database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    if (!dbUser) {
      return null
    }

    return {
      id: dbUser.id,
      email: dbUser.email || session.user.email!,
      name: dbUser.name,
      role: dbUser.role
    }
  } catch (error) {
    console.error('Server auth error:', error)
    return null
  }
}

export async function requireAdmin(): Promise<ServerAuthUser> {
  const user = await getServerAuthUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  if (user.role !== 'admin') {
    throw new Error('Admin role required')
  }

  return user
}

export async function requireAuth(): Promise<ServerAuthUser> {
  const user = await getServerAuthUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}