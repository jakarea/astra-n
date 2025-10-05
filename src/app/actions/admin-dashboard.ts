'use server'

import { getAdminDashboardData } from '@/lib/admin-data'

export async function getAdminDashboardAction(): Promise<any> {
  try {
    // Get real data from database
    const data = await getAdminDashboardData()

    return { success: true, data }
  } catch (error) {
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Dashboard error:', error.message)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
    }
  }
}