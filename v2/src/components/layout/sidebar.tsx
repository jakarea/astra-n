"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
  { name: "Dashboard", href: "/dashboard", icon: BarChart3, adminOnly: false },
  { name: "CRM", href: "/crm", icon: UserCheck, adminOnly: false },
  { name: "Orders", href: "/orders", icon: ShoppingCart, adminOnly: false },
  { name: "Clients", href: "/clients", icon: Users, adminOnly: false },
  { name: "Inventory", href: "/inventory", icon: Package, adminOnly: false },
  { name: "User Management", href: "/admin/users", icon: UserCog, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: false }
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      // Call the logout API endpoint
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Logout API error:', error)
      }

      // Force redirect to login page and reload to clear all client state
      window.location.href = '/login'

    } catch (error) {
      console.error('Error signing out:', error)
      // Even if there's an error, try to clear local state and redirect
      window.location.href = '/login'
    }
  }

  // For now, show all navigation items (we'll add user context later)
  const filteredNavigation = navigation.filter(item => !item.adminOnly || true) // Show all for admin

  return (
    <div className="flex h-screen w-64 flex-col bg-[#121212f2]">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-md flex items-center justify-center bg-blue-600">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="ml-2 text-xl font-bold text-white">Astra</span>
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 mt-4">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-100">
            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-green-500">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-900">
                Admin User
              </p>
              <div className="flex items-center mt-1">
                <Badge className="text-xs bg-green-500 text-white">
                  Admin
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-4 space-y-2 lg:space-y-3">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-blue-600 hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                    )}
                  />
                  <span className="group-hover:text-white">
                    {item.name}
                    {item.adminOnly && (
                      <Shield className="ml-2 h-3 w-3 inline" />
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
              className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={handleLogout}
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