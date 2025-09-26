'use server'

import { getAdminDashboardData } from '@/lib/admin-data'

export async function getAdminDashboardAction(): Promise<any> {
  try {
    console.log('🚀 Starting admin dashboard data fetch...')

    // Get real data from database
    const data = await getAdminDashboardData()
    console.log('✅ Real dashboard data fetched successfully with keys:', Object.keys(data))

    return { success: true, data }
  } catch (error) {
    console.error('Admin dashboard action error:', error)

    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
    }
  }
}