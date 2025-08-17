import { NextResponse } from 'next/server'
import { transformWooOrderForDB, transformLineItemForDB, calculateDailyOccupancy } from '@/lib/woo-transform'
import { prisma } from '@/lib/prisma'

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
          // Check if order exists
          const existingOrder = await prisma.order.findUnique({
            where: { wooCommerceId: wooOrder.id }
          })

          if (existingOrder) {
            // Update existing order - delete old line items first
            await prisma.order.update({
              where: { wooCommerceId: wooOrder.id },
              data: {
                status: wooOrder.status,
                dateCreated: new Date(wooOrder.date_created),
                billingFirstName: wooOrder.billing.first_name,
                billingLastName: wooOrder.billing.last_name,
                billingEmail: wooOrder.billing.email,
                billingPhone: wooOrder.billing.phone || null,
                lineItems: {
                  deleteMany: {}, // Delete all existing line items
                  create: wooOrder.line_items.map(item => transformLineItemForDB(item))
                }
              }
            })
          } else {
            // Create new order
            await prisma.order.create({
              data: transformWooOrderForDB(wooOrder)
            })
          }
          ordersProcessed++
        } catch (error: any) {
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
          errors: errors.length > 0 ? errors : undefined
        }
      })

      return NextResponse.json({
        success: true,
        ordersProcessed,
        errors: errors.length,
        syncType
      })
    } catch (error: any) {
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
  } catch (error: any) {
    console.error('Sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    )
  }
}

async function fetchWooCommerceOrders(fromDate: Date): Promise<WooOrder[]> {
  const consumerKey = process.env.WC_CONSUMER_KEY || '';
  const consumerSecret = process.env.WC_CONSUMER_SECRET || '';
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const afterParam = fromDate.toISOString();

  // Initial fetch for first page and total pages from headers
  const initialResponse = await fetch(`https://jaxportparking.com/wp-json/wc/v3/orders?status=completed&per_page=100&after=${afterParam}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    }
  });

  if (!initialResponse.ok) {
    throw new Error(`HTTP error! status: ${initialResponse.status}`);
  }

  const totalPages = parseInt(initialResponse.headers.get('X-WP-TotalPages') || '1', 10);
  const initialData: WooOrder[] = await initialResponse.json();

  let allOrders: WooOrder[] = initialData;

  if (totalPages > 1) {
    const pagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(
        fetch(`https://jaxportparking.com/wp-json/wc/v3/orders?status=completed&per_page=100&page=${page}&after=${afterParam}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (!res.ok) throw new Error(`Page ${page} error: ${res.status}`);
          return res.json() as Promise<WooOrder[]>;
        })
      );
    }
    const additionalPages = await Promise.all(pagePromises);
    additionalPages.forEach(pageData => allOrders = [...allOrders, ...pageData]);
  }

  return allOrders;
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
    occupancyPercentage: Math.round((carCount / 115) * 100) // 115 max capacity
  }))
  
  if (occupancyData.length > 0) {
    await prisma.dailyOccupancy.createMany({
      data: occupancyData
    })
  }
}

export async function GET() {
  try {
    const latestSync = await prisma.syncStatus.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(latestSync)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}