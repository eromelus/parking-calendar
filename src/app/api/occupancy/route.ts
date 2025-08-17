import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transformDBOrderForAPI } from '@/lib/woo-transform'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const includeOrders = searchParams.get('include_orders') === 'true'
    
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
      orderBy: { date: 'asc' }
    })

    // Use calculateDailyOccupancy for efficient calculation
    const { calculateDailyOccupancy } = await import('@/lib/woo-transform')
    
    // Get all line items that could potentially span the date range
    const earliestDate = new Date(startDate)
    earliestDate.setDate(earliestDate.getDate() - 30) // Look back 30 days for long cruises
    
    const lineItems = await prisma.lineItem.findMany({
      where: {
        deliveryDate: {
          gte: earliestDate,
          lte: new Date(endDate)
        },
        cruiseDuration: {
          not: null
        }
      },
      include: {
        order: true
      }
    })

    // Calculate daily occupancy using the established logic
    const occupancyMap = calculateDailyOccupancy(lineItems)
    
    // Create formatted data for the requested date range
    const formattedData = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateKey = date.toISOString().split('T')[0]
      const carCount = occupancyMap.get(dateKey) || 0
      
      const dayData: any = {
        date: dateKey,
        carCount,
        occupancyPercentage: Math.round((carCount / 115) * 100)
      }
      
      // Only include orders if specifically requested
      if (includeOrders) {
        const ordersForThisDate = lineItems
          .filter(item => {
            if (!item.deliveryDate || !item.cruiseDuration) return false
            
            const startDate = new Date(item.deliveryDate)
            const endDate = new Date(startDate)
            endDate.setDate(startDate.getDate() + item.cruiseDuration)
            
            const currentDate = new Date(dateKey)
            return currentDate >= startDate && currentDate <= endDate
          })
          .map(item => item.order)
          .filter((order, index, self) => self.findIndex(o => o.id === order.id) === index) // Deduplicate orders
        
        dayData.orders = ordersForThisDate.map(order => transformDBOrderForAPI({
          ...order,
          lineItems: lineItems.filter(item => item.orderId === order.id)
        }))
      }
      
      formattedData.push(dayData)
    }

    return NextResponse.json(formattedData)
  } catch (error: any) {
    console.error('Failed to fetch occupancy data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch occupancy data' },
      { status: 500 }
    )
  }
}