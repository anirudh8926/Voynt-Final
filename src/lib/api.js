const API_BASE = import.meta.env.VITE_API_BASE !== undefined ? import.meta.env.VITE_API_BASE : 'http://localhost:8000';

export function analyzeProfile(payload) {
  return fetch(API_BASE + '/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((res) => {
    if (!res.ok) return res.text().then((t) => { throw new Error(t || 'Failed to analyze profile'); });
    return res.json();
  });
}

export function pollStatus(sessionId, onComplete, onFailed) {
  const intervalMs = 2000;
  const intervalId = setInterval(() => {
    fetch(API_BASE + '/api/status/' + encodeURIComponent(sessionId))
      .then((res) => {
        if (!res.ok) return res.text().then((t) => { throw new Error(t || 'Status check failed'); });
        return res.json();
      })
      .then((data) => {
        if (!data || !data.status) return;
        if (data.status === 'complete') {
          clearInterval(intervalId);
          if (typeof onComplete === 'function') onComplete(data);
        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          if (typeof onFailed === 'function') onFailed(new Error('Pipeline failed for session ' + sessionId));
        }
      })
      .catch((err) => {
        clearInterval(intervalId);
        if (typeof onFailed === 'function') onFailed(err);
      });
  }, intervalMs);
  return intervalId;
}

export function getResults(sessionId) {
  return fetch(API_BASE + '/api/results/' + encodeURIComponent(sessionId)).then((res) => {
    if (!res.ok) return res.text().then((t) => { throw new Error(t || 'Failed to fetch results'); });
    return res.json();
  });
}

export function runSandbox(sessionId, spendOverrides, selectedCards) {
  const payload = {
    session_id: sessionId,
    selected_cards: selectedCards || [],
    spend_overrides: spendOverrides || {},
  };
  return fetch(API_BASE + '/api/sandbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((res) => {
    if (!res.ok) return res.text().then((t) => { throw new Error(t || 'Failed to run sandbox'); });
    return res.json();
  });
}

export function fetchExpenditureGraph(totalSpend, cards) {
  const payload = {
    total_spend: parseFloat(totalSpend) || 50000,
    cards: cards || [],
  };
  return fetch(API_BASE + '/api/graph/simulation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((res) => {
    if (!res.ok) return res.text().then((t) => { throw new Error(t || 'Failed to fetch graph'); });
    return res.json();
  });
}

export function fetchStrategyGraph(sessionId) {
  return fetch(API_BASE + '/api/graph/' + encodeURIComponent(sessionId)).then((res) => {
    if (!res.ok) return res.text().then((t) => { throw new Error(t || 'Failed to fetch strategy graph'); });
    return res.json();
  });
}
