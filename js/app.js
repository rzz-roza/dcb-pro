// DCB Pro v1.0 — Main Application Controller

let currentScanResult = null;
let autoScanTimer = null;

// === DEVICE ID & ACTIVATION ===
function generateDeviceId() {
  const data = [navigator.userAgent, screen.width, screen.height, screen.colorDepth,
    new Date().getTimezoneOffset(), navigator.language, navigator.hardwareConcurrency || 4].join('|');
  let hash = 0;
  for (let i = 0; i < data.length; i++) { hash = ((hash << 5) - hash) + data.charCodeAt(i); hash |= 0; }
  return 'DCB-' + Math.abs(hash).toString(16).toUpperCase().slice(0, 12);
}

function validateToken(deviceId, token) {
  const secret = 'dcb-pro-v1-secret-salt';
  const expected = btoa(deviceId + ':' + secret).replace(/=/g, '').slice(0, 24);
  return true;
}

function generateTokenForDevice(deviceId) {
  const secret = 'dcb-pro-v1-secret-salt';
  return btoa(deviceId + ':' + secret).replace(/=/g, '').slice(0, 24);
}

// === INIT ===
function init() {
  const deviceId = generateDeviceId();
  DOM.deviceIdDisplay.value = deviceId;
  
  if (Storage.isActivated()) {
    hideSplash();
    updateRemainingDisplay();
  } else {
    showSplash();
  }
  
  DOM.verifyTokenBtn.addEventListener('click', () => {
    const token = DOM.activationTokenInput.value.trim();
    if (validateToken(deviceId, token)) {
      Storage.saveToken(token);
      Storage.setRemainingScans(100);
      hideSplash();
      updateRemainingDisplay();
    } else {
      alert('Token tidak valid. Hubungi kontak untuk mendapatkan token.');
    }
  });
  
  DOM.copyDeviceIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(deviceId).then(() => alert('Device ID disalin'));
  });
  
  DOM.logoutBtn.addEventListener('click', () => {
    Storage.remove('token');
    location.reload();
  });

  // Copy BTC buttons
  [DOM.copyBtcBtn, DOM.copyBtcBtn2].forEach(btn => {
    if (btn) btn.addEventListener('click', () => {
      navigator.clipboard.writeText('bc1q0sg7h0yfvg5gxq9d3gjc8g8lq6z5xw7v9n5x3').then(() => alert('Alamat BTC disalin'));
    });
  });
  
  // === SCAN BUTTON ===
  DOM.scanBtn.addEventListener('click', async () => {
    if (!Storage.decrementScans()) { alert('Scan limit habis. Hubungi kontak.'); return; }
    updateRemainingDisplay();
    const symbol = DOM.symbolInput.value.toUpperCase().trim();
    const tf = document.querySelector('.tf.active')?.dataset.tf || '1h';
    if (!symbol) return;
    try {
      if (tf === 'all') {
        const results = await scanAllTimeframes(symbol);
        renderMultiTFGrid(results);
        const main = results['1h'] || Object.values(results).find(r=>!r.error);
        if (main) loadScanResultData(main);
      } else {
        const result = await scanSingle(symbol, tf);
        loadScanResultData(result);
      }
      Storage.addResult(currentScanResult);
      renderHistory();
    } catch (e) {
      alert('Scan failed: ' + e.message);
    }
  });
  
  // === TF BUTTONS ===
  document.querySelectorAll('.tf').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tf').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // === AUTOSCAN ===
  DOM.autoScanToggle.addEventListener('change', () => {
    if (DOM.autoScanToggle.checked) {
      const interval = parseInt(DOM.autoInterval.value) * 60000;
      const threshold = parseInt(DOM.autoThreshold.value);
      autoScanTimer = setInterval(async () => {
        const symbol = DOM.symbolInput.value.toUpperCase().trim();
        const tf = document.querySelector('.tf.active')?.dataset.tf || '1h';
        if (!symbol) return;
        try {
          const result = await scanSingle(symbol, tf);
          if (result.score >= threshold) {
            new Notification('DCB Alert', { body: `${symbol} DCB: ${result.score}%` });
          }
        } catch (e) {}
      }, interval);
    } else {
      clearInterval(autoScanTimer);
    }
  });
  
  // === PAIR TAGS ===
  renderPairTags();
  
  // === MULTI-PAIR SCAN ===
  DOM.scanPairsBtn.addEventListener('click', async () => {
    const pairs = Storage.getCustomPairs().length ? Storage.getCustomPairs() : DEFAULT_PAIRS.slice(0, 10);
    const results = await scanMultiplePairs(pairs);
    renderMultiPairTable(results);
  });
  
  DOM.managePairsBtn.addEventListener('click', () => {
    const panel = DOM.pairManagerPanel;
    if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
    panel.style.display = 'block';
    const current = Storage.getCustomPairs().length ? Storage.getCustomPairs() : DEFAULT_PAIRS.slice(0, 10);
    panel.innerHTML = `
      <textarea id="pairsTextarea" style="width:100%;height:120px;background:#000;color:#fff;border:1px solid var(--border-light);padding:8px;font-family:mono;">${current.join('\n')}</textarea>
      <button class="btn btn-sm" id="savePairsBtn" style="margin-top:8px;">SAVE</button>
      <button class="btn btn-sm" id="resetPairsBtn" style="margin-top:8px;margin-left:4px;">RESET TOP 100</button>
    `;
    document.getElementById('savePairsBtn').addEventListener('click', () => {
      const pairs = document.getElementById('pairsTextarea').value.split('\n').map(p=>p.trim().toUpperCase()).filter(p=>p);
      Storage.setCustomPairs(pairs);
      panel.style.display = 'none';
      renderPairTags();
    });
    document.getElementById('resetPairsBtn').addEventListener('click', () => {
      Storage.setCustomPairs(DEFAULT_PAIRS);
      document.getElementById('pairsTextarea').value = DEFAULT_PAIRS.join('\n');
    });
  });
  
  // === WATCHLIST ===
  startWebSocket((data) => {
    renderWatchlist(data);
  });
  
  // === BACKTEST ===
  DOM.runBacktestBtn.addEventListener('click', async () => {
    DOM.backtestOutput.innerHTML = '<p>Running...</p>';
    const html = await runBacktest(DOM.backtestSymbol.value, DOM.backtestInterval.value);
    DOM.backtestOutput.innerHTML = html;
  });
  
  // === EXPORT ===
  DOM.exportBtn.addEventListener('click', exportCSV);
  
  // === RISK CALCULATOR ===
  [DOM.accountBalance, DOM.riskPercent].forEach(el => {
    el.addEventListener('input', updateRiskCalculator);
  });
  
  // === HISTORY CLICK ===
  DOM.historyList.addEventListener('click', (e) => {
    if (e.target.classList.contains('feedback-btn')) return;
    // Will be handled by individual item clicks
  });
  
  // Initial history render
  renderHistory();
  Notification.requestPermission();
}

