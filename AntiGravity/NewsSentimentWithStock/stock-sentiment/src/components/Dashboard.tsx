"use client";

import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, Activity, Newspaper } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell, ReferenceLine
} from 'recharts';

// Why is this implemented: This component serves as the primary interactive dashboard.
// It handles user input (stock ticker search), fetches aggregated data from the BFF endpoints,
// and orchestrates the complex visualizations for stock price vs. news sentiment.
export default function Dashboard() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<any[]>([]);
  const [newsData, setNewsData] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    
    // Client-side input sanitization
    const sanitizedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9.\-]/g, '');
    if (sanitizedSymbol !== symbol.toUpperCase()) {
      setError('Invalid characters in symbol. Only alphanumeric, dots, and dashes are allowed.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSearched(true);
    
    try {
      const [stockRes, newsRes] = await Promise.all([
        fetch(`/api/stock?symbol=${sanitizedSymbol}`),
        fetch(`/api/news?symbol=${sanitizedSymbol}`)
      ]);
      
      if (!stockRes.ok || !newsRes.ok) {
        throw new Error('Failed to fetch data. Please check the ticker symbol and try again.');
      }
      
      const stock = await stockRes.json();
      const news = await newsRes.json();
      
      setStockData(stock);
      setNewsData(news);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data: Merge stock prices with average daily sentiment
  const chartData = stockData.map(day => {
    const dateStr = new Date(day.date).toISOString().split('T')[0];
    
    // Find news for this date
    const dayNews = newsData.filter(article => {
      if (!article.providerPublishTime) return false;
      const articleDate = new Date(article.providerPublishTime).toISOString().split('T')[0];
      return articleDate === dateStr;
    });
    
    let avgSentiment = 0;
    if (dayNews.length > 0) {
      avgSentiment = dayNews.reduce((acc, curr) => acc + curr.sentimentScore, 0) / dayNews.length;
    }
    
    return {
      date: dateStr,
      price: day.close,
      sentiment: avgSentiment !== 0 ? avgSentiment : null, // null so bar isn't drawn if 0 news
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header / Search */}
        <div className={`transition-all duration-700 ease-in-out ${searched ? 'mb-12' : 'mt-[25vh] text-center'}`}>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">
            Stock Sentiment Visualizer
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto font-medium">
            Analyze the relationship between recent news sentiment and stock price movements.
          </p>
          
          <form onSubmit={handleSearch} className={`relative flex items-center max-w-2xl ${searched ? '' : 'mx-auto'}`}>
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-14 pr-32 py-5 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl text-slate-100 placeholder-slate-500 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xl hover:border-slate-600 outline-none"
              placeholder="Enter stock ticker (e.g., AAPL, TSLA)"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-95"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </form>
          {error && <div className="mt-6 p-4 bg-red-950/50 border border-red-900 rounded-xl text-red-400 font-medium max-w-2xl inline-block text-left">{error}</div>}
        </div>

        {/* Dashboard Content */}
        {searched && !loading && !error && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Chart Section */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-4 md:p-8 mb-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Activity className="text-blue-400" />
                  Price vs. Sentiment Correlation (30 Days)
                </h2>
              </div>
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis yAxisId="left" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${Number(v).toFixed(2)}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} domain={[-1, 1]} hide={false} tickFormatter={(v) => v.toFixed(1)} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <ReferenceLine y={0} yAxisId="right" stroke="#475569" strokeDasharray="3 3" />
                    <Bar yAxisId="right" dataKey="sentiment" name="Avg Daily News Sentiment" radius={[4, 4, 0, 0]} barSize={30} opacity={0.7}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.sentiment && entry.sentiment > 0 ? '#10b981' : entry.sentiment && entry.sentiment < 0 ? '#ef4444' : '#64748b'} />
                      ))}
                    </Bar>
                    <Line yAxisId="left" type="monotone" dataKey="price" name="Closing Price" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 8, stroke: '#0f172a', strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* News Feed Section */}
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 mt-16">
              <Newspaper className="text-blue-400" />
              Recent News Analysis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsData.length === 0 ? (
                <p className="text-slate-500 col-span-full text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">No recent news found for this ticker.</p>
              ) : (
                newsData.map((article, idx) => (
                  <a 
                    key={idx} 
                    href={article.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group bg-slate-900/60 backdrop-blur-sm border border-slate-800 hover:border-slate-600 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1 flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full transition-colors duration-300" style={{
                      backgroundColor: article.sentimentScore > 0.05 ? '#10b981' : article.sentimentScore < -0.05 ? '#ef4444' : '#64748b'
                    }}></div>
                    <div className="flex justify-between items-start mb-4 pl-2">
                      <span className="text-xs font-semibold px-3 py-1 bg-slate-800 text-slate-300 rounded-full">
                        {article.publisher}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold bg-slate-950 px-3 py-1 rounded-full border border-slate-800" style={{
                        color: article.sentimentScore > 0.05 ? '#10b981' : article.sentimentScore < -0.05 ? '#ef4444' : '#94a3b8'
                      }}>
                        {article.sentimentScore > 0.05 ? <TrendingUp className="h-4 w-4" /> : article.sentimentScore < -0.05 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                        {article.sentimentScore.toFixed(2)}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-3 pl-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-slate-400 text-sm flex-grow line-clamp-3 pl-2">
                      {article.summary || "No summary available."}
                    </p>
                    <div className="mt-5 text-xs text-slate-500 pt-4 border-t border-slate-800 pl-2">
                      {new Date(article.providerPublishTime).toLocaleString()}
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
