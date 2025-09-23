"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, UserRole } from '@/types'

// Re-export for backward compatibility
export type { User, UserRole }

interface RoleContextType {
  user: User | null
  setUser: (user: User | null) => void
  isAdmin: boolean
  isSeller: boolean
  logout: () => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // For static prototype - simulate role based on email
  useEffect(() => {
    const storedUser = localStorage.getItem('astra_user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('astra_user')
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'
  const isSeller = user?.role === 'seller'

  return (
    <RoleContext.Provider value={{
      user,
      setUser,
      isAdmin,
      isSeller,
      logout
    }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}