import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface AuthUser {
  id: string
  email: string
  name?: string
}

export interface AuthSession {
  user: AuthUser
  token: string
  expiresAt: number
}

// Session storage keys
const SESSION_KEY = 'auth_session'
const TOKEN_KEY = 'auth_token'

// Get session from browser
export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null

  try {
    const sessionData = localStorage.getItem(SESSION_KEY)
    const token = localStorage.getItem(TOKEN_KEY)

    if (!sessionData || !token) return null

    const session = JSON.parse(sessionData) as AuthSession

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      clearSession()
      return null
    }

    return session
  } catch {
    clearSession()
    return null
  }
}

// Set session in browser
export function setSession(user: AuthUser, token: string, expiresIn: number = 3600000): void {
  if (typeof window === 'undefined') return

  const session: AuthSession = {
    user,
    token,
    expiresAt: Date.now() + expiresIn
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  localStorage.setItem(TOKEN_KEY, token)
}

// Clear session from browser
export function clearSession(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(TOKEN_KEY)

  // Clear any Supabase sessions too
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') || key.includes('supabase')) {
      localStorage.removeItem(key)
    }
  })
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const session = getSession()
  return session !== null
}

// Login with email/password
export async function login(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw new Error(error.message)
  if (!data.user || !data.session) throw new Error('Login failed')

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email!,
    name: data.user.user_metadata?.name || data.user.email?.split('@')[0]
  }

  // Set session in browser
  setSession(user, data.session.access_token, data.session.expires_in ? data.session.expires_in * 1000 : 3600000)

  return user
}

// Logout
export async function logout(): Promise<void> {
  // Clear browser session first
  clearSession()

  // Sign out from Supabase
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.warn('Supabase logout error:', error)
  }
}

// Get authenticated supabase client for database operations
export function getAuthenticatedClient() {
  const session = getSession()
  if (!session) throw new Error('Not authenticated')

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${session.token}`
      }
    }
  })
}