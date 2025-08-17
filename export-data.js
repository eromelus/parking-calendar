const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function exportData() {
  try {
    console.log('🔄 Exporting data from local database...')
    
    // Get all orders with line items
    const orders = await prisma.order.findMany({
      include: {
        lineItems: true
      }
    })
    
    console.log(`Found ${orders.length} orders to export`)
    
    // Get daily occupancy data
    const dailyOccupancy = await prisma.dailyOccupancy.findMany()
    console.log(`Found ${dailyOccupancy.length} daily occupancy records`)
    
    // Create export object
    const exportData = {
      orders,
      dailyOccupancy,
      exportedAt: new Date().toISOString(),
      totalOrders: orders.length,
      totalOccupancyRecords: dailyOccupancy.length
    }
    
    // Write to JSON file
    fs.writeFileSync('data-export.json', JSON.stringify(exportData, null, 2))
    
    console.log('✅ Data exported successfully to data-export.json')
    console.log(`   - ${orders.length} orders`)
    console.log(`   - ${dailyOccupancy.length} occupancy records`)
    
  } catch (error) {
    console.error('❌ Export failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportData()