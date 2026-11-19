import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const syms = ['^N225', '^GSPC', '^IXIC', '^VIX', 'JPY=X', '^TNX', 'CL=F', 'GC=F', '^SOX'];
const p1 = new Date(Date.now() - 400 * 864e5);
for (const s of syms) {
  try {
    const c = await yf.chart(s, { period1: p1, interval: '1d' });
    const cl = c.quotes.map((q) => q.close).filter((x) => typeof x === 'number');
    const last = cl.at(-1), hi = Math.max(...cl.slice(-252)), sma200 = cl.slice(-200).reduce((a, b) => a + b, 0) / 200;
    const ch = (n) => ((last / cl.at(-1 - n) - 1) * 100).toFixed(1);
    console.log(s.padEnd(6), last.toFixed(2), '| 1w', ch(5) + '%', '| 1m', ch(21) + '%', '| 3m', ch(63) + '%', '| off high', ((1 - last / hi) * 100).toFixed(1) + '%', '| vs 200d', ((last / sma200 - 1) * 100).toFixed(1) + '%');
  } catch (e) { console.log(s, 'failed'); }
}
