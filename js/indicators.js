// DCB Pro v1.0 — Complete Indicator & Signal Engine

function safeScore(v) {
  if (v === undefined || v === null || isNaN(v)) return 50;
  return Math.min(100, Math.max(0, Math.round(v)));
}

// === RSI ===
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return prices.map(() => 50);
  const gains = [], losses = [];
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i-1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  const rsi = [];
  let avgGain = gains.slice(0, period).reduce((a,b)=>a+b)/period;
  let avgLoss = losses.slice(0, period).reduce((a,b)=>a+b)/period;
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period-1) + gains[i]) / period;
    avgLoss = (avgLoss * (period-1) + losses[i]) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain/avgLoss)));
  }
  while (rsi.length < prices.length) rsi.unshift(rsi[0] || 50);
  return rsi;
}

// === MACD ===
function calcEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) ema.push(data[i] * k + ema[i-1] * (1 - k));
  return ema;
}
function calculateMACD(prices) {
  const ema12 = calcEMA(prices, 12), ema26 = calcEMA(prices, 26);
  const macdLine = ema12.map((v,i) => v - ema26[i]);
  const signal = calcEMA(macdLine, 9);
  const histogram = macdLine.map((v,i) => v - signal[i]);
  return { macdLine, signal, histogram };
}

// === BOLLINGER ===
function calculateBollinger(prices, period = 20, stdDev = 2) {
  const sma = [], upper = [], lower = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { sma.push(null); upper.push(null); lower.push(null); continue; }
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a,b)=>a+b)/period;
    const variance = slice.reduce((a,b)=>a+(b-mean)**2,0)/period;
    const sd = Math.sqrt(variance);
    sma.push(mean); upper.push(mean + stdDev * sd); lower.push(mean - stdDev * sd);
  }
  return { sma, upper, lower };
}

// === OBV ===
function calculateOBV(klines) {
  const closes = klines.map(k => parseFloat(k[4]));
  const volumes = klines.map(k => parseFloat(k[5]));
  const obv = [volumes[0]];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i-1]) obv.push(obv[i-1] + volumes[i]);
    else if (closes[i] < closes[i-1]) obv.push(obv[i-1] - volumes[i]);
    else obv.push(obv[i-1]);
  }
  return obv;
}

// === ATR ===
function calculateATR(klines, period = 14) {
  const tr = [];
  for (let i = 1; i < klines.length; i++) {
    const h = parseFloat(klines[i][2]), l = parseFloat(klines[i][3]), pc = parseFloat(klines[i-1][4]);
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (tr.length < period) return tr.reduce((a,b)=>a+b,0)/tr.length;
  let atr = tr.slice(0, period).reduce((a,b)=>a+b)/period;
  for (let i = period; i < tr.length; i++) atr = (atr * (period-1) + tr[i]) / period;
  return atr;
}

// === ADX (untuk deteksi regime) ===
function calculateADX(klines, period = 14) {
  const highs = klines.map(k=>parseFloat(k[2])), lows = klines.map(k=>parseFloat(k[3])), closes = klines.map(k=>parseFloat(k[4]));
  const tr = [], plusDM = [], minusDM = [];
  for (let i = 1; i < highs.length; i++) {
    const hDiff = highs[i] - highs[i-1], lDiff = lows[i-1] - lows[i];
    tr.push(Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1])));
    plusDM.push(hDiff > lDiff && hDiff > 0 ? hDiff : 0);
    minusDM.push(lDiff > hDiff && lDiff > 0 ? lDiff : 0);
  }
  let atr = tr.slice(0,period).reduce((a,b)=>a+b)/period;
  let pDI = plusDM.slice(0,period).reduce((a,b)=>a+b)/period;
  let mDI = minusDM.slice(0,period).reduce((a,b)=>a+b)/period;
  const adx = [];
  for (let i = period; i < tr.length; i++) {
    atr = (atr*(period-1)+tr[i])/period;
    pDI = (pDI*(period-1)+plusDM[i])/period;
    mDI = (mDI*(period-1)+minusDM[i])/period;
    const dx = (pDI+mDI) > 0 ? Math.abs(pDI-mDI)/(pDI+mDI)*100 : 0;
    if (adx.length === 0) adx.push(dx);
    else adx.push((adx[adx.length-1]*(period-1)+dx)/period);
  }
  while (adx.length < klines.length) adx.unshift(adx[0]||20);
  return adx;
}

