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

export function calculateOccupancyPercentage(carCount: number, maxCapacity: number = 115): number {
  return Math.round((carCount / maxCapacity) * 100)
}

export function transformDBOrderForAPI(dbOrder: any) {
  return {
    id: dbOrder.wooCommerceId,
    status: dbOrder.status,
    date_created: dbOrder.dateCreated.toISOString(),
    billing: {
      first_name: dbOrder.billingFirstName,
      last_name: dbOrder.billingLastName,
      email: dbOrder.billingEmail,
      phone: dbOrder.billingPhone
    },
    line_items: dbOrder.lineItems.map((item: any) => ({
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
  }
}