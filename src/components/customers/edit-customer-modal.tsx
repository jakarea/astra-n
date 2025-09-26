'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

interface EditCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (customer: any) => void
  customerId: string | null
}

export function EditCustomerModal({ isOpen, onClose, onSuccess, customerId }: EditCustomerModalProps) {
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    billing: {
      first_name: '',
      last_name: '',
      company: '',
      address_1: '',
      address_2: '',
      city: '',
      state: '',
      country: '',
      postcode: '',
      phone: ''
    },
    shipping: {
      first_name: '',
      last_name: '',
      company: '',
      address_1: '',
      address_2: '',
      city: '',
      state: '',
      country: '',
      postcode: ''
    },
    shippingSameAsBilling: false
  })

  const loadCustomer = useCallback(async () => {
    if (!customerId) return

    setInitialLoading(true)
    try {
      const session = getSession()
      if (!session) {
        console.error('No session found')
        return
      }

      const supabase = getAuthenticatedClient()

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Parse address object into billing/shipping sections
      const address = data.address || {}
      const billing = address.billing || {}
      const shipping = address.shipping || {}

      // Check if shipping is same as billing
      const shippingSameAsBilling = JSON.stringify(billing) === JSON.stringify(shipping)

      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        billing: {
          first_name: billing.first_name || '',
          last_name: billing.last_name || '',
          company: billing.company || '',
          address_1: billing.address_1 || '',
          address_2: billing.address_2 || '',
          city: billing.city || '',
          state: billing.state || '',
          country: billing.country || '',
          postcode: billing.postcode || '',
          phone: billing.phone || ''
        },
        shipping: {
          first_name: shipping.first_name || '',
          last_name: shipping.last_name || '',
          company: shipping.company || '',
          address_1: shipping.address_1 || '',
          address_2: shipping.address_2 || '',
          city: shipping.city || '',
          state: shipping.state || '',
          country: shipping.country || '',
          postcode: shipping.postcode || ''
        },
        shippingSameAsBilling
      })
    } catch (error: any) {
      console.error('Error loading customer:', error)
      alert(`Failed to load customer: ${error.message}`)
    } finally {
      setInitialLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    if (isOpen && customerId) {
      loadCustomer()
    }
  }, [isOpen, customerId, loadCustomer])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddressChange = (section: 'billing' | 'shipping', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleShippingSameChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      shippingSameAsBilling: checked,
      shipping: checked ? { ...prev.billing } : {
        first_name: '',
        last_name: '',
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        country: '',
        postcode: ''
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      alert('Name and email are required')
      return
    }

    if (!customerId) return

    setLoading(true)
    try {
      const session = getSession()
      if (!session) {
        alert('Please log in to edit customers')
        return
      }

      const supabase = getAuthenticatedClient()

      // Build address object in the required format
      const billingData = {
        first_name: formData.billing.first_name || '',
        last_name: formData.billing.last_name || '',
        company: formData.billing.company || '',
        address_1: formData.billing.address_1 || '',
        address_2: formData.billing.address_2 || '',
        city: formData.billing.city || '',
        state: formData.billing.state || '',
        country: formData.billing.country || '',
        postcode: formData.billing.postcode || '',
        phone: formData.billing.phone || ''
      }

      const shippingData = {
        first_name: formData.shipping.first_name || '',
        last_name: formData.shipping.last_name || '',
        company: formData.shipping.company || '',
        address_1: formData.shipping.address_1 || '',
        address_2: formData.shipping.address_2 || '',
        city: formData.shipping.city || '',
        state: formData.shipping.state || '',
        country: formData.shipping.country || '',
        postcode: formData.shipping.postcode || ''
      }

      const addressObj = {
        billing: billingData,
        shipping: shippingData
      }

      const customerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        address: addressObj,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', customerId)
        .eq('user_id', session.user.id)
        .select(`
          *
        `)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      onSuccess(data)
      onClose()
    } catch (error: any) {
      console.error('Error updating customer:', error)
      alert(`Failed to update customer: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      billing: {
        first_name: '',
        last_name: '',
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        country: '',
        postcode: '',
        phone: ''
      },
      shipping: {
        first_name: '',
        last_name: '',
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        country: '',
        postcode: ''
      },
      shippingSameAsBilling: false
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        {initialLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading customer...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-customer-name">Name *</Label>
                <Input
                  id="edit-customer-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-customer-email">Email *</Label>
                <Input
                  id="edit-customer-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter customer email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-customer-phone">Phone</Label>
                <Input
                  id="edit-customer-phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            {/* Billing Address Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Address</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={formData.billing.first_name}
                    onChange={(e) => handleAddressChange('billing', 'first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={formData.billing.last_name}
                    onChange={(e) => handleAddressChange('billing', 'last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={formData.billing.company}
                  onChange={(e) => handleAddressChange('billing', 'company', e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={formData.billing.address_1}
                  onChange={(e) => handleAddressChange('billing', 'address_1', e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.billing.city}
                    onChange={(e) => handleAddressChange('billing', 'city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State/Province</Label>
                  <Input
                    value={formData.billing.state}
                    onChange={(e) => handleAddressChange('billing', 'state', e.target.value)}
                    placeholder="State/Province"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={formData.billing.country}
                    onChange={(e) => handleAddressChange('billing', 'country', e.target.value)}
                    placeholder="Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input
                    value={formData.billing.postcode}
                    onChange={(e) => handleAddressChange('billing', 'postcode', e.target.value)}
                    placeholder="Postal code"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.billing.phone}
                  onChange={(e) => handleAddressChange('billing', 'phone', e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>

            {/* Shipping Same as Billing Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-same-as-billing"
                checked={formData.shippingSameAsBilling}
                onCheckedChange={handleShippingSameChange}
              />
              <Label htmlFor="edit-same-as-billing">Shipping address same as billing</Label>
            </div>

            {/* Shipping Address Section */}
            {!formData.shippingSameAsBilling && (
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Shipping Address</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      value={formData.shipping.first_name}
                      onChange={(e) => handleAddressChange('shipping', 'first_name', e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={formData.shipping.last_name}
                      onChange={(e) => handleAddressChange('shipping', 'last_name', e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={formData.shipping.company}
                    onChange={(e) => handleAddressChange('shipping', 'company', e.target.value)}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.shipping.address_1}
                    onChange={(e) => handleAddressChange('shipping', 'address_1', e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formData.shipping.city}
                      onChange={(e) => handleAddressChange('shipping', 'city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State/Province</Label>
                    <Input
                      value={formData.shipping.state}
                      onChange={(e) => handleAddressChange('shipping', 'state', e.target.value)}
                      placeholder="State/Province"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={formData.shipping.country}
                      onChange={(e) => handleAddressChange('shipping', 'country', e.target.value)}
                      placeholder="Country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={formData.shipping.postcode}
                      onChange={(e) => handleAddressChange('shipping', 'postcode', e.target.value)}
                      placeholder="Postal code"
                    />
                  </div>
                </div>
              </div>
            )}

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
                Update Customer
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}