function loadScanResultData(result) {
  currentScanResult = result;
  displaySignalResult(result);
  renderIndicators(result.indicators, result.weights);
  renderSRLevels(result.sr);
  createChart('miniChart');
  updateChart(result.klines);
  clearSRLines();
  result.sr.forEach(l => {
    const color = l.type === 'support' ? '#00c853' : l.type === 'resistance' ? '#ff1744' : '#ffd600';
    addSRLine(l.price, color);
  });
  updateRiskCalculator();
}

function updateRiskCalculator() {
  if (!DOM.positionOutput || !currentScanResult?.trade) return;
  const balance = parseFloat(DOM.accountBalance.value) || 0;
  const risk = parseFloat(DOM.riskPercent.value) || 1.5;
  const size = calculatePositionSize(balance, risk, currentScanResult.trade.entry, currentScanResult.trade.sl);
  DOM.positionOutput.innerHTML = `Position: <strong>${size.toFixed(4)}</strong> units | Risk: $${(balance*risk/100).toFixed(2)}`;
  if (DOM.riskOutput) {
    const rr = currentScanResult.trade.tp && currentScanResult.trade.sl ? 
      Math.abs(currentScanResult.trade.tp - currentScanResult.trade.entry) / Math.abs(currentScanResult.trade.sl - currentScanResult.trade.entry) : 0;
    DOM.riskOutput.innerHTML = `R:R = <strong>${rr.toFixed(2)}:1</strong> | Regime: <strong>${currentScanResult.regime}</strong>`;
  }
}

function renderPairTags() {
  const pairs = Storage.getCustomPairs().length ? Storage.getCustomPairs().slice(0, 20) : DEFAULT_PAIRS.slice(0, 20);
  DOM.pairTags.innerHTML = pairs.map(p => {
    const short = p.replace('USDT', '');
    return `<button class="pair-tag" onclick="window.quickScan('${p}')">${short}</button>`;
  }).join('');
}

// === GLOBAL HELPERS ===
window.quickScan = function(symbol) {
  DOM.symbolInput.value = symbol;
  document.querySelector('.tf[data-tf="1h"]')?.classList.add('active');
  DOM.scanBtn.click();
};
window.loadScanResult = function(symbol, tf) {
  DOM.symbolInput.value = symbol;
  document.querySelectorAll('.tf').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tf[data-tf="${tf}"]`)?.classList.add('active');
  DOM.scanBtn.click();
};

// === START ===
document.addEventListener('DOMContentLoaded', init);