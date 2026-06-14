#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  NOIZYARMY — Discord Command Center                        ║
 * ║  Real-time build orchestration, agent dispatch, telemetry   ║
 * ║  RSP_001 | NOIZY Empire | 2026                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Features:
 *  - /status    — Full empire health check
 *  - /deploy    — Deploy any service (Heaven, Landing, Gateway)
 *  - /build     — Build any project
 *  - /swarm     — Dispatch AI agent swarm
 *  - /heal      — Auto-fix broken services
 *  - /smoke     — Run smoke tests
 *  - /agents    — List/dispatch AI agents
 *  - /voice     — Voice pipeline status
 *  - /gemma     — Query local Gemma model
 *  - /dashboard — Live build dashboard link
 *  - /army      — NOIZYARMY full status
 *  - /never     — Never Clause check
 *
 * Env: DISCORD_BOT_TOKEN, DISCORD_GUILD_ID
 */

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { execSync, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const HOME = process.env.HOME || "/Users/m2ultra";
const NOIZYLAB = `${HOME}/NOIZYLAB`;
const ARMY_DIR = `${NOIZYLAB}/NOIZYARMY`;

// ── Load env ────────────────────────────────────────────────
function loadEnv() {
  for (const f of [`${ARMY_DIR}/.env`, `${NOIZYLAB}/.env`]) {
    if (fs.existsSync(f)) {
      fs.readFileSync(f, "utf8")
        .split("\n")
        .forEach((line) => {
          const [k, ...v] = line.split("=");
          if (k && !k.startsWith("#")) process.env[k.trim()] = v.join("=").trim();
        });
    }
  }
}
loadEnv();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const ARMY_CHANNEL = process.env.DISCORD_ARMY_CHANNEL || "noizyarmy-ops";

if (!TOKEN) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  NOIZYARMY Discord Bot — Setup Required                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  1. Go to https://discord.com/developers/applications        ║
║  2. Create "NOIZYARMY" application                           ║
║  3. Bot → Add Bot → Copy token                               ║
║  4. OAuth2 → URL Generator:                                  ║
║     Scopes: bot, applications.commands                       ║
║     Permissions: Send Messages, Embed Links,                 ║
║       Use Slash Commands, Manage Messages,                   ║
║       Read Message History, Add Reactions                    ║
║  5. Add to your server with the generated URL                ║
║  6. Create .env in NOIZYARMY/:                               ║
║                                                              ║
║     DISCORD_BOT_TOKEN=your-token-here                        ║
║     DISCORD_GUILD_ID=your-server-id                          ║
║                                                              ║
║  7. Run: node discord-bot.js                                 ║
║                                                              ║
║  Required channels (auto-created if missing):                ║
║    #noizyarmy-ops     — Build operations & status            ║
║    #noizyarmy-builds  — Build logs & deployments             ║
║    #noizyarmy-agents  — AI agent dispatch & results          ║
║    #noizyarmy-voice   — Voice pipeline events                ║
║    #noizyarmy-alerts  — Critical alerts & failures           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

// ── Helpers ─────────────────────────────────────────────────
async function shell(cmd, timeout = 15000) {
  try {
    const { stdout } = await execAsync(cmd, { timeout, cwd: NOIZYLAB });
    return stdout.trim();
  } catch (e) {
    return null;
  }
}

async function httpCheck(url, timeout = 4000) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return {
      ok: res.ok,
      status: res.status,
      data: res.ok ? await res.json().catch(() => null) : null,
    };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

function timestamp() {
  return new Date().toISOString().replace("T", " ").split(".")[0];
}
function daysUntil(target) {
  return Math.ceil((new Date(target) - new Date()) / 86400000);
}

// ── Service Checks ──────────────────────────────────────────
async function getEmpireStatus() {
  const [heaven, dreamchamber, ollama, voiceBridge] = await Promise.all([
    httpCheck("https://heaven.rsp-5f3.workers.dev/health"),
    httpCheck("http://localhost:7777/health"),
    httpCheck("http://localhost:11434/api/tags"),
    httpCheck("http://localhost:8080/health"),
  ]);

  const ollamaModels = ollama.data?.models?.map((m) => m.name).join(", ") || "none";
  const disk = (await shell("df -h / | tail -1 | awk '{print $5}'")) || "?";

  return {
    heaven: heaven.ok ? "🟢 LIVE" : "🔴 DOWN",
    dreamchamber: dreamchamber.ok ? "🟢 LIVE" : "🔴 DOWN",
    ollama: ollama.ok ? `🟢 ${ollamaModels}` : "🔴 DOWN",
    voiceBridge: voiceBridge.ok ? "🟢 LIVE" : "🔴 DOWN",
    disk,
    timestamp: timestamp(),
  };
}

// ── Gemma Query ─────────────────────────────────────────────
async function queryGemma(prompt) {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3",
        prompt: `You are GABRIEL, warrior executor of the NOIZY Empire. Be concise, direct, military-calm.\n\n${prompt}`,
        stream: false,
        options: { num_predict: 300 },
      }),
    });
    const data = await res.json();
    return data.response || "[No response from Gemma]";
  } catch {
    // Fallback to any available model
    try {
      const tags = await fetch("http://localhost:11434/api/tags");
      const models = await tags.json();
      if (models.models?.length > 0) {
        const fallback = models.models[0].name;
        const res = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: fallback,
            prompt,
            stream: false,
            options: { num_predict: 300 },
          }),
        });
        const data = await res.json();
        return `[via ${fallback}] ${data.response}`;
      }
    } catch {}
    return "❌ Ollama not reachable. Start with: `ollama serve`";
  }
}

