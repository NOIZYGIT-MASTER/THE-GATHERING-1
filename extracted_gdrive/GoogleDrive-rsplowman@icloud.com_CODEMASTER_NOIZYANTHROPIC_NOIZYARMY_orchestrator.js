#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NOIZYARMY — Master Orchestrator                            ║
 * ║  Connects Discord + Swarm + Dashboard + Tools               ║
 * ║  RSP_001 | NOIZY Empire | 2026                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * The brain of the army. Runs as a daemon and coordinates:
 *  - Discord bot for human interface
 *  - Swarm engine for AI agents
 *  - Dashboard server for visualization
 *  - Health monitoring for all services
 *  - Auto-healing for downed services
 *  - Scheduled builds and deploys
 *  - Event bus for real-time coordination
 *
 * Port: 9333
 *
 * Usage:
 *   node orchestrator.js              # Start orchestrator
 *   node orchestrator.js --daemon     # Run as background daemon
 */

import express from "express";
import { WebSocketServer } from "ws";
import { exec, spawn, fork } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || "/Users/m2ultra";
const NOIZYLAB = `${HOME}/NOIZYLAB`;
const PORT = parseInt(process.env.ARMY_PORT || "9333");

// ── Load env ────────────────────────────────────────────────
for (const f of [`${__dirname}/.env`, `${NOIZYLAB}/.env`]) {
  if (fs.existsSync(f)) {
    fs.readFileSync(f, "utf8")
      .split("\n")
      .forEach((line) => {
        const [k, ...v] = line.split("=");
        if (k && !k.startsWith("#")) process.env[k.trim()] = v.join("=").trim();
      });
  }
}

// ── State ───────────────────────────────────────────────────
const state = {
  bootTime: new Date().toISOString(),
  services: {},
  swarmJobs: [],
  events: [],
  childProcesses: {},
  healthHistory: [],
};

const MAX_EVENTS = 500;
const MAX_HISTORY = 200;

function emit(type, data) {
  const event = { type, data, ts: new Date().toISOString() };
  state.events.push(event);
  if (state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);

  // Broadcast to WebSocket clients
  wss?.clients?.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(event));
    }
  });
}

// ── Service Health Monitor ──────────────────────────────────
async function checkService(name, url, timeout = 4000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const status = res.ok ? "LIVE" : `HTTP_${res.status}`;
    state.services[name] = { status, url, lastCheck: new Date().toISOString(), ok: res.ok };
    return res.ok;
  } catch {
    state.services[name] = { status: "DOWN", url, lastCheck: new Date().toISOString(), ok: false };
    return false;
  }
}

async function fullHealthCheck() {
  await Promise.all([
    checkService("heaven", "https://heaven.rsp-5f3.workers.dev/health"),
    checkService("dreamchamber", "http://localhost:7777/health"),
    checkService("ollama", "http://localhost:11434/api/tags"),
    checkService("voice-bridge", "http://localhost:8080/health"),
    checkService("heaven17", "http://localhost:17017/health"),
    checkService("gabriel-daemon", "http://localhost:9777/health"),
    checkService("n8n", "http://localhost:5678/healthz"),
  ]);

  const snapshot = {
    ts: new Date().toISOString(),
    services: { ...state.services },
    allHealthy: Object.values(state.services).every((s) => s.ok),
  };
  state.healthHistory.push(snapshot);
  if (state.healthHistory.length > MAX_HISTORY)
    state.healthHistory = state.healthHistory.slice(-MAX_HISTORY);

  emit("health-check", snapshot);
  return snapshot;
}

// ── Auto-Healer ─────────────────────────────────────────────
async function autoHeal() {
  const healed = [];

  // Heal Ollama
  if (!state.services.ollama?.ok) {
    try {
      exec("ollama serve &");
      healed.push("ollama (started)");
    } catch {}
  }

  // Heal DreamChamber
  if (!state.services.dreamchamber?.ok) {
    try {
      const pid = await execAsync(`pgrep -f "dreamchamber.*server" 2>/dev/null`).catch(() => null);
      if (!pid?.stdout?.trim()) {
        exec(`cd ${NOIZYLAB}/dreamchamber && npm start &`);
        healed.push("dreamchamber (started)");
      }
    } catch {}
  }

  // Heal Gabriel daemon
  if (!state.services["gabriel-daemon"]?.ok) {
    try {
      const pid = await execAsync(`pgrep -f "gabriel-daemon" 2>/dev/null`).catch(() => null);
      if (!pid?.stdout?.trim()) {
        exec(`GABRIEL_PORT=9777 node ${NOIZYLAB}/GABRIEL/daemon/gabriel-daemon.js &`);
        healed.push("gabriel-daemon (started)");
      }
    } catch {}
  }

  if (healed.length > 0) {
    emit("auto-heal", { healed });
  }
  return healed;
}

