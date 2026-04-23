// DCB Pro v1.0 — UI Rendering Engine

const DOM = {
  // Splash
  splashOverlay: document.getElementById('splashOverlay'),
  deviceIdDisplay: document.getElementById('deviceIdDisplay'),
  activationTokenInput: document.getElementById('activationTokenInput'),
  verifyTokenBtn: document.getElementById('verifyTokenBtn'),
  copyDeviceIdBtn: document.getElementById('copyDeviceIdBtn'),
  appShell: document.getElementById('app'),
  
  // Topbar
  pageTitle: document.getElementById('pageTitle'),
  remainingDisplay: document.getElementById('remainingDisplay'),
  logoutBtn: document.getElementById('logoutBtn'),
  
  // Scanner
  symbolInput: document.getElementById('symbolInput'),
  scanBtn: document.getElementById('scanBtn'),
  pairTags: document.getElementById('pairTags'),
  signalBadge: document.getElementById('signalBadge'),
  bigScore: document.getElementById('bigScore'),
  scoreTimeframe: document.getElementById('scoreTimeframe'),
  tradeBox: document.getElementById('tradeBox'),
  riskOutput: document.getElementById('riskOutput'),
  chartCard: document.getElementById('chartCard'),
  indicatorsCard: document.getElementById('indicatorsCard'),
  snrCard: document.getElementById('snrCard'),
  mtfCard: document.getElementById('mtfCard'),
  multiPairTable: document.getElementById('multiPairTable'),
  scanPairsBtn: document.getElementById('scanPairsBtn'),
  managePairsBtn: document.getElementById('managePairsBtn'),
  pairManagerPanel: document.getElementById('pairManagerPanel'),
  autoScanToggle: document.getElementById('autoScanToggle'),
  autoInterval: document.getElementById('autoInterval'),
  autoThreshold: document.getElementById('autoThreshold'),
  
  // Risk Calculator
  accountBalance: document.getElementById('accountBalance'),
  riskPercent: document.getElementById('riskPercent'),
  positionOutput: document.getElementById('positionOutput'),
  
  // Watchlist
  watchlistGrid: document.getElementById('watchlistGrid'),
  wsStatus: document.getElementById('wsStatus'),
  topOppCard: document.getElementById('topOppCard'),
  topOppList: document.getElementById('topOppList'),
  
  // Backtest
  backtestSymbol: document.getElementById('backtestSymbol'),
  backtestInterval: document.getElementById('backtestInterval'),
  runBacktestBtn: document.getElementById('runBacktestBtn'),
  backtestOutput: document.getElementById('backtestOutput'),
  
  // History
  historyList: document.getElementById('historyList'),
  accuracyStats: document.getElementById('accuracyStats'),
  exportBtn: document.getElementById('exportBtn'),
  
  // Buttons
  copyBtcBtn: document.getElementById('copyBtcBtn'),
  copyBtcBtn2: document.getElementById('copyBtcBtn2')
};

// === NAVIGATION ===
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const page = item.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active');
    DOM.pageTitle.textContent = item.querySelector('span').textContent;
  });
});

// === SPLASH ===
function showSplash() { DOM.splashOverlay.style.display = 'flex'; }
function hideSplash() { DOM.splashOverlay.style.display = 'none'; DOM.appShell.style.display = 'flex'; }

