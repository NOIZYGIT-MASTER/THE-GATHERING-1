#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NOIZYARMY — CLI                                            ║
 * ║  One-command everything for the NOIZY Empire                ║
 * ║  RSP_001 | NOIZY Empire | 2026                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   army status          — Full empire health check
 *   army deploy heaven   — Deploy Heaven Worker
 *   army build all       — Build everything
 *   army heal            — Auto-fix broken services
 *   army swarm "task"    — Dispatch AI agent swarm
 *   army smoke           — Run smoke tests
 *   army agents          — List agent roster
 *   army gemma "prompt"  — Query local Gemma
 *   army observer        — Run observer digest
 *   army diagnostic      — Run MC96 diagnostic
 *   army dashboard       — Start dashboard
 *   army boot            — Boot the full army
 *   army git             — Git status all repos
 */

import { execSync, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || "/Users/m2ultra";
const NOIZYLAB = `${HOME}/NOIZYLAB`;

// ── ANSI ────────────────────────────────────────────────────
const C = {
  r: "\x1b[0m",
  b: "\x1b[1m",
  g: "\x1b[32m",
  y: "\x1b[33m",
  c: "\x1b[36m",
  m: "\x1b[35m",
  red: "\x1b[31m",
  dim: "\x1b[90m",
  bg: "\x1b[48;5;53m",
};

const [, , cmd, ...rest] = process.argv;
const arg = rest.join(" ");

// ── Helpers ─────────────────────────────────────────────────
async function shell(command, timeout = 30000) {
  try {
    const { stdout } = await execAsync(command, { timeout, cwd: NOIZYLAB });
    return stdout.trim();
  } catch (e) {
    return e.stdout?.trim() || e.message;
  }
}

async function httpCheck(url, timeout = 4000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

function header(title) {
  console.log(`\n${C.b}${C.m}${"═".repeat(60)}${C.r}`);
  console.log(`${C.b}${C.m}  ⚔️  ${title}${C.r}`);
  console.log(`${C.m}${"═".repeat(60)}${C.r}\n`);
}

function line(icon, label, value) {
  console.log(`  ${icon} ${C.b}${label.padEnd(20)}${C.r} ${value}`);
}

// ── Commands ────────────────────────────────────────────────

async function cmdStatus() {
  header("NOIZYARMY — Empire Status");

  const checks = [
    { name: "Heaven API", url: "https://heaven.rsp-5f3.workers.dev/health" },
    { name: "DreamChamber", url: "http://localhost:7777/health" },
    { name: "Ollama", url: "http://localhost:11434/api/tags" },
    { name: "Voice Bridge", url: "http://localhost:8080/health" },
    { name: "Gabriel Daemon", url: "http://localhost:9777/health" },
    { name: "Heaven17", url: "http://localhost:17017/health" },
    { name: "n8n", url: "http://localhost:5678/healthz" },
    { name: "Orchestrator", url: "http://localhost:9333/health" },
  ];

  const results = await Promise.all(
    checks.map(async (c) => {
      const r = await httpCheck(c.url);
      return { ...c, ...r };
    }),
  );

  for (const r of results) {
    line(r.ok ? "🟢" : "🔴", r.name, r.ok ? `LIVE (${r.status})` : "DOWN");
  }

  // Disk
  const disk = await shell('df -h / | tail -1 | awk \'{print $4 " free (" $5 " used)"}\'');
  line("💾", "Disk", disk || "?");

  // Ollama models
  const models = await shell(
    "ollama list 2>/dev/null | tail -n +2 | awk '{print $1}' | head -5 | tr '\\n' ', '",
  );
  if (models) line("🧠", "Models", models);

  // Git
  const branch = await shell("git branch --show-current");
  const changes = await shell('git status --short | wc -l | tr -d " "');
  line("📦", "Git", `${branch || "?"} (${changes || 0} changes)`);

  // Uptime
  const uptime = await shell("uptime | sed 's/.*up //' | sed 's/,.*//'");
  line("⏰", "Uptime", uptime || "?");

  const live = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n${C.m}${"─".repeat(60)}${C.r}`);
  console.log(`  ${live === total ? C.g : C.y}${C.b}${live}/${total} services online${C.r}`);
  console.log(`${C.m}${"═".repeat(60)}${C.r}\n`);
}

async function cmdDeploy() {
  const service = arg || "heaven";
  header(`Deploy: ${service}`);

  switch (service) {
    case "heaven":
      console.log("  🚀 Deploying Heaven Worker...\n");
      const result = await shell('npx wrangler deploy --env="" 2>&1', 60000);
      console.log(result);
      break;
    case "landing":
      console.log("  🚀 Deploying Landing Page...\n");
      const lr = await shell("cd noizy-landing && npx wrangler deploy 2>&1", 60000);
      console.log(lr);
      break;
    case "all":
      console.log("  🚀 Deploying ALL services...\n");
      const ar = await shell('npx wrangler deploy --env="" 2>&1', 60000);
      console.log(ar);
      break;
    default:
      console.log(`  Unknown service: ${service}`);
      console.log("  Available: heaven, landing, all");
  }
}

async function cmdHeal() {
  header("Auto-Heal");

  const healed = [];

  // Check and heal Ollama
  const ollama = await httpCheck("http://localhost:11434/api/tags");
  if (!ollama.ok) {
    console.log("  ❤️‍🩹 Starting Ollama...");
    exec("ollama serve &");
    healed.push("ollama");
  } else {
    console.log("  ✅ Ollama healthy");
  }

  // Check and heal DreamChamber
  const dc = await httpCheck("http://localhost:7777/health");
  if (!dc.ok) {
    console.log("  ❤️‍🩹 Starting DreamChamber...");
    exec(`cd ${NOIZYLAB}/dreamchamber && npm start &`);
    healed.push("dreamchamber");
  } else {
    console.log("  ✅ DreamChamber healthy");
  }

  // Check and heal Gabriel
  const gabriel = await httpCheck("http://localhost:9777/health");
  if (!gabriel.ok) {
    console.log("  ❤️‍🩹 Starting Gabriel Daemon...");
    exec(`GABRIEL_PORT=9777 node ${NOIZYLAB}/GABRIEL/daemon/gabriel-daemon.js &`);
    healed.push("gabriel-daemon");
  } else {
    console.log("  ✅ Gabriel Daemon healthy");
  }

  // Check Voice Bridge
  const vb = await httpCheck("http://localhost:8080/health");
  if (!vb.ok) {
    console.log("  ❤️‍🩹 Starting Voice Bridge...");
    exec(`cd ${NOIZYLAB} && node voice-bridge-server.js &`);
    healed.push("voice-bridge");
  } else {
    console.log("  ✅ Voice Bridge healthy");
  }

  console.log(
    `\n  ${healed.length > 0 ? `Healed: ${healed.join(", ")}` : "All services healthy ✨"}`,
  );
}

async function cmdSwarm() {
  if (!arg) {
    console.log('Usage: army swarm "your task description"');
    return;
  }
  header("Swarm Dispatch");

  // Try orchestrator first
  const orch = await httpCheck("http://localhost:9333/health");
  if (orch.ok) {
    try {
      const res = await fetch("http://localhost:9333/swarm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: arg }),
      });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
      return;
    } catch {}
  }

  // Fallback to direct swarm engine
  const result = await shell(
    `node ${__dirname}/swarm-engine.js --task="${arg.replace(/"/g, '\\"')}" 2>&1`,
    120000,
  );
  console.log(result);
}