// ── Swarm Dispatch ──────────────────────────────────────────
async function dispatchSwarm(task, options = {}) {
  const jobId = `swarm-${Date.now()}`;
  const job = {
    id: jobId,
    task,
    status: "running",
    startedAt: new Date().toISOString(),
    result: null,
  };
  state.swarmJobs.push(job);
  emit("swarm-dispatch", { jobId, task });

  try {
    const { stdout } = await execAsync(
      `node ${__dirname}/swarm-engine.js --task="${task.replace(/"/g, '\\"')}" --json`,
      // 15 min timeout — gemma4:31b cold-load on 6 parallel Bees can take 3+ min on M2 Ultra
      { timeout: 900000, cwd: __dirname, maxBuffer: 10 * 1024 * 1024 },
    );
    job.result = JSON.parse(stdout);
    job.status = "complete";
    job.completedAt = new Date().toISOString();
    emit("swarm-complete", { jobId, result: job.result });
  } catch (e) {
    job.status = "failed";
    job.error = e.message;
    emit("swarm-failed", { jobId, error: e.message });
  }

  return job;
}

// ── Express API ─────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Health
app.get("/health", (req, res) => {
  res.json({
    server: "NOIZYARMY Orchestrator",
    version: "1.0.0",
    status: "ONLINE",
    uptime: process.uptime(),
    bootTime: state.bootTime,
    services: state.services,
    swarmJobs: state.swarmJobs.length,
    events: state.events.length,
  });
});

// Full status
app.get("/status", async (req, res) => {
  const health = await fullHealthCheck();
  res.json({
    orchestrator: "NOIZYARMY",
    ...health,
    swarm: {
      totalJobs: state.swarmJobs.length,
      running: state.swarmJobs.filter((j) => j.status === "running").length,
      completed: state.swarmJobs.filter((j) => j.status === "complete").length,
    },
    recentEvents: state.events.slice(-20),
  });
});

// Services health
app.get("/services", async (req, res) => {
  await fullHealthCheck();
  res.json(state.services);
});

// Dispatch swarm
app.post("/swarm", async (req, res) => {
  const { task } = req.body;
  if (!task) return res.status(400).json({ error: "task required" });
  const job = await dispatchSwarm(task);
  res.json(job);
});

// Get swarm jobs
app.get("/swarm/jobs", (req, res) => {
  res.json(state.swarmJobs.slice(-50));
});

// Auto heal
app.post("/heal", async (req, res) => {
  const healed = await autoHeal();
  // Re-check after healing
  await new Promise((r) => setTimeout(r, 3000));
  await fullHealthCheck();
  res.json({ healed, services: state.services });
});

// Events stream (SSE)
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Send recent events
  state.events.slice(-10).forEach(sendEvent);

  // Listen for new events
  const interval = setInterval(() => {
    sendEvent({ type: "heartbeat", ts: new Date().toISOString() });
  }, 30000);

  req.on("close", () => clearInterval(interval));
});

// Deploy
app.post("/deploy/:service", async (req, res) => {
  const { service } = req.params;
  emit("deploy-start", { service });

  try {
    let cmd;
    switch (service) {
      case "heaven":
        cmd = `cd ${NOIZYLAB} && npx wrangler deploy --env="" 2>&1 | tail -20`;
        break;
      case "landing":
        cmd = `cd ${NOIZYLAB}/noizy-landing && npx wrangler deploy 2>&1 | tail -20`;
        break;
      default:
        return res.status(400).json({ error: `Unknown service: ${service}` });
    }
    const { stdout } = await execAsync(cmd, { timeout: 60000 });
    emit("deploy-complete", { service, output: stdout });
    res.json({ service, status: "deployed", output: stdout });
  } catch (e) {
    emit("deploy-failed", { service, error: e.message });
    res.status(500).json({ service, status: "failed", error: e.message });
  }
});

// Smoke tests
app.post("/smoke", async (req, res) => {
  emit("smoke-start", {});
  try {
    const { stdout } = await execAsync(`cd ${NOIZYLAB} && bash smoke_test.sh 2>&1 | tail -30`, {
      timeout: 60000,
    });
    emit("smoke-complete", { output: stdout });
    res.json({ status: "complete", output: stdout });
  } catch (e) {
    emit("smoke-failed", { error: e.message });
    res.status(500).json({ status: "failed", error: e.message });
  }
});

