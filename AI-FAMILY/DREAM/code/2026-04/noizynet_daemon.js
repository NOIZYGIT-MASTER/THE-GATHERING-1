/**
 * ============================================================
 * NOIZYNET DAEMON — GOD-SIDE NETWORK AUDIO MONITOR
 * ============================================================
 * Deployed to: GOD (10.90.90.10)
 * Port: 9699
 * Role: Signal chain monitor, AU Net health gate, ENGR_KEITH bridge
 *
 * Signal chain tracked:
 *   MICKY-P:10.90.90.40 → AU Net Send :97100
 *   → GOD Logic Pro X (AU Net Receive)
 *   → NOIZY Claude Session 1
 *   → Logic Remote (iPad)
 *
 * Endpoints:
 *   GET  /health      → full signal chain status
 *   GET  /ping        → alive check
 *   GET  /signal      → current chain state (JSON)
 *   GET  /keith       → ENGR_KEITH status proxy
 *   POST /event       → ingest signal events from CLI or scripts
 *   WS   /live        → WebSocket real-time feed (iPad/browser)
 *
 * v1.0 — RSP_001 / NOIZY Empire
 * ============================================================
 */

'use strict';

const http    = require('http');
const net     = require('net');
const { execSync, exec } = require('child_process');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');

// ── CONFIG ──────────────────────────────────────────────────
const CFG = {
    PORT:          9699,
    KEITH_PORT:    7006,
    AUNET_PORT:    97100,
    MICKYP_IP:     '10.90.90.40',
    GOD_IP:        '10.90.90.10',
    POLL_MS:       4000,       // chain health poll interval
    LOG:           path.join(os.homedir(), 'Desktop', 'noizynet.log'),
    EVENT_LOG:     path.join(os.homedir(), 'Desktop', 'noizynet_events.jsonl'),
    AGENT:         'NOIZYNET',
    SESSION:       'NOIZY Claude Session 1',
};

// ── STATE ────────────────────────────────────────────────────
const state = {
    agent:       CFG.AGENT,
    session:     CFG.SESSION,
    boot:        new Date().toISOString(),
    lastPoll:    null,
    chain: {
        mickyp_reachable:   false,   // ICMP to Micky-P
        aunet_port_open:    false,   // TCP probe :97100 on Micky-P
        keith_online:       false,   // HTTP /ping to ENGR_KEITH :7006
        logic_running:      false,   // osascript check
        session_saved:      false,   // session file exists
        ipad_connected:     false,   // Logic Remote beacon (heuristic)
    },
    keith:        null,
    events:       [],                // last 50 events
    ws_clients:   new Set(),
};

// ── LOGGER ──────────────────────────────────────────────────
function log(msg) {
    const line = `[${new Date().toISOString()}] [${CFG.AGENT}] ${msg}`;
    console.log(line);
    try { fs.appendFileSync(CFG.LOG, line + '\n'); } catch (_) {}
}

function event(type, data = {}) {
    const ev = { ts: new Date().toISOString(), type, ...data };
    try { fs.appendFileSync(CFG.EVENT_LOG, JSON.stringify(ev) + '\n'); } catch (_) {}
    state.events.unshift(ev);
    if (state.events.length > 50) state.events.length = 50;
    broadcast(JSON.stringify({ event: ev }));
    return ev;
}

// ── TCP PROBE ────────────────────────────────────────────────
function tcpProbe(host, port, timeout = 2000) {
    return new Promise(resolve => {
        const s = new net.Socket();
        let done = false;
        const finish = (ok) => {
            if (done) return;
            done = true;
            s.destroy();
            resolve(ok);
        };
        s.setTimeout(timeout);
        s.connect(port, host, () => finish(true));
        s.on('error', () => finish(false));
        s.on('timeout', () => finish(false));
    });
}

// ── HTTP GET ─────────────────────────────────────────────────
function httpGet(url, timeout = 3000) {
    return new Promise(resolve => {
        const t = setTimeout(() => resolve(null), timeout);
        try {
            http.get(url, res => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    clearTimeout(t);
                    try { resolve(JSON.parse(body)); }
                    catch (_) { resolve(null); }
                });
            }).on('error', () => { clearTimeout(t); resolve(null); });
        } catch (_) { clearTimeout(t); resolve(null); }
    });
}