// === SIGNAL DISPLAY ===
function displaySignalResult(result) {
  const signal = displaySignal(result.score);
  DOM.signalBadge.textContent = signal.label;
  DOM.signalBadge.style.color = signal.color;
  DOM.signalBadge.style.borderColor = signal.color;
  DOM.bigScore.textContent = result.score + '%';
  DOM.bigScore.style.color = signal.color;
  DOM.scoreTimeframe.textContent = `TF: ${result.interval}`;
  
  if (result.trade) {
    DOM.tradeBox.innerHTML = `
      <div class="trade-row"><span class="label">Direction</span><span class="value" style="color:${result.trade.direction==='BUY'?'#00c853':'#ff1744'}">${result.trade.direction}</span></div>
      <div class="trade-row"><span class="label">Entry</span><span class="value">$${result.trade.entry.toFixed(4)}</span></div>
      <div class="trade-row"><span class="label">Take Profit</span><span class="value" style="color:#00c853">$${result.trade.tp.toFixed(4)}</span></div>
      <div class="trade-row"><span class="label">Stop Loss</span><span class="value" style="color:#ff1744">$${result.trade.sl.toFixed(4)}</span></div>
    `;
  } else {
    DOM.tradeBox.innerHTML = '<p style="font-size:0.8rem;color:#888;">No clear trade signal</p>';
  }
  
  document.getElementById('signalCard').style.display = 'block';
  DOM.chartCard.style.display = 'block';
  document.getElementById('detailPanels').style.display = 'grid';
}

function renderIndicators(indicators, weights) {
  if (!DOM.indicatorsCard) return;
  const names = {
    volumeProfile: 'Volume Profile', orderBook: 'Order Book', rsi: 'RSI',
    macd: 'MACD', bollinger: 'Bollinger', obv: 'OBV',
    fundingRate: 'Funding Rate', fearGreed: 'Fear & Greed', priceAction: 'Price Action'
  };
  let html = '<h3 style="font-size:0.8rem;color:#888;margin-bottom:10px;">INDIKATOR</h3>';
  for (const [key, ind] of Object.entries(indicators)) {
    if (!ind) continue;
    const w = weights[key] ? (weights[key]*100).toFixed(0) + '%' : '';
    html += `<div class="ind-item">
      <div><span class="ind-name">${names[key]||key}</span> <span style="font-size:0.65rem;color:#555;">${w}</span><br><span class="ind-detail">${ind.detail||''}</span></div>
      <div class="ind-value" style="color:${ind.score>65?'#ff1744':ind.score>50?'#ff9100':'#888'}">${ind.score}</div>
    </div>`;
  }
  DOM.indicatorsCard.innerHTML = html;
}

function renderSRLevels(levels) {
  if (!DOM.snrCard) return;
  let html = '<h3 style="font-size:0.8rem;color:#888;margin-bottom:10px;">S/R LEVELS</h3>';
  if (!levels.length) { html += '<p style="font-size:0.7rem;color:#666;">No levels detected</p>'; }
  else {
    levels.forEach(l => {
      const priceStr = l.price < 1 ? l.price.toFixed(6) : l.price.toFixed(2);
      html += `<div class="snr-item ${l.type}">
        <span class="snr-type">${l.type.toUpperCase()}</span>
        <span class="snr-price">$${priceStr}</span>
        <span class="snr-strength">${l.strength}</span>
      </div>`;
    });
  }
  DOM.snrCard.innerHTML = html;
}

function renderMultiTFGrid(results) {
  if (!DOM.mtfCard) return;
  DOM.mtfCard.style.display = 'block';
  let html = '<h3 style="font-size:0.8rem;color:#888;margin-bottom:10px;">MULTI-TF</h3><div class="grid-4">';
  ['15m','1h','4h','1d'].forEach(tf => {
    const r = results[tf];
    if (!r || r.error) {
      html += `<div class="card" style="text-align:center;"><div style="font-size:0.7rem;color:#666;">${tf}</div><div style="color:#ff1744;">FAIL</div></div>`;
    } else {
      const sig = displaySignal(r.score);
      html += `<div class="card" style="text-align:center;cursor:pointer;" onclick="window.loadScanResult('${r.symbol}','${tf}')">
        <div style="font-size:0.7rem;color:#666;">${tf}</div>
        <div style="font-size:1.5rem;font-weight:800;color:${sig.color};">${r.score}%</div>
        <div style="font-size:0.6rem;color:${sig.color};">${sig.label}</div>
      </div>`;
    }
  });
  html += '</div>';
  DOM.mtfCard.innerHTML = html;
}

