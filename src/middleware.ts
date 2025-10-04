import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get auth token from cookies or headers
        const authCookie = request.cookies.get('auth_token')
  const authHeader = request.headers.get('authorization')

  const hasAuth = authCookie?.value || authHeader

  // Protected routes (require authentication)
        const protectedRoutes = ['/dashboard', '/orders', '/clients', '/inventory', '/crm', '/settings', '/admin']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Auth routes (login, register, etc.)
        const authRoutes = ['/login', '/register', '/forgot-password']
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // If accessing protected route without auth, redirect to login
  if (isProtectedRoute && !hasAuth) {    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If accessing auth route with auth, redirect to dashboard
  if (isAuthRoute && hasAuth) {    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If authenticated user visits root, redirect to dashboard
  if (hasAuth && pathname === '/') {    return NextResponse.redirect(new URL('/dashboard', request.url))
  }  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}