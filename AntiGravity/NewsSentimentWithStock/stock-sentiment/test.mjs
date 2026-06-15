import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();

async function run() {
  try {
    const data = await yf.search('AAPL', { newsCount: 2 });
    console.log('Success, news[0]:', data.news[0]);
  } catch (err) {
    console.error('Test failed:', err);
  }
}
run();
