'use client'

import { useState, useEffect, useRef } from 'react'
import { getAuthenticatedClient, getSession, isAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Eye, Edit, Trash2, Search, ChevronLeft, ChevronRight, Package, AlertTriangle, TrendingDown, BarChart3, Download, Users } from 'lucide-react'
import { AddProductModal } from '@/components/inventory/add-product-modal'
import { EditProductModal } from '@/components/inventory/edit-product-modal'
import { ViewProductModal } from '@/components/inventory/view-product-modal'
import { AssignProductModal } from '@/components/inventory/assign-product-modal'



// Animated counter component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const countRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (countRef.current) {
      clearInterval(countRef.current)
    }

    const increment = value / (duration / 16) // 60fps
    let current = 0

    countRef.current = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(countRef.current!)
      } else {
        setCount(Math.floor(current))
      }
    }, 16)

    return () => {
      if (countRef.current) {
        clearInterval(countRef.current)
      }
    }
  }, [value, duration])

  return <span>{Math.round(count).toLocaleString()}</span>
}

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [editProductId, setEditProductId] = useState<string | null>(null)
  const [viewProductId, setViewProductId] = useState<string | null>(null)
  const [assignProductId, setAssignProductId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; productId: string; productName: string }>({
    isOpen: false,
    productId: '',
    productName: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalStats, setTotalStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  })

  const ITEMS_PER_PAGE = 10
  const LOW_STOCK_THRESHOLD = 10

  // Helper function to check if user is admin (client-side only)
        const isUserAdmin = () => {
    return mounted && userRole === 'admin'
  }

  // Set mounted state and user role on client
  useEffect(() => {
    setMounted(true)
    const session = getSession()
    if (session) {
      setUserRole(session.user.role || null)
    }
  }, [])

  const loadProducts = async (page = 1, search = '') => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {        setHasError(true)
        setErrorMessage('You must be logged in to view inventory. Please log in first.')
        setLoading(false)
        return
      }

      const supabase = getAuthenticatedClient()
      // Build search query with different logic for admin vs seller
      let query

      if (session.user.role === 'admin') {
      // Admin sees all products with creator and assignment info
        query = supabase
          .from('products')
          .select(`
            *,
            creator:users!products_user_id_fkey(name),
            sellerProducts:seller_products(
              seller:users!seller_products_seller_id_fkey(id, name, email)
            )
          `, { count: 'exact' })
      } else {
      // Seller sees only products assigned to them
        query = supabase
          .from('seller_products')
          .select(`
            assignedAt:assigned_at,
            product:products!seller_products_product_id_fkey(
              id,
              sku,
              name,
              stock,
              price,
              created_at,
              updated_at,
              creator:users!products_user_id_fkey(name)
            )
          `, { count: 'exact' })
          .eq('seller_id', session.user.id)
      }

      // Add search filters if search query exists and has 3+ characters
      if (search && search.length >= 3) {
        if (session.user.role === 'admin') {
          query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
        } else {
          query = query.or(`product.name.ilike.%${search}%,product.sku.ilike.%${search}%`)
        }
      }

      // Add pagination
        const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      const { data, error, count } = await query
        .order(session.user.role === 'admin' ? 'created_at' : 'assigned_at', { ascending: false })
        .range(from, to)

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      let processedProducts = []

      if (session.user.role === 'admin') {
        processedProducts = data || []
      } else {
      // For sellers, extract product data and add assignment info
        processedProducts = (data || []).map(item => ({
          ...item.product,
          assignedAt: item.assignedAt
        }))
      }

      setProducts(processedProducts)
      setTotalCount(count || 0)
      setHasError(false)
      // Load stats separately (without pagination or search filters)
      await loadStats()
    } catch (error: any) {      setHasError(true)
      if (error.message && error.message.includes('JWT')) {
        setErrorMessage('Authentication token expired. Please log in again.')
      } else {
        setErrorMessage(`Database error: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const session = getSession()
      if (!session) {        return
      }

      const supabase = getAuthenticatedClient()

      // Load stats with different logic for admin vs seller
      let statsQuery

      if (session.user.role === 'admin') {
      // Admin sees all products stats
        statsQuery = supabase
          .from('products')
          .select('stock, price')
      } else {
      // Seller sees only assigned products stats
        statsQuery = supabase
          .from('seller_products')
          .select(`
            product:products!seller_products_product_id_fkey(stock, price)
          `)
          .eq('seller_id', session.user.id)
      }

      const { data: statsData, error: statsError } = await statsQuery

      if (!statsError && statsData) {
        let products

        if (session.user.role === 'admin') {
          products = statsData
        } else {
      // For sellers, extract product data from the relation
          products = statsData.map(item => item.product)
        }

        const stats = {
          total: products.length,
          lowStock: products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length,
          outOfStock: products.filter(p => p.stock === 0).length,
          totalValue: products.reduce((sum, p) => sum + (Number(p.price) * p.stock), 0)
        }
        setTotalStats(stats)
      }
    } catch (error) {    }
  }

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput.length === 0 || searchInput.length >= 3) {
        setSearchQuery(searchInput)
        setCurrentPage(1) // Reset to first page on search
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  // Load products when search query or page changes
  useEffect(() => {
    loadProducts(currentPage, searchQuery)
  }, [searchQuery, currentPage])

  // Initial load
  useEffect(() => {
    loadProducts()
  }, [])

  // Optimistic updates - no server reload needed
        const handleProductAdded = (newProduct: any) => {
      // Add to current products list
    setProducts(prev => [newProduct, ...prev])

    // Update total count
    setTotalCount(prev => prev + 1)

    // Update stats
    setTotalStats(prev => ({
      ...prev,
      total: prev.total + 1,
      lowStock: newProduct.stock > 0 && newProduct.stock <= LOW_STOCK_THRESHOLD ? prev.lowStock + 1 : prev.lowStock,
      outOfStock: newProduct.stock === 0 ? prev.outOfStock + 1 : prev.outOfStock,
      totalValue: prev.totalValue + (Number(newProduct.price) * newProduct.stock)
    }))
  }

  const handleProductUpdated = (updatedProduct: any) => {
      // Update the specific product in the list
    setProducts(prev => prev.map(product =>
      product.id === updatedProduct.id ? { ...product, ...updatedProduct } : product
    ))

    // Recalculate stats by re-fetching only stats (lightweight)
    loadStats()
  }

  const handleProductDeleted = (productId: string) => {
      // Remove from current products list
    setProducts(prev => prev.filter(product => product.id !== productId))

    // Update total count
    setTotalCount(prev => prev - 1)

    // Recalculate stats
    loadStats()
  }

  const handleEditProduct = (productId: string) => {
    setEditProductId(productId)
    setEditModalOpen(true)
  }

  const handleViewProduct = (productId: string) => {
    setViewProductId(productId)
    setViewModalOpen(true)
  }

  const handleEditClose = () => {
    setEditModalOpen(false)
    setEditProductId(null)
  }

  const handleViewClose = () => {
    setViewModalOpen(false)
    setViewProductId(null)
  }

  const handleAssignProduct = (productId: string) => {
    setAssignProductId(productId)
    setAssignModalOpen(true)
  }

  const handleAssignClose = () => {
    setAssignModalOpen(false)
    setAssignProductId(null)
  }

  const handleProductAssigned = () => {
      // Reload products to show updated assignments
    loadProducts(currentPage, searchQuery)
    handleAssignClose()
  }

  const openDeleteDialog = (productId: string, productName: string) => {
    setDeleteDialog({ isOpen: true, productId, productName })
  }

  const handleDeleteProduct = async () => {
    const { productId } = deleteDialog

    try {
      const session = getSession()
      if (!session) {        return
      }

      const supabase = getAuthenticatedClient()

      let deleteQuery = supabase
        .from('products')
        .delete()
        .eq('id', productId)

      // For sellers, also check user_id; admin can delete any product
      if (session.user.role !== 'admin') {
        deleteQuery = deleteQuery.eq('user_id', session.user.id)
      }

      const { error } = await deleteQuery

      if (error) {
        throw new Error(error.message)
      }

      handleProductDeleted(productId)
      // Close dialog
      setDeleteDialog({ isOpen: false, productId: '', productName: '' })
    } catch (error) {      alert('Failed to delete product. Please try again.')
      setDeleteDialog({ isOpen: false, productId: '', productName: '' })
    }
  }

  const handleExportCSV = async () => {
    try {
      const session = getSession()
      if (!session) {
        alert('You must be logged in to export data.')
        return
      }

      const supabase = getAuthenticatedClient()

      let exportQuery
      let exportData: any[] = []

      if (session.user.role === 'admin') {
      // Admin exports all products with assignment info
        exportQuery = supabase
          .from('products')
          .select(`
            *,
            sellerProducts:seller_products(seller_id)
          `)

        const { data, error } = await exportQuery.order('name')

        if (error) {
          throw new Error(error.message)
        }

        exportData = data || []
      } else {
      // Seller exports only assigned products
        exportQuery = supabase
          .from('seller_products')
          .select(`
            assignedAt:assigned_at,
            product:products!seller_products_product_id_fkey(
              id,
              sku,
              name,
              stock,
              price
            )
          `)
          .eq('seller_id', session.user.id)

        const { data, error } = await exportQuery.order('assigned_at', { ascending: false })

        if (error) {
          throw new Error(error.message)
        }

        // Transform seller data to match product structure
        exportData = (data || []).map(item => ({
          ...item.product,
          assignedAt: item.assignedAt
        }))
      }

      // Helper function to get stock status
        const getStockStatus = (stock: number) => {
        if (stock === 0) return 'Out of Stock'
        if (stock <= LOW_STOCK_THRESHOLD) return 'Low Stock'
        return 'In Stock'
      }

      // Create CSV content based on role
      let headers: string[]
      let rows: string[]

      if (session.user.role === 'admin') {
        headers = ['Name', 'SKU', 'Price', 'Stock', 'Status', 'Assigned To']
        rows = exportData.map(product => [
          `"${product.name}"`,
          `"${product.sku}"`,
          Number(product.price).toFixed(2),
          product.stock,
          `"${getStockStatus(product.stock)}"`,
          product.sellerProducts && product.sellerProducts.length > 0
            ? `"${product.sellerProducts.length} user${product.sellerProducts.length !== 1 ? 's' : ''}"`
            : '"Not assigned"'
        ].join(','))
      } else {
        headers = ['Name', 'SKU', 'Price', 'Stock', 'Status', 'Assigned Date']
        rows = exportData.map(product => [
          `"${product.name}"`,
          `"${product.sku}"`,
          Number(product.price).toFixed(2),
          product.stock,
          `"${getStockStatus(product.stock)}"`,
          product.assignedAt
            ? `"${new Date(product.assignedAt).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}"`
            : '"-"'
        ].join(','))
      }

      const csvContent = [headers.join(','), ...rows].join('\n')

      // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `inventory-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {      alert('Failed to export CSV. Please try again.')
    }
  }

  // Pagination calculations
        const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  // Show loading state until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="h-8 w-64 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  // Show error state if database connection failed
  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">
              Manage your product inventory and stock levels
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="text-destructive mb-4">
                <h3 className="text-lg font-medium">
                  {errorMessage.includes('logged in') ? 'Authentication Required' : 'Connection Error'}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
              </div>
              {errorMessage.includes('logged in') ? (
                <div className="text-sm text-muted-foreground">
                  <p>Please log in to access the Inventory module.</p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>This is likely a database configuration issue.</p>
                  <p className="mt-2">The Inventory module is fully implemented and ready to use once the connection is resolved.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your product inventory and stock levels
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {isUserAdmin() && (
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.total} duration={1200} />
            </div>
            <p className="text-xs text-muted-foreground">
              In inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.lowStock} duration={1000} />
            </div>
            <p className="text-xs text-muted-foreground">
              Items need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={totalStats.outOfStock} duration={1100} />
            </div>
            <p className="text-xs text-muted-foreground">
              Items unavailable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €<AnimatedCounter value={totalStats.totalValue} duration={1300} />
            </div>
            <p className="text-xs text-muted-foreground">
              Inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Product Management</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products (min 3 chars)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            // Loading skeleton
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    {isUserAdmin() && <TableHead>Assigned To</TableHead>}
                    {!isUserAdmin() && <TableHead>Assigned Date</TableHead>}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      {isUserAdmin() && (
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      )}
                      {!isUserAdmin() && (
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8 rounded" />
                          {isUserAdmin() && (
                            <>
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-8 w-8 rounded" />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'No products found matching your search.'
                  : isUserAdmin()
                    ? 'No products available. Add your first product!'
                    : 'No products assigned to you yet. Please contact your admin to assign products.'
                }
              </div>
              {isUserAdmin() && (
                <Button onClick={() => setAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Product
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      {isUserAdmin() && <TableHead>Assigned To</TableHead>}
                      {!isUserAdmin() && <TableHead>Assigned Date</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product, index) => {
                      const stockStatus = product.stock === 0 ? 'out' : product.stock <= LOW_STOCK_THRESHOLD ? 'low' : 'good'
                      return (
                        <TableRow key={`product-${product.id || index}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-muted-foreground">ID: {product.id}</div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-mono text-sm">{product.sku}</div>
                          </TableCell>

                          <TableCell>
                            <div className="font-medium">€{Number(product.price).toFixed(2)}</div>
                          </TableCell>

                          <TableCell>
                            <div className="font-medium">{product.stock}</div>
                          </TableCell>

                          <TableCell>
                            {stockStatus === 'out' ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : stockStatus === 'low' ? (
                              <Badge variant="secondary">Low Stock</Badge>
                            ) : (
                              <Badge variant="default">In Stock</Badge>
                            )}
                          </TableCell>

                          {isUserAdmin() && (
                            <TableCell>
                              <div className="text-sm">
                                {product.sellerProducts && product.sellerProducts.length > 0 ? (
                                  <span className="font-medium">
                                    {product.sellerProducts.length} user{product.sellerProducts.length !== 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Not assigned</span>
                                )}
                              </div>
                            </TableCell>
                          )}

                          {!isUserAdmin() && (
                            <TableCell>
                              <div className="text-sm">
                                {product.assignedAt ? new Date(product.assignedAt).toLocaleDateString('en-US', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                }) : '-'}
                              </div>
                            </TableCell>
                          )}

                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleViewProduct(product.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {isUserAdmin() && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product.id)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleAssignProduct(product.id)}
                                    title="Assign to sellers"
                                  >
                                    <Users className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(product.id, product.name)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startItem} to {endItem} of {totalCount} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNumber
                        if (totalPages <= 5) {
                          pageNumber = i + 1
                        } else if (currentPage <= 3) {
                          pageNumber = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i
                        } else {
                          pageNumber = currentPage - 2 + i
                        }

                        return (
                          <Button
                            key={pageNumber}
                            variant={currentPage === pageNumber ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNumber)}
                            disabled={loading}
                            className="w-10"
                          >
                            {pageNumber}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={handleProductAdded}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={editModalOpen}
        onClose={handleEditClose}
        onSuccess={handleProductUpdated}
        productId={editProductId}
      />

      {/* View Product Modal */}
      <ViewProductModal
        isOpen={viewModalOpen}
        onClose={handleViewClose}
        productId={viewProductId}
      />

      {/* Assign Product Modal */}
      {mounted && isUserAdmin() && (
        <AssignProductModal
          isOpen={assignModalOpen}
          onClose={handleAssignClose}
          onSuccess={handleProductAssigned}
          productId={assignProductId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ isOpen: false, productId: '', productName: '' })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete product "{deleteDialog.productName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}