import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const consumerKey = process.env.WC_CONSUMER_KEY || '';
    const consumerSecret = process.env.WC_CONSUMER_SECRET || '';
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    console.log(consumerKey, consumerSecret);

    const response = await fetch('https://jaxportparking.com/wp-json/wc/v3/orders?status=completed&per_page=100', {
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
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}