"use client"

import { useState, useEffect } from 'react'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading"
import {
  Package,
  Tag,
  DollarSign,
  Hash,
  Edit,
  Plus,
  Minus
} from 'lucide-react'

interface EditProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedProduct: any) => void
  productId: string | null
}

interface FormData {
  name: string
  sku: string
  price: string
  stock: string
}

export function EditProductModal({ isOpen, onClose, onSuccess, productId }: EditProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    sku: '',
    price: '',
    stock: ''
  })

  // Load product data when modal opens
  useEffect(() => {
    if (isOpen && productId) {
      loadProduct()
    }
  }, [isOpen, productId])

  const loadProduct = async () => {
    if (!productId) return

    try {
      setInitialLoading(true)
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
        setFormData({
          name: data.name,
          sku: data.sku,
          price: Number(data.price).toFixed(2),
          stock: data.stock.toString()
        })
      }
    } catch (error: any) {
      console.error('Error loading product:', error)
      alert(`Failed to load product: ${error.message}`)
      onClose()
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId) return

    setLoading(true)

    try {
      const session = getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      // Validate required fields
      if (!formData.name || !formData.sku || !formData.price || !formData.stock) {
        throw new Error('All fields are required')
      }

      // Validate numeric fields
      const price = parseFloat(formData.price)
      const stock = parseInt(formData.stock)

      if (isNaN(price) || price < 0) {
        throw new Error('Price must be a valid positive number')
      }

      if (isNaN(stock) || stock < 0) {
        throw new Error('Stock must be a valid positive integer')
      }

      const productData = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        price: price,
        stock: stock,
      }

      console.log('[EDIT_PRODUCT] Updating product with data:', productData)

      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId)
        .eq('user_id', session.user.id)
        .select()
        .single()

      console.log('[EDIT_PRODUCT] Update result:', { data, error })

      if (error) {
        console.error('[EDIT_PRODUCT] Update error:', error)
        if (error.code === '23505' && error.message.includes('user_id_sku')) {
          throw new Error('A product with this SKU already exists. Please use a different SKU.')
        }
        throw new Error(error.message)
      }

      // Pass the updated product data to parent
      onSuccess(data)
      onClose()
    } catch (error: any) {
      console.error('Error updating product:', error)
      alert(`Failed to update product: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading && !initialLoading) {
      onClose()
    }
  }

  const handleStockIncrement = () => {
    const currentStock = parseInt(formData.stock) || 0
    setFormData(prev => ({ ...prev, stock: (currentStock + 1).toString() }))
  }

  const handleStockDecrement = () => {
    const currentStock = parseInt(formData.stock) || 0
    if (currentStock > 0) {
      setFormData(prev => ({ ...prev, stock: (currentStock - 1).toString() }))
    }
  }

  const isFormValid = formData.name.trim() &&
                     formData.sku.trim() &&
                     formData.price.trim() &&
                     formData.stock.trim() &&
                     !isNaN(parseFloat(formData.price)) &&
                     !isNaN(parseInt(formData.stock))

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Product
          </DialogTitle>
          <DialogDescription>
            Update product information and stock levels. <br />
            <em>SKU must match your webshop product</em>
          </DialogDescription>
        </DialogHeader>

        {initialLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner className="mr-2" />
            Loading product data...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  SKU *
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="e.g. PROD-001"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  SKU must match your webshop product
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Price (€) *
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Stock *
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStockDecrement}
                    disabled={parseInt(formData.stock) <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="0"
                    required
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStockIncrement}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading || initialLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || initialLoading || !isFormValid}>
                {loading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Product
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}