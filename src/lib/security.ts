/**
 * Security utilities and middleware for data validation and protection
 */

import { z, ZodSchema } from 'zod'
import { sanitizeObject, sanitizationPresets } from './sanitization'

// Rate limiting (simple in-memory implementation for static prototype)
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Get or create request log for this identifier
    let requests = this.requests.get(identifier) || []

    // Filter out old requests
    requests = requests.filter(time => time > windowStart)

    // Check if under limit
    if (requests.length >= this.maxRequests) {
      return false
    }

    // Add current request
    requests.push(now)
    this.requests.set(identifier, requests)

    return true
  }
}

// Global rate limiters for different actions
export const rateLimiters = {
  login: new RateLimiter(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  api: new RateLimiter(60 * 1000, 60), // 60 requests per minute
  form: new RateLimiter(60 * 1000, 10) // 10 form submissions per minute
}

// Input validation with sanitization
export function validateAndSanitize<T>(
  data: unknown,
  schema: ZodSchema<T>,
  sanitizers?: Record<string, (value: any) => any>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    // First sanitize if sanitizers provided
    let sanitizedData = data
    if (sanitizers && typeof data === 'object' && data !== null) {
      sanitizedData = sanitizeObject(data as Record<string, any>, sanitizers)
    }

    // Then validate
    const result = schema.safeParse(sanitizedData)

    if (!result.success) {
      return {
        success: false,
        errors: result.error.errors.map(err => err.message)
      }
    }

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    return {
      success: false,
      errors: ['Validation failed']
    }
  }
}

// CSRF protection (simple token generation for static prototype)
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function validateCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken && token.length === 64
}

// SQL injection prevention patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|#|\/\*|\*\/)/,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  /('.*'|".*")/
]

export function containsSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input))
}

// XSS prevention
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<\s*\/?\s*(script|iframe|object|embed|form)\b[^>]*>/gi
]

export function containsXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input))
}

// Content Security Policy helpers
export const CSP_DIRECTIVES = {
  default: "default-src 'self'",
  scripts: "script-src 'self' 'unsafe-inline'",
  styles: "style-src 'self' 'unsafe-inline'",
  images: "img-src 'self' data: https:",
  fonts: "font-src 'self'",
  connect: "connect-src 'self'",
  frame: "frame-src 'none'"
}

export function generateCSPHeader(): string {
  return Object.values(CSP_DIRECTIVES).join('; ')
}

// File upload security
export const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'text/plain', 'application/msword'],
  spreadsheets: ['text/csv', 'application/vnd.ms-excel']
}

export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  csv: 2 * 1024 * 1024 // 2MB
}

export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSize: number
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo di file non consentito. Tipi permessi: ${allowedTypes.join(', ')}`
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File troppo grande. Dimensione massima: ${Math.round(maxSize / 1024 / 1024)}MB`
    }
  }

  return { valid: true }
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  score: number
  feedback: string[]
  isStrong: boolean
} {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= 8) score += 2
  else feedback.push('La password deve avere almeno 8 caratteri')

  if (password.length >= 12) score += 1

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Aggiungi lettere minuscole')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Aggiungi lettere maiuscole')

  if (/\d/.test(password)) score += 1
  else feedback.push('Aggiungi numeri')

  if (/[^a-zA-Z\d]/.test(password)) score += 1
  else feedback.push('Aggiungi caratteri speciali')

  // Common patterns check
  if (!/(.)\1{2,}/.test(password)) score += 1
  else feedback.push('Evita caratteri ripetuti')

  const isStrong = score >= 6
  return { score, feedback, isStrong }
}

// Session security
export interface SecureSession {
  userId: string
  email: string
  role: string
  issuedAt: number
  expiresAt: number
  csrfToken: string
}

export function createSecureSession(user: { id: string; email: string; role: string }): SecureSession {
  const now = Date.now()
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    issuedAt: now,
    expiresAt: now + (24 * 60 * 60 * 1000), // 24 hours
    csrfToken: generateCSRFToken()
  }
}

export function validateSession(session: SecureSession): boolean {
  return session.expiresAt > Date.now()
}