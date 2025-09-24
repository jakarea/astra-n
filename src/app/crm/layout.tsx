"use client"

import { AppLayout } from "@/components/layout/app-layout"

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout>{children}</AppLayout>
}