import Dashboard from '@/components/Dashboard';

export const metadata = {
  title: 'Stock Sentiment Visualizer',
  description: 'Analyze the relationship between recent news sentiment and stock price movements.',
};

export default function Home() {
  return <Dashboard />;
}