async function cmdSmoke() {
  header("Smoke Tests");
  const result = await shell("bash smoke_test.sh 2>&1", 60000);
  console.log(result);
}

async function cmdAgents() {
  header("NOIZYARMY Agent Roster");
  const agents = [
    ["🏛️", "GABRIEL", "System Bridge & Orchestrator", "Claude Opus 4"],
    ["💼", "SHIRL", "Business Ops & Family Care", "Claude Sonnet"],
    ["🎨", "POPS", "Creative Direction", "Claude Sonnet"],
    ["⚙️", "ENGR_KEITH", "Technical Engineering", "Claude Sonnet"],
    ["💭", "DREAM", "Visionary Planning", "Claude Sonnet"],
    ["🌐", "CB01", "DNS & Infrastructure", "Claude Sonnet"],
    ["👩‍💻", "SHIRLEY", "Code & File Manager", "Gemma3 27B (Local)"],
    ["🛡️", "CONSENT_AUDITOR", "Never Clause Enforcement", "Claude Opus"],
    ["🗣️", "VOICE_SPECIALIST", "TTS/Audio Pipeline", "MLX Whisper"],
    ["🧪", "TEST_RUNNER", "Smoke Tests & CI", "Local"],
  ];
  console.log("  AGENT               ROLE                          MODEL");
  console.log(`  ${"─".repeat(55)}`);
  for (const [icon, name, role, model] of agents) {
    console.log(
      `  ${icon} ${C.b}${name.padEnd(18)}${C.r} ${role.padEnd(30)} ${C.dim}${model}${C.r}`,
    );
  }

  console.log(`\n  ${C.b}Swarm Bees:${C.r}`);
  console.log("  🏗️  ARCHITECT  🔍 DEBUGGER  🧪 TESTER  📝 DOCUMENTER  🛡️ SECURITY  ⚡ OPTIMIZER");
}

async function cmdGemma() {
  if (!arg) {
    console.log('Usage: army gemma "your question"');
    return;
  }
  header("Gemma Query");
  console.log(`  ${C.dim}Prompt: ${arg}${C.r}\n`);

  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3",
        prompt: `You are GABRIEL, warrior executor of the NOIZY Empire. Be concise and direct.\n\n${arg}`,
        stream: false,
        options: { num_predict: 400 },
      }),
    });
    const data = await res.json();
    console.log(data.response || "[No response]");
  } catch {
    console.log("  ❌ Ollama not reachable. Start with: ollama serve");
  }
}

async function cmdObserver() {
  header("Observer Digest");
  const result = await shell(`node ${NOIZYLAB}/tools/observer.mjs 2>&1`, 15000);
  console.log(result);
}

