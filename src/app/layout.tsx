import type { Metadata } from 'next'
import { AuthProvider } from '@/contexts/AuthContext'
import { RoleProvider } from '@/contexts/RoleContext'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Astra - E-commerce Dashboard',
  description: 'Centralized dashboard for e-commerce sellers to manage operations across multiple online stores',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" translate="no" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ErrorBoundary>
          <AuthProvider>
            <RoleProvider>
              {children}
            </RoleProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}