// === EMA 50/200 ===
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [prices[0]];
  for (let i = 1; i < prices.length; i++) ema.push(prices[i] * k + ema[i-1] * (1 - k));
  return ema;
}

// === INDICATOR SCORING ===
function calcVolumeProfile(volumes) {
  const half = Math.floor(volumes.length/2);
  const old = volumes.slice(0,half).reduce((a,b)=>a+b,0);
  const recent = volumes.slice(half).reduce((a,b)=>a+b,0);
  const ratio = recent / (old || 1);
  let score = 50;
  if (ratio < 0.3) score = 85; else if (ratio < 0.5) score = 70;
  else if (ratio < 0.7) score = 50; else if (ratio < 1.0) score = 30; else score = 15;
  return { score: safeScore(score), detail: `Ratio: ${(ratio*100).toFixed(0)}%` };
}

function calcOrderBook(depth) {
  if (!depth?.bids?.length) return { score: 50, detail: 'No depth data' };
  const bidVol = depth.bids.slice(0,20).reduce((a,b)=>a+parseFloat(b[1]),0);
  const askVol = depth.asks.slice(0,20).reduce((a,b)=>a+parseFloat(b[1]),0);
  const ratio = bidVol / (askVol || 1);
  let score = 50;
  if (ratio < 0.5) score = 80; else if (ratio < 0.8) score = 65;
  else if (ratio < 1.2) score = 50; else if (ratio < 2) score = 30; else score = 15;
  return { score: safeScore(score), detail: `B/A: ${ratio.toFixed(2)}` };
}

function calcRSI(closes) {
  const rsi = calculateRSI(closes);
  const current = rsi[rsi.length-1];
  let score = 50;
  if (current > 70) score = 65; else if (current < 30) score = 30;
  return { score: safeScore(score), detail: `RSI: ${current.toFixed(1)}` };
}

function calcMACDScore(macd) {
  const last = macd.histogram[macd.histogram.length-1];
  const prev = macd.histogram[macd.histogram.length-2];
  let score = 50;
  if (last > 0 && last < prev) score = 35;
  else if (last < 0 && last > prev) score = 65;
  return { score: safeScore(score), detail: `Hist: ${last.toFixed(4)}` };
}

function calcBollingerScore(closes, bb) {
  const last = closes[closes.length-1];
  const up = bb.upper[bb.upper.length-1], low = bb.lower[bb.lower.length-1];
  let score = 50;
  if (last > up) score = 75; else if (last < low) score = 25;
  return { score: safeScore(score), detail: last > up ? 'Above upper' : last < low ? 'Below lower' : 'Inside' };
}

function calcOBVScore(obv, closes) {
  const obvSlope = (obv[obv.length-1] - obv[obv.length-10]) / Math.abs(obv[obv.length-10] || 1);
  const priceSlope = (closes[closes.length-1] - closes[closes.length-10]) / Math.abs(closes[closes.length-10] || 1);
  let score = 50;
  if (priceSlope > 0 && obvSlope < 0) score = 70;
  else if (priceSlope < 0 && obvSlope > 0) score = 30;
  return { score: safeScore(score), detail: 'OBV Divergence' };
}

function calcFunding(funding) {
  if (!funding?.length) return { score: 50, detail: 'Spot pair' };
  const rate = parseFloat(funding[0].fundingRate) * 100;
  let score = 50;
  if (rate > 0.1) score = 70; else if (rate > 0.05) score = 60;
  else if (rate < -0.05) score = 20;
  return { score: safeScore(score), detail: `${rate.toFixed(4)}%` };
}

