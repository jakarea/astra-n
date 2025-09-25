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

  const { data: userData, error: userError } = await tempClient
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

  const { data: userData, error: userError } = await tempClient
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

// Supabase invite user function
export async function inviteUser(email: string, role: UserRole = 'seller'): Promise<void> {
  try {
    const supabase = getAuthenticatedClient()
    const currentUserRole = getUserRole()
    const session = getSession()

    console.log('[INVITE_USER] Debug info:', {
      currentUserRole,
      sessionUser: session?.user,
      requestedRole: role
    })

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      throw new Error('User already exists')
    }

    // Only admins can use the admin invite function
    if (currentUserRole === 'admin') {
      console.log('[INVITE_USER] Admin invitation flow')
      // Admin can invite via Supabase Auth admin function
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          role: role
        }
      })

      if (error) throw new Error(error.message)

      // Create user record in our database
      const { error: dbError } = await supabase
        .from('users')
        .insert([{
          id: data.user?.id,
          email: email,
          name: email.split('@')[0], // Default name from email
          role: role
        }])

      if (dbError) {
        console.error('Database insert error:', dbError)
        // Don't throw here as user invitation was successful
      }
    } else {
      console.log('[INVITE_USER] Seller invitation flow')
      // Sellers use a different approach - create temp user and send signup email

      // Force role to seller for non-admin users
      const finalRole = 'seller'
      console.log(`[INVITE_USER] Seller invitation: ${email} with role ${finalRole} (original: ${role})`)

      // Step 1: Create a temporary user record in our database
      const tempUserId = crypto.randomUUID()
      const { error: dbError } = await supabase
        .from('users')
        .insert([{
          id: tempUserId,
          email: email,
          name: email.split('@')[0], // Default name from email
          role: finalRole
        }])

      if (dbError) {
        if (dbError.code === '23505') {
          throw new Error('User with this email already exists')
        }
        console.error('Database insert error:', dbError)
        throw new Error('Failed to create user invitation')
      }

      // Step 2: Send a signup/password reset email (this works without admin privileges)
      // This will send an email that allows the user to set up their account
      try {
        const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?type=signup&email=${encodeURIComponent(email)}&userId=${tempUserId}`
        })

        if (emailError) {
          // If password reset fails (user doesn't exist in auth yet), that's actually expected
          // We'll create a different approach - use signUp but handle the case where user already exists
          console.log('[INVITE_USER] Password reset failed, trying signup approach:', emailError.message)

          // Try to trigger a signup flow instead
          const { error: signupError } = await supabase.auth.signUp({
            email: email,
            password: 'temp-password-will-be-reset', // Temporary password
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?type=invite&userId=${tempUserId}`,
              data: {
                invited: true,
                role: finalRole,
                invitedBy: session?.user?.id
              }
            }
          })

          if (signupError && !signupError.message.includes('already registered')) {
            throw new Error(`Failed to send invitation: ${signupError.message}`)
          }
        }

        console.log(`[INVITE_USER] Invitation email sent to ${email}`)
      } catch (emailError: any) {
        console.error('Email sending error:', emailError)
        // Clean up the user record if email failed
        await supabase.from('users').delete().eq('id', tempUserId)
        throw new Error(`Failed to send invitation email: ${emailError.message}`)
      }
    }

  } catch (error: any) {
    console.error('Error inviting user:', error)
    throw error
  }
}

// Reset password for user
export async function resetUserPassword(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) throw new Error(error.message)
  } catch (error: any) {
    console.error('Error resetting password:', error)
    throw error
  }
}