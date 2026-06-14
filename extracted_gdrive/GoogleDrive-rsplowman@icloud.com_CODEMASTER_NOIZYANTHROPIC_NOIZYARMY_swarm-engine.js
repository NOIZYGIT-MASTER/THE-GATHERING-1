#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NOIZYARMY — Swarm Engine                                   ║
 * ║  Multi-Agent Autonomous Builder using Ollama/Gemma           ║
 * ║  RSP_001 | NOIZY Empire | 2026                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Dispatches parallel AI agents using local Ollama models
 * (Gemma 3, Mistral, Llama, etc.) to:
 *  - Analyze code and suggest fixes
 *  - Generate boilerplate and tests
 *  - Review PRs and commits
 *  - Debug build failures
 *  - Write documentation
 *  - Plan architecture
 *
 * Each "bee" is an Ollama instance with a specialized system prompt.
 * The Queen (this engine) coordinates, deduplicates, and merges results.
 *
 * Usage:
 *   node swarm-engine.js --task="Fix all broken imports"
 *   node swarm-engine.js --task="Generate tests for Heaven API"
 *   node swarm-engine.js --task="Review last 5 commits for security"
 *   node swarm-engine.js --mode=continuous
 *   node swarm-engine.js --analyze=src/index.js
 */

import fs from "fs";
import path from "path";
import { execSync, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const HOME = process.env.HOME || "/Users/m2ultra";
const NOIZYLAB = `${HOME}/NOIZYLAB`;
const SWARM_LOG = `${NOIZYLAB}/NOIZYARMY/logs/swarm.jsonl`;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// ── Ensure log dir ──────────────────────────────────────────
fs.mkdirSync(path.dirname(SWARM_LOG), { recursive: true });

// ── Parse args ──────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const a = args.find((a) => a.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : null;
};
const TASK = getArg("task");
const MODE = getArg("mode") || "single";
const ANALYZE_FILE = getArg("analyze");
const JSON_OUTPUT = args.includes("--json");
const MAX_BEES = parseInt(getArg("bees") || "5");

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
};

// ── Bee Definitions ─────────────────────────────────────────
const BEES = {
  architect: {
    name: "ARCHITECT",
    icon: "🏗️",
    model: "gemma4:31b",
    fallback: "gemma4:e4b",
    system: `You are ARCHITECT, a senior software architect for the NOIZY Empire.
You analyze codebases, suggest architectural improvements, identify anti-patterns.
Be concise, direct, military-calm. Output actionable items only.
Stack: Node.js, Cloudflare Workers, D1 SQLite, Express, WebSocket.
Sacred invariants: 75/25 creator split, consent required, revocation sacred.`,
  },
  debugger: {
    name: "DEBUGGER",
    icon: "🔍",
    model: "gemma4:31b",
    fallback: "gemma4:e4b",
    system: `You are DEBUGGER, a relentless bug hunter for the NOIZY Empire.
You find bugs, broken imports, missing error handlers, race conditions.
Output format: FILE:LINE — ISSUE — FIX (one per line).
Be surgical. No fluff.`,
  },
  tester: {
    name: "TESTER",
    icon: "🧪",
    model: "gemma4:31b",
    fallback: "gemma4:e4b",
    system: `You are TESTER, responsible for test generation in the NOIZY Empire.
Generate practical, runnable tests. Use Node.js assert or simple test patterns.
Focus on edge cases, consent flow, Never Clause enforcement.
Output only code. No explanations unless asked.`,
  },
  documenter: {
    name: "DOCUMENTER",
    icon: "📝",
    model: "gemma4:31b",
    fallback: "gemma4:e4b",
    system: `You are DOCUMENTER, the documentation specialist for the NOIZY Empire.
Generate clear, concise README sections, JSDoc comments, API docs.
Match the existing style: military-calm, direct, no fluff.
Use markdown formatting. Include code examples.`,
  },
  security: {
    name: "SECURITY",
    icon: "🛡️",
    model: "gemma4:31b",
    fallback: "gemma4:e4b",
    system: `You are SECURITY, the security auditor for the NOIZY Empire.
Check for: exposed secrets, missing auth, SQL injection, XSS, CORS issues,
improper consent handling, Never Clause violations.
Output: SEVERITY(CRITICAL/HIGH/MED/LOW) — FILE — ISSUE — FIX`,
  },
  optimizer: {
    name: "OPTIMIZER",
    icon: "⚡",
    model: "gemma4:31b",
    fallback: "gemma4:e4b",
    system: `You are OPTIMIZER, the performance specialist for the NOIZY Empire.
Find: slow queries, unnecessary loops, missing caching, large bundles.
Suggest: specific optimizations with before/after code.
Target: Cloudflare Workers (50ms CPU limit), M2 Ultra local services.`,
  },
};

