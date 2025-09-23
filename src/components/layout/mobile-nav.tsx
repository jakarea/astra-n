"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useRole } from "@/contexts/RoleContext"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  ShoppingCart,
  Package,
  Settings,
  UserCheck,
  BarChart3,
  Menu,
  X,
  LogOut,
  Shield,
  UserCog
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, adminOnly: false },
  { name: "CRM", href: "/crm", icon: UserCheck, adminOnly: false },
  { name: "Ordini", href: "/orders", icon: ShoppingCart, adminOnly: false },
  { name: "Clienti", href: "/clients", icon: Users, adminOnly: false },
  { name: "Inventario", href: "/inventory", icon: Package, adminOnly: false },
  { name: "Utenti", href: "/admin/users", icon: UserCog, adminOnly: true },
  { name: "Impostazioni", href: "/settings", icon: Settings, adminOnly: false }
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAdmin, logout } = useRole()
  const [showMenu, setShowMenu] = useState(false)

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => !item.adminOnly || isAdmin)

  // Show only first 4 items in bottom nav, rest in menu
  const bottomNavItems = filteredNavigation.slice(0, 4)
  const menuItems = filteredNavigation.slice(4)

  const handleLogout = () => {
    logout()
    router.push('/auth')
    setShowMenu(false)
  }

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden">
        <div className="fixed inset-x-0 top-0 z-40" style={{backgroundColor: '#FFFFFF', borderBottom: '1px solid #EAEDF0'}}>
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <div className="h-6 w-6 rounded flex items-center justify-center" style={{backgroundColor: '#3ECF8E'}}>
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="ml-2 text-lg font-bold" style={{color: '#11181C'}}>Astra</span>
            </div>

            {/* User info and menu button */}
            <div className="flex items-center space-x-3">
              {user && (
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs"
                       style={{backgroundColor: isAdmin ? '#3ECF8E' : '#94A3B8', color: '#FFFFFF'}}>
                    {isAdmin ? <Shield className="h-4 w-4" /> : user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-sm">
                    <div className="font-medium" style={{color: '#11181C'}}>{user.name || user.email}</div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-md"
                style={{color: '#687076'}}
              >
                {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      {showMenu && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMenu(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-64 shadow-lg" style={{backgroundColor: '#FFFFFF'}}>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4" style={{borderBottom: '1px solid #EAEDF0'}}>
                <h2 className="text-lg font-semibold" style={{color: '#11181C'}}>Menu</h2>
                <button onClick={() => setShowMenu(false)} style={{color: '#687076'}}>
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 py-4">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setShowMenu(false)}
                      className="flex items-center px-4 py-3 text-sm font-medium"
                      style={isActive
                        ? {backgroundColor: '#F8F9FA', color: '#3ECF8E', borderRight: '3px solid #3ECF8E'}
                        : {color: '#687076'}
                      }
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>

              <div className="p-4" style={{borderTop: '1px solid #EAEDF0'}}>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-md"
                  style={{color: '#DC2626', backgroundColor: '#FEF2F2'}}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <div className="md:hidden">
        <div className="fixed inset-x-0 bottom-0 z-40" style={{backgroundColor: '#FFFFFF', borderTop: '1px solid #EAEDF0'}}>
          <div className="grid grid-cols-4 gap-1 p-2">
            {bottomNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center py-2 px-1 text-xs font-medium rounded transition-colors"
                  style={isActive
                    ? {backgroundColor: '#3ECF8E', color: '#FFFFFF'}
                    : {color: '#687076'}
                  }
                >
                  <item.icon className="h-5 w-5 mb-1" />
                  <span className="truncate" translate="no" suppressHydrationWarning>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}