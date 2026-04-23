// DCB Pro v1.0 — Scanner Logic

const DEFAULT_PAIRS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT',
  'AVAXUSDT','DOTUSDT','LINKUSDT','MATICUSDT','SHIBUSDT','LTCUSDT','UNIUSDT',
  'ATOMUSDT','XLMUSDT','ETCUSDT','FILUSDT','APTUSDT','ARBUSDT','OPUSDT',
  'NEARUSDT','VETUSDT','GRTUSDT','ALGOUSDT','ICPUSDT','SANDUSDT','MANAUSDT',
  'AAVEUSDT','EGLDUSDT','THETAUSDT','FTMUSDT','FLOWUSDT','QNTUSDT','IMXUSDT',
  'AXSUSDT','CHZUSDT','SNXUSDT','ZILUSDT','ENJUSDT','STXUSDT','KAVAUSDT',
  'GALAUSDT','CRVUSDT','COMPUSDT','YFIUSDT','SUSHIUSDT','ZRXUSDT','BATUSDT',
  'LRCUSDT','OCEANUSDT','ANKRUSDT','CELOUSDT','HOTUSDT','COTIUSDT','IOSTUSDT',
  'ICXUSDT','WAVESUSDT','ONTUSDT','ZENUSDT','SCUSDT','DGBUSDT','RVNUSDT',
  '1INCHUSDT','DYDXUSDT','ENSUSDT','LDOUSDT','GMXUSDT','INJUSDT','RUNEUSDT',
  'FETUSDT','AGIXUSDT','OCEANUSDT','MASKUSDT','SSVUSDT','MINAUSDT','ROSEUSDT',
  'KSMUSDT','GLMRUSDT','MOVRUSDT','PEOPLEUSDT','DARUSDT','ALICEUSDT','TLMUSDT',
  'RADUSDT','RNDRUSDT','API3USDT','CTSIUSDT','BANDUSDT','LITUSDT','CTKUSDT',
  'DENTUSDT','STMXUSDT','CKBUSDT','KDAUSDT','CFXUSDT','ACHUSDT','JOEUSDT'
];

async function scanSingle(symbol, interval) {
  const { ticker, klines, depth, funding, fng } = await fetchAllData(symbol, interval);
  if (!klines?.length || !ticker) throw new Error('Data unavailable');
  const regime = detectRegime(klines);
  const weights = getDynamicWeights(regime);
  const indicators = getAllIndicators(klines, depth, funding, fng);
  const score = calculateFinalScore(indicators, weights);
  const price = parseFloat(ticker.lastPrice);
  const change = parseFloat(ticker.priceChangePercent);
  const closes = klines.map(k=>parseFloat(k[4])), highs = klines.map(k=>parseFloat(k[2])), lows = klines.map(k=>parseFloat(k[3]));
  const sr = findSRLevels(highs, lows, closes, klines);
  const trade = generateTradeSignal(score, price, sr);
  const signal = displaySignal(score);
  return { symbol, interval, price, change, score, signal, indicators, sr, trade, klines, regime, weights };
}

async function scanAllTimeframes(symbol) {
  const tfs = ['15m','1h','4h','1d'];
  const results = {};
  for (const tf of tfs) {
    try { results[tf] = await scanSingle(symbol, tf); }
    catch (e) { results[tf] = { symbol, interval: tf, error: e.message, score: 50 }; }
    await sleep(300);
  }
  return results;
}

async function scanMultiplePairs(pairs, interval = '1h') {
  const results = [];
  for (const pair of pairs) {
    try {
      const r = await scanSingle(pair, interval);
      results.push(r);
    } catch (e) {
      results.push({ symbol: pair, error: e.message, score: 0, price: 0, change: 0 });
    }
    await sleep(250);
  }
  return results;
}

function exportCSV() {
  const history = Storage.getHistory();
  let csv = 'Symbol,Interval,Score,Signal,Price,Change,Date\n';
  history.forEach(h => {
    csv += `${h.symbol},${h.interval},${h.score},"${displaySignal(h.score).label}",${h.price||0},${h.change||0},${h.timestamp}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'dcb_history.csv'; a.click();
  URL.revokeObjectURL(url);
}

// Backtest
async function runBacktest(symbol, interval) {
  const klines = await fetchEndpoint('klines', symbol, interval);
  if (!klines?.length) return '<p>No data</p>';
  const results = [];
  for (let i = 60; i < klines.length; i++) {
    const slice = klines.slice(i-60, i);
    const closes = slice.map(k=>parseFloat(k[4])), highs = slice.map(k=>parseFloat(k[2])), lows = slice.map(k=>parseFloat(k[3]));
    const indicators = getAllIndicators(slice, null, null, null);
    const score = calculateFinalScore(indicators, getDynamicWeights(detectRegime(slice)));
    const signal = score > 60 ? 'bearish' : score < 40 ? 'bullish' : 'neutral';
    const futurePrice = parseFloat(klines[Math.min(i+5, klines.length-1)][4]);
    const entryPrice = closes[closes.length-1];
    let result = 'draw';
    if (signal === 'bearish' && futurePrice < entryPrice) result = 'win';
    else if (signal === 'bullish' && futurePrice > entryPrice) result = 'win';
    else if (signal !== 'neutral') result = 'loss';
    results.push({ entryPrice, futurePrice, signal, result });
  }
  const wins = results.filter(r=>r.result==='win').length;
  const total = results.filter(r=>r.result!=='draw').length;
  return `<p>Backtest ${symbol} ${interval}: <strong>${wins}/${total}</strong> (${total?((wins/total)*100).toFixed(1):0}% accuracy, ${results.length} signals)</p>`;
}