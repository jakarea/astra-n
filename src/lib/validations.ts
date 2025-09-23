import { z } from 'zod'
import { sanitizeEmail, sanitizeText, sanitizePhone, sanitizePrice, sanitizeSku } from './sanitization'

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string()
    .transform(sanitizeEmail)
    .pipe(z.string().email('Invalid email address')),
  password: z.string().min(1, 'Password required')
})

export const resetPasswordSchema = z.object({
  email: z.string()
    .transform(sanitizeEmail)
    .pipe(z.string().email('Invalid email address'))
})

// User management validation schemas
export const createUserSchema = z.object({
  name: z.string()
    .transform(sanitizeText)
    .pipe(z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters')),
  email: z.string()
    .transform(sanitizeEmail)
    .pipe(z.string().email('Invalid email address')),
  role: z.enum(['admin', 'seller'], {
    required_error: 'Role required',
    invalid_type_error: 'Role invalid'
  })
})

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['admin', 'seller']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional()
})

// Integration validation schemas
export const createIntegrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  type: z.string().min(1, 'Type required'),
  domain: z.string().url('Invalid domain URL'),
  webhook_secret: z.string().min(8, 'Webhook secret must be at least 8 characters'),
  admin_access_token: z.string().min(1, 'Access token required').optional()
})

export const updateIntegrationSchema = createIntegrationSchema.partial()

// Telegram settings validation schemas
export const telegramSettingsSchema = z.object({
  chatId: z.string().regex(/^-?\d+$/, 'Chat ID must be a valid number'),
  notificationsEnabled: z.boolean()
})

// Product/Inventory validation schemas
export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Name cannot exceed 200 characters'),
  sku: z.string().min(1, 'SKU required').max(50, 'SKU cannot exceed 50 characters'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional(),
  price: z.number().min(0, 'Price must be positive'),
  stock_quantity: z.number().int().min(0, 'Stock quantity must be a positive integer'),
  category: z.string().max(100, 'Category cannot exceed 100 characters').optional(),
  is_active: z.boolean().default(true)
})

export const updateProductSchema = createProductSchema.partial()

// Customer validation schemas
export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),
  address: z.string().max(300, 'Address cannot exceed 300 characters').optional(),
  city: z.string().max(100, 'City cannot exceed 100 characters').optional(),
  postal_code: z.string().max(20, 'Postal code cannot exceed 20 characters').optional(),
  country: z.string().max(100, 'Country cannot exceed 100 characters').optional()
})

export const updateCustomerSchema = createCustomerSchema.partial()

// Order validation schemas
export const createOrderSchema = z.object({
  external_order_id: z.string().min(1, 'External order ID required'),
  customer_id: z.number().int().positive('Invalid customer ID'),
  integration_id: z.number().int().positive('Invalid integration ID'),
  total_amount: z.number().min(0, 'Total amount must be positive'),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  order_created_at: z.string().datetime('Invalid order date'),
  items: z.array(z.object({
    product_sku: z.string().min(1, 'Product SKU required'),
    product_name: z.string().min(1, 'Product name required'),
    quantity: z.number().int().positive('Quantity must be a positive integer'),
    price_per_unit: z.number().min(0, 'Unit price must be positive')
  })).min(1, 'At least one item is required')
})

export const updateOrderSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  tracking_number: z.string().max(100, 'Tracking number cannot exceed 100 characters').optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
})

// CRM Lead validation schemas - Updated to match Prisma schema
export const createCrmLeadSchema = z.object({
  name: z.string()
    .transform(sanitizeText)
    .pipe(z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters')),
  email: z.string()
    .transform(sanitizeEmail)
    .pipe(z.string().email('Invalid email address').optional().or(z.literal(''))),
  phone: z.string()
    .transform(sanitizePhone)
    .pipe(z.string().min(8, 'Invalid phone number').optional().or(z.literal(''))),
  source: z.enum(['website', 'social_media', 'email', 'phone', 'referral', 'advertisement', 'trade_show', 'manual', 'other'], {
    required_error: 'Source required',
    invalid_type_error: 'Source invalid'
  }),
  logisticStatus: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'], {
    required_error: 'Logistics status required'
  }).optional(),
  codStatus: z.enum(['pending', 'confirmed', 'rejected'], {
    required_error: 'COD status required'
  }).optional(),
  kpiStatus: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'], {
    required_error: 'KPI status required'
  }).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string()
    .transform(sanitizeText)
    .pipe(z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')))
})

export const updateCrmLeadSchema = createCrmLeadSchema.partial()

export const createCrmTagSchema = z.object({
  name: z.string()
    .transform(sanitizeText)
    .pipe(z.string().min(2, 'Tag name must be at least 2 characters').max(50, 'Tag name cannot exceed 50 characters')),
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color (hex format required)')
    .optional()
})

// Search and filter validation schemas
export const searchSchema = z.object({
  query: z.string().max(100, 'Search query cannot exceed 100 characters').optional(),
  page: z.number().int().min(1, 'Page number must be positive').default(1),
  limit: z.number().int().min(1).max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.string().max(50, 'Sort field cannot exceed 50 characters').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const dateRangeSchema = z.object({
  start: z.string().datetime('Invalid start date').optional(),
  end: z.string().datetime('Invalid end date').optional()
}).refine((data) => {
  if (data.start && data.end) {
    return new Date(data.start) <= new Date(data.end)
  }
  return true
}, {
  message: 'Start date must be before end date'
})

// Webhook validation schemas
export const webhookOrderSchema = z.object({
  order_id: z.string().min(1, 'Order ID required'),
  customer: z.object({
    name: z.string().min(1, 'Customer name required'),
    email: z.string().email('Invalid customer email'),
    phone: z.string().optional()
  }),
  items: z.array(z.object({
    sku: z.string().min(1, 'SKU required'),
    name: z.string().min(1, 'Product name required'),
    quantity: z.number().int().positive('Quantity must be positive'),
    price: z.number().min(0, 'Price must be positive')
  })).min(1, 'At least one item is required'),
  total: z.number().min(0, 'Total must be positive'),
  created_at: z.string().datetime('Invalid creation date'),
  status: z.string().min(1, 'Order status required')
})

// Type exports for use in components
export type LoginFormData = z.infer<typeof loginSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type CreateUserFormData = z.infer<typeof createUserSchema>
export type UpdateUserFormData = z.infer<typeof updateUserSchema>
export type CreateIntegrationFormData = z.infer<typeof createIntegrationSchema>
export type UpdateIntegrationFormData = z.infer<typeof updateIntegrationSchema>
export type TelegramSettingsFormData = z.infer<typeof telegramSettingsSchema>
export type CreateProductFormData = z.infer<typeof createProductSchema>
export type UpdateProductFormData = z.infer<typeof updateProductSchema>
export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>
export type UpdateCustomerFormData = z.infer<typeof updateCustomerSchema>
export type CreateOrderFormData = z.infer<typeof createOrderSchema>
export type UpdateOrderFormData = z.infer<typeof updateOrderSchema>
export type CreateCrmLeadFormData = z.infer<typeof createCrmLeadSchema>
export type UpdateCrmLeadFormData = z.infer<typeof updateCrmLeadSchema>
export type CreateCrmTagFormData = z.infer<typeof createCrmTagSchema>
export type SearchFormData = z.infer<typeof searchSchema>
export type DateRangeFormData = z.infer<typeof dateRangeSchema>
export type WebhookOrderData = z.infer<typeof webhookOrderSchema>