// ── LOGIC RUNNING CHECK ──────────────────────────────────────
function checkLogic() {
    try {
        const r = execSync(
            'osascript -e \'tell application "System Events" to return name of processes\'',
            { encoding: 'utf-8', timeout: 3000 }
        );
        return r.includes('Logic Pro');
    } catch (_) { return false; }
}

// ── SESSION FILE CHECK ───────────────────────────────────────
function checkSession() {
    const paths = [
        path.join(os.homedir(), 'Documents', 'Logic', `${CFG.SESSION}.logicx`),
        path.join(os.homedir(), 'Music', 'Logic', `${CFG.SESSION}.logicx`),
        path.join(os.homedir(), 'Desktop', `${CFG.SESSION}.logicx`),
    ];
    return paths.some(p => fs.existsSync(p));
}

// ── iLOOK FOR LOGIC REMOTE (heuristic via arp / bonjour) ────
function checkiPad() {
    try {
        // Logic Remote advertises _logiccontrols._tcp — check if arp has a tablet
        const arp = execSync('arp -a 2>/dev/null', { encoding: 'utf-8', timeout: 2000 });
        // Any .2 or .3 on the same subnet as a likely iPad
        return /\(10\.90\.90\.[2-9]\)/.test(arp);
    } catch (_) { return false; }
}

// ── BONJOUR ADVERTISEMENT ────────────────────────────────────
// Advertise _noizynet._tcp so Logic Remote and iPad apps can discover GOD
function advertiseBonjour() {
    try {
        exec(
            `dns-sd -R "NOIZYNET" _noizynet._tcp . ${CFG.PORT} &`,
            { shell: '/bin/bash' }
        );
        log('Bonjour: _noizynet._tcp advertised');
    } catch (e) {
        log(`Bonjour: skipped (${e.message})`);
    }
}

// ── CHAIN POLL ───────────────────────────────────────────────
async function pollChain() {
    const prev = { ...state.chain };

    // 1. Micky-P reachable
    state.chain.mickyp_reachable = await tcpProbe(CFG.MICKYP_IP, 22, 2000);

    // 2. AU Net port open on Micky-P
    if (state.chain.mickyp_reachable) {
        state.chain.aunet_port_open = await tcpProbe(CFG.MICKYP_IP, CFG.AUNET_PORT, 2000);
    } else {
        state.chain.aunet_port_open = false;
    }

    // 3. ENGR_KEITH online
    const keithData = await httpGet(`http://localhost:${CFG.KEITH_PORT}/ping`);
    state.chain.keith_online = !!(keithData && keithData.alive);
    if (state.chain.keith_online) {
        state.keith = await httpGet(`http://localhost:${CFG.KEITH_PORT}/status`);
    }

    // 4. Logic Pro running
    state.chain.logic_running = checkLogic();

    // 5. Session saved
    state.chain.session_saved = checkSession();

    // 6. iPad / Logic Remote heuristic
    state.chain.ipad_connected = checkiPad();

    state.lastPoll = new Date().toISOString();

    // Emit events for state transitions
    for (const [k, v] of Object.entries(state.chain)) {
        if (v !== prev[k]) {
            event('CHAIN_CHANGE', { link: k, from: prev[k], to: v });
            log(`CHAIN: ${k} ${prev[k] ? '✓' : '✗'} → ${v ? '✓' : '✗'}`);
        }
    }

    // Broadcast full state to WS clients
    broadcast(JSON.stringify({ type: 'poll', chain: state.chain, ts: state.lastPoll }));
}

// ── WEBSOCKET (hand-rolled, lightweight) ─────────────────────
// No ws dependency — raw HTTP upgrade for status feed
function broadcast(msg) {
    for (const client of state.ws_clients) {
        try {
            const frame = encodeWsFrame(msg);
            client.write(frame);
        } catch (_) {
            state.ws_clients.delete(client);
        }
    }
}

function encodeWsFrame(data) {
    const payload = Buffer.from(data, 'utf-8');
    const len = payload.length;
    let header;
    if (len <= 125) {
        header = Buffer.alloc(2);
        header[0] = 0x81; // FIN + text
        header[1] = len;
    } else if (len <= 65535) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
}

