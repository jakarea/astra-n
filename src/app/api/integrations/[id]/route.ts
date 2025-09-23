import { createServerComponentSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateIntegrationSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  adminAccessToken: z.string().min(1).optional()
})

// GET /api/integrations/[id] - Get a specific integration
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integrationId = parseInt(params.id)
    if (isNaN(integrationId)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let integration

    if (currentUser.role === 'admin') {
      // Admin can access any integration
      integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        include: {
          user: {
            select: { id: true, name: true, role: true }
          },
          _count: {
            select: { orders: true }
          }
        }
      })
    } else {
      // Regular users can only access their own integrations
      integration = await prisma.integration.findFirst({
        where: {
          id: integrationId,
          userId: session.user.id
        },
        include: {
          _count: {
            select: { orders: true }
          }
        }
      })
    }

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    return NextResponse.json({ integration })
  } catch (error) {
    console.error('Error fetching integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/integrations/[id] - Update an integration
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integrationId = parseInt(params.id)
    if (isNaN(integrationId)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    const body = await request.json()
    const updateData = updateIntegrationSchema.parse(body)

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if integration exists and user has permission
    const existingIntegration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })

    if (!existingIntegration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Check permissions: owner or admin
    if (existingIntegration.userId !== session.user.id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const integration = await prisma.integration.update({
      where: { id: integrationId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, role: true }
        },
        _count: {
          select: { orders: true }
        }
      }
    })

    return NextResponse.json({ integration })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/integrations/[id] - Delete an integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integrationId = parseInt(params.id)
    if (isNaN(integrationId)) {
      return NextResponse.json({ error: 'Invalid integration ID' }, { status: 400 })
    }

    // Get current user to check permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if integration exists and user has permission
    const existingIntegration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    })

    if (!existingIntegration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Check permissions: owner or admin
    if (existingIntegration.userId !== session.user.id && currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Check if integration has orders (prevent deletion if it has data)
    if (existingIntegration._count.orders > 0) {
      return NextResponse.json({
        error: 'Cannot delete integration with existing orders. Deactivate it instead.'
      }, { status: 409 })
    }

    await prisma.integration.delete({
      where: { id: integrationId }
    })

    return NextResponse.json({ message: 'Integration deleted successfully' })
  } catch (error) {
    console.error('Error deleting integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}