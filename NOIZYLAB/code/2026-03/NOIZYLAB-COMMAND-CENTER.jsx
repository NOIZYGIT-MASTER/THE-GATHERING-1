import { useState, useEffect } from "react";

const AMBER = "#F59E0B";
const CYAN = "#06B6D4";
const GREEN = "#10B981";
const RED = "#EF4444";
const PURPLE = "#A855F7";
const DARK = "#020409";

const mono = { fontFamily: "'JetBrains Mono', monospace" };
const serif = { fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 };

// ── MOCK DATA ──────────────────────────────────────────
const WORKERS = [
  { name: "HEAVEN",        role: "Master Router",     status: "live",  url: "noizy.ai/api/*",     calls: 1247 },
  { name: "VOICE",         role: "Mobile Command",    status: "live",  url: "noizy.ai/voice",     calls: 389  },
  { name: "GABRIEL-AGENT", role: "Heavy Execution",   status: "live",  url: "gabriel.noizy.ai",   calls: 644  },
  { name: "LUCY-AGENT",    role: "Archive Search",    status: "live",  url: "lucy.noizy.ai",      calls: 211  },
  { name: "SHIRL-AGENT",   role: "Support Layer",     status: "ready", url: "shirl.noizy.ai",     calls: 0    },
  { name: "POPS-AGENT",    role: "Wisdom/Guidance",   status: "ready", url: "pops.noizy.ai",      calls: 0    },
  { name: "DREAM-AGENT",   role: "Creative Vision",   status: "ready", url: "dream.noizy.ai",     calls: 0    },
  { name: "ENGR-KEITH",    role: "Technical Debug",   status: "ready", url: "keith.noizy.ai",     calls: 0    },
];

const CRONS = [
  { expr: "*/15 * * * *", name: "heartbeat",       last: "3 min ago",  status: "ok"      },
  { expr: "0 * * * *",    name: "aquarium_scan",   last: "41 min ago", status: "ok"      },
  { expr: "0 6 * * *",    name: "daily_brief",     last: "2h ago",     status: "ok"      },
  { expr: "0 */4 * * *",  name: "kv_cleanup",      last: "1h ago",     status: "ok"      },
  { expr: "0 0 * * 0",    name: "weekly_report",   last: "6 days ago", status: "ok"      },
  { expr: "0 9 * * 1-5",  name: "agent_warmup",    last: "5h ago",     status: "ok"      },
  { expr: "30 23 * * *",  name: "memory_snapshot", last: "7h ago",     status: "pending" },
];

const D1_DBS = [
  { name: "noizy_core",     tables: ["agent_log","system_events","memcells"],   rows: 4821 },
  { name: "hvs_registry",   tables: ["hvs_registry","royalty_events"],          rows: 12   },
  { name: "royalty_ledger", tables: ["royalty_events"],                          rows: 3    },
  { name: "aquarium_index", tables: ["aquarium_index"],                          rows: 892  },
];

const KV_NS = [
  { name: "MEMORY",    keys: 315, desc: "MEMCELLs + agent memory"       },
  { name: "SYSTEM",    keys: 12,  desc: "Health, briefs, snapshots"      },
  { name: "ALERTS",    keys: 0,   desc: "Downtime alerts"                },
  { name: "ROYALTIES", keys: 4,   desc: "Real-time royalty totals"       },
  { name: "TEMP",      keys: 7,   desc: "Short-lived scratch data"       },
];

const R2_BUCKETS = [
  { name: "the-aquarium",    size: "34TB", objects: 892,  desc: "Heritage music archive" },
  { name: "voice-dna-models",size: "2.1GB",objects: 3,   desc: "Trained voice models"   },
  { name: "noizy-assets",    size: "840MB",objects: 147,  desc: "Public assets"          },
];