// ── Ollama Interface ────────────────────────────────────────
async function ollamaGenerate(model, system, prompt, maxTokens = 500) {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system,
        prompt,
        stream: false,
        options: { num_predict: maxTokens, temperature: 0.3 },
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      response: data.response,
      model,
      eval_count: data.eval_count,
      eval_duration: data.eval_duration,
    };
  } catch (e) {
    return { response: null, error: e.message, model };
  }
}

async function getAvailableModels() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await res.json();
    return data.models?.map((m) => m.name) || [];
  } catch {
    return [];
  }
}

async function resolveModel(bee) {
  const available = await getAvailableModels();
  if (available.some((m) => m.startsWith(bee.model))) return bee.model;
  if (available.some((m) => m.startsWith(bee.fallback))) return bee.fallback;
  return available[0] || null;
}

// ── Gather Context ──────────────────────────────────────────
function gatherContext(taskType) {
  const context = {};

  // Recent git changes
  try {
    context.recentChanges = execSync("cd ~/NOIZYLAB && git log --oneline -10 2>/dev/null", {
      encoding: "utf8",
    }).trim();
  } catch {
    context.recentChanges = "N/A";
  }

  // Key files summary
  try {
    context.structure = execSync(
      'cd ~/NOIZYLAB && find src mcp tools -maxdepth 2 -name "*.js" -o -name "*.ts" -o -name "*.py" 2>/dev/null | head -30',
      { encoding: "utf8" },
    ).trim();
  } catch {
    context.structure = "N/A";
  }

  // Analyze specific file
  if (ANALYZE_FILE) {
    try {
      const fp = path.resolve(ANALYZE_FILE);
      if (fs.existsSync(fp)) {
        const content = fs.readFileSync(fp, "utf8");
        context.targetFile = {
          path: fp,
          content: content.slice(0, 8000),
          lines: content.split("\n").length,
        };
      }
    } catch {}
  }

  return context;
}

// ── Swarm Dispatch ──────────────────────────────────────────
async function dispatchBee(beeKey, task, context) {
  const bee = BEES[beeKey];
  const model = await resolveModel(bee);
  if (!model) {
    return { bee: beeKey, error: "No model available", response: null };
  }

  const contextStr = Object.entries(context)
    .map(
      ([k, v]) =>
        `[${k}]: ${typeof v === "object" ? JSON.stringify(v).slice(0, 2000) : String(v).slice(0, 2000)}`,
    )
    .join("\n");

  const prompt = `TASK: ${task}\n\nCONTEXT:\n${contextStr}\n\nProvide your analysis and actionable output:`;

  if (!JSON_OUTPUT) {
    process.stdout.write(`${bee.icon} ${C.b}${bee.name}${C.r} dispatched (${model})...`);
  }

  const start = Date.now();
  const result = await ollamaGenerate(model, bee.system, prompt, 600);
  const elapsed = Date.now() - start;

  if (!JSON_OUTPUT) {
    if (result.response) {
      console.log(` ${C.g}✓${C.r} ${elapsed}ms`);
    } else {
      console.log(` ${C.red}✗${C.r} ${result.error}`);
    }
  }

  return {
    bee: beeKey,
    name: bee.name,
    icon: bee.icon,
    model: result.model || model,
    response: result.response,
    error: result.error || null,
    elapsedMs: elapsed,
    tokens: result.eval_count || 0,
  };
}

