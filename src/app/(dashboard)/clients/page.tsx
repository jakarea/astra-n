import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Download, Plus, Eye, Edit, Mail, Phone, MapPin, Calendar, ShoppingBag, Euro, Star } from "lucide-react"

const clients = [
  {
    id: "CLI-001",
    registrationDate: "2023-08-15",
    firstName: "Marco",
    lastName: "Rossi",
    email: "marco.rossi@email.com",
    phone: "+39 335 123 4567",
    address: {
      street: "Via Roma 123",
      city: "Milano",
      province: "MI",
      postalCode: "20121",
      country: "Italia"
    },
    dateOfBirth: "1985-03-22",
    totalOrders: 12,
    totalSpent: "€1,247.88",
    averageOrderValue: "€103.99",
    lastOrderDate: "2024-01-15",
    customerType: "premium",
    status: "active",
    loyaltyPoints: 2450,
    preferredCategories: ["Elettronica", "Casa"],
    notes: "Cliente fedele, preferisce consegne rapide"
  },
  {
    id: "CLI-002",
    registrationDate: "2023-11-08",
    firstName: "Giulia",
    lastName: "Ferrari",
    email: "giulia.ferrari@email.com",
    phone: "+39 347 987 6543",
    address: {
      street: "Corso Buenos Aires 45",
      city: "Milano",
      province: "MI",
      postalCode: "20124",
      country: "Italia"
    },
    dateOfBirth: "1992-07-10",
    totalOrders: 8,
    totalSpent: "€856.42",
    averageOrderValue: "€107.05",
    lastOrderDate: "2024-01-14",
    customerType: "regular",
    status: "active",
    loyaltyPoints: 1680,
    preferredCategories: ["Fitness", "Benessere"],
    notes: "Interessata a prodotti wellness e fitness"
  },
  {
    id: "CLI-003",
    registrationDate: "2023-06-22",
    firstName: "Alessandro",
    lastName: "Conti",
    email: "alessandro.conti@email.com",
    phone: "+39 339 456 7890",
    address: {
      street: "Via Torino 67",
      city: "Milano",
      province: "MI",
      postalCode: "20123",
      country: "Italia"
    },
    dateOfBirth: "1978-12-05",
    totalOrders: 3,
    totalSpent: "€234.97",
    averageOrderValue: "€78.32",
    lastOrderDate: "2024-01-10",
    customerType: "regular",
    status: "inactive",
    loyaltyPoints: 470,
    preferredCategories: ["Tecnologia"],
    notes: "Ha cancellato l'ultimo ordine, da ricontattare"
  },
  {
    id: "CLI-004",
    registrationDate: "2024-01-02",
    firstName: "Francesca",
    lastName: "Ricci",
    email: "francesca.ricci@email.com",
    phone: "+39 342 678 9012",
    address: {
      street: "Viale Monza 234",
      city: "Milano",
      province: "MI",
      postalCode: "20126",
      country: "Italia"
    },
    dateOfBirth: "1988-09-18",
    totalOrders: 2,
    totalSpent: "€64.97",
    averageOrderValue: "€32.49",
    lastOrderDate: "2024-01-15",
    customerType: "new",
    status: "active",
    loyaltyPoints: 130,
    preferredCategories: ["Accessori"],
    notes: "Nuova cliente, ha appena fatto il secondo ordine"
  },
  {
    id: "CLI-005",
    registrationDate: "2023-09-30",
    firstName: "Roberto",
    lastName: "Gallo",
    email: "roberto.gallo@email.com",
    phone: "+39 348 234 5678",
    address: {
      street: "Via Brera 89",
      city: "Milano",
      province: "MI",
      postalCode: "20121",
      country: "Italia"
    },
    dateOfBirth: "1980-04-14",
    totalOrders: 15,
    totalSpent: "€1,892.35",
    averageOrderValue: "€126.16",
    lastOrderDate: "2024-01-12",
    customerType: "vip",
    status: "active",
    loyaltyPoints: 3780,
    preferredCategories: ["Audio", "Gaming"],
    notes: "VIP customer, frequent audio product purchases"
  },
  {
    id: "CLI-006",
    registrationDate: "2023-12-20",
    firstName: "Elena",
    lastName: "Bianchi",
    email: "elena.bianchi@email.com",
    phone: "+39 333 567 8901",
    address: {
      street: "Via Garibaldi 156",
      city: "Milano",
      province: "MI",
      postalCode: "20121",
      country: "Italia"
    },
    dateOfBirth: "1995-11-25",
    totalOrders: 6,
    totalSpent: "€432.18",
    averageOrderValue: "€72.03",
    lastOrderDate: "2024-01-14",
    customerType: "regular",
    status: "active",
    loyaltyPoints: 865,
    preferredCategories: ["Gaming", "Informatica"],
    notes: "Gamer appassionata, ordini regolari"
  }
]

