/**
 * Comprehensive TypeScript type definitions for Astra application
 */

// Base entity types
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// User and authentication types
export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  status?: UserStatus
  createdAt?: string
  updatedAt?: string
  lastLoginAt?: string
  profileImage?: string
}

export type UserRole = 'admin' | 'seller'
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended'

export interface AuthSession {
  user: User
  token: string
  expiresAt: string
  csrfToken?: string
}

// Customer types
export interface Customer extends BaseEntity {
  name: string
  email: string
  phone?: string
  address?: CustomerAddress
  notes?: string
  tags?: string[]
  totalOrders: number
  totalSpent: number
  lastOrderAt?: string
  source: CustomerSource
}

export interface CustomerAddress {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

export type CustomerSource = 'direct' | 'social_media' | 'referral' | 'advertising' | 'other'

// Product types
export interface Product extends BaseEntity {
  name: string
  description?: string
  sku: string
  price: number
  compareAtPrice?: number
  costPrice?: number
  category: ProductCategory
  tags: string[]
  images: ProductImage[]
  variants?: ProductVariant[]
  inventory: ProductInventory
  seo: ProductSEO
  status: ProductStatus
  vendor?: string
}

export interface ProductImage {
  id: string
  url: string
  altText?: string
  position: number
}

export interface ProductVariant {
  id: string
  title: string
  price: number
  sku: string
  inventory: ProductInventory
  options: Record<string, string>
}

export interface ProductInventory {
  quantity: number
  trackQuantity: boolean
  allowBackorder: boolean
  lowStockThreshold?: number
}

export interface ProductSEO {
  title?: string
  description?: string
  keywords?: string[]
}

export type ProductCategory = 'electronics' | 'clothing' | 'home' | 'books' | 'sports' | 'other'
export type ProductStatus = 'active' | 'draft' | 'archived'

// Order types
export interface Order extends BaseEntity {
  orderNumber: string
  customer: Customer
  items: OrderItem[]
  subtotal: number
  shipping: number
  tax: number
  discounts: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  shippingAddress: CustomerAddress
  billingAddress?: CustomerAddress
  notes?: string
  tags?: string[]
  source: OrderSource
  cancelledAt?: string
  cancelReason?: string
  refundedAmount?: number
  trackingNumber?: string
  shippedAt?: string
  deliveredAt?: string
}

export interface OrderItem {
  id: string
  product: Product
  variant?: ProductVariant
  quantity: number
  pricePerUnit: number
  totalPrice: number
  sku: string
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'failed'
export type FulfillmentStatus = 'unfulfilled' | 'partially_fulfilled' | 'fulfilled'
export type OrderSource = 'online_store' | 'pos' | 'draft_order' | 'subscription'

// Inventory types
export interface InventoryItem extends BaseEntity {
  product: Product
  variant?: ProductVariant
  location: InventoryLocation
  quantity: number
  reserved: number
  available: number
  committed: number
  damaged: number
  qualityControl: number
  safety: number
}

export interface InventoryLocation {
  id: string
  name: string
  address?: CustomerAddress
  type: LocationType
}

export type LocationType = 'warehouse' | 'store' | 'supplier' | 'customer'

// Integration types
export interface Integration extends BaseEntity {
  name: string
  type: IntegrationType
  status: IntegrationStatus
  config: Record<string, any>
  lastSyncAt?: string
  syncFrequency: SyncFrequency
  endpoints?: IntegrationEndpoint[]
}

export interface IntegrationEndpoint {
  name: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
}

export type IntegrationType = 'ecommerce' | 'accounting' | 'shipping' | 'payment' | 'marketing' | 'crm'
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'syncing'
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual'

// CRM types
export interface Lead extends BaseEntity {
  name: string
  email: string
  phone?: string
  company?: string
  source: LeadSource
  status: LeadStatus
  value?: number
  probability?: number
  notes?: string
  tags?: string[]
  assignedTo?: User
  convertedAt?: string
  convertedToCustomer?: Customer
}

export type LeadSource = 'website' | 'social_media' | 'email' | 'phone' | 'referral' | 'advertisement' | 'trade_show' | 'other'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

// Analytics types
export interface Analytics {
  period: AnalyticsPeriod
  metrics: AnalyticsMetrics
  breakdown: AnalyticsBreakdown
}

export interface AnalyticsMetrics {
  revenue: number
  orders: number
  customers: number
  products: number
  averageOrderValue: number
  conversionRate: number
  returnRate: number
}

export interface AnalyticsBreakdown {
  byDay: AnalyticsDataPoint[]
  byProduct: AnalyticsDataPoint[]
  byCategory: AnalyticsDataPoint[]
  bySource: AnalyticsDataPoint[]
}

export interface AnalyticsDataPoint {
  label: string
  value: number
  change?: number
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '365d' | 'custom'

// Settings types
export interface Settings {
  general: GeneralSettings
  notifications: NotificationSettings
  integrations: IntegrationSettings
  security: SecuritySettings
}

export interface GeneralSettings {
  companyName: string
  companyEmail: string
  companyPhone?: string
  companyAddress?: CustomerAddress
  timezone: string
  currency: string
  language: string
}

export interface NotificationSettings {
  email: EmailNotificationSettings
  push: PushNotificationSettings
  telegram: TelegramNotificationSettings
}

export interface EmailNotificationSettings {
  enabled: boolean
  newOrders: boolean
  lowStock: boolean
  customerMessages: boolean
  systemAlerts: boolean
}

export interface PushNotificationSettings {
  enabled: boolean
  newOrders: boolean
  urgentAlerts: boolean
}

export interface TelegramNotificationSettings {
  enabled: boolean
  chatId?: string
  newOrders: boolean
  lowStock: boolean
  systemAlerts: boolean
}

export interface IntegrationSettings {
  allowedDomains: string[]
  rateLimits: Record<string, number>
  webhooks: WebhookSettings[]
}

export interface WebhookSettings {
  url: string
  events: string[]
  secret?: string
  active: boolean
}

export interface SecuritySettings {
  twoFactorAuth: boolean
  sessionTimeout: number
  passwordPolicy: PasswordPolicy
  ipWhitelist: string[]
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number
}

// API types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  pagination?: Pagination
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  url: string
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
}

// Form types
export interface FormState<T = any> {
  data: T
  errors: Record<string, string>
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
}

export interface FormField<T = any> {
  name: keyof T
  value: any
  error?: string
  touched: boolean
  required: boolean
  disabled: boolean
}

// UI Component types
export interface TableColumn<T = any> {
  key: keyof T
  label: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

export interface TableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: Pagination
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void
  onFilter?: (filters: Record<keyof T, any>) => void
  onRowClick?: (row: T) => void
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

// Event types
export interface AppEvent<T = any> {
  type: string
  payload: T
  timestamp: string
  source: string
}

export interface NotificationEvent extends AppEvent {
  payload: {
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    action?: () => void
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]