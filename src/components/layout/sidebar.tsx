"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useRole } from "@/contexts/RoleContext"
import { useAuth } from "@/contexts/AuthContext"
import {
  Home,
  Users,
  ShoppingCart,
  Package,
  Settings,
  UserCheck,
  BarChart3,
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
  { name: "Gestione Utenti", href: "/admin/users", icon: UserCog, adminOnly: true },
  { name: "Impostazioni", href: "/settings", icon: Settings, adminOnly: false }
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAdmin } = useRole()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => !item.adminOnly || isAdmin)

  return (
    <div className="flex h-screen w-64 flex-col" style={{backgroundColor: '#FFFFFF', borderRight: '1px solid #EAEDF0'}}>
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#3ECF8E'}}>
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="ml-2 text-xl font-bold" style={{color: '#11181C'}}>Astra</span>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-6 mt-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg" style={{backgroundColor: '#F8F9FA'}}>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{backgroundColor: isAdmin ? '#3ECF8E' : '#94A3B8'}}>
                {isAdmin ? (
                  <Shield className="h-5 w-5 text-white" />
                ) : (
                  <span className="text-white font-medium text-sm">{user.name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{color: '#11181C'}}>
                  {user.name || user.email}
                </p>
                <div className="flex items-center mt-1">
                  <Badge
                    variant={isAdmin ? "default" : "secondary"}
                    className="text-xs"
                    style={isAdmin ? {backgroundColor: '#3ECF8E', color: '#FFFFFF'} : undefined}
                  >
                    {isAdmin ? 'Admin' : 'Seller'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-4 space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                  style={isActive
                    ? {backgroundColor: '#3ECF8E', color: '#FFFFFF'}
                    : {color: '#687076'}
                  }
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#F8F9FA';
                      e.currentTarget.style.color = '#11181C';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#687076';
                    }
                  }}
                >
                  <item.icon
                    className="mr-3 h-5 w-5 flex-shrink-0"
                    style={{color: isActive ? '#FFFFFF' : '#94A3B8'}}
                  />
                  <span translate="no" suppressHydrationWarning>
                    {item.name}
                    {item.adminOnly && (
                      <Shield className="ml-2 h-3 w-3 inline" style={{color: '#3ECF8E'}} />
                    )}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Logout button */}
          <div className="flex-shrink-0 px-4 pb-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
              style={{borderColor: '#EAEDF0', color: '#687076'}}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}