function upgradeToWs(req, socket) {
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    const accept = require('crypto')
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');
    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    state.ws_clients.add(socket);
    log(`WS client connected (${state.ws_clients.size} total)`);
    // Send current state immediately
    try {
        socket.write(encodeWsFrame(JSON.stringify({ type: 'init', state, chain: state.chain })));
    } catch (_) {}
    socket.on('close', () => { state.ws_clients.delete(socket); log('WS client disconnected'); });
    socket.on('error', () => state.ws_clients.delete(socket));
}

// ── HTTP SERVER ───────────────────────────────────────────────
function chainStatus() {
    const chain = state.chain;
    const ok = chain.mickyp_reachable && chain.aunet_port_open && chain.keith_online && chain.logic_running;
    return {
        status:   ok ? 'SIGNAL_CHAIN_LIVE' : 'DEGRADED',
        chain,
        keith:    state.keith,
        session:  CFG.SESSION,
        lastPoll: state.lastPoll,
        events:   state.events.slice(0, 10),
        uptime:   Math.floor(process.uptime()),
    };
}

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const url = req.url.split('?')[0];

    // Health
    if (req.method === 'GET' && url === '/health') {
        const s = chainStatus();
        res.statusCode = s.status === 'SIGNAL_CHAIN_LIVE' ? 200 : 503;
        return res.end(JSON.stringify(s, null, 2));
    }

    // Ping
    if (req.method === 'GET' && url === '/ping') {
        return res.end(JSON.stringify({ agent: CFG.AGENT, alive: true, boot: state.boot }));
    }

    // Signal chain
    if (req.method === 'GET' && url === '/signal') {
        return res.end(JSON.stringify(chainStatus(), null, 2));
    }

    // KEITH proxy
    if (req.method === 'GET' && url === '/keith') {
        httpGet(`http://localhost:${CFG.KEITH_PORT}/status`)
            .then(d => res.end(JSON.stringify(d || { error: 'KEITH unreachable' }, null, 2)));
        return;
    }

    // Event ingest
    if (req.method === 'POST' && url === '/event') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            try {
                const d = JSON.parse(body);
                const ev = event(d.type || 'EXTERNAL', d);
                res.end(JSON.stringify({ ok: true, event: ev }));
            } catch (e) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // Force poll
    if (req.method === 'GET' && url === '/poll') {
        pollChain().then(() =>
            res.end(JSON.stringify({ ok: true, chain: state.chain, ts: state.lastPoll }))
        );
        return;
    }

    // Events log
    if (req.method === 'GET' && url === '/events') {
        return res.end(JSON.stringify(state.events, null, 2));
    }

    // Root — usage map
    res.statusCode = 404;
    res.end(JSON.stringify({
        agent:     CFG.AGENT,
        session:   CFG.SESSION,
        endpoints: [
            'GET  /health   → full chain status (200 = live, 503 = degraded)',
            'GET  /ping     → alive check',
            'GET  /signal   → chain state snapshot',
            'GET  /keith    → ENGR_KEITH status proxy',
            'GET  /poll     → force immediate chain poll',
            'GET  /events   → last 50 events',
            'POST /event    → ingest external event {type, ...data}',
            'WS   /live     → real-time WebSocket feed',
        ]
    }, null, 2));
});

// WebSocket upgrade
server.on('upgrade', (req, socket) => {
    if (req.url === '/live') upgradeToWs(req, socket);
    else socket.destroy();
});

// ── GRACEFUL SHUTDOWN ─────────────────────────────────────────
function shutdown(sig) {
    log(`${sig} — shutting down`);
    event('DAEMON_STOP', { signal: sig });
    server.close(() => { log('Server closed'); process.exit(0); });
    setTimeout(() => process.exit(1), 3000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── BOOT ──────────────────────────────────────────────────────
server.listen(CFG.PORT, '0.0.0.0', () => {
    log(`NOIZYNET DAEMON ONLINE — port ${CFG.PORT}`);
    log(`Session: ${CFG.SESSION}`);
    log(`Polling chain every ${CFG.POLL_MS}ms`);
    log('Endpoints: /health /ping /signal /keith /poll /events /live');
    event('DAEMON_START', { port: CFG.PORT, session: CFG.SESSION });
    advertiseBonjour();
    // Initial poll immediately, then on interval
    pollChain();
    setInterval(pollChain, CFG.POLL_MS);
});