const NETWORK = [
  { id: "GOD",            ip: "10.90.90.10", machine: "Mac Studio M2 Ultra 192GB", status: "online", role: "Primary" },
  { id: "GABRIEL",        ip: "10.90.90.20", machine: "HP Omen Windows",           status: "online", role: "Execution" },
  { id: "DaFixer",        ip: "10.90.90.40", machine: "MacBook Pro",               status: "online", role: "Utility"   },
  { id: "Switch",         ip: "10.90.90.90", machine: "D-Link DGS1210-10",         status: "online", role: "Network"   },
];

const AI_STACK = [
  { model: "claude-sonnet-4-20250514", type: "Cloud",  use: "Primary intelligence",    status: "active" },
  { model: "gemma2",                   type: "Local",  use: "Fast sovereign tasks",    status: "active" },
  { model: "xtts-v2",                  type: "Local",  use: "Voice synthesis",         status: "active" },
  { model: "musicgen",                 type: "Local",  use: "Music generation",        status: "active" },
  { model: "fish-speech",              type: "Local",  use: "Alternative TTS",         status: "ready"  },
  { model: "rvc",                      type: "Local",  use: "Voice conversion",        status: "ready"  },
];

// ── COMPONENTS ─────────────────────────────────────────
function Badge({ children, color = AMBER, textColor = DARK }) {
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 2, fontSize: 10,
      fontWeight: 700, letterSpacing: "0.08em",
      background: color + "22", color: color, border: `0.5px solid ${color}44`
    }}>{children}</span>
  );
}

function StatusDot({ status }) {
  const c = status === "online" || status === "live" || status === "ok" || status === "active" ? GREEN
          : status === "pending" || status === "ready" ? AMBER : RED;
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: c, marginRight: 6 }} />;
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 8,
      background: "rgba(255,255,255,0.02)", padding: "1rem 1.1rem", ...style
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>{children}</p>;
}

// ── TABS ───────────────────────────────────────────────
const TABS = ["Workers", "Crons", "D1 + KV", "R2 Storage", "AI Stack", "Network", "Deploy"];