function calcFearGreed(fng) {
  if (!fng?.data?.length) return { score: 50, detail: 'N/A' };
  const val = parseInt(fng.data[0].value);
  return { score: safeScore(val > 60 ? 65 : val < 30 ? 35 : 50), detail: `${val}` };
}

function calcPriceAction(klines) {
  const closes = klines.map(k=>parseFloat(k[4])), opens = klines.map(k=>parseFloat(k[1]));
  const highs = klines.map(k=>parseFloat(k[2]));
  const lastBody = closes[closes.length-1] - opens[closes.length-1];
  const prevBody = closes[closes.length-2] - opens[closes.length-2];
  let score = 50, signals = [];
  if (prevBody > 0 && lastBody < 0 && Math.abs(lastBody) > Math.abs(prevBody)) { score = 80; signals.push('Bearish Engulfing'); }
  const recentHighs = highs.slice(-5);
  let lowerHighs = 0;
  for (let i = 1; i < recentHighs.length; i++) if (recentHighs[i] < recentHighs[i-1]) lowerHighs++;
  if (lowerHighs >= 3) { score = Math.min(100, score + 10); signals.push('Lower Highs'); }
  return { score: safeScore(score), detail: signals.length ? signals.join(', ') : 'Neutral' };
}

// === DETECT MARKET REGIME ===
function detectRegime(klines) {
  const adx = calculateADX(klines);
  const currentADX = adx[adx.length-1];
  const bb = calculateBollinger(klines.map(k=>parseFloat(k[4])));
  const lastUpper = bb.upper[bb.upper.length-1], lastLower = bb.lower[bb.lower.length-1];
  const bbWidth = lastUpper && lastLower ? (lastUpper - lastLower) / ((lastUpper+lastLower)/2) : 0.05;
  if (currentADX > 25 && bbWidth > 0.05) return 'trending';
  if (currentADX < 20 && bbWidth < 0.03) return 'ranging';
  if (bbWidth > 0.08) return 'volatile';
  return 'normal';
}

// === DYNAMIC WEIGHTS BASED ON REGIME ===
function getDynamicWeights(regime) {
  const base = {
    volumeProfile: 0.15, orderBook: 0.10, rsi: 0.10, macd: 0.15,
    bollinger: 0.10, obv: 0.10, fundingRate: 0.10, fearGreed: 0.10, priceAction: 0.10
  };
  if (regime === 'trending') {
    base.macd = 0.20; base.obv = 0.15; base.rsi = 0.08; base.bollinger = 0.07;
  } else if (regime === 'ranging') {
    base.rsi = 0.18; base.bollinger = 0.15; base.macd = 0.08; base.obv = 0.07;
  } else if (regime === 'volatile') {
    base.volumeProfile = 0.20; base.priceAction = 0.15; base.orderBook = 0.15;
  }
  return base;
}

// === MAIN CALCULATION ===
function getAllIndicators(klines, depth, funding, fng) {
  const closes = klines.map(k=>parseFloat(k[4]));
  const volumes = klines.map(k=>parseFloat(k[5]));
  return {
    volumeProfile: calcVolumeProfile(volumes),
    orderBook: calcOrderBook(depth),
    rsi: calcRSI(closes),
    macd: calcMACDScore(calculateMACD(closes)),
    bollinger: calcBollingerScore(closes, calculateBollinger(closes)),
    obv: calcOBVScore(calculateOBV(klines), closes),
    fundingRate: calcFunding(funding),
    fearGreed: calcFearGreed(fng),
    priceAction: calcPriceAction(klines)
  };
}