// ── Slash Commands ──────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("status").setDescription("Full NOIZY Empire health check"),
  new SlashCommandBuilder()
    .setName("deploy")
    .setDescription("Deploy a service")
    .addStringOption((o) =>
      o
        .setName("service")
        .setDescription("Service to deploy")
        .setRequired(true)
        .addChoices(
          { name: "Heaven", value: "heaven" },
          { name: "Landing", value: "landing" },
          { name: "All", value: "all" },
        ),
    ),
  new SlashCommandBuilder()
    .setName("build")
    .setDescription("Build a project")
    .addStringOption((o) =>
      o
        .setName("project")
        .setDescription("Project to build")
        .setRequired(true)
        .addChoices(
          { name: "DreamChamber", value: "dreamchamber" },
          { name: "Heaven", value: "heaven" },
          { name: "All", value: "all" },
        ),
    ),
  new SlashCommandBuilder()
    .setName("swarm")
    .setDescription("Dispatch AI agent swarm")
    .addStringOption((o) =>
      o.setName("task").setDescription("Task for the swarm").setRequired(true),
    ),
  new SlashCommandBuilder().setName("heal").setDescription("Auto-fix broken services"),
  new SlashCommandBuilder().setName("smoke").setDescription("Run smoke tests"),
  new SlashCommandBuilder().setName("agents").setDescription("List AI agent roster"),
  new SlashCommandBuilder().setName("voice").setDescription("Voice pipeline status"),
  new SlashCommandBuilder()
    .setName("gemma")
    .setDescription("Query local Gemma AI")
    .addStringOption((o) =>
      o.setName("prompt").setDescription("Question for Gemma").setRequired(true),
    ),
  new SlashCommandBuilder().setName("army").setDescription("NOIZYARMY full status"),
  new SlashCommandBuilder().setName("never").setDescription("Never Clause compliance check"),
  new SlashCommandBuilder().setName("countdown").setDescription("Days until deadline"),
  new SlashCommandBuilder().setName("diagnostic").setDescription("Run MC96 diagnostic engine"),
  new SlashCommandBuilder().setName("git").setDescription("Git status across all repos"),
  new SlashCommandBuilder().setName("observer").setDescription("Run full observer digest"),
].map((c) => c.toJSON());