export default function App() {
  const [tab, setTab] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: DARK, color: "#fff", minHeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
      {/* HEADER */}
      <div style={{ padding: "1.5rem 1rem 0.5rem", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: "0.35em", color: AMBER, textTransform: "uppercase", marginBottom: 3 }}>NOIZYLAB · MC96ECOUNIVERSE</p>
            <h1 style={{ ...serif, fontSize: "clamp(22px,5vw,36px)", letterSpacing: "0.1em", lineHeight: 1 }}>Infrastructure <span style={{ color: AMBER }}>Command Center</span></h1>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge color={GREEN}>● SYSTEM ONLINE</Badge>
            <Badge color={AMBER}>GORUNFREE</Badge>
            <Badge color={CYAN}>RSP_001</Badge>
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: "1rem" }}>
          {[
            { n: WORKERS.filter(w => w.status === "live").length + "/" + WORKERS.length, l: "Workers live" },
            { n: CRONS.length, l: "Cron loops" },
            { n: D1_DBS.reduce((s, d) => s + d.rows, 0).toLocaleString(), l: "D1 rows" },
            { n: KV_NS.reduce((s, k) => s + k.keys, 0), l: "KV keys" },
            { n: "34TB", l: "AQUARIUM" },
            { n: AI_STACK.filter(a => a.status === "active").length, l: "AI models active" },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "8px 14px", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 4, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: AMBER, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* TAB BAR */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              padding: "6px 14px", borderRadius: 2, border: "0.5px solid",
              borderColor: tab === i ? AMBER : "rgba(255,255,255,0.1)",
              background: tab === i ? AMBER : "transparent",
              color: tab === i ? DARK : "rgba(255,255,255,0.45)",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
              cursor: "pointer", fontFamily: "inherit",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* PANELS */}
      <div style={{ padding: "1.25rem 1rem 2rem", maxWidth: 900, margin: "0 auto" }}>

        {/* WORKERS */}
        {tab === 0 && (
          <div>
            <SectionLabel>Cloudflare Workers — {WORKERS.length} registered · {WORKERS.filter(w => w.status === "live").length} live</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
              {WORKERS.map((w, i) => (
                <Card key={i} style={{ borderTop: `2px solid ${w.status === "live" ? GREEN : AMBER}` }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                    <StatusDot status={w.status} />
                    <span style={{ ...mono, fontSize: 13, fontWeight: 700 }}>{w.name}</span>
                    <span style={{ marginLeft: "auto" }}><Badge color={w.status === "live" ? GREEN : AMBER}>{w.status}</Badge></span>
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{w.role}</p>
                  <p style={{ ...mono, fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 6 }}>{w.url}</p>
                  {w.calls > 0 && <p style={{ fontSize: 11, color: AMBER }}>{w.calls.toLocaleString()} calls today</p>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* CRONS */}
        {tab === 1 && (
          <div>
            <SectionLabel>Scheduled Cron Loops — {CRONS.length} active</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              {CRONS.map((c, i) => (
                <Card key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <StatusDot status={c.status} />
                    <span style={{ ...mono, fontSize: 12, color: AMBER, minWidth: 120 }}>{c.expr}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Last: {c.last}</span>
                    <Badge color={c.status === "ok" ? GREEN : AMBER}>{c.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "1rem", border: `0.5px solid ${CYAN}33`, borderRadius: 8, background: `${CYAN}08` }}>
              <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: CYAN, marginBottom: 6 }}>GORUNFREE Cron Command</p>
              <p style={{ ...mono, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>wrangler triggers deploy --name=heaven</p>
            </div>
          </div>
        )}

        {/* D1 + KV */}
        {tab === 2 && (
          <div>
            <SectionLabel>D1 Databases — {D1_DBS.length} databases</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: 20 }}>
              {D1_DBS.map((d, i) => (
                <Card key={i} style={{ borderTop: `2px solid ${AMBER}` }}>
                  <p style={{ ...mono, fontSize: 12, fontWeight: 700, color: AMBER, marginBottom: 6 }}>{d.name}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{d.tables.join(" · ")}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{d.rows.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>rows</p>
                </Card>
              ))}
            </div>

            <SectionLabel>KV Namespaces — {KV_NS.length} active</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              {KV_NS.map((k, i) => (
                <Card key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: CYAN, minWidth: 100 }}>{k.name}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{k.desc}</span>
                    <span style={{ marginLeft: "auto", fontSize: 16, fontWeight: 700, color: k.keys > 0 ? "#fff" : "rgba(255,255,255,0.3)" }}>{k.keys}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>keys</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* R2 */}
        {tab === 3 && (
          <div>
            <SectionLabel>R2 Buckets — Cloudflare Object Storage</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {R2_BUCKETS.map((b, i) => (
                <Card key={i} style={{ borderTop: `2px solid ${PURPLE}` }}>
                  <p style={{ ...mono, fontSize: 12, fontWeight: 700, color: PURPLE, marginBottom: 4 }}>{b.name}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>{b.desc}</p>
                  <p style={{ fontSize: 28, fontWeight: 700, color: AMBER, lineHeight: 1 }}>{b.size}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{b.objects.toLocaleString()} objects</p>
                </Card>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "1rem 1.25rem", border: `0.5px solid ${AMBER}33`, borderRadius: 8, background: `${AMBER}03` }}>
              <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: AMBER, marginBottom: 8 }}>THE AQUARIUM</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.75 }}>34TB heritage archive. 40 years of Fish Music Inc. productions — Ed Edd n Eddy, Dragon Tales, Johnny Test, Transformers, Barbie. The founding provenance dataset for NOIZY.ai and the Creator Consent Protocol.</p>
            </div>
          </div>
        )}

        {/* AI STACK */}
        {tab === 4 && (
          <div>
            <SectionLabel>SUPERSONIC AI STACK v2.0 — {AI_STACK.filter(a => a.status === "active").length} models active</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 16 }}>
              {AI_STACK.map((m, i) => (
                <Card key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <StatusDot status={m.status} />
                    <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: m.status === "active" ? "#fff" : "rgba(255,255,255,0.4)" }}>{m.model}</span>
                    <Badge color={m.type === "Cloud" ? CYAN : GREEN}>{m.type}</Badge>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{m.use}</span>
                    <span style={{ marginLeft: "auto" }}><Badge color={m.status === "active" ? GREEN : AMBER}>{m.status}</Badge></span>
                  </div>
                </Card>
              ))}
            </div>
            <Card style={{ border: `0.5px solid ${CYAN}33`, background: `${CYAN}04` }}>
              <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: CYAN, marginBottom: 8 }}>Smart AI Router — /api/ai/route</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.75 }}>Automatically routes to the right model: Claude for creative/complex tasks, Gemma2 for fast local classification, XTTS for voice synthesis. No manual model selection required. GORUNFREE.</p>
            </Card>
          </div>
        )}

        {/* NETWORK */}
        {tab === 5 && (
          <div>
            <SectionLabel>MC96ECO Network — 10.90.90.x</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {NETWORK.map((n, i) => (
                <Card key={i} style={{ borderTop: `2px solid ${GREEN}` }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                    <StatusDot status={n.status} />
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{n.id}</span>
                    <span style={{ marginLeft: "auto" }}><Badge color={n.status === "online" ? GREEN : RED}>{n.status}</Badge></span>
                  </div>
                  <p style={{ ...mono, fontSize: 12, color: AMBER, marginBottom: 4 }}>{n.ip}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{n.machine}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{n.role}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* DEPLOY */}
        {tab === 6 && (
          <div>
            <SectionLabel>GORUNFREE Deploy — One command. Everything executes.</SectionLabel>
            <div style={{ background: "#0a0d1a", borderRadius: 8, padding: "1.25rem", border: `0.5px solid ${AMBER}33`, marginBottom: 16 }}>
              <p style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: AMBER, marginBottom: 10 }}>Quick Deploy Sequence</p>
              {[
                ["1.", "wrangler secret put ANTHROPIC_API_KEY"],
                ["2.", "wrangler secret put RSP001_AUTH_KEY"],
                ["3.", "wrangler d1 create noizy_core"],
                ["4.", "# Update wrangler.toml with D1 IDs"],
                ["5.", "chmod +x scripts/deploy.sh"],
                ["6.", "./scripts/deploy.sh production"],
              ].map(([n, cmd], i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                  <span style={{ ...mono, fontSize: 11, color: AMBER, flexShrink: 0 }}>{n}</span>
                  <span style={{ ...mono, fontSize: 11, color: cmd.startsWith("#") ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.75)" }}>{cmd}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Workers deployed", val: `${WORKERS.filter(w => w.status === "live").length}/${WORKERS.length}`, color: GREEN },
                { label: "D1 databases", val: D1_DBS.length, color: AMBER },
                { label: "KV namespaces", val: KV_NS.length, color: CYAN },
                { label: "R2 buckets", val: R2_BUCKETS.length, color: PURPLE },
                { label: "Cron loops", val: CRONS.length, color: GREEN },
                { label: "AI models", val: AI_STACK.length, color: AMBER },
              ].map((s, i) => (
                <Card key={i}>
                  <p style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</p>
                </Card>
              ))}
            </div>

            <Card style={{ border: `0.5px solid ${GREEN}33`, background: `${GREEN}04`, textAlign: "center" }}>
              <p style={{ ...serif, fontSize: "clamp(18px,3vw,26px)", fontStyle: "italic", color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                "One command. Everything executes. Maximum automation. Zero friction."
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>GORUNFREE · RSP_001 · MC96ECOUNIVERSE</p>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
