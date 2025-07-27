import { NextResponse } from 'next/server';

// Interface for WooOrder 
interface WooOrder {
  id: number;
  status: string;
  line_items: {
    id: number;
    name: string;
    quantity: number;
    meta_data: { key: string; value: string }[];
  }[];
}

export async function GET() {
  try {
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
    const initialData: WooOrder[] = await initialResponse.json();

    let allOrders: WooOrder[] = initialData;

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
            return res.json() as Promise<WooOrder[]>;
          })
        );
      }
      const additionalPages = await Promise.all(pagePromises);
      additionalPages.forEach(pageData => allOrders = [...allOrders, ...pageData]);
    }

    return NextResponse.json(allOrders);
  } catch (error) {
    console.error('Fetch Error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}