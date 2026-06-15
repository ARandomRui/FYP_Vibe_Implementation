import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Why is this implemented: This endpoint serves as a Backend-For-Frontend (BFF) proxy
// to fetch historical stock data. It hides the underlying data source logic from the client
// and provides a secure, validated interface.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  // Input Validation: strictly alphanumeric + dots + dashes
  if (!/^[a-zA-Z0-9.\-]+$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol format' }, { status: 400 });
  }

  try {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Default to last 30 days
    
    // (Notice suppression removed due to version incompatibility)

    const result = await yahooFinance.chart(symbol, {
      period1: d,
      interval: '1d'
    });
    
    return NextResponse.json(result.quotes);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
