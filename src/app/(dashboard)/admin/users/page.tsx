"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRole } from "@/contexts/RoleContext"
import { createUserSchema, type CreateUserFormData } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  Shield,
  Users,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  AlertCircle
} from "lucide-react"

type UserAccount = {
  id: string
  name: string
  email: string
  role: 'admin' | 'seller'
  status: 'active' | 'inactive' | 'pending'
  lastLogin: string
  createdAt: string
  ordersCount: number
  revenue: number
}

const mockUsers: UserAccount[] = [
  {
    id: '1',
    name: 'Marco Rossi',
    email: 'admin@astra.com',
    role: 'admin',
    status: 'active',
    lastLogin: '2024-01-15 10:30',
    createdAt: '2023-06-15',
    ordersCount: 0,
    revenue: 0
  },
  {
    id: '2',
    name: 'Giulia Ferrari',
    email: 'giulia@vendita.com',
    role: 'seller',
    status: 'active',
    lastLogin: '2024-01-15 09:45',
    createdAt: '2023-08-20',
    ordersCount: 142,
    revenue: 15680
  },
  {
    id: '3',
    name: 'Alessandro Conti',
    email: 'alessandro@store.it',
    role: 'seller',
    status: 'active',
    lastLogin: '2024-01-14 18:20',
    createdAt: '2023-09-10',
    ordersCount: 89,
    revenue: 12340
  },
  {
    id: '4',
    name: 'Francesca Ricci',
    email: 'francesca@shop.com',
    role: 'seller',
    status: 'inactive',
    lastLogin: '2024-01-10 14:15',
    createdAt: '2023-11-05',
    ordersCount: 67,
    revenue: 8920
  },
  {
    id: '5',
    name: 'Roberto Gallo',
    email: 'roberto@ecommerce.it',
    role: 'seller',
    status: 'pending',
    lastLogin: 'Mai',
    createdAt: '2024-01-14',
    ordersCount: 0,
    revenue: 0
  }
]

const getRoleBadge = (role: string) => {
  return role === 'admin' ? (
    <Badge variant="default" className="flex items-center gap-1">
      <Shield className="h-3 w-3" />
      Admin
    </Badge>
  ) : (
    <Badge variant="secondary" className="flex items-center gap-1">
      <Users className="h-3 w-3" />
      Seller
    </Badge>
  )
}

const getStatusBadge = (status: string) => {
  const variants = {
    active: { variant: "success" as const, label: "Attivo", icon: UserCheck },
    inactive: { variant: "secondary" as const, label: "Inattivo", icon: UserX },
    pending: { variant: "warning" as const, label: "In Attesa", icon: AlertCircle }
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

export default function AdminUsersPage() {
  const { isAdmin } = useRole()
  const router = useRouter()
  const [users, setUsers] = useState<UserAccount[]>(mockUsers)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'seller' as 'admin' | 'seller'
  })
  const [userFormErrors, setUserFormErrors] = useState<{[key: string]: string}>({})

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      router.push('/')
    }
  }, [isAdmin, router])

  if (!isAdmin) {
    return null
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  const handleAddUser = () => {
    setUserFormErrors({})

    // Validate with Zod
    const result = createUserSchema.safeParse(newUser)

    if (!result.success) {
      const errors: {[key: string]: string} = {}
      result.error.errors.forEach((error) => {
        errors[error.path[0] as string] = error.message
      })
      setUserFormErrors(errors)
      return
    }

    const validatedData = result.data
    const user: UserAccount = {
      id: (users.length + 1).toString(),
      name: validatedData.name,
      email: validatedData.email,
      role: validatedData.role,
      status: 'pending',
      lastLogin: 'Mai',
      createdAt: new Date().toISOString().split('T')[0],
      ordersCount: 0,
      revenue: 0
    }

    setUsers([...users, user])
    setNewUser({ name: '', email: '', role: 'seller' })
    setUserFormErrors({})
    setIsAddUserOpen(false)
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId))
  }

  const handleToggleStatus = (userId: string) => {
    setUsers(users.map(user =>
      user.id === userId
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' as any }
        : user
    ))
  }

  const activeUsers = users.filter(u => u.status === 'active').length
  const pendingUsers = users.filter(u => u.status === 'pending').length
  const adminUsers = users.filter(u => u.role === 'admin').length
  const sellerUsers = users.filter(u => u.role === 'seller').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Shield className="mr-3 h-8 w-8 text-green-600" />
            Gestione Utenti
          </h1>
          <p className="text-muted-foreground">Amministra account utenti e permessi (Solo Admin)</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Esporta
          </Button>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Utente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi Nuovo Utente</DialogTitle>
                <DialogDescription>
                  Crea un nuovo account utente nel sistema
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="col-span-3"
                  />
                  {userFormErrors.name && (
                    <p className="col-span-3 col-start-2 text-sm text-red-600">{userFormErrors.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="col-span-3"
                  />
                  {userFormErrors.email && (
                    <p className="col-span-3 col-start-2 text-sm text-red-600">{userFormErrors.email}</p>
                  )}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Ruolo
                  </Label>
                  <Select value={newUser.role} onValueChange={(value: 'admin' | 'seller') => setNewUser({...newUser, role: value})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleziona ruolo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {userFormErrors.role && (
                    <p className="col-span-3 col-start-2 text-sm text-red-600">{userFormErrors.role}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddUser}>Crea Utente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Totali</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Registrati nel sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Attivi</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Online e operativi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingUsers}</div>
            <p className="text-xs text-muted-foreground">Da approvare</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amministratori</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers}</div>
            <p className="text-xs text-muted-foreground">{sellerUsers} venditori</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Elenco Utenti</CardTitle>
            <div className="flex space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca utenti..."
                  className="pl-10 w-80"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="active">Attivo</SelectItem>
                  <SelectItem value="inactive">Inattivo</SelectItem>
                  <SelectItem value="pending">In Attesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utente</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Ultimo Login</TableHead>
                <TableHead>Ordini</TableHead>
                <TableHead>Fatturato</TableHead>
                <TableHead>Registrato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center"
                           style={{backgroundColor: user.role === 'admin' ? '#3ECF8E' : '#94A3B8'}}>
                        <span className="text-white font-medium text-sm">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.lastLogin === 'Mai' ? (
                        <span className="text-muted-foreground">Mai</span>
                      ) : (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span className="font-mono text-xs">{user.lastLogin}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium">{user.ordersCount}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">
                      {user.revenue > 0 ? `€${user.revenue.toLocaleString()}` : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">{user.createdAt}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(user.id)}
                      >
                        {user.status === 'active' ? (
                          <UserX className="h-4 w-4 text-orange-600" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      {user.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}