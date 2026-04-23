// DCB Pro v1.0 — Chart Manager

let chart = null;
let candleSeries = null;
let srLines = [];

function createChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  chart = LightweightCharts.createChart(container, {
    layout: { background: { type: 'solid', color: '#0a0a0a' }, textColor: '#888888' },
    grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
    crosshair: { mode: 0 },
    timeScale: { borderColor: '#1f1f1f', timeVisible: true, secondsVisible: false },
    rightPriceScale: { borderColor: '#1f1f1f' },
    width: container.clientWidth,
    height: 320
  });
  candleSeries = chart.addCandlestickSeries({
    upColor: '#00c853', downColor: '#ff1744', borderVisible: false,
    wickUpColor: '#00c853', wickDownColor: '#ff1744'
  });
  window.addEventListener('resize', () => {
    if (container.clientWidth) chart.resize(container.clientWidth, 320);
  });
}

function updateChart(klines) {
  if (!candleSeries) return;
  const data = klines.map(k => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4])
  }));
  candleSeries.setData(data);
}

function clearSRLines() {
  srLines.forEach(line => chart?.removeSeries(line));
  srLines = [];
}

function addSRLine(price, color, label) {
  if (!chart) return;
  const line = chart.addLineSeries({
    color: color, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false
  });
  const data = candleSeries.data().map(d => ({ time: d.time, value: price }));
  line.setData(data);
  srLines.push(line);
}