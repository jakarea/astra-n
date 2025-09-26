// Preloader for heavy components
export const preloadDashboardComponents = () => {
  // Preload admin dashboard
  import('@/components/dashboard/admin-dashboard')

  // Preload seller dashboard
  import('@/components/dashboard/seller-dashboard')
}

export const preloadUserComponents = () => {
  // Preload user modals
  import('@/components/users/edit-user-modal')
  import('@/components/users/view-user-modal')
  import('@/components/users/invite-user-modal')
}

export const preloadOrderComponents = () => {
  // Preload order components
  import('@/components/orders/edit-order-modal')
  import('@/components/ui/date-range-picker')
}