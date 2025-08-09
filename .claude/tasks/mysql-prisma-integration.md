# MySQL Database Integration with Prisma ORM - Implementation Plan

## Project Overview
Adding MySQL database with Prisma ORM to the existing Next.js 15 parking calendar app that currently fetches orders from WooCommerce API. The goal is to store orders locally and add CRUD functionality while maintaining WooCommerce integration.

## Current Architecture Analysis

### Existing Data Flow
1. **WooCommerce API** (`src/app/api/orders/route.ts`) - Fetches completed orders with parallel pagination
2. **Client-side Processing** (`src/components/Calendar/index.tsx`) - Processes orders and calculates occupancy
3. **Calendar Display** - Shows color-coded occupancy levels with modal details

### Current TypeScript Interfaces
```typescript
interface WooOrder {
  id: number;
  status: string;
  line_items: {
    id: number;
    name: string;
    quantity: number;
    meta_data: { key: string; value: string }[];
  }[];
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface DayData {
  date: string;
  carCount: number;
  occupancyPercentage: number;
  orders: WooOrder[];
}
```

## PHASE 1: Database Infrastructure Setup

### Step 1.1: Install Prisma Dependencies
**Files to modify**: `package.json`
```bash
npm install prisma @prisma/client mysql2
npm install -D prisma
```

**Expected git commit**: `feat: add Prisma ORM and MySQL dependencies`

**Verification checkpoint**: `npm list prisma @prisma/client mysql2` shows installed packages

### Step 1.2: Initialize Prisma
**Files to create**: 
- `prisma/schema.prisma`
- `.env` updates

```bash
npx prisma init --datasource-provider mysql
```

**Expected git commit**: `feat: initialize Prisma with MySQL provider`

**Verification checkpoint**: Prisma folder exists with schema.prisma

### Step 1.3: Design Database Schema
**Files to modify**: `prisma/schema.prisma`

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Order {
  id                Int           @id @default(autoincrement())
  wooCommerceId     Int           @unique @map("woo_commerce_id")
  status            String        @db.VarChar(50)
  dateCreated       DateTime      @map("date_created")
  billingFirstName  String        @map("billing_first_name") @db.VarChar(100)
  billingLastName   String        @map("billing_last_name") @db.VarChar(100)
  billingEmail      String        @map("billing_email") @db.VarChar(255)
  billingPhone      String?       @map("billing_phone") @db.VarChar(50)
  lineItems         LineItem[]
  dailyOccupancy    DailyOccupancy[]
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  @@map("orders")
  @@index([wooCommerceId])
  @@index([status])
  @@index([dateCreated])
}

model LineItem {
  id                Int      @id @default(autoincrement())
  orderId           Int      @map("order_id")
  wooCommerceId     Int      @map("woo_commerce_id")
  name              String   @db.VarChar(255)
  quantity          Int
  deliveryDate      DateTime? @map("delivery_date")
  cruiseDuration    Int?     @map("cruise_duration")
  metaData          Json?    @map("meta_data")
  order             Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("line_items")
  @@index([orderId])
  @@index([deliveryDate])
}

model DailyOccupancy {
  id                Int      @id @default(autoincrement())
  date              DateTime @unique
  carCount          Int      @default(0) @map("car_count")
  occupancyPercentage Float  @default(0) @map("occupancy_percentage")
  orders            Order[]
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("daily_occupancy")
  @@index([date])
}

model SyncStatus {
  id                Int      @id @default(autoincrement())
  lastSyncAt        DateTime @map("last_sync_at")
  syncType          String   @map("sync_type") @db.VarChar(50) // 'full' or 'incremental'
  ordersProcessed   Int      @default(0) @map("orders_processed")
  errors            Json?
  status            String   @default("completed") @db.VarChar(50) // 'running', 'completed', 'failed'
  createdAt         DateTime @default(now()) @map("created_at")

  @@map("sync_status")
}
```

**Expected git commit**: `feat: design comprehensive database schema for parking orders`

**Verification checkpoint**: Schema compiles without errors

### Step 1.4: Environment Configuration
**Files to modify**: `.env.local`

Add MySQL connection string:
```env
DATABASE_URL="mysql://username:password@localhost:3306/parking_calendar"
```

**Expected git commit**: `config: add MySQL database connection`

**Verification checkpoint**: Database connection string is properly formatted

### Step 1.5: Generate Prisma Client & Run Migrations
**Commands to run**:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Files created**: 
- `prisma/migrations/` folder
- Updated `node_modules/.prisma/`

**Expected git commit**: `feat: create initial database migration`

**Verification checkpoint**: Database tables created successfully, Prisma Client generated

## PHASE 2: API Layer Development

### Step 2.1: Create Database Connection Utility
**Files to create**: `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Expected git commit**: `feat: add Prisma database connection utility`

