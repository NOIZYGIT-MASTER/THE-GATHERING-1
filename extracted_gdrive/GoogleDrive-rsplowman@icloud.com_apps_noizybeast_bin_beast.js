#!/usr/bin/env node
/**
 * beast — NOIZYBEAST CLI
 * The command surface for the NOIZY Empire
 *
 * Usage: beast <command> [args]
 *
 * Commands:
 *   status               full empire status
 *   queue                urgent action queue
 *   empire               full empire snapshot from GABRIEL V3
 *   mission <objective>  dispatch mission to GABRIEL Opus + extended thinking
 *   crew <agent> <task>  dispatch task to specialist agent
 *   think <question>     extended thinking via claude-opus-4
 *   scaffold <type>      generate worker|schema|dashboard|portal
 *   build <target>       scaffold + wire a new module
 *   audit                consent gap detection
 *   deploy               deploy HEAVEN to Cloudflare
 *   morning              daily briefing
 *   learn <observation>  teach GABRIEL something
 *   registry             show project registry
 *
 * 2026-03-27 | RSP_001 | GORUNFREE
 */

import { execSync, execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = process.env.HOME;
const BEASTDIR = path.resolve(__dirname, ".."); // apps/noizybeast/
const BEAST = path.join(BEASTDIR, "beast.config.json");
const REGISTRY = path.join(BEASTDIR, "PROJECT_REGISTRY.json");
const PKG = path.join(BEASTDIR, "package.json");

// ── Endpoint resolution ────────────────────────────────────────
// Single source of truth: package.json `noizybeast.endpoints` (authored 2026-04-30
// during NOIZYBEAST realtime build). Falls back to canonical defaults if package.json
// is missing or malformed so the CLI still works during bootstrap.
const PKG_NB = (() => {
  try {
    return JSON.parse(fs.readFileSync(PKG, "utf8")).noizybeast || {};
  } catch {
    return {};
  }
})();
const E = PKG_NB.endpoints || {};
const GABRIEL = E.gabrielDaemon || "http://localhost:9777"; // V4 daemon, NOT :7777
const DREAMCHAMBER = E.dreamChamber || "http://localhost:7777";
const VOICEBRIDGE = E.voiceBridge || "http://localhost:8080";
const OLLAMA = E.ollama || "http://localhost:11434";
const HEAVEN_EDGE = E.heavenEdge || "https://heaven.rsp-5f3.workers.dev";

// ── Heaven repo path resolution ────────────────────────────────
// Prefer the in-repo canonical path. Fall back to legacy desktop location for
// older muscle-memory ("~/Desktop/HEAVEN/") only if the canonical path is
// missing. This keeps `beast deploy` working across both layouts during
// migration without the operator needing to edit code.
function heavenRepoPath() {
  const candidates = [
    path.resolve(BEASTDIR, "..", "..", "repos", "noizy-heaven"),
    `${HOME}/NOIZYANTHROPIC/repos/noizy-heaven`,
    `${HOME}/Desktop/HEAVEN`,
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "wrangler.toml"))) return c;
  }
  return candidates[0];
}

// ── Days-to-target math ────────────────────────────────────────
// Was hardcoded to "21 days to April 17, 2026" — that math went stale on 2026-04-18.
// Now reads target date from beast.config.json and computes live.
function daysToTarget() {
  const target = new Date((cfg?.targetDate || "2026-04-17") + "T00:00:00-04:00");
  const diff = target.getTime() - Date.now();
  return Math.ceil(diff / 86400000); // negative if past
}

function daysLine() {
  const d = daysToTarget();
  if (d > 0) return `${d} days to ${cfg.targetDate}`;
  if (d === 0) return `TARGET DAY: ${cfg.targetDate}`;
  return `${Math.abs(d)} days past ${cfg.targetDate} (post-deadline mode)`;
}

// ── Colors ───────────────────────────────────────────────────
const C = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  magenta: (s) => `\x1b[35m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const cfg = JSON.parse(fs.readFileSync(BEAST, "utf8"));
const reg = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));

async function gabrielGet(path) {
  const r = await fetch(`${GABRIEL}${path}`, { signal: AbortSignal.timeout(8000) });
  return r.json();
}

async function gabrielPost(path, body) {
  const r = await fetch(`${GABRIEL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  return r.json();
}