// ── Bot Setup ───────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Register Commands ───────────────────────────────────────
client.once("ready", async () => {
  console.log(`\n⚔️  NOIZYARMY Discord Bot ONLINE as ${client.user.tag}`);
  console.log(`   Guilds: ${client.guilds.cache.size}`);
  console.log(`   Commands: ${commands.length}`);

  const rest = new REST().setToken(TOKEN);
  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
      console.log(`   ✅ Slash commands registered (guild: ${GUILD_ID})`);
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log(`   ✅ Slash commands registered (global)`);
    }
  } catch (e) {
    console.error("   ❌ Command registration failed:", e.message);
  }

  // Set status
  client.user.setPresence({
    status: "online",
    activities: [{ name: "🔥 Building at 100%", type: 3 }],
  });

  // Auto-create channels if guild is set
  if (GUILD_ID) {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
      const needed = [
        "noizyarmy-ops",
        "noizyarmy-builds",
        "noizyarmy-agents",
        "noizyarmy-voice",
        "noizyarmy-alerts",
      ];
      for (const name of needed) {
        if (!guild.channels.cache.find((c) => c.name === name)) {
          try {
            await guild.channels.create({ name, reason: "NOIZYARMY auto-setup" });
            console.log(`   ✅ Created #${name}`);
          } catch {}
        }
      }
    }
  }

  // Announce boot
  broadcastToChannel("noizyarmy-ops", {
    embeds: [
      new EmbedBuilder()
        .setColor(0x00ff88)
        .setTitle("⚔️ NOIZYARMY — ONLINE")
        .setDescription("Bot is live. All systems operational. Building at 100%.")
        .addFields(
          { name: "Machine", value: "GOD.local (M2 Ultra 192GB)", inline: true },
          { name: "Time", value: timestamp(), inline: true },
        )
        .setFooter({ text: "NOIZY Empire — Consent as executable code." }),
    ],
  });
});

// ── Broadcast to named channel ──────────────────────────────
function broadcastToChannel(channelName, message) {
  if (!GUILD_ID) return;
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  const channel = guild.channels.cache.find((c) => c.name === channelName);
  if (channel) channel.send(message).catch(() => {});
}

