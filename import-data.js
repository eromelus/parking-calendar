const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function importData() {
  try {
    console.log('🔄 Importing data to RDS...')
    
    // Read the exported data
    const exportData = JSON.parse(fs.readFileSync('data-export.json', 'utf8'))
    
    console.log(`Found ${exportData.orders.length} orders to import`)
    console.log(`Found ${exportData.dailyOccupancy.length} occupancy records to import`)
    
    // Import orders with line items
    console.log('📦 Importing orders...')
    for (const order of exportData.orders) {
      const { lineItems, ...orderData } = order
      
      try {
        const createdOrder = await prisma.order.create({
          data: {
            ...orderData,
            lineItems: {
              create: lineItems.map(item => ({
                wooCommerceId: item.wooCommerceId,
                name: item.name,
                quantity: item.quantity,
                deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
                cruiseDuration: item.cruiseDuration,
                metaData: item.metaData || []
              }))
            }
          }
        })
        console.log(`✅ Imported order #${order.wooCommerceId}`)
      } catch (error) {
        console.log(`⚠️  Skipped order #${order.wooCommerceId} (might already exist):`, error.message)
      }
    }
    
    // Import daily occupancy
    console.log('📊 Importing daily occupancy records...')
    for (const occupancy of exportData.dailyOccupancy) {
      try {
        await prisma.dailyOccupancy.create({
          data: {
            ...occupancy,
            date: new Date(occupancy.date)
          }
        })
      } catch (error) {
        console.log(`⚠️  Skipped occupancy for ${occupancy.date} (might already exist)`)
      }
    }
    
    console.log('✅ Data import completed!')
    
    // Verify the import
    const orderCount = await prisma.order.count()
    const occupancyCount = await prisma.dailyOccupancy.count()
    
    console.log(`📊 Final counts:`)
    console.log(`   - Orders: ${orderCount}`)
    console.log(`   - Daily occupancy records: ${occupancyCount}`)
    
  } catch (error) {
    console.error('❌ Import failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importData()