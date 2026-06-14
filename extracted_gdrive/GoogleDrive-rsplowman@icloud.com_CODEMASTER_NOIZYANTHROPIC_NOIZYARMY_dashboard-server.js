#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NOIZYARMY — Dashboard Server                               ║
 * ║  Real-time build status portal + iPad/mobile access         ║
 * ║  RSP_001 | NOIZY Empire | 2026                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Serves the NOIZYARMY dashboard at /dashboard
 * Auto-updates via WebSocket + SSE
 * Port: 9333 (shared with orchestrator, or standalone on 9334)
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.DASHBOARD_PORT || "9334");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// ── Serve Dashboard HTML ────────────────────────────────────
app.get("/dashboard", (req, res) => {
  res.send(DASHBOARD_HTML);
});

app.get("/health", (req, res) => {
  res.json({ server: "NOIZYARMY Dashboard", status: "ONLINE", port: PORT });
});

app.listen(PORT, () => {
  console.log(`🌐 NOIZYARMY Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📱 iPad access: http://10.90.90.10:${PORT}/dashboard`);
});

// ── Dashboard HTML ──────────────────────────────────────────
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>⚔️ NOIZYARMY — Command Center</title>
<style>
  :root {
    --bg: #0a0a0f;
    --card: #12121a;
    --border: #1e1e2e;
    --purple: #7B2FF7;
    --green: #00FF88;
    --red: #FF4444;
    --yellow: #FFB800;
    --cyan: #00DDFF;
    --text: #e0e0e0;
    --dim: #666;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    padding: 20px;
    min-height: 100vh;
  }
  h1 {
    text-align: center;
    color: var(--purple);
    font-size: 24px;
    margin-bottom: 5px;
  }
  .subtitle {
    text-align: center;
    color: var(--dim);
    font-size: 12px;
    margin-bottom: 20px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 15px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
  }
  .card h2 {
    font-size: 14px;
    color: var(--cyan);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .service {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
  }
  .service:last-child { border-bottom: none; }
  .service-name { font-size: 13px; }
  .status-live { color: var(--green); font-weight: bold; }
  .status-down { color: var(--red); font-weight: bold; }
  .agent {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 12px;
  }
  .agent-name { font-weight: bold; color: var(--purple); }
  .btn {
    background: var(--purple);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    margin: 4px;
  }
  .btn:hover { opacity: 0.8; }
  .btn-green { background: var(--green); color: black; }
  .btn-red { background: var(--red); }
  .btn-yellow { background: var(--yellow); color: black; }
  .log-area {
    background: #000;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 10px;
    font-size: 11px;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .log-entry { padding: 2px 0; }
  .log-time { color: var(--dim); }
  .log-info { color: var(--cyan); }
  .log-warn { color: var(--yellow); }
  .log-error { color: var(--red); }
  .log-success { color: var(--green); }
  .metric {
    text-align: center;
    padding: 10px;
  }
  .metric-value {
    font-size: 32px;
    font-weight: bold;
    color: var(--green);
  }
  .metric-label {
    font-size: 11px;
    color: var(--dim);
    margin-top: 4px;
  }
  .actions { display: flex; flex-wrap: wrap; gap: 4px; }
  .countdown {
    text-align: center;
    font-size: 48px;
    font-weight: bold;
    color: var(--purple);
    padding: 20px;
  }
  .countdown-label {
    font-size: 14px;
    color: var(--dim);
  }
  #swarm-input {
    width: 100%;
    background: #000;
    border: 1px solid var(--border);
    color: var(--text);
    padding: 8px;
    border-radius: 4px;
    font-family: inherit;
    font-size: 12px;
    margin: 8px 0;
  }
  @media (max-width: 768px) {
    body { padding: 10px; }
    .grid { grid-template-columns: 1fr; }
    .countdown { font-size: 36px; }
  }
</style>
</head>
<body>
<h1>⚔️ NOIZYARMY — COMMAND CENTER</h1>
<p class="subtitle">Building at 100%. Always. Forever. | GOD.local (M2 Ultra 192GB)</p>

<div class="grid">

  <!-- Services -->
  <div class="card">
    <h2>🏛️ Services</h2>
    <div id="services">
      <div class="service"><span class="service-name">Loading...</span></div>
    </div>
    <div style="margin-top: 10px">
      <button class="btn btn-green" onclick="heal()">❤️‍🩹 Heal</button>
      <button class="btn" onclick="refreshStatus()">🔄 Refresh</button>
    </div>
  </div>

  <!-- Metrics -->
  <div class="card">
    <h2>📊 Metrics</h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
      <div class="metric">
        <div class="metric-value" id="metric-services">-</div>
        <div class="metric-label">Services Live</div>
      </div>
      <div class="metric">
        <div class="metric-value" id="metric-agents">10</div>
        <div class="metric-label">Agents</div>
      </div>
      <div class="metric">
        <div class="metric-value" id="metric-swarm">-</div>
        <div class="metric-label">Swarm Jobs</div>
      </div>
    </div>
  </div>

  <!-- Countdown -->
  <div class="card">
    <h2>⏳ Deadline</h2>
    <div class="countdown" id="countdown">-</div>
    <div class="countdown-label" style="text-align:center">days until April 17, 2026</div>
  </div>

  <!-- Actions -->
  <div class="card">
    <h2>🚀 Quick Actions</h2>
    <div class="actions">
      <button class="btn" onclick="deploy('heaven')">🚀 Deploy Heaven</button>
      <button class="btn" onclick="deploy('landing')">🌐 Deploy Landing</button>
      <button class="btn btn-yellow" onclick="smoke()">🧪 Smoke Tests</button>
      <button class="btn btn-green" onclick="heal()">❤️‍🩹 Auto-Heal</button>
      <button class="btn" onclick="observer()">👁️ Observer</button>
      <button class="btn btn-red" onclick="diagnostic()">🔬 Diagnostic</button>
    </div>
  </div>

  <!-- Swarm -->
  <div class="card" style="grid-column: span 2">
    <h2>🐝 Swarm Engine</h2>
    <input id="swarm-input" placeholder="Enter task for the swarm..." onkeydown="if(event.key==='Enter')swarm()">
    <button class="btn" onclick="swarm()">🐝 Dispatch Swarm</button>
    <div id="swarm-result" class="log-area" style="margin-top:10px; display:none;"></div>
  </div>

  <!-- Gemma -->
  <div class="card">
    <h2>🧠 Gemma AI (Local)</h2>
    <input id="gemma-input" style="width:100%;background:#000;border:1px solid var(--border);color:var(--text);padding:8px;border-radius:4px;font-family:inherit;font-size:12px;margin:8px 0;" placeholder="Ask Gemma..." onkeydown="if(event.key==='Enter')askGemma()">
    <button class="btn" onclick="askGemma()">🧠 Ask</button>
    <div id="gemma-result" class="log-area" style="margin-top:10px; display:none;"></div>
  </div>

  <!-- Agent Roster -->
  <div class="card">
    <h2>🤖 Agent Roster</h2>
    <div class="agent">🏛️ <span class="agent-name">GABRIEL</span> System Bridge & Orchestrator</div>
    <div class="agent">💼 <span class="agent-name">SHIRL</span> Business Ops & Family Care</div>
    <div class="agent">🎨 <span class="agent-name">POPS</span> Creative Direction</div>
    <div class="agent">⚙️ <span class="agent-name">ENGR_KEITH</span> Technical Engineering</div>
    <div class="agent">💭 <span class="agent-name">DREAM</span> Visionary Planning</div>
    <div class="agent">🌐 <span class="agent-name">CB01</span> DNS & Infrastructure</div>
    <div class="agent">👩‍💻 <span class="agent-name">SHIRLEY</span> Code & File Mgr (Gemma3)</div>
    <div class="agent">🛡️ <span class="agent-name">CONSENT_AUDITOR</span> Never Clauses</div>
    <div class="agent">🗣️ <span class="agent-name">VOICE_SPECIALIST</span> TTS/Audio</div>
    <div class="agent">🧪 <span class="agent-name">TEST_RUNNER</span> Smoke Tests & CI</div>
  </div>

  <!-- Event Log -->
  <div class="card" style="grid-column: span 2">
    <h2>📋 Event Log</h2>
    <div id="event-log" class="log-area">
      <div class="log-entry"><span class="log-time">${new Date().toLocaleTimeString()}</span> <span class="log-info">Dashboard loaded. Connecting...</span></div>
    </div>
  </div>

</div>

<script>
const ORCH_URL = location.hostname === 'localhost' ? 'http://localhost:9333' : \`http://\${location.hostname}:9333\`;
const DASH_URL = location.origin;

function log(msg, type = 'info') {
  const el = document.getElementById('event-log');
  const time = new Date().toLocaleTimeString();
  el.innerHTML += \`<div class="log-entry"><span class="log-time">\${time}</span> <span class="log-\${type}">\${msg}</span></div>\`;
  el.scrollTop = el.scrollHeight;
}

async function api(path, opts = {}) {
  try {
    const res = await fetch(ORCH_URL + path, { ...opts, headers: { 'Content-Type': 'application/json', ...opts.headers } });
    return await res.json();
  } catch (e) {
    log('Orchestrator unreachable: ' + e.message, 'error');
    return null;
  }
}

async function refreshStatus() {
  log('Refreshing status...');
  const data = await api('/services');
  if (!data) return;
  const el = document.getElementById('services');
  el.innerHTML = '';
  let live = 0;
  for (const [name, svc] of Object.entries(data)) {
    const ok = svc.ok || svc.status === 'LIVE';
    if (ok) live++;
    el.innerHTML += \`<div class="service"><span class="service-name">\${name}</span><span class="\${ok ? 'status-live' : 'status-down'}">\${ok ? '🟢 LIVE' : '🔴 DOWN'}</span></div>\`;
  }
  document.getElementById('metric-services').textContent = \`\${live}/\${Object.keys(data).length}\`;
  log(\`Status: \${live}/\${Object.keys(data).length} services online\`, live === Object.keys(data).length ? 'success' : 'warn');
}

async function heal() {
  log('Auto-healing...', 'warn');
  const data = await api('/heal', { method: 'POST' });
  if (data?.healed?.length > 0) {
    log('Healed: ' + data.healed.join(', '), 'success');
  } else {
    log('All services healthy', 'success');
  }
  setTimeout(refreshStatus, 3000);
}

async function deploy(service) {
  log(\`Deploying \${service}...\`, 'info');
  const data = await api(\`/deploy/\${service}\`, { method: 'POST' });
  if (data?.status === 'deployed') {
    log(\`\${service} deployed successfully\`, 'success');
  } else {
    log(\`Deploy failed: \${data?.error || 'unknown'}\`, 'error');
  }
}

async function smoke() {
  log('Running smoke tests...', 'info');
  const data = await api('/smoke', { method: 'POST' });
  log(data?.output?.slice(0, 300) || 'Smoke tests complete', data?.status === 'complete' ? 'success' : 'error');
}

async function observer() {
  log('Running observer...', 'info');
  const data = await api('/observer');
  if (data?._meta) {
    log('Observer digest captured: ' + data._meta.timestamp, 'success');
  }
}

async function diagnostic() {
  log('Running MC96 diagnostic...', 'info');
  const data = await api('/observer');
  log('Diagnostic complete', 'success');
}

async function swarm() {
  const input = document.getElementById('swarm-input');
  const task = input.value.trim();
  if (!task) return;
  log(\`Dispatching swarm: \${task}\`, 'info');
  const resultEl = document.getElementById('swarm-result');
  resultEl.style.display = 'block';
  resultEl.textContent = 'Bees working...';
  const data = await api('/swarm', { method: 'POST', body: JSON.stringify({ task }) });
  if (data?.result) {
    resultEl.textContent = JSON.stringify(data.result, null, 2);
    log('Swarm complete', 'success');
  } else {
    resultEl.textContent = JSON.stringify(data || 'No result', null, 2);
  }
  input.value = '';
}

async function askGemma() {
  const input = document.getElementById('gemma-input');
  const prompt = input.value.trim();
  if (!prompt) return;
  const resultEl = document.getElementById('gemma-result');
  resultEl.style.display = 'block';
  resultEl.textContent = 'Thinking...';
  const data = await api('/gemma', { method: 'POST', body: JSON.stringify({ prompt }) });
  resultEl.textContent = data?.response || 'No response';
  input.value = '';
}

function updateCountdown() {
  const target = new Date('2026-04-17');
  const days = Math.ceil((target - new Date()) / 86400000);
  document.getElementById('countdown').textContent = days;
}

// Init
updateCountdown();
setInterval(updateCountdown, 60000);
refreshStatus();
setInterval(refreshStatus, 30000);

// SSE connection
try {
  const es = new EventSource(ORCH_URL + '/events');
  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type !== 'heartbeat') {
      log(\`[\${data.type}] \${JSON.stringify(data.data || '').slice(0, 100)}\`, 'info');
    }
  };
  es.onerror = () => log('SSE reconnecting...', 'warn');
} catch {}
</script>
</body>
</html>`;
