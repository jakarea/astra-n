import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side function to get session from request headers
function getSessionFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix

    // Create a Supabase client with this token to verify and get user info
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    return { token, supabase }
  } catch (error) {
    console.error('[SESSION] Error parsing session from request:', error)
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    console.log('[ADMIN_USER_DETAILED] Get detailed user data API called for:', id)

    const sessionInfo = getSessionFromRequest(request)
    if (!sessionInfo) {
      console.log('[ADMIN_USER_DETAILED] No valid session found in request')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { supabase } = sessionInfo

    // Get current user info and verify admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.log('[ADMIN_USER_DETAILED] Invalid token or user not found:', userError?.message)
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError || !userData || userData.role !== 'admin') {
      console.log('[ADMIN_USER_DETAILED] User is not admin:', userData?.role || 'no role found')
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
    }

    console.log('[ADMIN_USER_DETAILED] Admin user authenticated, fetching detailed user data:', id)

    // Use service role for admin access
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get user basic info
    const { data: userInfo, error: userInfoError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (userInfoError) {
      console.error('[ADMIN_USER_DETAILED] User info error:', userInfoError)
      return NextResponse.json({ error: userInfoError.message }, { status: 500 })
    }

    // Get user settings
    const { data: userSettings } = await serviceClient
      .from('user_settings')
      .select('*')
      .eq('user_id', id)
      .single()

    // Get integrations
    const { data: integrations } = await serviceClient
      .from('integrations')
      .select(`
        id,
        name,
        type,
        domain,
        base_url,
        is_active,
        status,
        last_sync_at,
        created_at,
        updated_at
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    // Get products
    const { data: products } = await serviceClient
      .from('products')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    // Get orders through integrations
    const integrationIds = integrations?.map(i => i.id) || []
    let orders = []
    let customers = []

    if (integrationIds.length > 0) {
      const { data: ordersData } = await serviceClient
        .from('orders')
        .select(`
          id,
          external_order_id,
          status,
          total_amount,
          order_created_at,
          created_at,
          integration:integrations(id, name, type),
          customer:customers(id, name, email, phone)
        `)
        .in('integration_id', integrationIds)
        .order('order_created_at', { ascending: false })
        .limit(20) // Limit to recent orders

      orders = ordersData || []

      // Get customers
      const { data: customersData } = await serviceClient
        .from('customers')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20) // Limit to recent customers

      customers = customersData || []
    }

    // Get CRM leads
    const { data: crmLeads } = await serviceClient
      .from('crm_leads')
      .select(`
        id,
        name,
        email,
        phone,
        source,
        logistic_status,
        cod_status,
        kpi_status,
        notes,
        created_at,
        updated_at
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20) // Limit to recent leads

    // Calculate statistics
    const stats = {
      integrations: {
        total: integrations?.length || 0,
        active: integrations?.filter(i => i.is_active).length || 0,
        shopify: integrations?.filter(i => i.type === 'shopify').length || 0,
        woocommerce: integrations?.filter(i => i.type === 'woocommerce').length || 0,
      },
      products: {
        total: products?.length || 0,
        totalValue: products?.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0) || 0,
        totalStock: products?.reduce((sum, p) => sum + p.stock, 0) || 0,
      },
      orders: {
        total: orders?.length || 0,
        totalValue: orders?.reduce((sum, o) => sum + parseFloat(o.total_amount.toString()), 0) || 0,
        recentOrders: orders?.filter(o => {
          const orderDate = new Date(o.order_created_at)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          return orderDate > thirtyDaysAgo
        }).length || 0,
      },
      customers: {
        total: customers?.length || 0,
      },
      crmLeads: {
        total: crmLeads?.length || 0,
        active: crmLeads?.filter(l => l.kpi_status !== 'closed').length || 0,
      }
    }

    const detailedUserData = {
      user: userInfo,
      settings: userSettings,
      integrations: integrations || [],
      products: products || [],
      orders: orders || [],
      customers: customers || [],
      crmLeads: crmLeads || [],
      stats
    }

    console.log('[ADMIN_USER_DETAILED] Detailed user data compiled successfully:', {
      integrations: detailedUserData.integrations.length,
      products: detailedUserData.products.length,
      orders: detailedUserData.orders.length,
      customers: detailedUserData.customers.length,
      crmLeads: detailedUserData.crmLeads.length,
    })

    return NextResponse.json(detailedUserData)

  } catch (error: any) {
    console.error('[ADMIN_USER_DETAILED] Unexpected error:', error)
    return NextResponse.json({
      error: 'Failed to fetch detailed user data',
      details: error.message
    }, { status: 500 })
  }
}