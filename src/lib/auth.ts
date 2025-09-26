import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface AuthUser {
  id: string
  email: string
  name?: string
  role?: string
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

  // Fetch user role from database
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`
      }
    }
  })

  const { data: userData, error: _userError } = await tempClient
    .from('users')
    .select('name, role')
    .eq('id', data.user.id)
    .single()

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email!,
    name: userData?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
    role: userData?.role || 'seller'
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

// Role-based access control utilities
export type UserRole = 'admin' | 'seller'

export function getUserRole(): UserRole | null {
  const session = getSession()
  return session?.user?.role as UserRole || null
}

export function isAdmin(): boolean {
  return getUserRole() === 'admin'
}

export function isSeller(): boolean {
  return getUserRole() === 'seller'
}

export function hasRole(role: UserRole): boolean {
  return getUserRole() === role
}

export function requireRole(role: UserRole): void {
  if (!hasRole(role)) {
    throw new Error(`Access denied. Required role: ${role}`)
  }
}

export function requireAdmin(): void {
  requireRole('admin')
}

// Get user role from database (for initial login)
export async function fetchUserRole(userId: string): Promise<UserRole> {
  try {
    const supabase = getAuthenticatedClient()
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) throw new Error(error.message)

    return data.role as UserRole
  } catch (error) {
    console.error('Error fetching user role:', error)
    return 'seller' // Default role
  }
}

// Enhanced login function that includes role
export async function loginWithRole(email: string, password: string): Promise<AuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw new Error(error.message)
  if (!data.user || !data.session) throw new Error('Login failed')

  // Fetch user role from database
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`
      }
    }
  })

  const { data: userData, error: _userError } = await tempClient
    .from('users')
    .select('name, role')
    .eq('id', data.user.id)
    .single()

  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email!,
    name: userData?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
    role: userData?.role || 'seller'
  }

  // Set session in browser
  setSession(user, data.session.access_token, data.session.expires_in ? data.session.expires_in * 1000 : 3600000)

  return user
}

// Invite user using API endpoint
export async function inviteUser(email: string, role: UserRole = 'seller'): Promise<void> {
  try {
    const session = getSession()
    if (!session) {
      throw new Error('Not authenticated')
    }

    console.log('[INVITE_USER] Inviting user:', { email, role, invitedBy: session.user.id })

    // Call the invitation API
    const response = await fetch('/api/users/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`
      },
      body: JSON.stringify({ email, role })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send invitation')
    }

    console.log(`[INVITE_USER] Invitation sent successfully to ${email}`)

  } catch (error: any) {
    console.error('Error inviting user:', error)
    throw error
  }
}

// Reset password for user using API endpoint
export async function resetUserPassword(email: string): Promise<void> {
  try {
    console.log('[RESET_PASSWORD] Requesting password reset for:', email)

    // Call the password reset API
    const response = await fetch('/api/users/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send password reset email')
    }

    console.log('[RESET_PASSWORD] Password reset request processed successfully')
  } catch (error: any) {
    console.error('Error resetting password:', error)
    throw error
  }
}