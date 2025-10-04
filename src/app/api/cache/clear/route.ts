import { NextRequest, NextResponse } from 'next/server'
import { clearAllCaches } from '@/lib/cache-manager'

export async function POST(request: NextRequest) {
  try {
    // Clear all module caches
    clearAllCaches()
    return NextResponse.json({
      success: true,
      message: 'All caches cleared successfully'
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear caches',
        details: error.message
      },
      { status: 500 }
    )
  }
}
