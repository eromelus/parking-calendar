const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

const prisma = new PrismaClient()

async function fastImport() {
  try {
    console.log('🚀 Fast importing remaining data...')
    
    const exportData = JSON.parse(fs.readFileSync('data-export.json', 'utf8'))
    
    // Check current state
    const currentOrderCount = await prisma.order.count()
    console.log(`Current orders in RDS: ${currentOrderCount}`)
    
    // Get orders that haven't been imported yet
    const importedOrders = await prisma.order.findMany({
      select: { wooCommerceId: true }
    })
    const importedIds = new Set(importedOrders.map(o => o.wooCommerceId))
    
    const remainingOrders = exportData.orders.filter(order => !importedIds.has(order.wooCommerceId))
    console.log(`Remaining orders to import: ${remainingOrders.length}`)
    
    if (remainingOrders.length > 0) {
      // Batch import remaining orders
      for (let i = 0; i < remainingOrders.length; i += 50) {
        const batch = remainingOrders.slice(i, i + 50)
        
        await Promise.all(batch.map(async (order) => {
          const { lineItems, ...orderData } = order
          
          try {
            await prisma.order.create({
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
          } catch (error) {
            // Skip duplicates silently
          }
        }))
        
        console.log(`✅ Imported batch ${Math.min(i + 50, remainingOrders.length)}/${remainingOrders.length}`)
      }
    }
    
    // Import daily occupancy if needed
    const currentOccupancyCount = await prisma.dailyOccupancy.count()
    if (currentOccupancyCount === 0) {
      console.log('📊 Importing daily occupancy records...')
      
      const occupancyBatch = exportData.dailyOccupancy.map(occ => ({
        ...occ,
        date: new Date(occ.date)
      }))
      
      await prisma.dailyOccupancy.createMany({
        data: occupancyBatch,
        skipDuplicates: true
      })
      console.log(`✅ Imported ${occupancyBatch.length} occupancy records`)
    }
    
    // Final verification
    const finalOrderCount = await prisma.order.count()
    const finalOccupancyCount = await prisma.dailyOccupancy.count()
    
    console.log('🎉 Import completed!')
    console.log(`📊 Final counts:`)
    console.log(`   - Orders: ${finalOrderCount}/${exportData.orders.length}`)
    console.log(`   - Daily occupancy: ${finalOccupancyCount}/${exportData.dailyOccupancy.length}`)
    
  } catch (error) {
    console.error('❌ Import failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fastImport()