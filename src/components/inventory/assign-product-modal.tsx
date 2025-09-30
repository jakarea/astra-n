'use client'

import { useState, useEffect } from 'react'
import { getAuthenticatedClient, getSession } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface AssignProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  productId: string | null
}

interface Seller {
  id: string
  name: string
  email: string
  isAssigned: boolean
}

export function AssignProductModal({ isOpen, onClose, onSuccess, productId }: AssignProductModalProps) {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedSellers, setSelectedSellers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && productId) {
      loadData()
    } else {
      // Reset state when modal closes
      setSellers([])
      setProduct(null)
      setSelectedSellers(new Set())
    }
  }, [isOpen, productId])

  const loadData = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) return

      const supabase = getAuthenticatedClient()

      // Load product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('id', productId)
        .single()

      if (productError) throw productError
      setProduct(productData)

      // Load all sellers
      const { data: sellersData, error: sellersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'seller')
        .order('name')

      if (sellersError) throw sellersError

      // Load current assignments for this product
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('seller_products')
        .select('seller_id')
        .eq('product_id', productId)

      if (assignmentsError) throw assignmentsError

      const assignedSellerIds = new Set(assignmentsData.map(a => a.seller_id))

      // Combine sellers data with assignment status
      const sellersWithAssignment = sellersData.map(seller => ({
        ...seller,
        isAssigned: assignedSellerIds.has(seller.id)
      }))

      setSellers(sellersWithAssignment)

      // Set initially selected sellers (those currently assigned)
      setSelectedSellers(new Set(Array.from(assignedSellerIds)))

    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSellerToggle = (sellerId: string, checked: boolean) => {
    const newSelected = new Set(selectedSellers)
    if (checked) {
      newSelected.add(sellerId)
    } else {
      newSelected.delete(sellerId)
    }
    setSelectedSellers(newSelected)
  }

  const handleSave = async () => {
    if (!productId) return

    try {
      setSaving(true)
      const session = getSession()
      if (!session) return

      const supabase = getAuthenticatedClient()

      // Get current assignments
      const currentlyAssigned = new Set(sellers.filter(s => s.isAssigned).map(s => s.id))
      const newAssignments = selectedSellers

      // Find sellers to add and remove
      const sellersToAdd = Array.from(newAssignments).filter(id => !currentlyAssigned.has(id))
      const sellersToRemove = Array.from(currentlyAssigned).filter(id => !newAssignments.has(id))

      // Remove assignments
      if (sellersToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('seller_products')
          .delete()
          .eq('product_id', productId)
          .in('seller_id', sellersToRemove)

        if (removeError) throw removeError
      }

      // Add new assignments
      if (sellersToAdd.length > 0) {
        const newAssignmentRecords = sellersToAdd.map(sellerId => ({
          seller_id: sellerId,
          product_id: parseInt(productId),
          assigned_by: session.user.id
        }))

        const { error: addError } = await supabase
          .from('seller_products')
          .insert(newAssignmentRecords)

        if (addError) throw addError
      }

      toast.success('Product assignments updated successfully')
      onSuccess()

    } catch (error: any) {
      console.error('Error saving assignments:', error)
      toast.error('Failed to update assignments')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Product to Sellers</DialogTitle>
          <DialogDescription>
            Select which sellers should have access to this product.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {product && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Product:</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{product.sku}</Badge>
                  <span className="font-medium">{product.name}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Assign to Sellers:</h4>
              {sellers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sellers found.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {sellers.map((seller) => (
                    <div key={seller.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={seller.id}
                        checked={selectedSellers.has(seller.id)}
                        onCheckedChange={(checked) => handleSellerToggle(seller.id, checked as boolean)}
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <label
                          htmlFor={seller.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {seller.name}
                        </label>
                        <p className="text-xs text-muted-foreground">{seller.email}</p>
                        {seller.isAssigned && (
                          <Badge variant="secondary" className="text-xs">Currently Assigned</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving || !product}
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}