const getCustomerTypeBadge = (type: string) => {
  const variants = {
    new: { variant: "info" as const, label: "Nuovo", icon: Star },
    regular: { variant: "secondary" as const, label: "Regular", icon: null },
    premium: { variant: "warning" as const, label: "Premium", icon: Star },
    vip: { variant: "success" as const, label: "VIP Customers", icon: Star }
  }

  const config = variants[type as keyof typeof variants]
  if (!config) return <Badge>{type}</Badge>

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon && <config.icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}

const getStatusBadge = (status: string) => {
  const variants = {
    active: { variant: "success" as const, label: "Attivo" },
    inactive: { variant: "destructive" as const, label: "Inattivo" },
    suspended: { variant: "warning" as const, label: "Sospeso" }
  }

  const config = variants[status as keyof typeof variants]
  return config ? <Badge variant={config.variant}>{config.label}</Badge> : <Badge>{status}</Badge>
}

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestione Clienti</h1>
            <p className="text-muted-foreground">Monitora e gestisci la tua base clienti</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Cliente
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clienti Totali</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-primary"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,847</div>
              <p className="text-xs text-muted-foreground">+12% dal mese scorso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clienti Attivi</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-green-500"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,523</div>
              <p className="text-xs text-muted-foreground">82.5% del totale</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nuovi Questo Mese</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Star className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">+15% crescita</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clienti VIP</CardTitle>
              <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Star className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">8.4% del totale</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LTV Medio</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Euro className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€847</div>
              <p className="text-xs text-muted-foreground">Lifetime Value</p>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Elenco Clienti</CardTitle>
              <div className="flex space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cerca clienti..." className="pl-10 w-80" />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtri
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contatti</TableHead>
                  <TableHead>Indirizzo</TableHead>
                  <TableHead>Registrazione</TableHead>
                  <TableHead>Ordini</TableHead>
                  <TableHead>Totale Speso</TableHead>
                  <TableHead>Tipo Cliente</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Punti Fedeltà</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{client.firstName} {client.lastName}</div>
                        <div className="text-xs text-muted-foreground">{client.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-xs">
                          <Mail className="h-3 w-3 mr-1" />
                          {client.email}
                        </div>
                        <div className="flex items-center text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          {client.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="flex items-start">
                          <MapPin className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                          <div>
                            <div>{client.address.street}</div>
                            <div>{client.address.postalCode} {client.address.city}, {client.address.province}</div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        {client.registrationDate}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">{client.totalOrders}</div>
                        <div className="text-xs text-muted-foreground">ordini</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-semibold">{client.totalSpent}</div>
                        <div className="text-xs text-muted-foreground">AOV: {client.averageOrderValue}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getCustomerTypeBadge(client.customerType)}</TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium text-primary">{client.loyaltyPoints}</div>
                        <div className="text-xs text-muted-foreground">punti</div>
                      </div>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}