'use client'

import { useState, useEffect } from 'react'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface EditOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (order: any) => void
  orderId: string | null
}

export function EditOrderModal({ isOpen, onClose, onSuccess, orderId }: EditOrderModalProps) {
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [formData, setFormData] = useState({
    status: '',
    totalAmount: '',
    orderCreatedAt: '',
    trackingId: ''
  })

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder()
    }
  }, [isOpen, orderId])

  const loadOrder = async () => {
    if (!orderId) return

    setInitialLoading(true)
    try {
      const session = getSession()
      if (!session) {        return
      }

      const supabase = getAuthenticatedClient()

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          integration:integrations!inner(user_id)
        `)
        .eq('id', orderId)
        .eq('integration.user_id', session.user.id)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      setFormData({
        status: data.status || '',
        totalAmount: data.total_amount ? Number(data.total_amount).toFixed(2) : '',
        orderCreatedAt: data.order_created_at ? new Date(data.order_created_at).toISOString().split('T')[0] : '',
        trackingId: data.tracking_id || ''
      })
    } catch (error: any) {      alert(`Failed to load order: ${error.message}`)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.status || !formData.totalAmount) {
      alert('Status and total amount are required')
      return
    }

    if (!orderId) return

    setLoading(true)
    try {
      const session = getSession()
      if (!session) {
        alert('Please log in to edit orders')
        return
      }

      const supabase = getAuthenticatedClient()

      const orderData = {
        status: formData.status,
        total_amount: parseFloat(formData.totalAmount),
        order_created_at: formData.orderCreatedAt ? new Date(formData.orderCreatedAt).toISOString() : undefined,
        tracking_id: formData.trackingId || null,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', orderId)
        .select(`
          *,
          customer:customers(id, name, email),
          integration:integrations(name, type),
          items:order_items(*)
        `)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      onSuccess(data)
      onClose()
    } catch (error: any) {      alert(`Failed to update order: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      status: '',
      totalAmount: '',
      orderCreatedAt: '',
      trackingId: ''
    })
    onClose()
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'paid', label: 'Paid' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
        </DialogHeader>

        {initialLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading order...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-order-status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-order-amount">Total Amount *</Label>
              <Input
                id="edit-order-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.totalAmount}
                onChange={(e) => handleInputChange('totalAmount', e.target.value)}
                placeholder="Enter total amount"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-order-date">Order Date</Label>
              <Input
                id="edit-order-date"
                type="date"
                value={formData.orderCreatedAt}
                onChange={(e) => handleInputChange('orderCreatedAt', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tracking-id">Tracking ID (Optional)</Label>
              <Input
                id="edit-tracking-id"
                type="text"
                value={formData.trackingId}
                onChange={(e) => handleInputChange('trackingId', e.target.value)}
                placeholder="Enter tracking ID"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Order
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}