function renderMultiPairTable(results) {
  if (!DOM.multiPairTable) return;
  if (!results.length) { DOM.multiPairTable.innerHTML = '<p style="font-size:0.8rem;color:#666;">No results</p>'; return; }
  results.sort((a,b)=>b.score-a.score);
  let html = '<table class="mp-table"><thead><tr><th>PAIR</th><th>PRICE</th><th>24H</th><th>DCB</th><th>SIGNAL</th></tr></thead><tbody>';
  results.forEach(r => {
    const sig = displaySignal(r.score);
    const changeColor = r.change >= 0 ? '#00c853' : '#ff1744';
    html += `<tr onclick="window.quickScan('${r.symbol}')">
      <td><strong>${r.symbol.replace('USDT','')}</strong></td>
      <td>$${r.price.toFixed(2)}</td>
      <td style="color:${changeColor};">${r.change>=0?'+':''}${r.change.toFixed(1)}%</td>
      <td style="color:${sig.color};font-weight:700;">${r.score}%</td>
      <td style="font-size:0.65rem;color:${sig.color};">${sig.label}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  DOM.multiPairTable.innerHTML = html;
}

function renderWatchlist(data) {
  if (!DOM.watchlistGrid) return;
  DOM.wsStatus.textContent = 'Live';
  DOM.wsStatus.style.color = '#00c853';
  let html = '';
  const pairs = Storage.getCustomPairs().length ? Storage.getCustomPairs() : ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','DOTUSDT','LINKUSDT'];
  pairs.forEach(pair => {
    const info = data.find(d => d.s === pair);
    if (!info) return;
    const price = parseFloat(info.c), change = parseFloat(info.P), vol = parseFloat(info.q);
    const changeColor = change >= 0 ? '#00c853' : '#ff1744';
    html += `<div class="wl-card" onclick="window.quickScan('${pair}')">
      <div class="wl-symbol">${pair.replace('USDT','')}</div>
      <div class="wl-price">$${price.toFixed(2)}</div>
      <div class="wl-change" style="color:${changeColor};">${change>=0?'+':''}${change.toFixed(2)}%</div>
    </div>`;
  });
  DOM.watchlistGrid.innerHTML = html;
}

function renderHistory() {
  const history = Storage.getHistory();
  const acc = Storage.getAccuracy();
  if (DOM.accuracyStats) DOM.accuracyStats.innerHTML = `<span>Total: ${acc.total} | Wins: ${acc.wins} | Rate: ${acc.rate}%</span>`;
  if (!DOM.historyList) return;
  if (!history.length) { DOM.historyList.innerHTML = '<p style="color:#666;">No history</p>'; return; }
  let html = '';
  history.slice(0,30).forEach(h => {
    const sig = displaySignal(h.score);
    const time = new Date(h.timestamp).toLocaleDateString('id-ID',{ day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    html += `<div class="history-item">
      <div>
        <strong>${h.symbol}</strong> <span style="color:#666;">${h.interval}</span>
        <span style="color:${sig.color};font-weight:700;margin-left:8px;">${h.score}%</span>
        <div style="font-size:0.65rem;color:#555;">${time}</div>
      </div>
      <div class="feedback-btns" data-id="${h.id}">
        <button class="feedback-btn correct ${h.feedback==='win'?'active':''}" data-result="win">Win</button>
        <button class="feedback-btn incorrect ${h.feedback==='loss'?'active':''}" data-result="loss">Loss</button>
      </div>
    </div>`;
  });
  DOM.historyList.innerHTML = html;
  
  // Feedback listeners
  DOM.historyList.querySelectorAll('.feedback-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.parentElement.dataset.id);
      const result = btn.dataset.result;
      Storage.updateFeedback(id, result);
      Storage.addAccuracy({
        symbol: history.find(h=>h.id===id)?.symbol,
        result: result
      });
      renderHistory();
    });
  });
}

function updateRemainingDisplay() {
  if (DOM.remainingDisplay) {
    const r = Storage.getRemainingScans();
    DOM.remainingDisplay.textContent = `Scans left: ${r}`;
  }
}