**Verification checkpoint**: Prisma client can connect to database

### Step 2.2: Create WooCommerce Data Transformation Utilities
**Files to create**: `src/lib/woo-transform.ts`

```typescript
import { Order, LineItem } from '@prisma/client'
import moment from 'moment'

interface WooOrder {
  id: number;
  status: string;
  date_created: string;
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    meta_data: Array<{ key: string; value: string }>;
  }>;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

export function transformWooOrderForDB(wooOrder: WooOrder) {
  return {
    wooCommerceId: wooOrder.id,
    status: wooOrder.status,
    dateCreated: new Date(wooOrder.date_created),
    billingFirstName: wooOrder.billing.first_name,
    billingLastName: wooOrder.billing.last_name,
    billingEmail: wooOrder.billing.email,
    billingPhone: wooOrder.billing.phone || null,
    lineItems: {
      create: wooOrder.line_items.map(item => transformLineItemForDB(item))
    }
  }
}

export function transformLineItemForDB(lineItem: any) {
  const deliveryDateMeta = lineItem.meta_data.find(
    (meta: any) => meta.key === '_prdd_lite_date'
  )
  
  const cruiseDurationMatch = lineItem.name.match(/(\d+)-Night/)
  
  return {
    wooCommerceId: lineItem.id,
    name: lineItem.name,
    quantity: lineItem.quantity,
    deliveryDate: deliveryDateMeta ? new Date(deliveryDateMeta.value) : null,
    cruiseDuration: cruiseDurationMatch ? parseInt(cruiseDurationMatch[1]) : null,
    metaData: lineItem.meta_data
  }
}

export function calculateDailyOccupancy(lineItems: LineItem[]) {
  const dailyOccupancy = new Map<string, number>()
  
  lineItems.forEach(item => {
    if (item.deliveryDate && item.cruiseDuration) {
      const startDate = moment(item.deliveryDate)
      const totalDays = item.cruiseDuration + 1
      
      for (let i = 0; i < totalDays; i++) {
        const currentDate = startDate.clone().add(i, 'days')
        const dateKey = currentDate.format('YYYY-MM-DD')
        const currentCount = dailyOccupancy.get(dateKey) || 0
        dailyOccupancy.set(dateKey, currentCount + item.quantity)
      }
    }
  })
  
  return dailyOccupancy
}
```

**Expected git commit**: `feat: add WooCommerce data transformation utilities`

**Verification checkpoint**: Functions compile and handle edge cases properly