function calculateFinalScore(indicators, weights) {
  let sum = 0, total = 0;
  for (const [key, ind] of Object.entries(indicators)) {
    if (!ind?.score) continue;
    const w = weights[key] || 0;
    sum += ind.score * w;
    total += w;
  }
  return total ? Math.round((sum/total)*10)/10 : 50;
}

// === SUPPORT & RESISTANCE ===
function findSRLevels(highs, lows, closes, klines) {
  const current = closes[closes.length-1];
  const atr = calculateATR(klines);
  const tol = atr * 0.4;
  const swingHighs = [], swingLows = [];
  for (let i = 2; i < highs.length-2; i++) {
    if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2])
      swingHighs.push({ price: highs[i], strength: 0 });
    if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2])
      swingLows.push({ price: lows[i], strength: 0 });
  }
  swingHighs.forEach(sh => { let t=0; highs.forEach(h=>{ if(Math.abs(h-sh.price)<tol) t++; }); sh.strength=t; });
  swingLows.forEach(sl => { let t=0; lows.forEach(l=>{ if(Math.abs(l-sl.price)<tol) t++; }); sl.strength=t; });
  const all = [...swingHighs.map(s=>({...s,type:'resistance'})), ...swingLows.map(s=>({...s,type:'support'}))];
  const unique = [];
  all.sort((a,b)=>a.price-b.price);
  for (const lvl of all) {
    const exist = unique.find(u=>Math.abs(u.price-lvl.price)<tol);
    if (exist) { exist.strength += lvl.strength; if (lvl.type==='support'&&exist.type==='resistance'&&lvl.price<current) exist.type='support'; }
    else unique.push({...lvl});
  }
  const supports = unique.filter(l=>l.type==='support'&&l.price<current).sort((a,b)=>b.price-a.price);
  const resistances = unique.filter(l=>l.type==='resistance'&&l.price>current).sort((a,b)=>a.price-b.price);
  if (supports.length && resistances.length) {
    unique.push({ price: (supports[0].price+resistances[0].price)/2, type: 'pivot', strength: 1 });
  }
  return unique.sort((a,b)=>Math.abs(a.price-current)-Math.abs(b.price-current)).slice(0,8);
}

// === SIGNAL & TRADE ===
function displaySignal(score) {
  if (score >= 85) return { label: 'SEVERE DCB', color: '#ff1744' };
  if (score >= 70) return { label: 'DEAD CAT', color: '#ff9100' };
  if (score >= 55) return { label: 'WEAK DCB', color: '#ffd600' };
  if (score >= 40) return { label: 'UNCERTAIN', color: '#888888' };
  if (score >= 20) return { label: 'GENUINE', color: '#00c853' };
  return { label: 'STRONG REVERSAL', color: '#00c853' };
}

function generateTradeSignal(score, price, srLevels) {
  if (score < 40) {
    const res = srLevels.filter(l=>l.type==='resistance'&&l.price>price).sort((a,b)=>a.price-b.price);
    const sup = srLevels.filter(l=>l.type==='support'&&l.price<price).sort((a,b)=>b.price-a.price);
    return {
      direction: 'BUY',
      entry: price,
      tp: res.length ? res[0].price : price * 1.05,
      sl: sup.length ? sup[0].price : price * 0.95
    };
  } else if (score > 60) {
    const sup = srLevels.filter(l=>l.type==='support'&&l.price<price).sort((a,b)=>b.price-a.price);
    const res = srLevels.filter(l=>l.type==='resistance'&&l.price>price).sort((a,b)=>a.price-b.price);
    return {
      direction: 'SELL',
      entry: price,
      tp: sup.length ? sup[0].price : price * 0.95,
      sl: res.length ? res[0].price : price * 1.05
    };
  }
  return null;
}

function calculatePositionSize(accountBalance, riskPercent, entry, sl) {
  const riskAmount = accountBalance * (riskPercent / 100);
  const riskPerUnit = Math.abs(entry - sl);
  if (riskPerUnit === 0) return 0;
  return riskAmount / riskPerUnit;
}