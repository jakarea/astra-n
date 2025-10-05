"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import {
  Menu,
  Users,
  ShoppingCart,
  Package,
  Settings,
  UserCheck,
  BarChart3,
  LogOut,
  Shield,
  UserCog,
  Puzzle,
  User
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3, adminOnly: false, sellerOnly: false },
  { name: "CRM", href: "/crm", icon: UserCheck, adminOnly: false, sellerOnly: false },
  { name: "Orders", href: "/orders", icon: ShoppingCart, adminOnly: false, sellerOnly: false },
  { name: "Clients", href: "/clients", icon: Users, adminOnly: false, sellerOnly: false },
  { name: "Inventory", href: "/inventory", icon: Package, adminOnly: false, sellerOnly: false },
  { name: "Integration", href: "/integration", icon: Puzzle, adminOnly: false, sellerOnly: false },
  { name: "User Management", href: "/users", icon: UserCog, adminOnly: true, sellerOnly: false },
  { name: "Profile", href: "/profile", icon: User, adminOnly: false, sellerOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: false, sellerOnly: false }
]

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const userRole = user?.role || null
  const userName = user?.name || user?.email?.split('@')[0] || 'User'

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
        const error = await response.json()      }

      // Force redirect to login page and reload to clear all client state
      window.location.href = '/login'

    } catch (error) {
      // Even if there's an error, try to clear local state and redirect
      window.location.href = '/login'
    }
  }

  // Filter navigation based on user role
        const filteredNavigation = navigation.filter(item => {
    // Show common items (neither adminOnly nor sellerOnly)
    if (!item.adminOnly && !item.sellerOnly) {
      return true
    }

    // Show admin-only items if user is admin
    if (item.adminOnly && userRole === 'admin') {
      return true
    }

    // Show seller-only items if user is seller (and hide for admin)
    if (item.sellerOnly && userRole === 'seller') {
      return true
    }

    return false
  })

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
              <VisuallyHidden>
                <SheetTitle>Navigation Menu</SheetTitle>
              </VisuallyHidden>
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
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      userRole === 'admin' ? "bg-green-500" : "bg-blue-500"
                    )}>
                      {userRole === 'admin' ? (
                        <Shield className="h-5 w-5 text-white" />
                      ) : (
                        <User className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-gray-900">
                        {userName}
                      </p>
                      <div className="flex items-center mt-1">
                        <Badge
                          className={cn(
                            "text-xs text-white capitalize",
                            userRole === 'admin' ? "bg-green-500" : "bg-blue-500"
                          )}
                        >
                          {userRole || 'User'}
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
                            ? "bg-active-parimary text-white"
                            : "text-primary hover:bg-popover hover:text-white"
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