### Step 2.3: Create Data Synchronization API
**Files to create**: `src/app/api/sync/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transformWooOrderForDB, calculateDailyOccupancy } from '@/lib/woo-transform'

export async function POST(request: Request) {
  try {
    const { syncType = 'incremental' } = await request.json()
    
    // Record sync start
    const syncRecord = await prisma.syncStatus.create({
      data: {
        lastSyncAt: new Date(),
        syncType,
        status: 'running'
      }
    })

    let ordersProcessed = 0
    let errors: any[] = []

    try {
      // Get last sync time for incremental sync
      const lastSync = syncType === 'incremental' 
        ? await prisma.syncStatus.findFirst({
            where: { status: 'completed' },
            orderBy: { createdAt: 'desc' }
          })
        : null

      const fromDate = lastSync?.lastSyncAt || new Date('2025-01-01')
      
      // Fetch WooCommerce orders
      const wooOrders = await fetchWooCommerceOrders(fromDate)
      
      // Process each order
      for (const wooOrder of wooOrders) {
        try {
          await prisma.order.upsert({
            where: { wooCommerceId: wooOrder.id },
            update: transformWooOrderForDB(wooOrder),
            create: transformWooOrderForDB(wooOrder)
          })
          ordersProcessed++
        } catch (error) {
          errors.push({ orderId: wooOrder.id, error: error.message })
        }
      }

      // Recalculate daily occupancy
      await recalculateDailyOccupancy()

      // Update sync status
      await prisma.syncStatus.update({
        where: { id: syncRecord.id },
        data: {
          status: errors.length > 0 ? 'failed' : 'completed',
          ordersProcessed,
          errors: errors.length > 0 ? errors : null
        }
      })

      return NextResponse.json({
        success: true,
        ordersProcessed,
        errors: errors.length,
        syncType
      })
    } catch (error) {
      await prisma.syncStatus.update({
        where: { id: syncRecord.id },
        data: {
          status: 'failed',
          ordersProcessed,
          errors: [{ general: error.message }]
        }
      })
      throw error
    }
  } catch (error) {
    console.error('Sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    )
  }
}

async function fetchWooCommerceOrders(fromDate: Date) {
  // Implementation similar to existing orders route but with date filtering
  // ... (implement WooCommerce API calls)
}

async function recalculateDailyOccupancy() {
  // Clear existing occupancy data
  await prisma.dailyOccupancy.deleteMany()
  
  // Get all line items with delivery dates
  const lineItems = await prisma.lineItem.findMany({
    where: {
      deliveryDate: { not: null },
      cruiseDuration: { not: null }
    }
  })
  
  // Calculate occupancy
  const occupancyMap = calculateDailyOccupancy(lineItems)
  
  // Insert new occupancy data
  const occupancyData = Array.from(occupancyMap.entries()).map(([date, carCount]) => ({
    date: new Date(date),
    carCount,
    occupancyPercentage: Math.min((carCount / 115) * 100, 100) // 115 max capacity
  }))
  
  await prisma.dailyOccupancy.createMany({
    data: occupancyData
  })
}

export async function GET() {
  try {
    const latestSync = await prisma.syncStatus.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(latestSync)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
```

**Expected git commit**: `feat: implement data synchronization API with WooCommerce`

**Verification checkpoint**: Sync endpoint successfully imports and processes orders

### Step 2.4: Create New Database-Powered Orders API
**Files to modify**: `src/app/api/orders/route.ts`

Replace existing implementation with database queries:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where = startDate && endDate ? {
      lineItems: {
        some: {
          deliveryDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      }
    } : {}

    const orders = await prisma.order.findMany({
      where,
      include: {
        lineItems: {
          where: startDate && endDate ? {
            deliveryDate: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          } : undefined
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dateCreated: 'desc' }
    })

    // Transform to match existing WooCommerce format for compatibility
    const formattedOrders = orders.map(order => ({
      id: order.wooCommerceId,
      status: order.status,
      date_created: order.dateCreated.toISOString(),
      billing: {
        first_name: order.billingFirstName,
        last_name: order.billingLastName,
        email: order.billingEmail,
        phone: order.billingPhone
      },
      line_items: order.lineItems.map(item => ({
        id: item.wooCommerceId,
        name: item.name,
        quantity: item.quantity,
        meta_data: [
          ...(item.metaData as any[] || []),
          ...(item.deliveryDate ? [{ 
            key: '_prdd_lite_date', 
            value: item.deliveryDate.toISOString().split('T')[0] 
          }] : [])
        ]
      }))
    }))

    return NextResponse.json(formattedOrders)
  } catch (error) {
    console.error('Database query failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders from database' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const orderData = await request.json()
    
    const newOrder = await prisma.order.create({
      data: {
        wooCommerceId: orderData.wooCommerceId || 0, // For manually created orders
        status: orderData.status,
        dateCreated: new Date(orderData.dateCreated),
        billingFirstName: orderData.billing.first_name,
        billingLastName: orderData.billing.last_name,
        billingEmail: orderData.billing.email,
        billingPhone: orderData.billing.phone,
        lineItems: {
          create: orderData.line_items.map((item: any) => ({
            wooCommerceId: item.id || 0,
            name: item.name,
            quantity: item.quantity,
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
            cruiseDuration: item.cruiseDuration,
            metaData: item.meta_data || []
          }))
        }
      },
      include: {
        lineItems: true
      }
    })

    // Recalculate affected daily occupancy
    await recalculateOccupancyForOrder(newOrder)

    return NextResponse.json({ success: true, order: newOrder })
  } catch (error) {
    console.error('Failed to create order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...orderData } = await request.json()
    
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: orderData.status,
        billingFirstName: orderData.billing.first_name,
        billingLastName: orderData.billing.last_name,
        billingEmail: orderData.billing.email,
        billingPhone: orderData.billing.phone,
        lineItems: {
          deleteMany: {},
          create: orderData.line_items.map((item: any) => ({
            wooCommerceId: item.id || 0,
            name: item.name,
            quantity: item.quantity,
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
            cruiseDuration: item.cruiseDuration,
            metaData: item.meta_data || []
          }))
        }
      },
      include: {
        lineItems: true
      }
    })

    await recalculateOccupancyForOrder(updatedOrder)

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Failed to update order:', error)
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    await prisma.order.delete({
      where: { id: parseInt(id) }
    })

    // Recalculate daily occupancy
    await recalculateDailyOccupancy()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}

