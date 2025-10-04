"use client"

import { useState } from 'react'
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
  Plus
} from 'lucide-react'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newProduct: any) => void
}

interface FormData {
  name: string
  sku: string
  price: string
  stock: string
}

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    sku: '',
    price: '',
    stock: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        user_id: session.user.id
      }
      const supabase = getAuthenticatedClient()
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single()
      if (error) {        if (error.code === '23505' && error.message.includes('user_id_sku')) {
          throw new Error('A product with this SKU already exists. Please use a different SKU.')
        }
        throw new Error(error.message)
      }

      // Reset form
      setFormData({
        name: '',
        sku: '',
        price: '',
        stock: ''
      })

      // Pass the new product data to parent
      onSuccess(data)
      onClose()
    } catch (error: any) {      alert(`Failed to create product: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
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
            <Plus className="h-5 w-5" />
            Add New Product
          </DialogTitle>
          <DialogDescription>
            Add a new product to your inventory. <br />
            <em>SKU must match your webshop product</em>
          </DialogDescription>
        </DialogHeader>

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

            <div className="grid grid-cols-2 gap-4">
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
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isFormValid}>
              {loading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Product
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}