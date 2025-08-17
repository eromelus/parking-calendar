import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transformDBOrderForAPI } from '@/lib/woo-transform'

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
      orderBy: { dateCreated: 'desc' },
      distinct: ['id'] // Ensure unique orders
    })

    // Transform to match existing WooCommerce format for compatibility
    const formattedOrders = orders.map(order => transformDBOrderForAPI(order))
    
    // Deduplicate orders by id (in case of any remaining duplicates)
    const uniqueOrders = formattedOrders.reduce((acc: any[], order: any) => {
      const existing = acc.find(o => o.id === order.id)
      if (!existing) {
        acc.push(order)
      }
      return acc
    }, [])

    return NextResponse.json(uniqueOrders)
  } catch (error: any) {
    console.error('Database query failed:', error)
    
    // Fallback to WooCommerce API if database fails
    try {
      return await fetchFromWooCommerceAPI()
    } catch (fallbackError: any) {
      console.error('Fallback to WooCommerce API also failed:', fallbackError)
      return NextResponse.json(
        { error: 'Failed to fetch orders from database and WooCommerce API' },
        { status: 500 }
      )
    }
  }
}

async function fetchFromWooCommerceAPI() {
  const consumerKey = process.env.WC_CONSUMER_KEY || '';
  const consumerSecret = process.env.WC_CONSUMER_SECRET || '';
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  // Initial fetch for first page and total pages from headers
  const initialResponse = await fetch('https://jaxportparking.com/wp-json/wc/v3/orders?status=completed&per_page=100&after=2025-01-01T00:00:00', {
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
  const initialData = await initialResponse.json();

  let allOrders = initialData;

  if (totalPages > 1) {
    const pagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(
        fetch(`https://jaxportparking.com/wp-json/wc/v3/orders?status=completed&per_page=100&page=${page}&after=2025-01-01T00:00:00`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (!res.ok) throw new Error(`Page ${page} error: ${res.status}`);
          return res.json();
        })
      );
    }
    const additionalPages = await Promise.all(pagePromises);
    additionalPages.forEach(pageData => allOrders = [...allOrders, ...pageData]);
  }

  return NextResponse.json(allOrders);
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

    return NextResponse.json({ success: true, order: transformDBOrderForAPI(newOrder) })
  } catch (error: any) {
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

    return NextResponse.json({ success: true, order: transformDBOrderForAPI(updatedOrder) })
  } catch (error: any) {
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
    await recalculateFullOccupancy()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}

async function recalculateOccupancyForOrder(order: any) {
  // For simplicity, recalculate full occupancy when an order changes
  await recalculateFullOccupancy()
}

async function recalculateFullOccupancy() {
  const { calculateDailyOccupancy } = await import('@/lib/woo-transform')
  
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
  
  if (occupancyData.length > 0) {
    await prisma.dailyOccupancy.createMany({
      data: occupancyData
    })
  }
}