async function recalculateOccupancyForOrder(order: any) {
  // Recalculate daily occupancy for affected dates
  // Implementation similar to sync route
}
```

**Expected git commit**: `feat: replace WooCommerce API with database-powered orders endpoint`

**Verification checkpoint**: Orders API returns data from database, CRUD operations work

### Step 2.5: Create Optimized Occupancy API
**Files to create**: `src/app/api/occupancy/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      )
    }

    const occupancyData = await prisma.dailyOccupancy.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        orders: {
          include: {
            lineItems: {
              where: {
                deliveryDate: {
                  gte: new Date(startDate),
                  lte: new Date(endDate)
                }
              }
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    // Transform to match existing DayData interface
    const formattedData = occupancyData.map(day => ({
      date: day.date.toISOString().split('T')[0],
      carCount: day.carCount,
      occupancyPercentage: day.occupancyPercentage,
      orders: day.orders.map(order => ({
        id: order.wooCommerceId,
        status: order.status,
        date_created: order.dateCreated.toISOString(),
        billing: {
          first_name: order.billingFirstName,
          last_name: order.billingLastName,
          email: order.billingEmail,
          phone: order.billingPhone
        },
        line_items: order.lineItems.map(item => ({
          id: item.wooCommerceId,
          name: item.name,
          quantity: item.quantity,
          meta_data: [
            ...(item.metaData as any[] || []),
            ...(item.deliveryDate ? [{ 
              key: '_prdd_lite_date', 
              value: item.deliveryDate.toISOString().split('T')[0] 
            }] : [])
          ]
        }))
      }))
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('Failed to fetch occupancy data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch occupancy data' },
      { status: 500 }
    )
  }
}
```

**Expected git commit**: `feat: add optimized occupancy data API endpoint`

**Verification checkpoint**: Occupancy API returns pre-calculated data efficiently

## PHASE 3: Calendar Integration & CRUD Operations

### Step 3.1: Update Calendar Component for Database Integration
**Files to modify**: `src/components/Calendar/index.tsx`

Replace client-side data processing with API calls:

```typescript
// Key changes to Calendar component
export default function Calendar() {
  const [dayData, setDayData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<any>(null)

  useEffect(() => {
    loadCalendarData()
    checkSyncStatus()
  }, [])

  const loadCalendarData = async () => {
    try {
      setLoading(true)
      const currentDate = moment()
      const startDate = currentDate.clone().startOf('month').subtract(1, 'month')
      const endDate = currentDate.clone().endOf('month').add(2, 'months')
      
      const response = await fetch(
        `/api/occupancy?start_date=${startDate.format('YYYY-MM-DD')}&end_date=${endDate.format('YYYY-MM-DD')}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load calendar data')
      }
      
      const data = await response.json()
      setDayData(data)
    } catch (error) {
      console.error('Error loading calendar data:', error)
      // Fallback to original WooCommerce API if database fails
      await loadFallbackData()
    } finally {
      setLoading(false)
    }
  }

  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync')
      if (response.ok) {
        const status = await response.json()
        setSyncStatus(status)
      }
    } catch (error) {
      console.error('Failed to check sync status:', error)
    }
  }

  const handleManualSync = async () => {
    try {
      setSyncStatus({ status: 'running' })
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'incremental' })
      })
      
      if (response.ok) {
        const result = await response.json()
        setSyncStatus({ 
          status: 'completed', 
          lastSyncAt: new Date(),
          ordersProcessed: result.ordersProcessed 
        })
        await loadCalendarData() // Refresh calendar
      }
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncStatus({ status: 'failed' })
    }
  }

  // Rest of component remains similar but uses loaded data instead of processing
  return (
    <div className="container">
      {/* Add sync status indicator */}
      <div className="sync-status">
        {syncStatus?.status === 'running' && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent"></div>
            Syncing data...
          </div>
        )}
        <button 
          onClick={handleManualSync}
          disabled={syncStatus?.status === 'running'}
          className="btn-sync"
        >
          Sync Now
        </button>
      </div>
      
      {loading ? (
        <div className="loading-spinner">Loading calendar...</div>
      ) : (
        <CalendarGrid dayData={dayData} onDateClick={handleDateClick} />
      )}
    </div>
  )
}
```

**Expected git commit**: `feat: integrate calendar component with database APIs`

**Verification checkpoint**: Calendar loads data from database, shows sync status

### Step 3.2: Add Order Creation Modal
**Files to create**: `src/components/OrderModal/CreateOrder.tsx`

```typescript
import { useState } from 'react'
import moment from 'moment'

interface CreateOrderModalProps {
  selectedDate?: string
  onClose: () => void
  onOrderCreated: () => void
}

export default function CreateOrderModal({ selectedDate, onClose, onOrderCreated }: CreateOrderModalProps) {
  const [formData, setFormData] = useState({
    billing: {
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    },
    line_items: [{
      name: '',
      quantity: 1,
      deliveryDate: selectedDate || moment().format('YYYY-MM-DD'),
      cruiseDuration: 7
    }]
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'completed',
          dateCreated: new Date().toISOString()
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create order')
      }
      
      onOrderCreated()
      onClose()
    } catch (error) {
      console.error('Failed to create order:', error)
      alert('Failed to create order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Parking Order</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="order-form">
          <div className="form-section">
            <h3>Customer Information</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="First Name"
                value={formData.billing.first_name}
                onChange={(e) => setFormData({
                  ...formData,
                  billing: { ...formData.billing, first_name: e.target.value }
                })}
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.billing.last_name}
                onChange={(e) => setFormData({
                  ...formData,
                  billing: { ...formData.billing, last_name: e.target.value }
                })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.billing.email}
                onChange={(e) => setFormData({
                  ...formData,
                  billing: { ...formData.billing, email: e.target.value }
                })}
                required
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={formData.billing.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  billing: { ...formData.billing, phone: e.target.value }
                })}
              />
            </div>
          </div>
          
          <div className="form-section">
            <h3>Parking Details</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Service Name (e.g., 7-Night Caribbean Cruise)"
                value={formData.line_items[0].name}
                onChange={(e) => setFormData({
                  ...formData,
                  line_items: [{
                    ...formData.line_items[0],
                    name: e.target.value
                  }]
                })}
                required
              />
              <input
                type="number"
                placeholder="Number of Cars"
                min="1"
                value={formData.line_items[0].quantity}
                onChange={(e) => setFormData({
                  ...formData,
                  line_items: [{
                    ...formData.line_items[0],
                    quantity: parseInt(e.target.value)
                  }]
                })}
                required
              />
              <input
                type="date"
                value={formData.line_items[0].deliveryDate}
                onChange={(e) => setFormData({
                  ...formData,
                  line_items: [{
                    ...formData.line_items[0],
                    deliveryDate: e.target.value
                  }]
                })}
                required
              />
              <select
                value={formData.line_items[0].cruiseDuration}
                onChange={(e) => setFormData({
                  ...formData,
                  line_items: [{
                    ...formData.line_items[0],
                    cruiseDuration: parseInt(e.target.value)
                  }]
                })}
                required
              >
                <option value={3}>3-Night Cruise</option>
                <option value={4}>4-Night Cruise</option>
                <option value={7}>7-Night Cruise</option>
                <option value={10}>10-Night Cruise</option>
                <option value={14}>14-Night Cruise</option>
              </select>
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Expected git commit**: `feat: add order creation modal with form validation`

**Verification checkpoint**: Users can create new orders through the calendar interface

### Step 3.3: Add Order Edit/Delete Functionality
**Files to create**: `src/components/OrderModal/EditOrder.tsx`

```typescript
import { useState, useEffect } from 'react'
import moment from 'moment'

interface EditOrderModalProps {
  order: any
  onClose: () => void
  onOrderUpdated: () => void
  onOrderDeleted: () => void
}

export default function EditOrderModal({ order, onClose, onOrderUpdated, onOrderDeleted }: EditOrderModalProps) {
  const [formData, setFormData] = useState({
    billing: {
      first_name: '',
      last_name: '',
      email: '',
      phone: ''
    },
    line_items: [{}],
    status: 'completed'
  })
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (order) {
      setFormData({
        billing: order.billing,
        line_items: order.line_items.map((item: any) => ({
          ...item,
          deliveryDate: item.meta_data.find((m: any) => m.key === '_prdd_lite_date')?.value || '',
          cruiseDuration: item.name.match(/(\d+)-Night/)?.[1] || 7
        })),
        status: order.status
      })
    }
  }, [order])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          ...formData
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update order')
      }
      
      onOrderUpdated()
      onClose()
    } catch (error) {
      console.error('Failed to update order:', error)
      alert('Failed to update order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    
    try {
      const response = await fetch(`/api/orders?id=${order.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete order')
      }
      
      onOrderDeleted()
      onClose()
    } catch (error) {
      console.error('Failed to delete order:', error)
      alert('Failed to delete order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Order #{order.id}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        {showDeleteConfirm ? (
          <div className="delete-confirmation">
            <p>Are you sure you want to delete this order? This action cannot be undone.</p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button onClick={handleDelete} className="btn-danger" disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Order'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="order-form">
            {/* Similar form fields as CreateOrder component */}
            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-danger"
                disabled={loading}
              >
                Delete Order
              </button>
              <button type="button" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Updating...' : 'Update Order'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
```

**Expected git commit**: `feat: add order edit and delete functionality`

**Verification checkpoint**: Users can edit and delete orders through the calendar interface

## PHASE 4: Testing & Verification

### Step 4.1: Set up Prisma Studio for Database Management
**Commands to add**:
```bash
npx prisma studio
```

**Expected git commit**: `docs: add Prisma Studio setup instructions`

**Verification checkpoint**: Prisma Studio opens and shows database tables with data

### Step 4.2: Create Database Seed Script
**Files to create**: `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import moment from 'moment'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  
  // Create sample orders
  const sampleOrders = [
    {
      wooCommerceId: 1001,
      status: 'completed',
      dateCreated: moment().subtract(30, 'days').toDate(),
      billingFirstName: 'John',
      billingLastName: 'Doe',
      billingEmail: 'john.doe@example.com',
      billingPhone: '555-0123',
      lineItems: {
        create: [
          {
            wooCommerceId: 2001,
            name: '7-Night Caribbean Cruise Parking',
            quantity: 2,
            deliveryDate: moment().add(5, 'days').toDate(),
            cruiseDuration: 7,
            metaData: []
          }
        ]
      }
    },
    {
      wooCommerceId: 1002,
      status: 'completed',
      dateCreated: moment().subtract(25, 'days').toDate(),
      billingFirstName: 'Jane',
      billingLastName: 'Smith',
      billingEmail: 'jane.smith@example.com',
      billingPhone: '555-0456',
      lineItems: {
        create: [
          {
            wooCommerceId: 2002,
            name: '5-Night Bahamas Cruise Parking',
            quantity: 1,
            deliveryDate: moment().add(10, 'days').toDate(),
            cruiseDuration: 5,
            metaData: []
          }
        ]
      }
    }
  ]

  for (const orderData of sampleOrders) {
    await prisma.order.create({
      data: orderData
    })
  }

  // Recalculate daily occupancy
  await recalculateDailyOccupancy()

  console.log('Database seeded successfully!')
}

async function recalculateDailyOccupancy() {
  // Clear existing occupancy
  await prisma.dailyOccupancy.deleteMany()

  // Get all line items
  const lineItems = await prisma.lineItem.findMany({
    where: {
      deliveryDate: { not: null },
      cruiseDuration: { not: null }
    }
  })

  const occupancyMap = new Map<string, number>()

  lineItems.forEach(item => {
    if (item.deliveryDate && item.cruiseDuration) {
      const startDate = moment(item.deliveryDate)
      const totalDays = item.cruiseDuration + 1

      for (let i = 0; i < totalDays; i++) {
        const currentDate = startDate.clone().add(i, 'days')
        const dateKey = currentDate.format('YYYY-MM-DD')
        const currentCount = occupancyMap.get(dateKey) || 0
        occupancyMap.set(dateKey, currentCount + item.quantity)
      }
    }
  })

  // Create occupancy records
  const occupancyData = Array.from(occupancyMap.entries()).map(([date, carCount]) => ({
    date: new Date(date),
    carCount,
    occupancyPercentage: Math.min((carCount / 115) * 100, 100)
  }))

  await prisma.dailyOccupancy.createMany({
    data: occupancyData
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Package.json script to add**:
```json
{
  "scripts": {
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

**Expected git commit**: `feat: add database seed script with sample data`

**Verification checkpoint**: Seed script creates sample orders and calculates occupancy

### Step 4.3: Error Handling and Edge Cases
**Files to modify**: Various API routes and components

Add comprehensive error handling:
- Database connection failures
- Invalid date formats
- Concurrent modification conflicts
- API rate limiting
- Network failures

**Expected git commit**: `feat: add comprehensive error handling and validation`

**Verification checkpoint**: App gracefully handles errors and edge cases

### Step 4.4: Performance Testing
**Files to create**: `scripts/performance-test.js`

```javascript
// Script to test API performance with sample data
// Test database query performance vs WooCommerce API
// Load testing for concurrent operations
```

**Expected git commit**: `test: add performance testing scripts`

**Verification checkpoint**: Database operations perform better than WooCommerce API calls

## PHASE 5: Final Integration & Deployment Prep

### Step 5.1: Update Environment Configuration
**Files to modify**: 
- `.env.example`
- `README.md` (if deployment instructions needed)

Add database-related environment variables and setup instructions.

**Expected git commit**: `docs: update environment configuration for database`

### Step 5.2: Add Database Migration Scripts
**Files to create**: `scripts/migrate-production.sh`

```bash
#!/bin/bash
# Production migration script
npx prisma migrate deploy
npx prisma generate
npm run db:seed
```

**Expected git commit**: `feat: add production database migration scripts`

### Step 5.3: Backup and Recovery Strategy
**Files to create**: 
- `scripts/backup-db.sh`
- `scripts/restore-db.sh`

**Expected git commit**: `feat: add database backup and recovery scripts`

**Verification checkpoint**: Backup and restore procedures work correctly

## Rollback Strategy

If issues occur during implementation:

1. **Phase 1 Rollback**: Remove Prisma dependencies, delete prisma folder
2. **Phase 2 Rollback**: Restore original `/api/orders/route.ts`, remove new API endpoints
3. **Phase 3 Rollback**: Restore original Calendar component, remove new modals
4. **Database Rollback**: Drop database tables, restore WooCommerce-only integration

## Success Criteria

✅ **Database Integration**:
- [ ] Orders stored and retrieved from MySQL database
- [ ] Daily occupancy pre-calculated and cached
- [ ] API response times improved (< 500ms vs > 2s)

✅ **CRUD Operations**:
- [ ] Create new orders directly in calendar
- [ ] Edit existing orders with validation
- [ ] Delete orders with confirmation
- [ ] Real-time calendar updates

✅ **Data Synchronization**:
- [ ] WooCommerce orders automatically synced
- [ ] Manual sync functionality working
- [ ] Conflict resolution for overlapping bookings
- [ ] Error handling and logging

✅ **Performance & Reliability**:
- [ ] Calendar loads in < 2 seconds
- [ ] Database queries optimized with proper indexing
- [ ] Error handling for all failure scenarios
- [ ] Graceful fallback to WooCommerce API if database fails

## Next Steps After Implementation

1. **Monitoring Setup**: Add logging and monitoring for database operations
2. **Automated Backups**: Set up regular database backups
3. **Additional Features**: 
   - Advanced search and filtering
   - Reporting and analytics
   - Customer management
   - Booking conflicts prevention
4. **Performance Optimization**: Query optimization, caching layers
5. **Security Enhancements**: Authentication, authorization, audit logging

This comprehensive plan maintains backward compatibility while adding powerful database features and CRUD operations to the parking calendar application.