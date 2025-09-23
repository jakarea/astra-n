"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { User, Session } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Sync user data to our users table when they sign up or sign in
        if (session?.user && event === 'SIGNED_IN') {
          await syncUserToDatabase(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const syncUserToDatabase = async (user: User) => {
    try {
      // Check if user already exists in our users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      // If user doesn't exist, create them
      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            role: user.user_metadata?.role || 'seller'
          }])

        if (insertError) {
          console.error('Error creating user in database:', insertError)
        }
      }
    } catch (error) {
      console.error('Error syncing user to database:', error)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const value = {
    user,
    session,
    loading,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}