"use client"

import Link from "next/link"
  import Image from 'next/image';
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useRole, type User } from "@/contexts/RoleContext"
import { loginSchema, type LoginFormData } from "@/lib/validations"
import { LoadingSpinner } from "@/components/ui/loading"
import { handleError } from "@/lib/error-handling"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{email?: string; password?: string}>({})
  const router = useRouter()
  const { setUser } = useRole()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setFieldErrors({})

    // Validate form data with Zod
    const result = loginSchema.safeParse({ email, password })

    if (!result.success) {
      const errors: {email?: string; password?: string} = {}
      result.error.errors.forEach((error) => {
        if (error.path[0] === 'email') {
          errors.email = error.message
        } else if (error.path[0] === 'password') {
          errors.password = error.message
        }
      })
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    try {
      // For static prototype - assign role based on email pattern
      const validatedData = result.data
      const isAdmin = validatedData.email.toLowerCase().includes('admin')

      const userData: User = {
        id: validatedData.email,
        email: validatedData.email,
        role: isAdmin ? 'admin' : 'seller',
        name: isAdmin ? 'Admin User' : 'Seller User'
      }

      // Store user data in localStorage for static prototype
      localStorage.setItem('astra_user', JSON.stringify(userData))
      setUser(userData)

      setTimeout(() => {
        router.push("/")
      }, 1000)
    } catch (err) {
      const appError = handleError(err)
      setError(appError.message || "Errore durante il login. Riprova.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden" style={{background: '#F8F9FA'}}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100"></div>
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full blur-3xl" style={{backgroundColor: 'rgba(62, 207, 142, 0.05)'}}></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl" style={{backgroundColor: 'rgba(62, 207, 142, 0.03)'}}></div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo/Brand Section */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{backgroundColor: 'rgba(62, 207, 142, 0.1)'}}>
            <span className="text-2xl font-bold" style={{color: '#3ECF8E'}}>A</span>
          </div>
          <h1 className="text-4xl font-bold" style={{color: '#11181C'}}>
            <span style={{color: '#3ECF8E'}}>Astra</span>
            <Image
            src="/public/astra-logo.png" // Path relative to the public folder
            alt="Description of my image"
            width={500} // Specify width
            height={300} // Specify height
          />
            <img src="" alt="" />
          </h1>
          <p className="mt-2" style={{color: '#687076'}}>
            E-commerce Dashboard E-commerce Dashboard
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/95 backdrop-blur-sm border rounded-lg shadow-xl p-6" style={{borderColor: '#EAEDF0'}}>
          <div className="space-y-1 text-center pb-6">
            <h2 className="text-2xl font-semibold tracking-tight" style={{color: '#11181C'}}>
              Sign in to your account
            </h2>
            <p className="text-base" style={{color: '#687076'}}>
              Enter your email and password below to access your dashboard
            </p>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="text-sm text-center p-3 rounded-md" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#DC2626'}}>
                {error}
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <label htmlFor="email" className="font-medium block" style={{color: '#11181C'}}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{
                    borderColor: '#EAEDF0',
                    backgroundColor: '#F8F9FA',
                    color: '#11181C'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3ECF8E';
                    e.target.style.boxShadow = '0 0 0 2px rgba(62, 207, 142, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#EAEDF0';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                  disabled={loading}
                />
                {fieldErrors.email && (
                  <p className="text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="font-medium" style={{color: '#11181C'}}>
                    Password
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-sm font-medium transition-colors"
                    style={{color: '#3ECF8E'}}
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{
                    borderColor: '#EAEDF0',
                    backgroundColor: '#F8F9FA',
                    color: '#11181C'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3ECF8E';
                    e.target.style.boxShadow = '0 0 0 2px rgba(62, 207, 142, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#EAEDF0';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                  disabled={loading}
                />
                {fieldErrors.password && (
                  <p className="text-sm text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  style={{accentColor: '#3ECF8E'}}
                />
                <label htmlFor="remember" className="text-sm font-medium" style={{color: '#687076'}}>
                  Remember me for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center"
                style={{
                  backgroundColor: loading ? '#94A3B8' : '#3ECF8E',
                  color: '#FFFFFF',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                onMouseOver={(e) => {
                  if (!loading) e.target.style.backgroundColor = '#4CDF9D'
                }}
                onMouseOut={(e) => {
                  if (!loading) e.target.style.backgroundColor = '#3ECF8E'
                }}
              >
                {loading && <LoadingSpinner size="sm" className="mr-2" />}
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{borderColor: '#EAEDF0'}} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2" style={{color: '#687076'}}>
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className="h-12 border rounded-lg transition-colors flex items-center justify-center font-medium"
                style={{
                  borderColor: '#EAEDF0',
                  backgroundColor: '#F8F9FA',
                  color: '#11181C'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#F8F9FA'}
              >
                Google
              </button>
              <button
                className="h-12 border rounded-lg transition-colors flex items-center justify-center font-medium"
                style={{
                  borderColor: '#EAEDF0',
                  backgroundColor: '#F8F9FA',
                  color: '#11181C'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#F8F9FA'}
              >
                Facebook
              </button>
            </div>

            {/* Footer Text */}
            <div className="text-center text-sm" style={{color: '#687076'}}>
              New to Astra?{" "}
              <span style={{color: '#94a3b8'}}>
                Contact your administrator for access
              </span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs" style={{color: '#687076'}}>
            Protected by enterprise-grade security.{" "}
            <Link href="#" className="transition-colors" style={{color: '#3ECF8E'}}>
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="#" className="transition-colors" style={{color: '#3ECF8E'}}>
              Terms of Service
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}