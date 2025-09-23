"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/contexts/RoleContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LoadingSpinner, LoadingState, TableSkeleton } from "@/components/ui/loading"
import { handleError } from "@/lib/error-handling"
import { Search, Filter, Download, Plus, Eye, Edit, Package, Truck, CheckCircle, Clock, AlertCircle, RefreshCw, Shield } from "lucide-react"

type Order = {
  id: number
  external_order_id: string
  total_amount: number
  status: string
  order_created_at: string
  created_at: string
  updated_at: string
  customer: {
    id: number
    name: string
    email: string
    phone?: string
  }
  integration: {
    id: number
    name: string
    type: string
  }
  items: Array<{
    id: number
    product_sku: string
    product_name: string
    quantity: number
    price_per_unit: number
  }>
}

// Static fallback data for now - will be replaced by API
// Orders with seller association for data isolation
const allOrders = [
  {
    id: "ORD-2024-001",
    date: "2024-01-15 14:30",
    customer: "Marco Rossi",
    email: "marco.rossi@email.com",
    phone: "+39 335 123 4567",
    sellerId: "admin@astra.com", // Admin can see this
    sellerName: "Admin Store",
    items: [
      { name: "Wireless Bluetooth Headphones", sku: "WBH-001", quantity: 1, price: "€89.99" }
    ],
    subtotal: "€89.99",
    shipping: "€4.99",
    total: "€94.98",
    status: "delivered",
    paymentStatus: "paid",
    shippingAddress: "Via Roma 123, 20121 Milano, MI",
    trackingNumber: "TRK789123456",
    notes: "Fast delivery requested"
  },
  {
    id: "ORD-2024-002",
    date: "2024-01-15 13:45",
    customer: "Giulia Ferrari",
    email: "giulia.ferrari@email.com",
    phone: "+39 347 987 6543",
    sellerId: "seller@test.com", // This seller can see this
    sellerName: "Test Seller Store",
    items: [
      { name: "Smart Fitness Tracker", sku: "SFT-002", quantity: 1, price: "€149.99" },
      { name: "Sport Armband", sku: "SAB-010", quantity: 1, price: "€19.99" }
    ],
    subtotal: "€169.98",
    shipping: "€0.00",
    total: "€169.98",
    status: "shipped",
    paymentStatus: "paid",
    shippingAddress: "Corso Buenos Aires 45, 20124 Milano, MI",
    trackingNumber: "TRK789123457",
    notes: "Spedizione gratuita applicata"
  },
  {
    id: "ORD-2024-003",
    date: "2024-01-15 12:20",
    customer: "Alessandro Conti",
    email: "alessandro.conti@email.com",
    phone: "+39 339 456 7890",
    sellerId: "seller@test.com", // This seller can see this
    sellerName: "Test Seller Store",
    items: [
      { name: "Wireless Charging Pad", sku: "WCP-003", quantity: 2, price: "€39.99" }
    ],
    subtotal: "€79.98",
    shipping: "€4.99",
    total: "€84.97",
    status: "cancelled",
    paymentStatus: "refunded",
    shippingAddress: "Via Torino 67, 20123 Milano, MI",
    trackingNumber: "",
    notes: "Cancelled by customer request"
  },
  {
    id: "ORD-2024-004",
    date: "2024-01-15 11:15",
    customer: "Francesca Ricci",
    email: "francesca.ricci@email.com",
    phone: "+39 342 678 9012",
    sellerId: "another@seller.com", // Different seller
    sellerName: "Another Store",
    items: [
      { name: "Portable Power Bank", sku: "PPB-004", quantity: 1, price: "€29.99" }
    ],
    subtotal: "€29.99",
    shipping: "€4.99",
    total: "€34.98",
    status: "processing",
    paymentStatus: "paid",
    shippingAddress: "Viale Monza 234, 20126 Milano, MI",
    trackingNumber: "",
    notes: "In preparazione"
  },
  {
    id: "ORD-2024-005",
    date: "2024-01-15 10:30",
    customer: "Roberto Gallo",
    email: "roberto.gallo@email.com",
    phone: "+39 348 234 5678",
    sellerId: "seller@test.com", // This seller can see this
    sellerName: "Test Seller Store",
    items: [
      { name: "Bluetooth Speaker", sku: "BTS-005", quantity: 1, price: "€79.99" },
      { name: "Carrying Case", sku: "CC-015", quantity: 1, price: "€24.99" }
    ],
    subtotal: "€104.98",
    shipping: "€0.00",
    total: "€104.98",
    status: "pending",
    paymentStatus: "pending",
    shippingAddress: "Via Brera 89, 20121 Milano, MI",
    trackingNumber: "",
    notes: "In attesa di pagamento"
  },
  {
    id: "ORD-2024-006",
    date: "2024-01-14 16:45",
    customer: "Elena Bianchi",
    email: "elena.bianchi@email.com",
    phone: "+39 333 567 8901",
    sellerId: "another@seller.com", // Different seller
    sellerName: "Another Store",
    items: [
      { name: "Gaming Mouse", sku: "GM-007", quantity: 1, price: "€59.99" },
      { name: "Mouse Pad", sku: "MP-020", quantity: 1, price: "€12.99" }
    ],
    subtotal: "€72.98",
    shipping: "€4.99",
    total: "€77.97",
    status: "delivered",
    paymentStatus: "paid",
    shippingAddress: "Via Garibaldi 156, 20121 Milano, MI",
    trackingNumber: "TRK789123458",
    notes: "Consegnato in sede"
  }
]

