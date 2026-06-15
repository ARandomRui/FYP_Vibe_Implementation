import { NextResponse } from 'next/server';
import vader from 'vader-sentiment';

// Why is this implemented: This endpoint acts as a BFF proxy to fetch recent news
// for a requested stock ticker from Finnhub (to get 30 days of historical data) and run a local NLP sentiment analysis on the headlines.
// This prevents the client from having to process heavy NLP tasks and securely centralizes data fetching without leaking API keys.
// We chunk the requests into weekly intervals to bypass Finnhub's ~250 result cap per request.
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
    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      throw new Error('FINNHUB_API_KEY is not configured');
    }

    // Finnhub caps responses to ~250 items per request, which for popular stocks is only 3-7 days of news.
    // To get a full 30 days, we make 4 concurrent requests (approx 7.5 days each).
    const fetchPromises = [];
    for (let i = 0; i < 4; i++) {
      const toDate = new Date();
      toDate.setDate(toDate.getDate() - (i * 7));
      
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - ((i + 1) * 7) - 2); // Slightly overlap to ensure no gaps

      const toDateStr = toDate.toISOString().split('T')[0];
      const fromDateStr = fromDate.toISOString().split('T')[0];

      const finnhubUrl = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDateStr}&to=${toDateStr}&token=${apiKey}`;
      fetchPromises.push(fetch(finnhubUrl).then(res => {
        if (!res.ok) throw new Error(`Finnhub API returned status: ${res.status}`);
        return res.json();
      }));
    }
    
    // Execute all 4 requests concurrently
    const results = await Promise.all(fetchPromises);
    
    // Flatten the array of arrays and deduplicate by article id/url
    let allNews: any[] = [];
    results.forEach(batch => {
      if (Array.isArray(batch)) {
        allNews = allNews.concat(batch);
      }
    });

    const uniqueNews = Array.from(new Map(allNews.map(item => [item.id || item.url, item])).values());
    
    const analyzedNews = uniqueNews.map((article: any) => {
      // Analyze title and summary text
      const textToAnalyze = `${article.headline || ''} ${article.summary || ''}`.trim();
      let sentiment = { compound: 0, pos: 0, neg: 0, neu: 0 };
      
      if (textToAnalyze) {
        sentiment = vader.SentimentIntensityAnalyzer.polarity_scores(textToAnalyze);
      }
      
      return {
        // Map Finnhub structure to the structure our frontend expects
        link: article.url,
        publisher: article.source,
        title: article.headline,
        summary: article.summary,
        // Convert UNIX timestamp (seconds) to ISO string for the frontend
        providerPublishTime: article.datetime ? new Date(article.datetime * 1000).toISOString() : new Date().toISOString(),
        sentimentScore: sentiment.compound,
        sentimentDetails: sentiment
      };
    });

    // Sort by newest first
    analyzedNews.sort((a, b) => new Date(b.providerPublishTime).getTime() - new Date(a.providerPublishTime).getTime());
    
    return NextResponse.json(analyzedNews);
  } catch (error) {
    console.error('Error fetching news:', error);
    // Error Handling: Use explicit error boundaries and try/catch blocks with meaningful error messages.
    return NextResponse.json({ error: 'Failed to fetch news data from provider' }, { status: 500 });
  }
}