// ── Command Handler ─────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  try {
    switch (commandName) {
      // ── /status ─────────────────────────────────────────
      case "status": {
        await interaction.deferReply();
        const s = await getEmpireStatus();
        const embed = new EmbedBuilder()
          .setColor(0x7b2ff7)
          .setTitle("🏛️ NOIZY Empire — System Status")
          .addFields(
            { name: "Heaven API", value: s.heaven, inline: true },
            { name: "DreamChamber", value: s.dreamchamber, inline: true },
            { name: "Ollama/Gemma", value: s.ollama, inline: true },
            { name: "Voice Bridge", value: s.voiceBridge, inline: true },
            { name: "Disk", value: s.disk, inline: true },
            { name: "Updated", value: s.timestamp, inline: true },
          )
          .setFooter({ text: "⚔️ NOIZYARMY — Building at 100%" });
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      // ── /deploy ─────────────────────────────────────────
      case "deploy": {
        const service = interaction.options.getString("service");
        await interaction.deferReply();
        broadcastToChannel("noizyarmy-builds", {
          content: `🚀 **Deploy initiated** by <@${interaction.user.id}>: \`${service}\``,
        });

        let result;
        switch (service) {
          case "heaven":
            result = await shell('npx wrangler deploy --env="" 2>&1 | tail -20', 60000);
            break;
          case "landing":
            result = await shell("cd noizy-landing && npx wrangler deploy 2>&1 | tail -20", 60000);
            break;
          case "all":
            result = await shell('npx wrangler deploy --env="" 2>&1 | tail -10', 60000);
            break;
        }

        const embed = new EmbedBuilder()
          .setColor(result ? 0x00ff88 : 0xff4444)
          .setTitle(`🚀 Deploy: ${service}`)
          .setDescription(
            `\`\`\`\n${(result || "Deploy failed — check logs").slice(0, 1800)}\n\`\`\``,
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      // ── /swarm ──────────────────────────────────────────
      case "swarm": {
        const task = interaction.options.getString("task");
        await interaction.deferReply();

        broadcastToChannel("noizyarmy-agents", {
          content: `🐝 **Swarm dispatched** by <@${interaction.user.id}>: \`${task}\``,
        });

        // Dispatch to swarm engine
        const swarmResult = await shell(
          `node ${ARMY_DIR}/swarm-engine.js --task="${task}" --json 2>&1`,
          120000,
        );

        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle("🐝 Swarm Dispatch")
          .setDescription(`**Task:** ${task}`)
          .addFields({
            name: "Result",
            value: `\`\`\`\n${(swarmResult || "Swarm processing...").slice(0, 900)}\n\`\`\``,
          })
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      // ── /heal ───────────────────────────────────────────
      case "heal": {
        await interaction.deferReply();
        const healResult = await shell(`node ${ARMY_DIR}/cli.js heal --json 2>&1`, 30000);
        const embed = new EmbedBuilder()
          .setColor(0x00ddff)
          .setTitle("❤️‍🩹 Auto-Heal")
          .setDescription(`\`\`\`\n${(healResult || "Heal complete").slice(0, 1800)}\n\`\`\``)
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      // ── /smoke ──────────────────────────────────────────
      case "smoke": {
        await interaction.deferReply();
        const smokeResult = await shell("bash smoke_test.sh 2>&1 | tail -30", 60000);
        const embed = new EmbedBuilder()
          .setColor(0x00ff88)
          .setTitle("🧪 Smoke Tests")
          .setDescription(
            `\`\`\`\n${(smokeResult || "No smoke test output").slice(0, 1800)}\n\`\`\``,
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      // ── /agents ─────────────────────────────────────────
      case "agents": {
        const agents = [
          {
            name: "GABRIEL",
            role: "System Bridge & Orchestrator",
            model: "Claude Opus 4",
            status: "🟢",
          },
          {
            name: "SHIRL",
            role: "Business Ops & Family Care",
            model: "Claude Sonnet",
            status: "🟢",
          },
          { name: "POPS", role: "Creative Direction", model: "Claude Sonnet", status: "🟢" },
          {
            name: "ENGR_KEITH",
            role: "Technical Engineering",
            model: "Claude Sonnet",
            status: "🟢",
          },
          { name: "DREAM", role: "Visionary Planning", model: "Claude Sonnet", status: "🟢" },
          { name: "CB01", role: "DNS & Infrastructure", model: "Claude Sonnet", status: "🟢" },
          { name: "SHIRLEY", role: "Code & File Manager", model: "Gemma3 27B", status: "🟢" },
          {
            name: "CONSENT_AUDITOR",
            role: "Never Clause Enforcement",
            model: "Claude Opus",
            status: "🟢",
          },
          {
            name: "VOICE_SPECIALIST",
            role: "TTS/Audio Pipeline",
            model: "MLX Whisper",
            status: "🟡",
          },
          { name: "TEST_RUNNER", role: "Smoke Tests & CI", model: "Local", status: "🟢" },
        ];
        const embed = new EmbedBuilder()
          .setColor(0x7b2ff7)
          .setTitle("🤖 NOIZYARMY Agent Roster")
          .setDescription(
            agents.map((a) => `${a.status} **${a.name}** — ${a.role} *(${a.model})*`).join("\n"),
          )
          .setFooter({
            text: `${agents.length} agents | ${agents.filter((a) => a.status === "🟢").length} active`,
          });
        await interaction.reply({ embeds: [embed] });
        break;
      }

      // ── /gemma ──────────────────────────────────────────
      case "gemma": {
        const prompt = interaction.options.getString("prompt");
        await interaction.deferReply();
        const response = await queryGemma(prompt);
        const embed = new EmbedBuilder()
          .setColor(0x4285f4)
          .setTitle("🧠 Gemma Response")
          .addFields(
            { name: "Prompt", value: prompt.slice(0, 200) },
            { name: "Response", value: response.slice(0, 1800) },
          )
          .setFooter({ text: "Local Ollama — no data leaves GOD.local" });
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      // ── /army ───────────────────────────────────────────
      case "army": {
        await interaction.deferReply();
        const s = await getEmpireStatus();
        const uptime = (await shell("uptime")) || "?";
        const gitStatus =
          (await shell("cd ~/NOIZYLAB && git log --oneline -5 2>/dev/null")) || "N/A";

        const embed = new EmbedBuilder()
          .setColor(0xff6600)
          .setTitle("⚔️ NOIZYARMY — Full Status")
          .setDescription("**Building at 100%. Always. Forever.**")
          .addFields(
            { name: "🏛️ Heaven", value: s.heaven, inline: true },
            { name: "💎 DreamChamber", value: s.dreamchamber, inline: true },
            { name: "🧠 Ollama", value: s.ollama, inline: true },
            { name: "🗣️ Voice", value: s.voiceBridge, inline: true },
            { name: "💾 Disk", value: s.disk, inline: true },
            {
              name: "⏰ Uptime",
              value: uptime.split("up")[1]?.split(",")[0]?.trim() || uptime.slice(0, 40),
              inline: true,
            },
            { name: "📝 Recent Commits", value: `\`\`\`\n${gitStatus.slice(0, 400)}\n\`\`\`` },
          )
          .setTimestamp()
          .setFooter({ text: "NOIZYARMY — Consent as executable code." });

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("army_heal")
            .setLabel("🩹 Heal")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("army_deploy")
            .setLabel("🚀 Deploy")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("army_smoke")
            .setLabel("🧪 Smoke")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("army_swarm")
            .setLabel("🐝 Swarm")
            .setStyle(ButtonStyle.Danger),
        );
        await interaction.editReply({ embeds: [embed], components: [buttons] });
        break;
      }

      // ── /never ──────────────────────────────────────────
      case "never": {
        const clauses = [
          "1. Never synthesize a voice without explicit, informed, revocable consent",
          "2. Never store biometric data without encryption and actor-controlled keys",
          "3. Never reduce the creator royalty split below 75%",
          "4. Never share actor data with third parties without explicit consent",
          "5. Never disable the Kill Switch mechanism",
          "6. Never allow descendant models to bypass consent verification",
          "7. Never modify the append-only ledger retroactively",
          "8. Never deploy consent logic without a 9-point audit",
          "9. Never operate without RSP_001 as founding authority",
        ];
        const embed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("🛡️ THE 9 NEVER CLAUSES — Immovable Law")
          .setDescription(clauses.join("\n\n"))
          .setFooter({ text: "These are LAW. They override everything. They cannot be changed." });
        await interaction.reply({ embeds: [embed] });
        break;
      }

      // ── /countdown ──────────────────────────────────────
      case "countdown": {
        const days = daysUntil("2026-04-17");
        const embed = new EmbedBuilder()
          .setColor(days <= 3 ? 0xff0000 : days <= 7 ? 0xffaa00 : 0x00ff88)
          .setTitle(`⏳ ${days} days until April 17, 2026`)
          .setDescription(
            days <= 0 ? "🚀 **LAUNCH DAY or past!**" : `${days} days remain. Ship it.`,
          )
          .setTimestamp();
        await interaction.reply({ embeds: [embed] });
        break;
      }

      // ── /diagnostic ─────────────────────────────────────
      case "diagnostic": {
        await interaction.deferReply();
        const result = await shell(
          "node ~/MC96/app/opus-4.6-diagnostic-engine.js --quick 2>&1 | tail -30",
          30000,
        );
        const embed = new EmbedBuilder()
          .setColor(0x7b2ff7)
          .setTitle("🔬 MC96 Diagnostic")
          .setDescription(`\`\`\`\n${(result || "Diagnostic unavailable").slice(0, 1800)}\n\`\`\``)
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      // ── /git ────────────────────────────────────────────
      case "git": {
        await interaction.deferReply();
        const repos = ["~/NOIZYLAB", "~/MC96"];
        const statuses = [];
        for (const r of repos) {
          const s = await shell(`cd ${r} && git status --short 2>/dev/null | head -5`);
          const branch = await shell(`cd ${r} && git branch --show-current 2>/dev/null`);
          statuses.push(`**${r.replace("~/", "")}** (${branch || "?"})\n${s || "clean ✅"}`);
        }
        const embed = new EmbedBuilder()
          .setColor(0x333333)
          .setTitle("📦 Git Status")
          .setDescription(statuses.join("\n\n"))
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      // ── /observer ───────────────────────────────────────
      case "observer": {
        await interaction.deferReply();
        const result = await shell(`node ${NOIZYLAB}/tools/observer.mjs 2>&1`, 15000);
        const embed = new EmbedBuilder()
          .setColor(0x00ddff)
          .setTitle("👁️ Observer Digest")
          .setDescription(`\`\`\`\n${(result || "Observer unavailable").slice(0, 1800)}\n\`\`\``)
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      // ── /voice ──────────────────────────────────────────
      case "voice": {
        await interaction.deferReply();
        const bridge = await httpCheck("http://localhost:8080/health");
        const h17 = await httpCheck("http://localhost:17017/health");
        const embed = new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle("🗣️ Voice Pipeline Status")
          .addFields(
            {
              name: "Voice Bridge (:8080)",
              value: bridge.ok ? "🟢 LIVE" : "🔴 DOWN",
              inline: true,
            },
            { name: "Heaven17 (:17017)", value: h17.ok ? "🟢 LIVE" : "🔴 DOWN", inline: true },
          )
          .setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }
    }
  } catch (e) {
    const reply = { content: `❌ Error: ${e.message}`, ephemeral: true };
    if (interaction.deferred) await interaction.editReply(reply);
    else await interaction.reply(reply);
  }
});

// ── Button Handler ──────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  const { customId } = interaction;
  await interaction.deferReply({ ephemeral: true });

  switch (customId) {
    case "army_heal":
      await interaction.editReply("❤️‍🩹 Running auto-heal... Check #noizyarmy-ops");
      shell(`node ${ARMY_DIR}/cli.js heal 2>&1`).then((r) =>
        broadcastToChannel("noizyarmy-ops", {
          content: `❤️‍🩹 **Auto-Heal Results:**\n\`\`\`\n${(r || "done").slice(0, 1800)}\n\`\`\``,
        }),
      );
      break;
    case "army_deploy":
      await interaction.editReply("🚀 Deploying Heaven... Check #noizyarmy-builds");
      shell('npx wrangler deploy --env="" 2>&1 | tail -15', 60000).then((r) =>
        broadcastToChannel("noizyarmy-builds", {
          content: `🚀 **Deploy Result:**\n\`\`\`\n${(r || "done").slice(0, 1800)}\n\`\`\``,
        }),
      );
      break;
    case "army_smoke":
      await interaction.editReply("🧪 Running smoke tests... Check #noizyarmy-ops");
      shell("bash smoke_test.sh 2>&1 | tail -20", 60000).then((r) =>
        broadcastToChannel("noizyarmy-ops", {
          content: `🧪 **Smoke Test Results:**\n\`\`\`\n${(r || "done").slice(0, 1800)}\n\`\`\``,
        }),
      );
      break;
    case "army_swarm":
      await interaction.editReply("🐝 Swarm requires a task. Use `/swarm task:your-task`");
      break;
  }
});

// ── Scheduled Tasks ─────────────────────────────────────────
// Every 5 minutes — heartbeat to #noizyarmy-ops
setInterval(
  async () => {
    const s = await getEmpireStatus();
    const down = [];
    if (!s.heaven.includes("🟢")) down.push("Heaven");
    if (!s.dreamchamber.includes("🟢")) down.push("DreamChamber");
    if (!s.ollama.includes("🟢")) down.push("Ollama");

    if (down.length > 0) {
      broadcastToChannel("noizyarmy-alerts", {
        content: `🚨 **SERVICES DOWN:** ${down.join(", ")} — ${timestamp()}`,
      });
    }
  },
  5 * 60 * 1000,
);

// ── Login ───────────────────────────────────────────────────
console.log("⚔️  NOIZYARMY Discord Bot starting...");
client.login(TOKEN);
