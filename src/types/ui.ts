/**
 * UI component and state type definitions
 */

import React from 'react'

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
  'data-testid'?: string
}

// Button types
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  icon?: React.ReactNode
}

// Input types
export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  placeholder?: string
  value?: string
  defaultValue?: string
  disabled?: boolean
  required?: boolean
  error?: string
  label?: string
  helperText?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
}

// Form types
export interface FormState<T = Record<string, any>> {
  data: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isDirty: boolean
  isValid: boolean
}

export interface FormFieldProps<T = any> {
  name: keyof T
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  onChange: (value: any) => void
  onBlur?: () => void
}

// Table types
export interface TableColumn<T = any> {
  key: keyof T | string
  label: string
  sortable?: boolean
  filterable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: T, index: number) => React.ReactNode
  headerRender?: () => React.ReactNode
}

export interface TableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  empty?: React.ReactNode
  rowKey?: keyof T | ((row: T) => string)
  onRowClick?: (row: T, index: number) => void
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void
  sortColumn?: keyof T
  sortDirection?: 'asc' | 'desc'
  pagination?: PaginationProps
  selection?: TableSelectionProps<T>
}

export interface TableSelectionProps<T = any> {
  type: 'single' | 'multiple'
  selectedKeys: string[]
  onSelectionChange: (keys: string[]) => void
  getRowKey: (row: T) => string
}

// Pagination types
export interface PaginationProps {
  page: number
  pageSize: number
  total: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: boolean
  onChange: (page: number, pageSize: number) => void
}

// Modal types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  maskClosable?: boolean
  destroyOnClose?: boolean
  footer?: React.ReactNode
  onOk?: () => void
  onCancel?: () => void
  loading?: boolean
}

// Notification types
export interface NotificationProps {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  closable?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

// Navigation types
export interface NavigationItem {
  key: string
  label: string
  icon?: React.ReactNode
  href?: string
  onClick?: () => void
  children?: NavigationItem[]
  disabled?: boolean
  badge?: string | number
  adminOnly?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
  current?: boolean
}

// Loading states
export interface LoadingState {
  isLoading: boolean
  message?: string
  progress?: number
}

export interface AsyncState<T = any> {
  data?: T
  loading: boolean
  error?: string
  lastUpdated?: Date
}

// Theme types
export interface ThemeColors {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
  info: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
}

export interface ThemeConfig {
  colors: ThemeColors
  fonts: {
    primary: string
    secondary: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
  breakpoints: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
  }
  shadows: {
    sm: string
    md: string
    lg: string
  }
}

// Layout types
export interface LayoutProps extends BaseComponentProps {
  sidebar?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  sidebarCollapsed?: boolean
  onSidebarToggle?: () => void
}

// Search types
export interface SearchProps extends BaseComponentProps {
  placeholder?: string
  value?: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  loading?: boolean
  suggestions?: string[]
  debounceMs?: number
}

// Filter types
export interface FilterOption {
  label: string
  value: string | number
  count?: number
}

export interface FilterGroup {
  key: string
  label: string
  type: 'select' | 'multiselect' | 'range' | 'date' | 'text'
  options?: FilterOption[]
  min?: number
  max?: number
}

export interface ActiveFilter {
  key: string
  value: any
  label: string
}

export interface FilterProps {
  groups: FilterGroup[]
  activeFilters: ActiveFilter[]
  onChange: (filters: ActiveFilter[]) => void
  onClear: () => void
}

// Chart types
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
  metadata?: Record<string, any>
}

export interface ChartProps {
  data: ChartDataPoint[]
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area'
  title?: string
  width?: number
  height?: number
  responsive?: boolean
  legend?: boolean
  tooltip?: boolean
}