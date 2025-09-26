// Generate dynamic seller mock data
function generateDynamicSellerData() {
  const dailyVariation = Math.floor(Math.random() * 6) - 3 // ±3 variation

  return {
  userInfo: {
    name: 'Demo Seller',
    email: 'seller@demo.com',
    role: 'seller'
  },
  summary: {
    totalOrders: 156 + dailyVariation,
    totalCustomers: 89 + Math.floor(Math.random() * 3),
    totalProducts: 34,
    totalCrmLeads: 23 + Math.floor(Math.random() * 4),
    totalRevenue: 45678.90 + (Math.random() * 800 - 400), // ±$400 variation
    totalIntegrations: 3,
    lowStockProducts: 5,
    activeIntegrations: 3
  },
  recentOrders: [
    {
      id: 1,
      externalOrderId: 'ORD-S-001',
      totalAmount: 89.99,
      status: 'completed',
      orderCreatedAt: new Date('2024-01-15T09:30:00Z'),
      customer: { name: 'Alice Wilson', email: 'alice@example.com' },
      integration: { name: 'My Store', domain: 'mystore.example.com' }
    },
    {
      id: 2,
      externalOrderId: 'ORD-S-002',
      totalAmount: 45.50,
      status: 'pending',
      orderCreatedAt: new Date('2024-01-15T12:15:00Z'),
      customer: { name: 'Mike Brown', email: 'mike@example.com' },
      integration: { name: 'Online Shop', domain: 'shop.example.com' }
    }
  ],
  topProducts: [
    { id: 1, name: 'Popular Item', sku: 'PI-001', price: 29.99, stock: 25 },
    { id: 2, name: 'Best Seller', sku: 'BS-002', price: 19.99, stock: 50 },
    { id: 3, name: 'Featured Product', sku: 'FP-003', price: 39.99, stock: 15 }
  ],
  monthlyStats: [
    { month: 'Jan', orders: 12, revenue: 3400 },
    { month: 'Feb', orders: 18, revenue: 5200 },
    { month: 'Mar', orders: 15, revenue: 4100 },
    { month: 'Apr', orders: 22, revenue: 6800 },
    { month: 'May', orders: 19, revenue: 5500 },
    { month: 'Jun', orders: 25, revenue: 7200 }
  ],
  leadsStatusStats: {
    logisticStatus: {
      'pending': 5,
      'shipped': 8,
      'delivered': 10
    },
    codStatus: {
      'confirmed': 15,
      'pending': 4,
      'rejected': 4
    },
    kpiStatus: {
      'hot': 9,
      'warm': 7,
      'cold': 7
    }
  },
  charts: {
    orderStatusDistribution: [
      { status: 'completed', count: 89 },
      { status: 'pending', count: 34 },
      { status: 'processing', count: 22 },
      { status: 'cancelled', count: 11 }
    ],
    monthlyPerformance: [
      { month: 'Jan', orders: 12, revenue: 3400 },
      { month: 'Feb', orders: 18, revenue: 5200 },
      { month: 'Mar', orders: 15, revenue: 4100 },
      { month: 'Apr', orders: 22, revenue: 6800 },
      { month: 'May', orders: 19, revenue: 5500 },
      { month: 'Jun', orders: 25, revenue: 7200 }
    ],
    leadsStatus: {
      logistic: {
        'pending': 5,
        'shipped': 8,
        'delivered': 10
      },
      cod: {
        'confirmed': 15,
        'pending': 4,
        'rejected': 4
      },
      kpi: {
        'hot': 9,
        'warm': 7,
        'cold': 7
      }
    },
    integrationStatus: [
      { status: 'active', count: 3 },
      { status: 'inactive', count: 0 },
      { status: 'error', count: 0 }
    ]
  },
  recentActivity: {
    orders: [
      {
        id: 1,
        externalOrderId: 'ORD-S-001',
        totalAmount: 89.99,
        status: 'completed',
        orderCreatedAt: new Date('2024-01-15T09:30:00Z'),
        customer: { name: 'Alice Wilson', email: 'alice@example.com' },
        integration: { name: 'My Store', domain: 'mystore.example.com' }
      },
      {
        id: 2,
        externalOrderId: 'ORD-S-002',
        totalAmount: 45.50,
        status: 'pending',
        orderCreatedAt: new Date('2024-01-15T12:15:00Z'),
        customer: { name: 'Mike Brown', email: 'mike@example.com' },
        integration: { name: 'Online Shop', domain: 'shop.example.com' }
      }
    ],
    products: [
      { id: 1, name: 'Popular Item', sku: 'PI-001', price: 29.99, stock: 25 },
      { id: 2, name: 'Best Seller', sku: 'BS-002', price: 19.99, stock: 50 },
      { id: 3, name: 'Featured Product', sku: 'FP-003', price: 39.99, stock: 15 }
    ],
    leads: []
  },
  insights: {
    avgOrderValue: 156.78,
    inventoryHealth: 85.5,
    leadConversionRate: 12.3,
    monthlyGrowth: 8.7 + (Math.random() * 3 - 1.5) // ±1.5% variation
  }
  }
}

// Export dynamic seller mock data
export const mockSellerDashboardData = generateDynamicSellerData()