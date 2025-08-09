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
      orders: day.orders.map(order => transformDBOrderForAPI(order))
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