import { createServerComponentSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createServerComponentSupabase()

    // Exchange the code for a session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session?.user) {
      try {
        // Check if user already exists in our public users table
        const existingUser = await prisma.user.findUnique({
          where: { id: session.user.id }
        })

        if (!existingUser) {
          // Create new user in public users table
          await prisma.user.create({
            data: {
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email || 'User',
              role: 'seller' // Default role, can be changed by admin later
            }
          })

          // Also create user settings entry
          await prisma.userSettings.create({
            data: {
              userId: session.user.id
            }
          })
        }
      } catch (error) {
        console.error('Error creating user in public table:', error)
        // Continue anyway - user can still log in
      }
    }
  }

  // Redirect to the dashboard or auth page
  return NextResponse.redirect(`${origin}/`)
}