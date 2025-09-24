"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import {
  Menu,
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

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

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
    <div className="md:hidden">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#121212f2] border-b border-gray-700">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
            <Image
              src="/astra-logo.svg"
              alt="Astra"
              width={120}
              height={32}
              className="h-12 w-auto"
              priority
            />
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-[#121212f2] border-gray-700">
              <div className="flex flex-col h-full pt-4">
                {/* Logo */}
                <div className="flex items-center px-2 mb-6">
                  <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
                    <Image
                      src="/astra-logo.svg"
                      alt="Astra"
                      width={120}
                      height={32}
                      className="h-12 w-auto"
                      priority
                    />
                  </Link>
                </div>

                {/* User Info */}
                <div className="px-2 mb-6">
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
                <nav className="flex-1 px-2 space-y-2">
                  {filteredNavigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setOpen(false)}
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
                <div className="px-2 pb-4">
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
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  )
}