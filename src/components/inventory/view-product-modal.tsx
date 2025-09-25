"use client"

import { useState, useEffect } from 'react'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Tag,
  DollarSign,
  Hash,
  Eye,
  Calendar,
  AlertTriangle,
  TrendingDown,
  BarChart3
} from 'lucide-react'

interface ViewProductModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string | null
}

interface ProductData {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  created_at: string
  updated_at: string
}

export function ViewProductModal({ isOpen, onClose, productId }: ViewProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState<ProductData | null>(null)

  const LOW_STOCK_THRESHOLD = 10

  // Load product data when modal opens
  useEffect(() => {
    if (isOpen && productId) {
      loadProduct()
    } else if (!isOpen) {
      setProduct(null)
    }
  }, [isOpen, productId])

  const loadProduct = async () => {
    if (!productId) return

    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      if (data) {
        setProduct(data)
      }
    } catch (error: any) {
      console.error('Error loading product:', error)
      alert(`Failed to load product: ${error.message}`)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return 'out'
    if (stock <= LOW_STOCK_THRESHOLD) return 'low'
    return 'good'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Product Details
          </DialogTitle>
          <DialogDescription>
            View complete product information and stock details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="mr-2" />
            Loading product data...
          </div>
        ) : product ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Name
                </Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="font-medium">{product.name}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  SKU
                </Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="font-mono">{product.sku}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price
                  </Label>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="font-semibold text-lg">{formatCurrency(product.price)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Stock
                  </Label>
                  <div className="p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{product.stock}</span>
                      {getStockStatus(product.stock) === 'out' ? (
                        <Badge variant="destructive" className="text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Out of Stock
                        </Badge>
                      ) : getStockStatus(product.stock) === 'low' ? (
                        <Badge variant="secondary" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          In Stock
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculated Values */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Total Value
                </Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="font-semibold text-lg">
                    {formatCurrency(product.price * product.stock)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(product.price)} × {product.stock} units
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Created
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(product.created_at)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Last Updated
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(product.updated_at)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Product ID
                  </Label>
                  <div className="text-sm text-muted-foreground font-mono">
                    {product.id}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Product not found</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}