"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { isAuthenticated, getSession, clearSession, type AuthUser, type AuthSession } from '@/lib/auth'

interface AuthContextType {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const existingSession = getSession()

    if (existingSession && isAuthenticated()) {
      setUser(existingSession.user)
      setSession(existingSession)

      // Set auth cookie for middleware
      document.cookie = `auth_token=${existingSession.token}; path=/; max-age=${Math.floor((existingSession.expiresAt - Date.now()) / 1000)}`
    }

    setLoading(false)
  }, [])

  const logout = () => {
    clearSession()
    setUser(null)
    setSession(null)

    // Clear auth cookie
    document.cookie = 'auth_token=; path=/; max-age=0'

    // Redirect to login
    window.location.href = '/login'
  }

  const value = {
    user,
    session,
    loading,
    logout
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