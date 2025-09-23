"use client"

import { ReactNode } from "react"
import { Sidebar } from "./sidebar"
import { MobileNav } from "./mobile-nav"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top padding */}
        <div className="md:hidden h-16" />

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6 lg:p-8 lg:pb-24">
          {children}
        </main>
      </div>
    </div>
  )
}