async function cmdDiagnostic() {
  header("MC96 Diagnostic");
  const result = await shell(
    `node ${HOME}/MC96/app/opus-4.6-diagnostic-engine.js --quick 2>&1`,
    30000,
  );
  console.log(result);
}

async function cmdDashboard() {
  header("Starting Dashboard");
  console.log("  Starting dashboard server on port 9333...");
  exec(`node ${__dirname}/dashboard-server.js`, { cwd: __dirname });
  console.log(`  🌐 Dashboard: http://localhost:9333/dashboard`);
  console.log(`  📱 iPad: http://10.90.90.10:9333/dashboard`);
}

async function cmdBoot() {
  header("NOIZYARMY — FULL BOOT");

  console.log("  [1/4] Starting Orchestrator...");
  exec(`node ${__dirname}/orchestrator.js &`, { cwd: __dirname });
  await new Promise((r) => setTimeout(r, 2000));

  console.log("  [2/4] Auto-healing services...");
  await cmdHeal();

  console.log("\n  [3/4] Checking Discord bot...");
  if (process.env.DISCORD_BOT_TOKEN || fs.existsSync(`${__dirname}/.env`)) {
    exec(`node ${__dirname}/discord-bot.js &`, { cwd: __dirname });
    console.log("  ✅ Discord bot starting...");
  } else {
    console.log("  ⚠️  No DISCORD_BOT_TOKEN — skipping Discord bot");
    console.log(`     Set up: ${__dirname}/.env`);
  }

  console.log("  [4/4] Running initial health check...");
  await new Promise((r) => setTimeout(r, 2000));
  await cmdStatus();

  console.log(`\n${C.b}${C.g}  ⚔️  NOIZYARMY IS LIVE — Building at 100%. Always. Forever.${C.r}\n`);
}

async function cmdGit() {
  header("Git Status");
  const repos = [
    { name: "NOIZYLAB", path: NOIZYLAB },
    { name: "MC96", path: `${HOME}/MC96` },
  ];
  for (const r of repos) {
    if (!fs.existsSync(r.path)) continue;
    console.log(`  ${C.b}${r.name}${C.r}`);
    const branch = await shell(`cd ${r.path} && git branch --show-current 2>/dev/null`);
    const status = await shell(`cd ${r.path} && git status --short 2>/dev/null | head -10`);
    const log = await shell(`cd ${r.path} && git log --oneline -3 2>/dev/null`);
    console.log(`  Branch: ${branch || "?"}`);
    console.log(`  Status: ${status || "clean ✅"}`);
    console.log(`  Recent: ${log || "N/A"}\n`);
  }
}

async function cmdBuildAll() {
  header("Build All");
  console.log("  [1] DreamChamber...");
  const dc = await shell("cd dreamchamber && npm run build 2>&1 | tail -5", 60000);
  console.log(`  ${dc || "done"}\n`);

  console.log("  [2] Heaven...");
  const heaven = await shell("npx wrangler deploy --dry-run 2>&1 | tail -5", 30000);
  console.log(`  ${heaven || "done"}\n`);

  console.log("  ✅ Build complete");
}

// ── Help ────────────────────────────────────────────────────
function showHelp() {
  console.log(`
${C.b}${C.m}⚔️  NOIZYARMY CLI${C.r} — One-command everything

${C.b}Commands:${C.r}
  ${C.c}status${C.r}              Full empire health check
  ${C.c}deploy${C.r} [service]    Deploy (heaven|landing|all)
  ${C.c}build-all${C.r}           Build everything
  ${C.c}heal${C.r}                Auto-fix broken services
  ${C.c}swarm${C.r} "task"        Dispatch AI agent swarm
  ${C.c}smoke${C.r}               Run smoke tests
  ${C.c}agents${C.r}              List agent roster
  ${C.c}gemma${C.r} "prompt"      Query local Gemma AI
  ${C.c}observer${C.r}            Run observer digest
  ${C.c}diagnostic${C.r}          Run MC96 diagnostic
  ${C.c}dashboard${C.r}           Start dashboard server
  ${C.c}boot${C.r}                Boot the full army
  ${C.c}git${C.r}                 Git status all repos
  ${C.c}help${C.r}                Show this help

${C.b}Examples:${C.r}
  army status
  army swarm "Fix all broken imports in src/"
  army deploy heaven
  army gemma "What is the consent kernel?"
  army boot
`);
}

// ── Main ────────────────────────────────────────────────────
const commands = {
  status: cmdStatus,
  deploy: cmdDeploy,
  "build-all": cmdBuildAll,
  build: cmdBuildAll,
  heal: cmdHeal,
  swarm: cmdSwarm,
  smoke: cmdSmoke,
  agents: cmdAgents,
  gemma: cmdGemma,
  observer: cmdObserver,
  diagnostic: cmdDiagnostic,
  dashboard: cmdDashboard,
  boot: cmdBoot,
  git: cmdGit,
  help: showHelp,
};

const handler = commands[cmd];
if (handler) {
  handler().catch((e) => console.error(`${C.red}Error: ${e.message}${C.r}`));
} else {
  showHelp();
}
