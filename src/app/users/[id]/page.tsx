'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSession, isAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Settings,
  Calendar,
  MessageCircle,
  Globe,
  Package,
  ShoppingCart,
  Users,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Eye,
  Edit,
  AlertCircle,
  ExternalLink,
  Phone,
  MapPin,
  Tag
} from 'lucide-react'

interface UserData {
  user: {
    id: string
    name: string
    email: string
    role: string
    webhook_secret?: string
    created_at: string
    updated_at: string
  }
  settings: {
    telegram_chat_id?: string
    updated_at: string
  } | null
  integrations: Array<{
    id: number
    name: string
    type: string
    domain: string
    base_url?: string
    is_active: boolean
    status: string
    last_sync_at?: string
    created_at: string
    updated_at: string
  }>
  products: Array<{
    id: number
    sku: string
    name: string
    stock: number
    price: number
    created_at: string
    updated_at: string
  }>
  orders: Array<{
    id: number
    external_order_id: string
    status: string
    total_amount: number
    order_created_at: string
    created_at: string
    integration: {
      id: number
      name: string
      type: string
    }
    customer: {
      id: number
      name: string
      email: string
      phone?: string
    }
  }>
  customers: Array<{
    id: number
    name: string
    email: string
    phone?: string
    total_order: number
    source: string
    created_at: string
    updated_at: string
  }>
  crmLeads: Array<{
    id: number
    name?: string
    email?: string
    phone?: string
    source: string
    logistic_status?: string
    cod_status?: string
    kpi_status?: string
    notes?: string
    created_at: string
    updated_at: string
  }>
  stats: {
    integrations: {
      total: number
      active: number
      shopify: number
      woocommerce: number
    }
    products: {
      total: number
      totalValue: number
      totalStock: number
    }
    orders: {
      total: number
      totalValue: number
      recentOrders: number
    }
    customers: {
      total: number
    }
    crmLeads: {
      total: number
      active: number
    }
  }
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isAdmin()) {
      setHasError(true)
      setErrorMessage('Access denied. Admin role required.')
      setLoading(false)
      return
    }

    if (userId) {
      loadUserData()
    }
  }, [userId])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const session = getSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      console.log('[USER_DETAIL] Loading detailed user data:', userId)

      const response = await fetch(`/api/admin/users/${userId}/detailed`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('[USER_DETAIL] User data loaded successfully')

      setUserData(data)
      setHasError(false)
    } catch (error: any) {
      console.error('Error loading user data:', error)
      setHasError(true)
      setErrorMessage(`Failed to load user data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusBadge = (status: string, type: 'integration' | 'order' | 'crm' = 'integration') => {
    const variants: Record<string, any> = {
      integration: {
        active: 'default',
        inactive: 'secondary',
        error: 'destructive'
      },
      order: {
        pending: 'secondary',
        processing: 'default',
        completed: 'default',
        cancelled: 'destructive',
        refunded: 'secondary'
      },
      crm: {
        open: 'default',
        in_progress: 'secondary',
        closed: 'outline'
      }
    }

    return (
      <Badge variant={variants[type][status] || 'secondary'} className="capitalize">
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  if (hasError) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium text-destructive mb-2">Error Loading User</h3>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6">
                      <Skeleton className="h-6 w-16 mb-2" />
                      <Skeleton className="h-8 w-12" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push('/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">User Not Found</h3>
              <p className="text-sm text-muted-foreground">The user you're looking for doesn't exist or has been removed.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{userData.user.name}</h1>
            <p className="text-muted-foreground">{userData.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={userData.user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
            {userData.user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
            {userData.user.role}
          </Badge>
          <Button variant="outline" onClick={() => router.push(`/users/${userId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData.stats.integrations.total}</div>
            <p className="text-xs text-muted-foreground">
              {userData.stats.integrations.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData.stats.products.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(userData.stats.products.totalValue)} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData.stats.orders.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(userData.stats.orders.totalValue)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData.stats.customers.total}</div>
            <p className="text-xs text-muted-foreground">
              Total customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="crm">CRM Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <div className="mt-1 text-sm">{userData.user.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <div className="mt-1 text-sm font-mono">{userData.user.email}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Role</label>
                    <div className="mt-1">
                      <Badge variant={userData.user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {userData.user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                        {userData.user.role}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User ID</label>
                    <div className="mt-1 text-xs text-muted-foreground font-mono break-all">{userData.user.id}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telegram Notifications</label>
                  <div className="mt-1 flex items-center gap-2">
                    {userData.settings?.telegram_chat_id ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Configured</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {userData.settings.telegram_chat_id}
                        </Badge>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Not configured</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Webhook Secret</label>
                  <div className="mt-1">
                    {userData.user.webhook_secret ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {userData.user.webhook_secret.substring(0, 20)}...
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not set</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Account Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                  <div className="mt-1 text-sm">{formatDate(userData.user.created_at)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <div className="mt-1 text-sm">{formatDate(userData.user.updated_at)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Integrations ({userData.integrations.length})
              </CardTitle>
              <CardDescription>
                Connected e-commerce platforms and integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData.integrations.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Integrations</h3>
                  <p className="text-sm text-muted-foreground">This user hasn't connected any integrations yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userData.integrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">{integration.name}</div>
                          {getStatusBadge(integration.status, 'integration')}
                          <Badge variant="outline" className="capitalize">
                            {integration.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {integration.domain}
                          </span>
                          {integration.last_sync_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last sync: {formatDate(integration.last_sync_at)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {formatDate(integration.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {integration.base_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={integration.base_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products ({userData.products.length})
              </CardTitle>
              <CardDescription>
                Product catalog managed by this user
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData.products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Products</h3>
                  <p className="text-sm text-muted-foreground">This user hasn't added any products yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userData.products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {product.sku}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Added {formatDate(product.created_at)}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-medium">{formatCurrency(product.price)}</div>
                        <div className="text-sm text-muted-foreground">
                          Stock: {product.stock}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Recent Orders ({userData.orders.length})
              </CardTitle>
              <CardDescription>
                Latest orders from this user's integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData.orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Orders</h3>
                  <p className="text-sm text-muted-foreground">No orders have been received through this user's integrations.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userData.orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">#{order.external_order_id}</div>
                          {getStatusBadge(order.status, 'order')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Customer: {order.customer.name} ({order.customer.email})
                        </div>
                        <div className="text-sm text-muted-foreground">
                          From: {order.integration.name} ({order.integration.type})
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(order.order_created_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-lg">{formatCurrency(order.total_amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customers ({userData.customers.length})
              </CardTitle>
              <CardDescription>
                Customer database for this user
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData.customers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Customers</h3>
                  <p className="text-sm text-muted-foreground">No customers in the database yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userData.customers.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {customer.source}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Added {formatDate(customer.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{customer.total_order} orders</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                CRM Leads ({userData.crmLeads.length})
              </CardTitle>
              <CardDescription>
                Lead management and tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData.crmLeads.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No CRM Leads</h3>
                  <p className="text-sm text-muted-foreground">No leads have been added to the CRM yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userData.crmLeads.map((lead) => (
                    <div key={lead.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="space-y-1">
                          <div className="font-medium">{lead.name || 'Unnamed Lead'}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4">
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {lead.kpi_status && getStatusBadge(lead.kpi_status, 'crm')}
                          {lead.logistic_status && (
                            <Badge variant="outline" className="text-xs">
                              {lead.logistic_status}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="capitalize">
                          {lead.source}
                        </Badge>
                        <span>Added {formatDate(lead.created_at)}</span>
                      </div>

                      {lead.notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          {lead.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}