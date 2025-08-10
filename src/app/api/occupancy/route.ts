import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { transformDBOrderForAPI } from '@/lib/woo-transform'

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
      orderBy: { date: 'asc' }
    })

    // Get orders for each date by finding line items with delivery dates
    const formattedData = await Promise.all(occupancyData.map(async (day) => {
      const dayString = day.date.toISOString().split('T')[0]
      
      // Find orders that have line items with delivery dates covering this day
      const orders = await prisma.order.findMany({
        where: {
          lineItems: {
            some: {
              deliveryDate: {
                lte: new Date(dayString)
              },
              cruiseDuration: {
                not: null
              }
            }
          }
        },
        include: {
          lineItems: {
            where: {
              deliveryDate: {
                not: null
              },
              cruiseDuration: {
                not: null
              }
            }
          }
        }
      })

      // Filter orders that actually span this date
      const ordersForThisDate = orders.filter(order => {
        return order.lineItems.some(item => {
          if (!item.deliveryDate || !item.cruiseDuration) return false
          
          const startDate = new Date(item.deliveryDate)
          const endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + item.cruiseDuration)
          
          const currentDate = new Date(dayString)
          return currentDate >= startDate && currentDate <= endDate
        })
      })

      // Calculate correct car count from actual orders for this date
      const actualCarCount = ordersForThisDate.reduce((total, order) => {
        return total + order.lineItems.reduce((orderTotal, item) => {
          // Only count this line item if it spans this specific date
          if (item.deliveryDate && item.cruiseDuration) {
            const startDate = new Date(item.deliveryDate)
            const endDate = new Date(startDate)
            endDate.setDate(startDate.getDate() + item.cruiseDuration)
            
            const currentDate = new Date(dayString)
            if (currentDate >= startDate && currentDate <= endDate) {
              return orderTotal + item.quantity
            }
          }
          return orderTotal
        }, 0)
      }, 0)

      return {
        date: dayString,
        carCount: actualCarCount, // Use real-time calculation instead of pre-calculated
        occupancyPercentage: Math.round((actualCarCount / 115) * 100),
        orders: ordersForThisDate.map(order => transformDBOrderForAPI(order))
      }
    }))

    return NextResponse.json(formattedData)
  } catch (error: any) {
    console.error('Failed to fetch occupancy data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch occupancy data' },
      { status: 500 }
    )
  }
}