async function runSwarm(task, selectedBees = null) {
  const context = gatherContext(task);
  const beeKeys = selectedBees || Object.keys(BEES).slice(0, MAX_BEES);

  if (!JSON_OUTPUT) {
    console.log(`\n${C.b}${C.m}${"═".repeat(60)}${C.r}`);
    console.log(`${C.b}${C.m}  🐝 NOIZYARMY SWARM ENGINE${C.r}`);
    console.log(`${C.b}${C.m}${"═".repeat(60)}${C.r}`);
    console.log(`${C.dim}  Task:    ${task}${C.r}`);
    console.log(`${C.dim}  Bees:    ${beeKeys.length}${C.r}`);
    console.log(`${C.dim}  Ollama:  ${OLLAMA_URL}${C.r}`);
    console.log(`${C.m}${"─".repeat(60)}${C.r}\n`);
  }

  // Dispatch all bees in parallel
  const promises = beeKeys.map((key) => dispatchBee(key, task, context));
  const results = await Promise.all(promises);

  // Merge results
  const successful = results.filter((r) => r.response);
  const failed = results.filter((r) => !r.response);
  const totalTokens = results.reduce((sum, r) => sum + (r.tokens || 0), 0);
  const totalTime = results.reduce((max, r) => Math.max(max, r.elapsedMs || 0), 0);

  // Log to JSONL
  const logEntry = {
    ts: new Date().toISOString(),
    task,
    bees: beeKeys.length,
    successful: successful.length,
    failed: failed.length,
    totalTokens,
    totalTimeMs: totalTime,
    results: results.map((r) => ({
      bee: r.bee,
      ok: !!r.response,
      ms: r.elapsedMs,
      tokens: r.tokens,
    })),
  };
  fs.appendFileSync(SWARM_LOG, JSON.stringify(logEntry) + "\n");

  if (JSON_OUTPUT) {
    console.log(
      JSON.stringify(
        {
          task,
          results: results.map((r) => ({
            agent: r.name,
            model: r.model,
            response: r.response,
            error: r.error,
            elapsed_ms: r.elapsedMs,
          })),
          summary: {
            total: results.length,
            successful: successful.length,
            failed: failed.length,
            tokens: totalTokens,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  // Print results
  console.log(`\n${C.m}${"─".repeat(60)}${C.r}`);
  console.log(`${C.b}  SWARM RESULTS${C.r}\n`);

  for (const r of successful) {
    console.log(`${r.icon} ${C.b}${r.name}${C.r} ${C.dim}(${r.model}, ${r.elapsedMs}ms)${C.r}`);
    console.log(`${C.dim}${"─".repeat(40)}${C.r}`);
    console.log(r.response);
    console.log("");
  }

  if (failed.length > 0) {
    console.log(`${C.red}Failed bees: ${failed.map((f) => f.bee).join(", ")}${C.r}\n`);
  }

  // Queen's synthesis
  if (successful.length >= 2) {
    console.log(`${C.m}${"─".repeat(60)}${C.r}`);
    console.log(`${C.b}  👑 QUEEN'S SYNTHESIS${C.r}\n`);

    const synthesis = successful
      .map((r) => `[${r.name}]: ${r.response?.slice(0, 300)}`)
      .join("\n\n");
    const queenModel = await resolveModel(BEES.architect);
    if (queenModel) {
      const queenResult = await ollamaGenerate(
        queenModel,
        "You are the QUEEN BEE, synthesizing reports from specialist agents. Create a unified action plan with priorities. Be extremely concise. Output a numbered list of actions.",
        `Synthesize these agent reports into a unified action plan:\n\n${synthesis}`,
        400,
      );
      if (queenResult.response) {
        console.log(queenResult.response);
      }
    }
  }

  console.log(`\n${C.m}${"═".repeat(60)}${C.r}`);
  console.log(
    `${C.b}  Swarm: ${successful.length}/${results.length} bees returned | ${totalTokens} tokens | ${totalTime}ms${C.r}`,
  );
  console.log(`${C.m}${"═".repeat(60)}${C.r}\n`);
}

// ── Continuous Mode ─────────────────────────────────────────
async function continuousMode() {
  console.log(`\n${C.b}${C.m}  🐝 CONTINUOUS SWARM MODE${C.r}`);
  console.log(`${C.dim}  Watching for changes and auto-dispatching bees...${C.r}`);
  console.log(`${C.dim}  Press Ctrl+C to stop${C.r}\n`);

  const tasks = [
    {
      task: "Check all services are healthy and report any issues",
      bees: ["debugger", "security"],
      interval: 300000,
    },
    {
      task: "Scan recent git changes for bugs or security issues",
      bees: ["debugger", "security"],
      interval: 600000,
    },
    {
      task: "Suggest optimizations for the most recently changed files",
      bees: ["optimizer", "architect"],
      interval: 900000,
    },
  ];

  for (const t of tasks) {
    setInterval(() => runSwarm(t.task, t.bees), t.interval);
  }

  // Initial run
  await runSwarm("Quick health check: what needs immediate attention?", ["debugger", "architect"]);

  // Keep alive
  await new Promise(() => {});
}

// ── File Analysis Mode ──────────────────────────────────────
async function analyzeFile(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.log(`${C.red}❌ File not found: ${resolved}${C.r}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolved, "utf8");
  const ext = path.extname(resolved);
  const lines = content.split("\n").length;

  console.log(`\n${C.b}Analyzing: ${resolved}${C.r}`);
  console.log(`${C.dim}  ${lines} lines | ${ext}${C.r}\n`);

  await runSwarm(
    `Analyze this file thoroughly:\n\nFile: ${resolved}\nExtension: ${ext}\nLines: ${lines}\n\nContent:\n${content.slice(0, 6000)}`,
    ["debugger", "security", "optimizer", "documenter"],
  );
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  // Check Ollama
  const models = await getAvailableModels();
  if (models.length === 0) {
    console.log(`${C.red}❌ Ollama not running or no models available.${C.r}`);
    console.log(`${C.dim}   Start: ollama serve${C.r}`);
    console.log(`${C.dim}   Pull:  ollama pull gemma3${C.r}`);
    process.exit(1);
  }

  if (!JSON_OUTPUT) {
    console.log(
      `${C.g}✓${C.r} Ollama: ${models.length} models available (${models.slice(0, 3).join(", ")}${models.length > 3 ? "..." : ""})`,
    );
  }

  if (ANALYZE_FILE) {
    await analyzeFile(ANALYZE_FILE);
  } else if (MODE === "continuous") {
    await continuousMode();
  } else if (TASK) {
    await runSwarm(TASK);
  } else {
    console.log(`
${C.b}NOIZYARMY Swarm Engine${C.r}

Usage:
  node swarm-engine.js --task="Your task"          # One-shot swarm
  node swarm-engine.js --analyze=path/to/file.js   # Analyze a file
  node swarm-engine.js --mode=continuous            # Continuous watch
  node swarm-engine.js --task="..." --bees=3        # Limit bee count
  node swarm-engine.js --task="..." --json          # JSON output

Available bees:
  🏗️  ARCHITECT  — Architecture & patterns
  🔍  DEBUGGER   — Bug hunting
  🧪  TESTER     — Test generation
  📝  DOCUMENTER — Documentation
  🛡️  SECURITY   — Security audit
  ⚡  OPTIMIZER  — Performance
`);
  }
}

main().catch((e) => {
  console.error(`${C.red}FATAL: ${e.message}${C.r}`);
  process.exit(1);
});
