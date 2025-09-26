// Generate slightly randomized mock data to feel more dynamic
function generateDynamicMockData() {
  // Add some small random variations to make it feel less static
  const dailyVariation = Math.floor(Math.random() * 10) - 5 // ±5 variation

  return {
  summary: {
    totalUsers: 125 + Math.floor(Math.random() * 10),
    totalOrders: 1847 + dailyVariation,
    totalCustomers: 892 + Math.floor(Math.random() * 5),
    totalProducts: 127,
    totalCrmLeads: 234 + Math.floor(Math.random() * 8),
    totalIntegrations: 8,
    totalRevenue: 125478.90 + (Math.random() * 2000 - 1000), // ±$1000 variation
    activeIntegrations: 8
  },
  recentOrders: [
    {
      id: 1,
      externalOrderId: 'ORD-2024-001',
      totalAmount: 299.99,
      status: 'completed',
      orderCreatedAt: new Date('2024-01-15T10:30:00Z'),
      customer: { name: 'John Doe', email: 'john@example.com' },
      integration: { name: 'Shopify Store', domain: 'mystore.myshopify.com' }
    },
    {
      id: 2,
      externalOrderId: 'ORD-2024-002',
      totalAmount: 159.50,
      status: 'pending',
      orderCreatedAt: new Date('2024-01-15T11:45:00Z'),
      customer: { name: 'Jane Smith', email: 'jane@example.com' },
      integration: { name: 'WooCommerce Store', domain: 'shop.example.com' }
    },
    {
      id: 3,
      externalOrderId: 'ORD-2024-003',
      totalAmount: 89.99,
      status: 'completed',
      orderCreatedAt: new Date('2024-01-15T14:20:00Z'),
      customer: { name: 'Bob Johnson', email: 'bob@example.com' },
      integration: { name: 'Online Store', domain: 'store.example.com' }
    }
  ],
  topProducts: [
    { id: 1, name: 'Premium Widget', sku: 'PWD-001', price: 99.99, stock: 15 },
    { id: 2, name: 'Basic Kit', sku: 'BK-002', price: 49.99, stock: 30 },
    { id: 3, name: 'Pro Bundle', sku: 'PB-003', price: 199.99, stock: 8 },
    { id: 4, name: 'Starter Pack', sku: 'SP-004', price: 29.99, stock: 45 },
    { id: 5, name: 'Deluxe Set', sku: 'DS-005', price: 149.99, stock: 12 }
  ],
  userRoleStats: [
    { role: 'admin', count: 3 },
    { role: 'seller', count: 122 }
  ],
  monthlyOrderStats: [
    { month: 'Jan', orders: 45, revenue: 12500 },
    { month: 'Feb', orders: 52, revenue: 15200 },
    { month: 'Mar', orders: 38, revenue: 9800 },
    { month: 'Apr', orders: 61, revenue: 18400 },
    { month: 'May', orders: 49, revenue: 13900 },
    { month: 'Jun', orders: 67, revenue: 21300 }
  ],
  leadsStatusStats: {
    logisticStatus: {
      'pending': 45,
      'shipped': 78,
      'delivered': 111
    },
    codStatus: {
      'confirmed': 156,
      'pending': 34,
      'rejected': 44
    },
    kpiStatus: {
      'hot': 89,
      'warm': 67,
      'cold': 78
    }
  },
  integrationStats: [
    { type: 'shopify', count: 3 },
    { type: 'woocommerce', count: 4 },
    { type: 'wordpress', count: 1 }
  ],
  charts: {
    userRoleDistribution: [
      { role: 'admin', count: 3 },
      { role: 'seller', count: 122 }
    ],
    monthlyOrders: [
      { month: 'Jan', orders: 45, revenue: 12500 },
      { month: 'Feb', orders: 52, revenue: 15200 },
      { month: 'Mar', orders: 38, revenue: 9800 },
      { month: 'Apr', orders: 61, revenue: 18400 },
      { month: 'May', orders: 49, revenue: 13900 },
      { month: 'Jun', orders: 67, revenue: 21300 }
    ],
    leadsStatus: {
      logistic: {
        'pending': 45,
        'shipped': 78,
        'delivered': 111
      },
      cod: {
        'confirmed': 156,
        'pending': 34,
        'rejected': 44
      },
      kpi: {
        'hot': 89,
        'warm': 67,
        'cold': 78
      }
    },
    integrationsByType: [
      { type: 'shopify', count: 3 },
      { type: 'woocommerce', count: 4 },
      { type: 'wordpress', count: 1 }
    ]
  },
  recentActivity: {
    orders: [
      {
        id: 1,
        externalOrderId: 'ORD-001',
        totalAmount: 99.99,
        status: 'completed',
        orderCreatedAt: new Date('2024-01-15T09:30:00Z'),
        customer: { name: 'John Doe', email: 'john@example.com' },
        integration: { name: 'Demo Store', domain: 'demo.example.com' }
      }
    ],
    topProducts: [
      { id: 1, name: 'Premium Widget', sku: 'PWD-001', price: 99.99, stock: 15 },
      { id: 2, name: 'Basic Kit', sku: 'BK-002', price: 49.99, stock: 30 }
    ]
  },
  insights: {
    avgOrderValue: 156.78,
    conversionRate: 3.4,
    customerGrowthRate: 12.5,
    orderGrowthRate: 8.3 + (Math.random() * 4 - 2) // ±2% variation
  }
  }
}

// Export the mock data (generates new data each time it's called)
export const mockAdminDashboardData = generateDynamicMockData()