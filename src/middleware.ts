import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })

  const { pathname } = request.nextUrl

  console.log(`[MIDDLEWARE] Processing ${pathname}`)

  // Get session using Supabase auth helpers
  const { data: { session }, error } = await supabase.auth.getSession()

  // Protected routes (require authentication)
  const protectedRoutes = ['/orders', '/clients', '/inventory', '/crm', '/settings', '/admin','/dashboard']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Auth routes (login, register, forgot-password)
  const authRoutes = ['/login', '/register', '/forgot-password']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  console.log(`[MIDDLEWARE] ${pathname} - Session: ${session ? 'EXISTS' : 'NONE'}${error ? ` (Error: ${error.message})` : ''}`)

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (!session && isProtectedRoute) {
    console.log(`[MIDDLEWARE] Redirecting ${pathname} to /login - No auth`)
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is not authenticated and trying to access dashboard, redirect to login
  if (!session && pathname === '/dashboard') {
    console.log(`[MIDDLEWARE] Redirecting /dashboard to /login - No auth`)
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth routes, redirect to dashboard
  if (session && isAuthRoute) {
    console.log(`[MIDDLEWARE] Redirecting ${pathname} to /dashboard - Already authenticated`)
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If authenticated user visits root, redirect to dashboard
  if (session && pathname === '/') {
    console.log(`[MIDDLEWARE] Redirecting authenticated user from / to /dashboard`)
    const redirectUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Allow access to /dashboard if authenticated
  if (session && pathname === '/dashboard') {
    console.log(`[MIDDLEWARE] Allowing access to /dashboard - Authenticated user`)
    return res
  }

  console.log(`[MIDDLEWARE] Allowing access to ${pathname}`)
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