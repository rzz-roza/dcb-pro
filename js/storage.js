// DCB Pro v1.0 — Local Storage Manager

const Storage = {
  prefix: 'dcb_pro_',
  
  set(key, value) {
    try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  
  get(key, def = null) {
    try { const item = localStorage.getItem(this.prefix + key); return item ? JSON.parse(item) : def; }
    catch (e) { return def; }
  },
  
  remove(key) { localStorage.removeItem(this.prefix + key); },

  // Activation
  getToken() { return this.get('token'); },
  saveToken(t) { this.set('token', t); },
  isActivated() { return !!this.getToken(); },
  
  getRemainingScans() { return this.get('remainingScans', 0); },
  setRemainingScans(n) { this.set('remainingScans', n); },
  decrementScans() {
    const r = this.getRemainingScans();
    if (r > 0) { this.setRemainingScans(r - 1); return true; }
    return false;
  },

  // History
  addResult(data) {
    const hist = this.get('history', []);
    hist.unshift({ ...data, id: Date.now(), timestamp: new Date().toISOString() });
    this.set('history', hist.slice(0, 200));
  },
  getHistory() { return this.get('history', []); },
  updateFeedback(id, result) {
    const hist = this.getHistory();
    const idx = hist.findIndex(h => h.id === id);
    if (idx !== -1) { hist[idx].feedback = result; this.set('history', hist); }
  },
  clearHistory() { this.remove('history'); },

  // Accuracy
  addAccuracy(record) {
    const recs = this.get('accuracy', []);
    recs.unshift({ ...record, timestamp: new Date().toISOString() });
    this.set('accuracy', recs.slice(0, 500));
  },
  getAccuracy() {
    const recs = this.get('accuracy', []);
    if (!recs.length) return { total: 0, wins: 0, rate: 0 };
    const wins = recs.filter(r => r.result === 'win').length;
    return { total: recs.length, wins, rate: ((wins/recs.length)*100).toFixed(1) };
  },

  // Custom pairs
  getCustomPairs() { return this.get('customPairs', []); },
  setCustomPairs(pairs) { this.set('customPairs', pairs); }
};