// Gemma query
app.post("/gemma", async (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  try {
    const r = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "gemma3",
        prompt,
        stream: false,
        options: { num_predict: 300 },
      }),
    });
    const data = await r.json();
    res.json({ response: data.response, model: model || "gemma3" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Observer
app.get("/observer", async (req, res) => {
  try {
    const { stdout } = await execAsync(`node ${NOIZYLAB}/tools/observer.mjs 2>&1`, {
      timeout: 15000,
    });
    const digestPath = `${NOIZYLAB}/tools/observer-digest.json`;
    if (fs.existsSync(digestPath)) {
      res.json(JSON.parse(fs.readFileSync(digestPath, "utf8")));
    } else {
      res.json({ output: stdout });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Empire agents
app.get("/agents", (req, res) => {
  res.json({
    agents: [
      {
        id: "gabriel",
        name: "GABRIEL",
        role: "System Bridge & Orchestrator",
        model: "Claude Opus 4",
        status: "active",
      },
      {
        id: "shirl",
        name: "SHIRL",
        role: "Business Ops & Family Care",
        model: "Claude Sonnet",
        status: "active",
      },
      {
        id: "pops",
        name: "POPS",
        role: "Creative Direction",
        model: "Claude Sonnet",
        status: "active",
      },
      {
        id: "engr_keith",
        name: "ENGR_KEITH",
        role: "Technical Engineering",
        model: "Claude Sonnet",
        status: "active",
      },
      {
        id: "dream",
        name: "DREAM",
        role: "Visionary Planning",
        model: "Claude Sonnet",
        status: "active",
      },
      {
        id: "cb01",
        name: "CB01",
        role: "DNS & Infrastructure",
        model: "Claude Sonnet",
        status: "active",
      },
      {
        id: "shirley",
        name: "SHIRLEY",
        role: "Code & File Manager",
        model: "Gemma3 27B",
        status: "active",
      },
      {
        id: "consent_auditor",
        name: "CONSENT_AUDITOR",
        role: "Never Clause Enforcement",
        model: "Claude Opus",
        status: "active",
      },
      {
        id: "voice_specialist",
        name: "VOICE_SPECIALIST",
        role: "TTS/Audio Pipeline",
        model: "MLX Whisper",
        status: "standby",
      },
      {
        id: "test_runner",
        name: "TEST_RUNNER",
        role: "Smoke Tests & CI",
        model: "Local",
        status: "active",
      },
    ],
    swarmBees: ["architect", "debugger", "tester", "documenter", "security", "optimizer"],
  });
});

// Health history
app.get("/health/history", (req, res) => {
  res.json(state.healthHistory.slice(-50));
});

// ── WebSocket ───────────────────────────────────────────────
let wss;

// ── Start ───────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ⚔️  NOIZYARMY ORCHESTRATOR — ONLINE                        ║
╠══════════════════════════════════════════════════════════════╣
║  Port:     ${String(PORT).padEnd(48)}║
║  API:      http://localhost:${PORT}/health${" ".repeat(26)}║
║  Events:   http://localhost:${PORT}/events (SSE)${" ".repeat(20)}║
║  WebSocket: ws://localhost:${PORT}${" ".repeat(31)}║
╠══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║    GET  /health         — Orchestrator health                ║
║    GET  /status         — Full empire status                 ║
║    GET  /services       — All service health                 ║
║    POST /swarm          — Dispatch AI swarm                  ║
║    GET  /swarm/jobs     — List swarm jobs                    ║
║    POST /heal           — Auto-heal services                 ║
║    POST /deploy/:svc    — Deploy a service                   ║
║    POST /smoke          — Run smoke tests                    ║
║    POST /gemma          — Query local Gemma                  ║
║    GET  /observer       — Run observer digest                ║
║    GET  /agents         — Agent roster                       ║
║    GET  /events         — SSE event stream                   ║
╚══════════════════════════════════════════════════════════════╝
`);

  emit("orchestrator-boot", { port: PORT, pid: process.pid });
});

// WebSocket server
wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  ws.send(
    JSON.stringify({ type: "connected", ts: new Date().toISOString(), services: state.services }),
  );
  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === "swarm") {
        const job = await dispatchSwarm(data.task);
        ws.send(JSON.stringify({ type: "swarm-result", job }));
      } else if (data.type === "health") {
        const health = await fullHealthCheck();
        ws.send(JSON.stringify({ type: "health-result", ...health }));
      } else if (data.type === "heal") {
        const healed = await autoHeal();
        ws.send(JSON.stringify({ type: "heal-result", healed }));
      }
    } catch {}
  });
});

// ── Scheduled Health Checks ─────────────────────────────────
// Check every 2 minutes
setInterval(async () => {
  await fullHealthCheck();
  const down = Object.entries(state.services)
    .filter(([_, s]) => !s.ok)
    .map(([k]) => k);
  if (down.length > 0) {
    emit("services-down", { services: down });
    // Auto-heal attempt
    await autoHeal();
  }
}, 120000);

// Initial health check
setTimeout(() => fullHealthCheck(), 2000);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n⚔️  NOIZYARMY Orchestrator shutting down...");
  emit("orchestrator-shutdown", {});
  server.close();
  process.exit(0);
});
