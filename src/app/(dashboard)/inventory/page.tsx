import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Download, Plus, Eye, Edit, Package, AlertTriangle, CheckCircle, Clock, BarChart3, Euro, TrendingUp, TrendingDown } from "lucide-react"

const products = [
  {
    id: "PRD-001",
    sku: "WBH-001",
    name: "Wireless Bluetooth Headphones",
    category: "Elettronica",
    brand: "TechSound",
    description: "Cuffie wireless di alta qualità con cancellazione del rumore",
    price: "€89.99",
    costPrice: "€45.00",
    profitMargin: "50.0%",
    stockQuantity: 45,
    lowStockThreshold: 10,
    stockStatus: "in_stock",
    supplier: "TechDistribution S.r.l.",
    supplierCode: "TS-WBH-001",
    weight: "250g",
    dimensions: "18 x 15 x 8 cm",
    barcode: "8019283847562",
    location: "A-12-03",
    lastRestockDate: "2024-01-10",
    totalSold: 234,
    avgMonthlySales: 18,
    reorderPoint: 15,
    images: ["headphones-1.jpg", "headphones-2.jpg"],
    status: "active"
  },
  {
    id: "PRD-002",
    sku: "SFT-002",
    name: "Smart Fitness Tracker",
    category: "Fitness",
    brand: "FitLife",
    description: "Smartwatch per il monitoraggio dell'attività fisica e della salute",
    price: "€149.99",
    costPrice: "€75.00",
    profitMargin: "50.0%",
    stockQuantity: 8,
    lowStockThreshold: 15,
    stockStatus: "low_stock",
    supplier: "WellnessTech Italy",
    supplierCode: "FT-SFT-002",
    weight: "45g",
    dimensions: "4.5 x 3.8 x 1.2 cm",
    barcode: "8019283847563",
    location: "B-05-12",
    lastRestockDate: "2023-12-20",
    totalSold: 187,
    avgMonthlySales: 24,
    reorderPoint: 20,
    images: ["tracker-1.jpg", "tracker-2.jpg"],
    status: "active"
  },
  {
    id: "PRD-003",
    sku: "WCP-003",
    name: "Wireless Charging Pad",
    category: "Accessori",
    brand: "PowerHub",
    description: "Base di ricarica wireless compatibile con tutti i dispositivi Qi",
    price: "€39.99",
    costPrice: "€18.00",
    profitMargin: "55.0%",
    stockQuantity: 0,
    lowStockThreshold: 20,
    stockStatus: "out_of_stock",
    supplier: "ElectroGoods Ltd",
    supplierCode: "PH-WCP-003",
    weight: "180g",
    dimensions: "10 x 10 x 1.2 cm",
    barcode: "8019283847564",
    location: "C-08-07",
    lastRestockDate: "2023-11-15",
    totalSold: 156,
    avgMonthlySales: 12,
    reorderPoint: 25,
    images: ["charging-pad-1.jpg"],
    status: "active"
  },
  {
    id: "PRD-004",
    sku: "PPB-004",
    name: "Portable Power Bank",
    category: "Accessori",
    brand: "PowerHub",
    description: "Power bank portatile 10000mAh con ricarica rapida",
    price: "€29.99",
    costPrice: "€15.00",
    profitMargin: "50.0%",
    stockQuantity: 67,
    lowStockThreshold: 25,
    stockStatus: "in_stock",
    supplier: "ElectroGoods Ltd",
    supplierCode: "PH-PPB-004",
    weight: "220g",
    dimensions: "14 x 7 x 1.5 cm",
    barcode: "8019283847565",
    location: "C-08-08",
    lastRestockDate: "2024-01-05",
    totalSold: 298,
    avgMonthlySales: 32,
    reorderPoint: 30,
    images: ["powerbank-1.jpg", "powerbank-2.jpg"],
    status: "active"
  },
  {
    id: "PRD-005",
    sku: "BTS-005",
    name: "Bluetooth Speaker",
    category: "Audio",
    brand: "SoundWave",
    description: "Altoparlante Bluetooth portatile con suono stereo",
    price: "€79.99",
    costPrice: "€40.00",
    profitMargin: "50.0%",
    stockQuantity: 23,
    lowStockThreshold: 12,
    stockStatus: "in_stock",
    supplier: "AudioPro Distribution",
    supplierCode: "SW-BTS-005",
    weight: "450g",
    dimensions: "20 x 8 x 8 cm",
    barcode: "8019283847566",
    location: "D-03-15",
    lastRestockDate: "2023-12-28",
    totalSold: 145,
    avgMonthlySales: 16,
    reorderPoint: 18,
    images: ["speaker-1.jpg", "speaker-2.jpg", "speaker-3.jpg"],
    status: "active"
  },
  {
    id: "PRD-006",
    sku: "GM-007",
    name: "Gaming Mouse",
    category: "Gaming",
    brand: "GamePro",
    description: "Mouse gaming ad alta precisione con RGB personalizzabile",
    price: "€59.99",
    costPrice: "€30.00",
    profitMargin: "50.0%",
    stockQuantity: 34,
    lowStockThreshold: 15,
    stockStatus: "in_stock",
    supplier: "GamerTech Solutions",
    supplierCode: "GP-GM-007",
    weight: "95g",
    dimensions: "12 x 6.5 x 4 cm",
    barcode: "8019283847567",
    location: "E-02-09",
    lastRestockDate: "2024-01-08",
    totalSold: 89,
    avgMonthlySales: 11,
    reorderPoint: 20,
    images: ["mouse-1.jpg", "mouse-2.jpg"],
    status: "active"
  }
]

