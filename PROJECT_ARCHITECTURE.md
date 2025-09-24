# V2 Project Architecture

## 🏗️ Core Principles

### 📊 Data Layer
- **Use Prisma directly** in React Server Components
- **No client-side fetch** or Supabase client for data queries
- Direct database queries in server components for optimal performance
- All dashboard data should be server-side rendered

### 🔐 Authentication
- **Supabase Auth** for registration and login endpoints only
- Authentication handled via API routes (`/api/auth/login`, `/api/auth/register`)
- **Email uniqueness** enforced by Supabase Auth automatically
- Default role: `admin` for dashboard access

### 🎯 Project Focus
- **Admin Dashboard** - server-side rendered components
- **React Server Components** for all data fetching
- **No client-side data fetching** in dashboard components

## 📁 Project Structure

```
src/
├── app/
│   ├── api/auth/          # Authentication endpoints only
│   ├── dashboard/         # Admin dashboard pages (Server Components)
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── ...
├── components/
│   ├── layout/           # Layout components
│   └── ui/               # shadcn UI components
└── lib/
    ├── prisma.ts         # Prisma client (for Server Components)
    ├── supabase.ts       # Supabase client (auth only)
    └── utils.ts          # Utility functions
```

## 🔧 Implementation Guidelines

### ✅ Correct Approach (Dashboard Pages)
```tsx
// Dashboard Server Component
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  // Direct Prisma query in Server Component
  const users = await prisma.user.findMany()
  const orders = await prisma.order.count()

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Users: {users.length}</p>
      <p>Orders: {orders}</p>
    </div>
  )
}
```

### ❌ Avoid (Client-side fetching)
```tsx
// Don't do this in dashboard components
"use client"
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/data').then(res => res.json()).then(setData)
  }, [])

  // ...
}
```

### 🔐 Authentication Flow
1. **Registration**: `/register` → `/api/auth/register` → Supabase Auth
2. **Login**: `/login` → `/api/auth/login` → Supabase Auth
3. **Dashboard**: Server Components with direct Prisma queries

## 🎨 UI Guidelines
- **shadcn UI components** only - no custom UI
- **Responsive design** with Tailwind CSS 4
- **Dark theme** with proper contrast
- **Professional admin interface**

## 📊 Database Access
- **Prisma ORM** for all database operations
- **Same database** as main project (Supabase PostgreSQL)
- **Server Components** for data fetching
- **Type-safe** database queries

## 🚀 Performance
- **Server-side rendering** for faster initial loads
- **Direct database queries** without API layer overhead
- **Minimal client-side JavaScript** for dashboard pages