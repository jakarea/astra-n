/**
 * Data sanitization utilities for security and data integrity
 */

import DOMPurify from 'isomorphic-dompurify'

// HTML sanitization for user content
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  })
}

// Basic text sanitization
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML brackets
    .replace(/[\r\n\t]+/g, ' ') // Normalize whitespace
    .substring(0, 1000) // Limit length
}

// Email sanitization
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w@.-]/g, '') // Only allow word chars, @, ., -
}

// Phone number sanitization (Italian format)
export function sanitizePhone(phone: string): string {
  return phone
    .replace(/[^\d+\-\s()]/g, '') // Only allow digits, +, -, space, parentheses
    .trim()
}

// URL sanitization
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid protocol')
    }
    return urlObj.toString()
  } catch {
    return ''
  }
}

// SKU/Product code sanitization
export function sanitizeSku(sku: string): string {
  return sku
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9\-_]/g, '') // Only allow alphanumeric, hyphens, underscores
    .substring(0, 50)
}

// Price sanitization (ensure valid number format)
export function sanitizePrice(price: string | number): number {
  if (typeof price === 'number') {
    return Math.max(0, Math.round(price * 100) / 100) // Round to 2 decimals, ensure positive
  }

  const numericPrice = parseFloat(price.replace(/[^\d.-]/g, ''))
  return isNaN(numericPrice) ? 0 : Math.max(0, Math.round(numericPrice * 100) / 100)
}

// Generic object sanitization
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  sanitizers: Partial<Record<keyof T, (value: any) => any>>
): T {
  const sanitized = { ...obj }

  for (const [key, sanitizer] of Object.entries(sanitizers)) {
    if (key in sanitized && sanitizer) {
      sanitized[key as keyof T] = sanitizer(sanitized[key as keyof T])
    }
  }

  return sanitized
}

// Sanitization presets for common data types
export const sanitizationPresets = {
  user: {
    name: sanitizeText,
    email: sanitizeEmail,
    phone: sanitizePhone
  },
  product: {
    name: sanitizeText,
    description: sanitizeHtml,
    sku: sanitizeSku,
    price: sanitizePrice
  },
  order: {
    notes: sanitizeHtml,
    shippingAddress: sanitizeText
  },
  customer: {
    name: sanitizeText,
    email: sanitizeEmail,
    phone: sanitizePhone,
    address: sanitizeText,
    notes: sanitizeHtml
  }
}

// File upload sanitization
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 255) // Limit length
}

// SQL injection prevention (for dynamic queries)
export function escapeString(str: string): string {
  return str
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment starts
    .replace(/\*\//g, '') // Remove block comment ends
}

// XSS prevention for attributes
export function sanitizeAttribute(value: string): string {
  return value
    .replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      }
      return entities[char] || char
    })
}