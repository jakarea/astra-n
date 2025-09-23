export interface AppError {
  message: string
  code?: string
  details?: any
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends Error {
  constructor(message: string, public status?: number) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export function handleError(error: unknown): AppError {
  console.error('Error occurred:', error)

  if (error instanceof ValidationError) {
    return {
      message: error.message,
      code: 'VALIDATION_ERROR',
      details: { field: error.field }
    }
  }

  if (error instanceof NetworkError) {
    return {
      message: error.status === 404
        ? 'Resource not found'
        : error.status === 403
        ? 'Access denied'
        : error.status === 500
        ? 'Server error'
        : 'Connection error',
      code: 'NETWORK_ERROR',
      details: { status: error.status }
    }
  }

  if (error instanceof AuthError) {
    return {
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    }
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    details: error
  }
}

export function createApiErrorHandler(fallbackMessage: string = 'API Error') {
  return (error: unknown) => {
    const appError = handleError(error)

    // Log error for debugging
    console.error('API Error:', appError)

    // Return user-friendly message
    return appError.message || fallbackMessage
  }
}

export const errorMessages = {
  network: {
    offline: 'Internet connection not available',
    timeout: 'Request timed out. Please try again.',
    serverError: 'Server error. Please try again later.'
  },
  validation: {
    required: 'This field is required',
    email: 'Invalid email address',
    minLength: (min: number) => `Must contain at least ${min} characters`,
    maxLength: (max: number) => `Cannot exceed ${max} characters`
  },
  auth: {
    unauthorized: 'Invalid credentials',
    sessionExpired: 'Session expired. Please log in again.',
    accessDenied: 'You do not have permission to access this resource'
  },
  generic: {
    unexpected: 'An unexpected error occurred',
    tryAgain: 'Please try again later',
    contactSupport: 'If the problem persists, contact support'
  }
}