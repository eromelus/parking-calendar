import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const consumerKey = process.env.WC_CONSUMER_KEY || '';
    const consumerSecret = process.env.WC_CONSUMER_SECRET || '';
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    let allOrders: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`https://jaxportparking.com/wp-json/wc/v3/orders?status=completed&per_page=100&page=${page}&after=2025-01-01T00:00:00`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      allOrders = [...allOrders, ...data];

      hasMore = data.length === 100; // If less than 100, no more pages
      page++;
    }

    return NextResponse.json(allOrders);
  } catch (error) {
    console.error('Fetch Error:', (error as Error).message);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}