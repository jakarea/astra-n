"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import {
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
  { name: "Customers", href: "/customers", icon: Users, adminOnly: false, sellerOnly: false },
  { name: "Orders", href: "/orders", icon: ShoppingCart, adminOnly: false, sellerOnly: false },
  { name: "Inventory", href: "/inventory", icon: Package, adminOnly: false, sellerOnly: false },
  { name: "Integration", href: "/integration", icon: Puzzle, adminOnly: false, sellerOnly: false },
  { name: "User Management", href: "/users", icon: UserCog, adminOnly: true, sellerOnly: false },
  { name: "Profile", href: "/profile", icon: User, adminOnly: false, sellerOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: false, sellerOnly: false }
]

export function Sidebar() {
  const pathname = usePathname()
  const { logout: authLogout, user } = useAuth()
  const userRole = user?.role || null

  const handleLogout = () => {
    authLogout()
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
    <div className="flex h-screen w-64 flex-col bg-card borde-r border-accent">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6">
          <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
            <Image
              src="/astra-logo.svg"
              alt="Astra"
              width={250}
              height={70}
              className="h-12 w-auto"
              priority
            />
          </Link>
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