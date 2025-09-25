'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EditCustomerModal } from './edit-customer-modal'
import { Edit } from 'lucide-react'

interface CustomerActionsProps {
  customerId: string
}

export function CustomerActions({ customerId }: CustomerActionsProps) {
  const [editModalOpen, setEditModalOpen] = useState(false)

  const handleCustomerUpdated = () => {
    setEditModalOpen(false)
    // Refresh the page to show updated data
    window.location.reload()
  }

  return (
    <>
      <Button onClick={() => setEditModalOpen(true)}>
        <Edit className="h-4 w-4 mr-2" />
        Edit Customer
      </Button>

      <EditCustomerModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleCustomerUpdated}
        customerId={customerId}
      />
    </>
  )
}