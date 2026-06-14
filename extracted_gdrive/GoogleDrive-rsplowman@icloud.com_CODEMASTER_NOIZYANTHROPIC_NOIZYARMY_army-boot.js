#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NOIZYARMY — Full Boot Sequence                             ║
 * ║  One command to rule them all                               ║
 * ║  RSP_001 | NOIZY Empire | 2026                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Boots the entire NOIZYARMY stack:
 *   1. Orchestrator (port 9333) — brain
 *   2. Dashboard (port 9334) — eyes
 *   3. Discord Bot — ears & mouth
 *   4. Services heal — heartbeat
 *   5. Initial swarm — warmup
 */

import { spawn, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME || "/Users/m2ultra";
const NOIZYLAB = `${HOME}/NOIZYLAB`;

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

const C = {
  r: "\x1b[0m",
  b: "\x1b[1m",
  g: "\x1b[32m",
  y: "\x1b[33m",
  c: "\x1b[36m",
  m: "\x1b[35m",
  red: "\x1b[31m",
};

function banner() {
  console.log(`
${C.b}${C.m}
    ███╗   ██╗ ██████╗ ██╗███████╗██╗   ██╗ █████╗ ██████╗ ███╗   ███╗██╗   ██╗
    ████╗  ██║██╔═══██╗██║╚══███╔╝╚██╗ ██╔╝██╔══██╗██╔══██╗████╗ ████║╚██╗ ██╔╝
    ██╔██╗ ██║██║   ██║██║  ███╔╝  ╚████╔╝ ███████║██████╔╝██╔████╔██║ ╚████╔╝
    ██║╚██╗██║██║   ██║██║ ███╔╝    ╚██╔╝  ██╔══██║██╔══██╗██║╚██╔╝██║  ╚██╔╝
    ██║ ╚████║╚██████╔╝██║███████╗   ██║   ██║  ██║██║  ██║██║ ╚═╝ ██║   ██║
    ╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝
${C.r}
${C.b}    Building at 100%. Always. Forever.${C.r}
${C.b}    RSP_001 | NOIZY Empire | ${new Date().toISOString().split("T")[0]}${C.r}
`);
}

async function httpCheck(url, timeout = 3000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

function spawnDaemon(name, script, env = {}) {
  const logDir = `${__dirname}/logs`;
  fs.mkdirSync(logDir, { recursive: true });

  const child = spawn("node", [script], {
    cwd: __dirname,
    env: { ...process.env, ...env },
    stdio: [
      "ignore",
      fs.openSync(`${logDir}/${name}.log`, "a"),
      fs.openSync(`${logDir}/${name}.err`, "a"),
    ],
    detached: true,
  });
  child.unref();
  return child.pid;
}

async function boot() {
  banner();

  const steps = [
    // Step 1: Orchestrator
    async () => {
      process.stdout.write(`  ${C.c}[1/5]${C.r} Orchestrator (port 9333)... `);
      const running = await httpCheck("http://localhost:9333/health");
      if (running) {
        console.log(`${C.g}already running ✓${C.r}`);
        return;
      }
      const pid = spawnDaemon("orchestrator", `${__dirname}/orchestrator.js`);
      await new Promise((r) => setTimeout(r, 2000));
      const ok = await httpCheck("http://localhost:9333/health");
      console.log(
        ok ? `${C.g}ONLINE (pid ${pid}) ✓${C.r}` : `${C.y}starting (pid ${pid})...${C.r}`,
      );
    },

    // Step 2: Dashboard
    async () => {
      process.stdout.write(`  ${C.c}[2/5]${C.r} Dashboard (port 9334)... `);
      const running = await httpCheck("http://localhost:9334/health");
      if (running) {
        console.log(`${C.g}already running ✓${C.r}`);
        return;
      }
      const pid = spawnDaemon("dashboard", `${__dirname}/dashboard-server.js`);
      await new Promise((r) => setTimeout(r, 1500));
      console.log(`${C.g}ONLINE (pid ${pid}) ✓${C.r}`);
    },

    // Step 3: Discord Bot
    async () => {
      process.stdout.write(`  ${C.c}[3/5]${C.r} Discord Bot... `);
      if (!process.env.DISCORD_BOT_TOKEN) {
        // Check .env file
        const envPath = `${__dirname}/.env`;
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf8");
          if (content.includes("DISCORD_BOT_TOKEN=")) {
            const pid = spawnDaemon("discord-bot", `${__dirname}/discord-bot.js`);
            console.log(`${C.g}ONLINE (pid ${pid}) ✓${C.r}`);
            return;
          }
        }
        console.log(`${C.y}no token — set DISCORD_BOT_TOKEN in .env${C.r}`);
        return;
      }
      const pid = spawnDaemon("discord-bot", `${__dirname}/discord-bot.js`);
      console.log(`${C.g}ONLINE (pid ${pid}) ✓${C.r}`);
    },

    // Step 4: Service health
    async () => {
      process.stdout.write(`  ${C.c}[4/5]${C.r} Service health check... `);
      const services = [
        { name: "Heaven", url: "https://heaven.rsp-5f3.workers.dev/health" },
        { name: "Ollama", url: "http://localhost:11434/api/tags" },
        { name: "DreamChamber", url: "http://localhost:7777/health" },
      ];
      const results = await Promise.all(
        services.map(async (s) => ({ ...s, ok: await httpCheck(s.url) })),
      );
      const live = results.filter((r) => r.ok).length;
      const down = results.filter((r) => !r.ok).map((r) => r.name);
      if (live === services.length) {
        console.log(`${C.g}${live}/${services.length} ✓${C.r}`);
      } else {
        console.log(`${C.y}${live}/${services.length} (down: ${down.join(", ")})${C.r}`);
      }
    },

    // Step 5: Ready
    async () => {
      console.log(`  ${C.c}[5/5]${C.r} ${C.g}${C.b}NOIZYARMY IS LIVE ⚔️${C.r}`);
    },
  ];

  for (const step of steps) {
    await step();
  }

  console.log(`
${C.m}${"═".repeat(60)}${C.r}
${C.b}  Access Points:${C.r}
    🌐 Dashboard:    http://localhost:9334/dashboard
    📱 iPad:         http://10.90.90.10:9334/dashboard
    🔌 API:          http://localhost:9333/health
    📡 Events:       http://localhost:9333/events
    🐝 Swarm:        POST http://localhost:9333/swarm

${C.b}  CLI:${C.r}
    node NOIZYARMY/cli.js status
    node NOIZYARMY/cli.js swarm "your task"
    node NOIZYARMY/cli.js deploy heaven
    node NOIZYARMY/cli.js heal
${C.m}${"═".repeat(60)}${C.r}
${C.b}  ⚔️  Building at 100%. Always. Forever.${C.r}
`);
}

boot().catch((e) => {
  console.error(`${C.red}FATAL: ${e.message}${C.r}`);
  process.exit(1);
});
