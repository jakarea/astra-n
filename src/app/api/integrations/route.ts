import { createServerComponentSupabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const createIntegrationSchema = z.object({
  name: z.string().min(1, 'Integration name is required'),
  type: z.enum(['shopify', 'woocommerce'], {
    errorMap: () => ({ message: 'Type must be either shopify or woocommerce' })
  }),
  domain: z.string().url('Domain must be a valid URL'),
  adminAccessToken: z.string().min(1, 'Admin access token is required')
})

const updateIntegrationSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  adminAccessToken: z.string().min(1).optional()
})

// GET /api/integrations - List all integrations for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user to check role
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let integrations

    if (currentUser.role === 'admin') {
      // Admin can see all integrations
      integrations = await prisma.integration.findMany({
        include: {
          user: {
            select: { id: true, name: true, role: true }
          },
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Regular users only see their own integrations
      integrations = await prisma.integration.findMany({
        where: { userId: session.user.id },
        include: {
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    return NextResponse.json({ integrations })
  } catch (error) {
    console.error('Error fetching integrations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integrations - Create a new integration
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentSupabase()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, domain, adminAccessToken } = createIntegrationSchema.parse(body)

    // Generate a secure webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex')

    // Check if domain already exists
    const existingIntegration = await prisma.integration.findUnique({
      where: { domain }
    })

    if (existingIntegration) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 409 })
    }

    const integration = await prisma.integration.create({
      data: {
        userId: session.user.id,
        name,
        type,
        domain,
        webhookSecret,
        adminAccessToken,
        isActive: true
      },
      include: {
        user: {
          select: { id: true, name: true, role: true }
        }
      }
    })

    return NextResponse.json({ integration })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating integration:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}