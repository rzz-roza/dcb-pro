// DCB Pro v1.0 — Data Fetcher with Multi-Layer Endpoints

const ENDPOINTS = {
  ticker: [
    'https://api.binance.com/api/v3/ticker/24hr',
    'https://api1.binance.com/api/v3/ticker/24hr',
    'https://api2.binance.com/api/v3/ticker/24hr',
    'https://api3.binance.com/api/v3/ticker/24hr'
  ],
  klines: [
    'https://api.binance.com/api/v3/klines',
    'https://api1.binance.com/api/v3/klines',
    'https://api2.binance.com/api/v3/klines',
    'https://api3.binance.com/api/v3/klines'
  ],
  depth: [
    'https://api.binance.com/api/v3/depth',
    'https://api1.binance.com/api/v3/depth',
    'https://api2.binance.com/api/v3/depth'
  ],
  funding: ['https://fapi.binance.com/fapi/v1/fundingRate'],
  fng: ['https://api.alternative.me/fng/']
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, retries = 3, timeoutMs = 8000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(id);
      if (res.ok) return await res.json();
      if (res.status === 429) { await sleep(2000 * (i+1)); continue; }
      if (res.status >= 500) { await sleep(1000 * (i+1)); continue; }
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === retries-1) throw e;
      await sleep(800 * (i+1));
    }
  }
}

async function fetchEndpoint(type, symbol, interval = null) {
  const urls = ENDPOINTS[type].map(base => {
    switch (type) {
      case 'ticker': return `${base}?symbol=${symbol}`;
      case 'klines': return `${base}?symbol=${symbol}&interval=${interval}&limit=60`;
      case 'depth': return `${base}?symbol=${symbol}&limit=20`;
      case 'funding': return `${base}?symbol=${symbol}&limit=2`;
      case 'fng': return `${base}?limit=1`;
      default: return base;
    }
  });
  for (const url of urls) {
    try { return await fetchWithRetry(url); } catch (e) { continue; }
  }
  return null;
}

async function fetchAllData(symbol, interval) {
  const results = await Promise.allSettled([
    fetchEndpoint('ticker', symbol),
    fetchEndpoint('klines', symbol, interval),
    fetchEndpoint('depth', symbol),
    fetchEndpoint('funding', symbol),
    fetchEndpoint('fng')
  ]);
  return {
    ticker: results[0].value,
    klines: results[1].value,
    depth: results[2].value,
    funding: results[3].value,
    fng: results[4].value
  };
}

// WebSocket untuk watchlist
let ws = null;
let wsCallbacks = [];

function startWebSocket(callback) {
  if (wsCallbacks.includes(callback)) return;
  wsCallbacks.push(callback);
  if (ws && ws.readyState === WebSocket.OPEN) return;
  ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      wsCallbacks.forEach(cb => cb(data));
    } catch (err) {}
  };
  ws.onclose = () => { ws = null; setTimeout(() => startWebSocket(callback), 5000); };
  ws.onerror = () => { ws?.close(); };
}

function stopWebSocket(callback) {
  wsCallbacks = wsCallbacks.filter(cb => cb !== callback);
  if (wsCallbacks.length === 0 && ws) { ws.close(); ws = null; }
}