const getStatusBadge = (status: string) => {
  const variants = {
    pending: { variant: "warning" as const, label: "Pending", icon: Clock },
    processing: { variant: "info" as const, label: "Processing", icon: Package },
    shipped: { variant: "warning" as const, label: "Shipped", icon: Truck },
    delivered: { variant: "success" as const, label: "Delivered", icon: CheckCircle },
    cancelled: { variant: "destructive" as const, label: "Cancelled", icon: AlertCircle }
  }

  const config = variants[status as keyof typeof variants]
  if (!config) return <Badge>{status}</Badge>

  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

const getPaymentStatusBadge = (status: string) => {
  const variants = {
    pending: { variant: "warning" as const, label: "Pending" },
    paid: { variant: "success" as const, label: "Paid" },
    failed: { variant: "destructive" as const, label: "Failed" },
    refunded: { variant: "secondary" as const, label: "Refunded" }
  }

  const config = variants[status as keyof typeof variants]
  return config ? <Badge variant={config.variant}>{config.label}</Badge> : <Badge>{status}</Badge>
}

export default function OrdersPage() {
  const { user, isAdmin, isSeller } = useRole()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Simulate loading for orders
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setIsLoading(true)
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800))
        setError(null)
      } catch (err) {
        const appError = handleError(err)
        setError(appError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [])

  // Filter orders based on user role
  const orders = isAdmin
    ? allOrders // Admin sees all orders
    : allOrders.filter(order => order.sellerId === user?.email) // Seller sees only their orders

  // Role-based stats
  const totalOrders = orders.length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const shippedOrders = orders.filter(o => o.status === 'shipped').length
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length
  const totalRevenue = orders.reduce((sum, order) => {
    const amount = parseFloat(order.total.replace('€', '').replace(',', ''))
    return sum + amount
  }, 0)

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isAdmin ? 'Order Management (All)' : 'My Orders'}
                {isAdmin && <Shield className="inline ml-2 h-6 w-6 text-green-600" />}
              </h1>
              <p className="text-muted-foreground">
                {isAdmin
                  ? 'Monitor all system orders'
                  : 'Monitor and manage your orders'
                }
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" disabled>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button disabled>
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          </div>
          <LoadingState message="Loading orders..." />
        </div>
      </div>
    )
  }

  // Early return for error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {isAdmin ? 'Order Management (All)' : 'My Orders'}
                {isAdmin && <Shield className="inline ml-2 h-6 w-6 text-green-600" />}
              </h1>
              <p className="text-muted-foreground">
                {isAdmin
                  ? 'Monitor all system orders'
                  : 'Monitor and manage your orders'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold mb-2">Loading error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isAdmin ? 'Order Management (All)' : 'My Orders'}
              {isAdmin && <Shield className="inline ml-2 h-6 w-6 text-green-600" />}
            </h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? 'Monitor all system orders'
                : 'Monitor and manage your orders'
              }
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Ordine
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'All orders' : 'Your orders'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders}</div>
              <p className="text-xs text-muted-foreground">To process</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shipped</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Truck className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shippedOrders}</div>
              <p className="text-xs text-muted-foreground">In transit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deliveredOrders}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs font-bold">€</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? 'System total' : 'Your revenue'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <CardTitle>Order List</CardTitle>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search orders..." className="pl-10 w-full sm:w-80" />
                </div>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  {isAdmin && <TableHead>Seller</TableHead>}
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Order Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">{order.id}</TableCell>
                    <TableCell className="font-mono text-sm">{order.date}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer}</div>
                        <div className="text-xs text-muted-foreground">{order.email}</div>
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{order.sellerName}</div>
                          <div className="text-xs text-muted-foreground">{order.sellerId}</div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              SKU: {item.sku} | Qty: {item.quantity} | {item.price}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{order.total}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPaymentStatusBadge(order.paymentStatus)}</TableCell>
                    <TableCell>
                      {order.trackingNumber ? (
                        <div className="font-mono text-xs">{order.trackingNumber}</div>
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="p-4 border rounded-lg" style={{borderColor: '#EAEDF0'}}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-medium text-sm">{order.id}</span>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Customer:</span>
                      <span className="text-sm font-medium">{order.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <span className="text-sm font-mono">{order.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="text-sm font-semibold">{order.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <div className="flex space-x-2">
                        {getStatusBadge(order.status)}
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Seller:</span>
                        <span className="text-sm">{order.sellerName}</span>
                      </div>
                    )}
                    {order.trackingNumber && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Tracking:</span>
                        <span className="text-xs font-mono">{order.trackingNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t" style={{borderColor: '#EAEDF0'}}>
                    <p className="text-xs text-muted-foreground mb-1">Items:</p>
                    {order.items.map((item, index) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {item.sku} | Qty: {item.quantity} | {item.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}