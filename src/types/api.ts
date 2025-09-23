/**
 * API-specific type definitions
 */

// Generic API response wrapper
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  pagination?: PaginationInfo
  meta?: ResponseMeta
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  field?: string
  stack?: string // Only in development
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ResponseMeta {
  timestamp: string
  version: string
  requestId: string
  executionTime?: number
}

// Request types
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
  timeout?: number
}

export interface PaginationRequest {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, any>
}

// Specific API endpoints
export interface OrdersApiParams extends PaginationRequest {
  status?: string[]
  dateFrom?: string
  dateTo?: string
  customerId?: string
}

export interface CustomersApiParams extends PaginationRequest {
  source?: string[]
  tags?: string[]
  minTotalSpent?: number
  maxTotalSpent?: number
}

export interface ProductsApiParams extends PaginationRequest {
  category?: string[]
  status?: string[]
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
}

// WebSocket types
export interface WebSocketMessage<T = any> {
  type: string
  payload: T
  timestamp: string
  id: string
}

export interface WebSocketResponse<T = any> extends WebSocketMessage<T> {
  success: boolean
  error?: string
}

// File upload types
export interface FileUploadResponse {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
  thumbnailUrl?: string
}

export interface FileUploadProgress {
  loaded: number
  total: number
  percentage: number
}

// Batch operation types
export interface BatchRequest<T = any> {
  action: 'create' | 'update' | 'delete'
  items: T[]
}

export interface BatchResponse<T = any> {
  success: T[]
  errors: Array<{
    item: T
    error: ApiError
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}