const getStockStatusBadge = (status: string, quantity: number, threshold: number) => {
  if (quantity === 0) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Esaurito
      </Badge>
    )
  } else if (quantity <= threshold) {
    return (
      <Badge variant="warning" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Scorte Basse
      </Badge>
    )
  } else {
    return (
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Disponibile
      </Badge>
    )
  }
}

const getCategoryBadge = (category: string) => {
  const variants = {
    "Elettronica": "info",
    "Fitness": "success",
    "Accessori": "secondary",
    "Audio": "warning",
    "Gaming": "destructive"
  }

  const variant = variants[category as keyof typeof variants] || "secondary"
  return <Badge variant={variant as any}>{category}</Badge>
}

export default function InventoryPage() {
  const totalProducts = products.length
  const lowStockProducts = products.filter(p => p.stockQuantity <= p.lowStockThreshold && p.stockQuantity > 0).length
  const outOfStockProducts = products.filter(p => p.stockQuantity === 0).length
  const totalValue = products.reduce((sum, p) => sum + (parseFloat(p.price.replace('€', '')) * p.stockQuantity), 0)

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestione Inventario</h1>
            <p className="text-muted-foreground">Monitora e gestisci il tuo stock di prodotti</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Esporta
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Prodotto
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prodotti Totali</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-muted-foreground">Articoli catalogati</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scorte Basse</CardTitle>
              <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockProducts}</div>
              <p className="text-xs text-muted-foreground">Da riordinare</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esauriti</CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outOfStockProducts}</div>
              <p className="text-xs text-muted-foreground">Non disponibili</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valore Inventario</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Euro className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Valore totale stock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trend Vendite</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+12%</div>
              <p className="text-xs text-muted-foreground">Ultimo mese</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Catalogo Prodotti</CardTitle>
              <div className="flex space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cerca prodotti..." className="pl-10 w-80" />
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
                  <TableHead>Prodotto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Prezzo</TableHead>
                  <TableHead>Margine</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Posizione</TableHead>
                  <TableHead>Vendite</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.brand}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>{getCategoryBadge(product.category)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{product.price}</div>
                        <div className="text-xs text-muted-foreground">Costo: {product.costPrice}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                        <span className="text-sm font-medium">{product.profitMargin}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-bold text-lg">{product.stockQuantity}</div>
                        <div className="text-xs text-muted-foreground">Min: {product.lowStockThreshold}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStockStatusBadge(product.stockStatus, product.stockQuantity, product.lowStockThreshold)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">{product.location}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">{product.totalSold}</div>
                        <div className="text-xs text-muted-foreground">{product.avgMonthlySales}/mese</div>
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