function header(title) {
  const line = "═".repeat(62);
  console.log(`\n${C.bold(C.magenta(line))}`);
  console.log(`${C.bold(C.magenta(`  NOIZYBEAST — ${title}`))}`);
  console.log(
    `${C.bold(C.magenta(`  ${new Date().toLocaleTimeString("en-CA")} | GOD.local | RSP_001`))}`,
  );
  console.log(`${C.bold(C.magenta(line))}\n`);
}

// ── Commands ─────────────────────────────────────────────────

// Native-fetch probe replaces the prior `curl` subprocess pattern. No shell, no
// command injection surface, and it's faster. AbortSignal.timeout(2000) caps
// each probe at 2s to keep `beast status` snappy when services are down.
async function probe(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

async function cmdStatus() {
  header("EMPIRE STATUS");
  const [health, status, dcUp, vbUp, olUp] = await Promise.all([
    gabrielGet("/health").catch(() => null),
    gabrielGet("/api/gabriel/status").catch(() => null),
    probe(`${DREAMCHAMBER}/health`),
    probe(`${VOICEBRIDGE}/health`),
    probe(`${OLLAMA}/api/tags`),
  ]);

  const svc = (name, ok) => `  ${ok ? C.green("✓") : C.red("✗")} ${name}`;
  const port = (url) => url.split(":").pop();

  // GABRIEL daemon (:9777) and DreamChamber (:7777) are SEPARATE services. The
  // earlier line "GABRIEL DreamChamber :7777" conflated them — daemon health
  // came back healthy but the label pointed at the wrong port. Split them.
  console.log(C.bold("SERVICES"));
  console.log(svc(`GABRIEL daemon          :${port(GABRIEL)}`, health?.status === "healthy"));
  console.log(svc(`DreamChamber UI         :${port(DREAMCHAMBER)}`, dcUp));
  console.log(svc("Heaven consent kernel   live", !!status?.context?.kernelOnline));
  console.log(svc(`Voice Bridge            :${port(VOICEBRIDGE)}`, vbUp));
  console.log(svc(`Ollama (Gemma3/Mistral) :${port(OLLAMA)}`, olUp));

  if (status) {
    console.log(`\n${C.bold("GABRIEL")}`);
    console.log(`  Model:     ${status.model}`);
    console.log(`  Learnings: ${C.green(status.learningCount)}`);
    console.log(`  Memcells:  ${C.green("333")}`);
    console.log(`  Uptime:    ${health?.uptime || 0}s`);
  }

  console.log(`\n${C.bold("PROPERTIES")}`);
  reg.properties.slice(0, 6).forEach((p) => {
    const dot =
      p.status === "LIVE" || p.status === "ACTIVE"
        ? C.green("●")
        : p.status === "BUILDING"
          ? C.yellow("◐")
          : C.dim("○");
    console.log(
      `  ${dot} ${p.name.padEnd(18)} ${C.dim(p.status)} ${C.dim(p.next?.substring(0, 40) || "")}`,
    );
  });

  // Live countdown — was previously hardcoded "DAYS TO APRIL 17: 21" which
  // went stale on 2026-04-18. daysLine() reads beast.config.json and goes
  // negative gracefully ("13 days past 2026-04-17 (post-deadline mode)").
  console.log(`\n${C.bold("COUNTDOWN:")} ${C.yellow(daysLine())}`);
}

async function cmdQueue() {
  header("URGENT QUEUE");
  try {
    const q = await gabrielGet("/api/gabriel/v3/queue");
    q.queue.forEach((item) => {
      const b = item.blocker ? C.red("🔴") : C.yellow("🟡");
      const t = `[${item.type}]`.padEnd(10);
      console.log(
        `  ${b} ${String(item.priority).padEnd(3)} ${C.dim(t)} ${item.action}  ${C.dim(item.est)}`,
      );
    });
    console.log(`\n  ${C.red(q.blockers + " blockers")} · ${q.total} total actions`);
  } catch {
    reg.urgentQueue.forEach((item) => {
      const b = item.blocker ? C.red("🔴") : C.yellow("🟡");
      console.log(`  ${b} [${item.p}] ${item.action}  ${C.dim(item.est)}`);
    });
  }
}

async function cmdEmpire() {
  header("FULL EMPIRE SNAPSHOT");
  try {
    const e = await gabrielGet("/api/gabriel/v3/empire");
    console.log(
      `GABRIEL:    ${e.gabriel.online ? C.green("ONLINE") : C.red("OFFLINE")} · ${e.gabriel.learnings} learnings`,
    );
    console.log(`Heaven:   ${e.gabriel.heaven ? C.green("CONNECTED") : C.red("OFFLINE")}`);
    console.log(`Days left:  ${C.yellow(e.daysRemaining)} to April 17`);
    console.log(`\nSERVICES:`);
    Object.entries(e.services).forEach(([k, v]) => {
      console.log(`  ${v === "LIVE" ? C.green("✓") : C.red("✗")} ${k}: ${v}`);
    });
  } catch (e) {
    console.log(C.red("GABRIEL V3 /empire not reachable — is DreamChamber running?"));
    console.log(C.dim("  Start: cd ~/NOIZYLAB/dreamchamber && node src/server.js"));
  }
}

async function cmdMission(args) {
  const objective = args.join(" ");
  if (!objective) {
    console.log(C.red("Usage: beast mission <objective>"));
    return;
  }
  header("MISSION DISPATCH → GABRIEL OPUS");
  console.log(C.dim(`Objective: ${objective}\n`));
  console.log(C.yellow("Dispatching to GABRIEL with extended thinking... (may take 30s)\n"));
  const r = await gabrielPost("/api/gabriel/v3/mission", { objective, priority: 8 });
  if (r.thinking) console.log(C.dim(`[THINKING]\n${r.thinking.substring(0, 500)}…\n`));
  console.log(r.response || r.error);
}

async function cmdThink(args) {
  const question = args.join(" ");
  if (!question) {
    console.log(C.red("Usage: beast think <question>"));
    return;
  }
  header("EXTENDED THINKING → CLAUDE OPUS");
  console.log(C.yellow("Thinking deeply... (may take 30s)\n"));
  const r = await gabrielPost("/api/gabriel/v3/think", { question, budget: 12000 });
  if (r.thinking) console.log(C.dim(`[THINKING TRACE]\n${r.thinking.substring(0, 400)}…\n`));
  console.log(r.response || r.error);
}

async function cmdCrew(args) {
  const [agent, ...taskParts] = args;
  const task = taskParts.join(" ");
  if (!agent || !task) {
    console.log(
      C.red(
        "Usage: beast crew <agent> <task>\nAgents: engr-keith | dream | consent-auditor | voice-specialist | cb01 | shirley",
      ),
    );
    return;
  }
  header(`CREW DISPATCH → ${agent.toUpperCase()}`);
  const r = await gabrielPost("/api/gabriel/v3/crew", { agent, task });
  console.log(r.response || r.error);
}

async function cmdLearn(args) {
  const observation = args.join(" ");
  if (!observation) {
    console.log(C.red("Usage: beast learn <observation>"));
    return;
  }
  const r = await gabrielPost("/api/gabriel/learn", {
    observation,
    category: "general",
    source: "beast-cli",
  });
  console.log(
    r.learned ? C.green(`✓ GABRIEL learned: ${observation.substring(0, 80)}`) : C.red(r.error),
  );
}

async function cmdMorning() {
  header("MORNING BRIEFING");
  const today = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  console.log(C.bold(`${today}`));
  console.log(C.yellow(`${daysLine()}\n`));
  await cmdStatus();
  console.log("");
  await cmdQueue();
}

async function cmdDeploy() {
  header("DEPLOY HEAVEN → CLOUDFLARE");
  // heavenRepoPath() probes canonical (repos/noizy-heaven), legacy
  // (~/NOIZYANTHROPIC/repos/noizy-heaven), and ancient (~/Desktop/HEAVEN).
  const heavenDir = heavenRepoPath();
  if (!fs.existsSync(path.join(heavenDir, "wrangler.toml"))) {
    console.log(C.red(`✗ wrangler.toml not found at ${heavenDir}`));
    console.log(
      C.dim("  Tried: repos/noizy-heaven, ~/NOIZYANTHROPIC/repos/noizy-heaven, ~/Desktop/HEAVEN"),
    );
    console.log(C.dim("  Edit package.json `noizybeast.endpoints` or check repo layout"));
    return;
  }
  console.log(C.yellow(`Deploying HEAVEN from ${heavenDir}...`));
  console.log(C.dim(`Account: 5f36aa9795348ea681d0b21910dfc82a`));
  // D1 canonical agent-memory ID per repos/noizy-heaven/wrangler.toml (verified
  // 2026-04-25). Earlier comment cited stale `7b813205-...` from before the
  // NOIZYCLAW v0.1 audit.
  console.log(C.dim(`D1: agent-memory / b5b58cc9-1f37-4000-adc5-12f9e419662f\n`));
  try {
    // execFileSync with cwd option: no shell, no injection surface.
    const out = execFileSync("npx", ["wrangler", "deploy"], {
      cwd: heavenDir,
      encoding: "utf8",
      timeout: 60000,
      env: { ...process.env, WRANGLER_HOME: `${HOME}/.wrangler` },
    });
    console.log(out);
    console.log(C.green(`\n✓ HEAVEN deployed! Check ${HEAVEN_EDGE}/health`));
  } catch (e) {
    console.log(C.red("Deploy failed:"), e.message);
    console.log(C.dim("Tip: run `wrangler login` first if auth expired"));
  }
}

async function cmdRegistry() {
  header("PROJECT REGISTRY");
  reg.properties.forEach((p) => {
    const dot =
      p.status === "LIVE" || p.status === "ACTIVE"
        ? C.green("●")
        : p.status === "BUILDING"
          ? C.yellow("◐")
          : C.dim("○");
    console.log(`${dot} ${C.bold(p.name.padEnd(20))} ${C.dim(p.status.padEnd(16))} ${p.tagline}`);
    if (p.next) console.log(`  ${C.dim("→")} ${C.dim(p.next)}`);
  });
}

// ── OpenClaw 36 master-orchestrator dispatch ─────────────────────
// Surfaces the NoizyOpenClaw dispatcher (../../noizybeast/integrations/openclaw.mjs)
// through the beast CLI. Per HZ_JXL_PRECEDENT.md, this is one of the three
// required input surfaces (CLI / Talon Voice / OSC tile) for any new command.
//
// Usage:
//   beast claw                              → list 36 named claws
//   beast claw discord intake.idea          → dispatch with empty payload
//   beast claw cloudflare edge.deploy.canary '{"worker":"heaven"}'
//
// Reads NOIZY_API_KEY from env or ~/.noizy/api-key. Emits structured receipts.
async function cmdClaw(args) {
  const [surface, verb, payloadJson] = args;
  // Lazy import keeps the CLI fast for non-claw commands and avoids loading
  // the dispatcher if its dependencies are missing on a partial install.
  const integrationPath = path.resolve(
    BEASTDIR,
    "..",
    "..",
    "noizybeast",
    "integrations",
    "openclaw.mjs",
  );
  if (!fs.existsSync(integrationPath)) {
    console.log(C.red("✗ OpenClaw integration not found at " + integrationPath));
    console.log(C.dim("  Expected the dispatcher shipped 2026-04-30. Run `git status` to verify."));
    return;
  }
  const { NoizyOpenClaw, CLAWS } = await import(integrationPath);

  // Help/list mode — no surface given
  if (!surface) {
    header("OPENCLAW 36 — REGISTRY");
    for (const [s, verbs] of Object.entries(CLAWS)) {
      console.log(`\n${C.bold(C.cyan(s.toUpperCase()))} ${C.dim(`(${verbs.length} claws)`)}`);
      verbs.forEach((v) => console.log(`  ${C.dim("•")} ${v}`));
    }
    console.log(`\n${C.dim("Usage: beast claw <surface> <verb> [json-payload]")}`);
    console.log(
      `${C.dim('Example: beast claw cloudflare edge.deploy.canary \'{"worker":"heaven"}\'')}`,
    );
    return;
  }

  if (!verb) {
    console.log(C.red(`Usage: beast claw ${surface} <verb> [payload-json]`));
    if (CLAWS[surface]) {
      console.log(C.dim(`\n${surface} verbs:`));
      CLAWS[surface].forEach((v) => console.log(C.dim(`  • ${v}`)));
    } else {
      console.log(C.dim(`\nUnknown surface "${surface}". Valid: ${Object.keys(CLAWS).join(", ")}`));
    }
    return;
  }

  let payload = {};
  if (payloadJson) {
    try {
      payload = JSON.parse(payloadJson);
    } catch (e) {
      console.log(C.red(`✗ payload is not valid JSON: ${e.message}`));
      return;
    }
  }

  // Resolve API key: prefer env, then ~/.noizy/api-key, then ~/.env.secrets
  let apiKey = process.env.NOIZY_API_KEY;
  if (!apiKey) {
    const candidates = [path.join(HOME, ".noizy", "api-key"), path.join(HOME, ".env.secrets")];
    for (const c of candidates) {
      try {
        const txt = fs.readFileSync(c, "utf8");
        const m = txt.match(/NOIZY_API_KEY[=:]\s*([^\s\n]+)/);
        if (m) {
          apiKey = m[1].replace(/^["']|["']$/g, "");
          break;
        }
      } catch {
        /* file missing — try next */
      }
    }
  }
  if (!apiKey) {
    console.log(C.red("✗ NOIZY_API_KEY not set"));
    console.log(C.dim("  Set via env: NOIZY_API_KEY=... beast claw ..."));
    console.log(C.dim("  Or store at ~/.noizy/api-key (chmod 600)"));
    return;
  }

  header(`OPENCLAW DISPATCH — ${surface} / ${verb}`);
  const claw = new NoizyOpenClaw({
    heavenUrl: HEAVEN_EDGE,
    apiKey,
    actor: {
      id: cfg.operator?.id || "RSP_001",
      displayName: cfg.operator?.name || "Robert Stephen Plowman",
      role: "founder",
    },
  });

  try {
    const t0 = Date.now();
    const r = await claw.dispatch(surface, verb, payload);
    const ms = Date.now() - t0;
    const ok = r.status === "EXECUTED" || r.status === "ACCEPTED";
    console.log(
      `  ${ok ? C.green("✓") : C.yellow("◐")} status:    ${ok ? C.green(r.status) : C.yellow(r.status)}`,
    );
    console.log(`  ${C.dim("•")} intent_id: ${C.dim(r.intentId)}`);
    console.log(`  ${C.dim("•")} latency:   ${C.dim(ms + "ms")}`);
    console.log(`  ${C.dim("•")} summary:   ${r.summary}`);
    if (r.receipt && Object.keys(r.receipt).length > 0) {
      console.log(`\n${C.dim("receipt:")}`);
      console.log(C.dim(JSON.stringify(r.receipt, null, 2).slice(0, 800)));
    }
  } catch (e) {
    console.log(C.red(`✗ dispatch failed: ${e.message}`));
    console.log(
      C.dim("  Heaven /api/claw/dispatch may not be mounted yet — see CLAUDE.md blockers."),
    );
  }
}

function cmdHelp() {
  header("COMMAND REFERENCE");
  Object.entries(cfg.commands).forEach(([cmd, desc]) => {
    console.log(`  ${C.cyan(cmd.padEnd(20))} ${C.dim(desc)}`);
  });
  console.log(`\n  ${C.cyan("beast registry".padEnd(20))} ${C.dim("show all project statuses")}`);
  console.log(
    `  ${C.cyan("beast morning".padEnd(20))} ${C.dim("daily briefing with status + queue")}`,
  );
  console.log(`  ${C.cyan("beast deploy".padEnd(20))} ${C.dim("deploy HEAVEN to Cloudflare")}`);
  console.log(`  ${C.cyan("beast learn <obs>".padEnd(20))} ${C.dim("teach GABRIEL something")}`);
  console.log(
    `  ${C.cyan("beast claw <s> <v>".padEnd(20))} ${C.dim("dispatch into OpenClaw 36 (run bare for registry)")}`,
  );
}

// ── Main ─────────────────────────────────────────────────────
const [, , cmd, ...args] = process.argv;

const handlers = {
  status: cmdStatus,
  queue: cmdQueue,
  empire: cmdEmpire,
  mission: () => cmdMission(args),
  think: () => cmdThink(args),
  crew: () => cmdCrew(args),
  learn: () => cmdLearn(args),
  morning: cmdMorning,
  deploy: cmdDeploy,
  registry: cmdRegistry,
  claw: () => cmdClaw(args),
  doctor: async () => {
    const { runDoctor } = await import("./doctor.js");
    const code = await runDoctor();
    process.exit(code);
  },
  debug: async () => {
    // alias per CLAUDE.md spec: `beast debug`
    const { runDoctor } = await import("./doctor.js");
    const code = await runDoctor();
    process.exit(code);
  },
  boot: async () => {
    const { runBoot } = await import("./boot.js");
    const code = await runBoot();
    process.exit(code);
  },
  heal: async () => {
    const { runHeal } = await import("./heal.js");
    const code = await runHeal();
    process.exit(code);
  },
  help: cmdHelp,
};

const handler = handlers[cmd] || handlers.help;
handler().catch((e) => {
  console.error(C.red(`\nFATAL: ${e.message}`));
  process.exit(1);
});
