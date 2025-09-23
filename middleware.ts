import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Auth routes (login, register, forgot-password)
  const authRoutes = ['/login', '/register', '/forgot-password']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Protected routes (dashboard routes)
  const protectedRoutes = ['/orders', '/customers', '/inventory', '/crm', '/settings', '/admin']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // If user is not authenticated and trying to access protected routes
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth routes, redirect to orders
  if (session && isAuthRoute) {
    const redirectUrl = new URL('/orders', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and accessing root, redirect to orders
  if (session && pathname === '/') {
    const redirectUrl = new URL('/orders', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is not authenticated and accessing root, redirect to login
  if (!session && pathname === '/') {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}