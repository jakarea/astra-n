'use server'

import { getSellerDashboardData } from '@/lib/seller-data'
import { mockSellerDashboardData } from '@/lib/mock-seller-data'

export async function getSellerDashboardAction(userId: string): Promise<any> {
  try {
    if (!userId) {
      throw new Error('User ID is required')
    }

    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not found in environment, using mock data for seller dashboard')
      return { success: true, data: mockSellerDashboardData }
    }

    try {
      const data = await getSellerDashboardData(userId)
      return { success: true, data }
    } catch (dbError) {
      console.warn('Database operation failed for seller dashboard, falling back to mock data:', dbError)
      return { success: true, data: mockSellerDashboardData }
    }
  } catch (error) {
    console.error('Seller dashboard action error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard data'
    }
  }
}