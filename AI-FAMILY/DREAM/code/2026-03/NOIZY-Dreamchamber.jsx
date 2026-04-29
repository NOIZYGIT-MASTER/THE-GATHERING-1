import { useState } from "react";

const COLORS = {
  bg: "#0a0a0f",
  card: "#12121a",
  cardHover: "#1a1a28",
  gold: "#c49a2a",
  goldLight: "#e8c547",
  blue: "#2e75b6",
  blueLight: "#5ba3e6",
  green: "#27ae60",
  red: "#c0392b",
  purple: "#8e44ad",
  cyan: "#00d4aa",
  white: "#f0f0f0",
  muted: "#888",
  dimText: "#666",
  border: "#2a2a3a",
};

const BRANDS = [
  { name: "NOIZYFISH", icon: "\uD83C\uDFA3", color: COLORS.blue, desc: "Artist Label", sub: "Home of RSP Descendants", status: "ACTIVE", artists: ["Nuhouse Porter"], details: "First RSP Descendant. Van Morrison meets Otis Redding meets Zucchero meets Memphis Horns meets Muscle Shoals meets Mavis Staples meets Neville Brothers meets Tower of Power meets Squeeze meets hybrid Canadian Northern Soul." },
  { name: "NOIZYVOX", icon: "\uD83C\uDFA4", color: COLORS.purple, desc: "Voice Contracts", sub: "75/25 artist-enforced splits", status: "BUILDING", artists: [], details: "Voice actor licensing marketplace. Every clone tracked. Every use billable. Revenue splits enforced by code, not contracts. Artist can pull their voice from any project instantly." },
  { name: "NOIZYKIDZ", icon: "\uD83D\uDEE1\uFE0F", color: COLORS.green, desc: "Child Voice Protection", sub: "Zero-storage. Parents hold the key.", status: "BUILDING", artists: [], details: "Children's voice data NEVER persisted. Ephemeral processing only. Per-interaction parental HVS Guardian consent. No blanket opt-ins. No buried checkboxes. A moral line in the sand." },
  { name: "NOIZYLAB", icon: "\u2699\uFE0F", color: COLORS.cyan, desc: "R&D Engine", sub: "Research & development", status: "BUILDING", artists: [], details: "The experimental lab where new NOIZY technology gets prototyped, stress-tested, and proven before it ships to the other brands. Where HVS evolves." },
];

const STACK = [
  { category: "VOICE BIOMETRICS", tool: "Resemblyzer", license: "Apache 2.0", purpose: "Voiceprint extraction & speaker verification", owned: true, vendor: "Self-hosted" },
  { category: "VOICE BIOMETRICS", tool: "pyannote.audio", license: "MIT", purpose: "Speaker diarization & real-time recognition", owned: true, vendor: "Self-hosted" },
  { category: "TTS ENGINE", tool: "Coqui TTS", license: "MPL 2.0", purpose: "Voice cloning from RSP_001 recordings", owned: true, vendor: "Self-hosted" },
  { category: "TTS ENGINE", tool: "Piper", license: "MIT", purpose: "Ultra-fast local TTS rendering", owned: true, vendor: "Mozilla" },
  { category: "AI BRAIN", tool: "Claude (Anthropic)", license: "API", purpose: "Central intelligence, orchestration, reasoning", owned: false, vendor: "Anthropic", note: "Trusted partner" },
  { category: "AI BRAIN", tool: "Gabriel on God", license: "Proprietary", purpose: "Recognition engine, context routing, HVS gateway", owned: true, vendor: "FISHMUSICINC" },
  { category: "INFRASTRUCTURE", tool: "Cloudflare D1", license: "Managed", purpose: "Cryptographic IP ledger, HVS registry", owned: false, vendor: "Cloudflare", note: "Data sovereignty maintained" },
  { category: "INFRASTRUCTURE", tool: "Cloudflare Workers", license: "Managed", purpose: "Edge compute, webhook handlers, API layer", owned: false, vendor: "Cloudflare", note: "Code is yours" },
  { category: "INFRASTRUCTURE", tool: "Cloudflare R2", license: "Managed", purpose: "Voice asset storage, zero egress fees", owned: false, vendor: "Cloudflare", note: "No lock-in" },
  { category: "BLOCKCHAIN", tool: "Arweave", license: "Decentralized", purpose: "Permanent IP registration, immutable audit trail", owned: true, vendor: "Permaweb" },
  { category: "BLOCKCHAIN", tool: "Polygon", license: "Open Source", purpose: "Smart contracts for revenue splits & consent", owned: true, vendor: "Decentralized" },
  { category: "DATA SOVEREIGNTY", tool: "The Aquarium", license: "Proprietary", purpose: "Local-first preference store, revocable tokens", owned: true, vendor: "FISHMUSICINC" },
  { category: "MUSIC PRODUCTION", tool: "Logic Pro", license: "Commercial", purpose: "Primary DAW for Nuhouse Porter", owned: false, vendor: "Apple", note: "Industry standard" },
  { category: "MUSIC PRODUCTION", tool: "Demucs", license: "MIT", purpose: "AI stem separation", owned: true, vendor: "Meta (open source)" },
  { category: "MUSIC PRODUCTION", tool: "iZotope", license: "Commercial", purpose: "Mastering chain", owned: false, vendor: "iZotope" },
  { category: "DISTRIBUTION", tool: "DistroKid", license: "Subscription", purpose: "Platform distribution, 100% royalties kept", owned: false, vendor: "DistroKid", note: "Interim — direct-to-fan via R2 is the goal" },
  { category: "MOBILE", tool: "React Native", license: "MIT", purpose: "Cross-platform HVS capture app", owned: true, vendor: "Self-built" },
  { category: "AUDIO NETWORK", tool: "MC 96 (Audio MIDI)", license: "Native", purpose: "Device audio routing across Apple ecosystem", owned: true, vendor: "Apple native" },
  { category: "LEGAL", tool: "ELVIS Act Compliance", license: "N/A", purpose: "Structural compliance — not policy, code-enforced", owned: true, vendor: "Built-in" },
];

const HVS_LAYERS = [
  { num: 1, name: "Voice Identity Capture", desc: "Acoustic signature + timestamp + device + language + emotion", status: 85 },
  { num: 2, name: "Speaker Recognition", desc: "Instant ID → history + style + depth + energy + timezone", status: 70 },
  { num: 3, name: "TTS Optimization", desc: "Hearing profile + device quality + voice pref + pronunciation", status: 50 },
  { num: 4, name: "Continuous Refinement", desc: "Every conversation teaches. Feedback → Aquarium → smarter", status: 40 },
  { num: 5, name: "IP Data Layer", desc: "Voice = registered asset. Every AI touch = billable event", status: 30 },
  { num: 6, name: "Preference Sovereignty", desc: "Local-first. Secure token. Revocable. Never centralized", status: 25 },
  { num: 7, name: "Creative Control Protocol", desc: "Rights encoded in code. Impossible to violate. Not a TOS", status: 20 },
];

const DEVICES = [
  { name: "Mac (Primary)", icon: "\uD83D\uDDA5\uFE0F", status: "ONLINE", mic: "Logitech USB (LOCKED)", audio: "MC 96 Network" },
  { name: "iPad Pro 12.9\"", icon: "\uD83D\uDCF1", status: "ONLINE", mic: "Built-in", audio: "AirPlay → MC 96" },
  { name: "iPhone 15 Pro Max", icon: "\uD83D\uDCF1", status: "ONLINE", mic: "Built-in + 3x Voice Recordings", audio: "AirPlay → MC 96" },
  { name: "RSP Beats", icon: "\uD83C\uDFA7", status: "OUTPUT ONLY", mic: "BLOCKED", audio: "Bluetooth A2DP" },
  { name: "Logitech C10 AT USB", icon: "\uD83C\uDFA5", status: "DEFAULT MIC", mic: "LOCKED AS PRIMARY", audio: "USB Direct" },
];

function ProgressBar({ value, color }) {
  return (
    <div style={{ width: "100%", height: 6, background: "#1a1a2a", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
    </div>
  );
}

function Tab({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 20px", border: "none", borderBottom: active ? `3px solid ${color || COLORS.gold}` : "3px solid transparent",
      background: "transparent", color: active ? COLORS.white : COLORS.muted, cursor: "pointer",
      fontSize: 14, fontWeight: active ? 700 : 400, fontFamily: "system-ui", transition: "all 0.2s",
      letterSpacing: 1,
    }}>{label}</button>
  );
}

function BrandCard({ brand, onClick, selected }) {
  return (
    <div onClick={onClick} style={{
      background: selected ? COLORS.cardHover : COLORS.card, border: `1px solid ${selected ? brand.color : COLORS.border}`,
      borderRadius: 12, padding: 20, cursor: "pointer", transition: "all 0.3s",
      boxShadow: selected ? `0 0 20px ${brand.color}33` : "none", flex: "1 1 200px", minWidth: 200,
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{brand.icon}</div>
      <div style={{ color: brand.color, fontSize: 18, fontWeight: 800, letterSpacing: 2, fontFamily: "system-ui" }}>{brand.name}</div>
      <div style={{ color: COLORS.white, fontSize: 13, marginTop: 4 }}>{brand.desc}</div>
      <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>{brand.sub}</div>
      <div style={{ marginTop: 10, display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
        background: brand.status === "ACTIVE" ? `${COLORS.green}22` : `${COLORS.gold}22`,
        color: brand.status === "ACTIVE" ? COLORS.green : COLORS.gold, letterSpacing: 1,
      }}>{brand.status}</div>
    </div>
  );
}

export default function Dreamchamber() {
  const [activeTab, setActiveTab] = useState("COMMAND");
  const [selectedBrand, setSelectedBrand] = useState(0);
  const [stackFilter, setStackFilter] = useState("ALL");
  const [expandedLayer, setExpandedLayer] = useState(null);

  const categories = ["ALL", ...Array.from(new Set(STACK.map(s => s.category)))];
  const filteredStack = stackFilter === "ALL" ? STACK : STACK.filter(s => s.category === stackFilter);

  return (
    <div style={{ background: COLORS.bg, color: COLORS.white, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", padding: 0 }}>
      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #0d0d15 0%, #1a1025 50%, #0d1520 100%)", borderBottom: `1px solid ${COLORS.border}`, padding: "30px 40px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: COLORS.gold, letterSpacing: 4, fontWeight: 700, marginBottom: 6 }}>FISHMUSICINC.COM PRESENTS</div>
            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 3, background: "linear-gradient(90deg, #c49a2a, #e8c547, #c49a2a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              THE DREAMCHAMBER
            </div>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4, letterSpacing: 1 }}>NOIZY ECOSYSTEM \u2022 100% GORUNFREE \u2022 ARTIST-FIRST VOICE INTELLIGENCE</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.gold }}>RSP_001</div>
                <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2 }}>MASTER HVS</div>
              </div>
              <div style={{ width: 1, height: 40, background: COLORS.border }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.green }}>4</div>
                <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2 }}>BRANDS</div>
              </div>
              <div style={{ width: 1, height: 40, background: COLORS.border }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.blue }}>7</div>
                <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2 }}>HVS LAYERS</div>
              </div>
              <div style={{ width: 1, height: 40, background: COLORS.border }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.cyan }}>{STACK.length}</div>
                <div style={{ fontSize: 10, color: COLORS.muted, letterSpacing: 2 }}>STACK TOOLS</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0, marginTop: 24 }}>
          {["COMMAND", "BRANDS", "HVS LAYERS", "TECH STACK", "MC 96 NETWORK", "NUHOUSE PORTER"].map(t => (
            <Tab key={t} label={t} active={activeTab === t} onClick={() => setActiveTab(t)} />
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "30px 40px" }}>

        {/* COMMAND CENTER */}
        {activeTab === "COMMAND" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 30 }}>
              {BRANDS.map((b, i) => <BrandCard key={b.name} brand={b} onClick={() => { setSelectedBrand(i); setActiveTab("BRANDS"); }} />)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* HVS Status */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 12, color: COLORS.gold, letterSpacing: 3, fontWeight: 700, marginBottom: 16 }}>HVS SYSTEM STATUS</div>
                {HVS_LAYERS.map(l => (
                  <div key={l.num} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: COLORS.white }}><span style={{ color: COLORS.gold, fontWeight: 700 }}>L{l.num}</span> {l.name}</span>
                      <span style={{ fontSize: 11, color: l.status >= 70 ? COLORS.green : l.status >= 40 ? COLORS.gold : COLORS.muted }}>{l.status}%</span>
                    </div>
                    <ProgressBar value={l.status} color={l.status >= 70 ? COLORS.green : l.status >= 40 ? COLORS.gold : COLORS.blue} />
                  </div>
                ))}
              </div>

              {/* Tomorrow's Mission */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 12, color: COLORS.cyan, letterSpacing: 3, fontWeight: 700, marginBottom: 16 }}>TOMORROW \u2022 MARCH 24, 2026</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, marginBottom: 4 }}>RSP_001 CREATION</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>3 voice recordings on iPhone 15 Pro Max → Extract acoustic signature → Build voiceprint → Register as first HVS entry</div>
                </div>
                <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.blue, marginBottom: 4 }}>PIPELINE</div>
                  {["Pull recordings from iPhone", "Process through Resemblyzer", "Generate RSP_001 voiceprint hash", "Register in Cloudflare D1 ledger", "Store in Arweave (permanent)", "Feed to Coqui TTS for voice model", "Test Gabriel recognition"].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.muted }}>{i + 1}</div>
                      <span style={{ fontSize: 12, color: COLORS.white }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sovereignty Score */}
            <div style={{ background: "linear-gradient(135deg, #1a1025, #0d1520)", border: `1px solid ${COLORS.gold}33`, borderRadius: 12, padding: 24, marginTop: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: COLORS.gold, letterSpacing: 3, fontWeight: 700 }}>SOVEREIGNTY SCORE</div>
                  <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Percentage of stack that is self-owned, open source, or artist-controlled</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: COLORS.gold }}>{Math.round(STACK.filter(s => s.owned).length / STACK.length * 100)}%</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2 }}>GORUNFREE</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: COLORS.green }}>{STACK.filter(s => s.owned).length}/{STACK.length}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2 }}>TOOLS SOVEREIGN</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: COLORS.red }}>0</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2 }}>VENDOR LOCK-INS</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BRANDS */}
        {activeTab === "BRANDS" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              {BRANDS.map((b, i) => (
                <button key={b.name} onClick={() => setSelectedBrand(i)} style={{
                  padding: "8px 20px", borderRadius: 8, border: `1px solid ${selectedBrand === i ? b.color : COLORS.border}`,
                  background: selectedBrand === i ? `${b.color}22` : "transparent", color: selectedBrand === i ? b.color : COLORS.muted,
                  cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: 1, fontFamily: "system-ui",
                }}>{b.name}</button>
              ))}
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${BRANDS[selectedBrand].color}44`, borderRadius: 16, padding: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 48 }}>{BRANDS[selectedBrand].icon}</span>
                <div>
                  <div style={{ color: BRANDS[selectedBrand].color, fontSize: 28, fontWeight: 900, letterSpacing: 3 }}>{BRANDS[selectedBrand].name}</div>
                  <div style={{ color: COLORS.muted, fontSize: 14 }}>{BRANDS[selectedBrand].desc} \u2022 {BRANDS[selectedBrand].sub}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: COLORS.white, lineHeight: 1.7, marginBottom: 20 }}>{BRANDS[selectedBrand].details}</div>
              {BRANDS[selectedBrand].artists.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: COLORS.gold, letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>ARTISTS</div>
                  {BRANDS[selectedBrand].artists.map(a => (
                    <div key={a} style={{ display: "inline-block", padding: "6px 16px", background: `${BRANDS[selectedBrand].color}22`, border: `1px solid ${BRANDS[selectedBrand].color}44`, borderRadius: 8, marginRight: 8, fontSize: 13, fontWeight: 600 }}>{a}</div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 20, padding: "12px 16px", background: `${COLORS.gold}11`, border: `1px solid ${COLORS.gold}33`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: COLORS.gold, letterSpacing: 2, fontWeight: 700 }}>PARENT</div>
                <div style={{ fontSize: 14, color: COLORS.white, marginTop: 4 }}>FISHMUSICINC.COM</div>
              </div>
            </div>
          </div>
        )}

        {/* HVS LAYERS */}
        {activeTab === "HVS LAYERS" && (
          <div>
            <div style={{ fontSize: 12, color: COLORS.gold, letterSpacing: 3, fontWeight: 700, marginBottom: 20 }}>ARTIST-FIRST VOICE INTELLIGENCE SYSTEM 2.0 \u2022 SEVEN LAYERS</div>
            {HVS_LAYERS.map(l => (
              <div key={l.num} onClick={() => setExpandedLayer(expandedLayer === l.num ? null : l.num)} style={{
                background: expandedLayer === l.num ? COLORS.cardHover : COLORS.card,
                border: `1px solid ${expandedLayer === l.num ? COLORS.gold : COLORS.border}`,
                borderRadius: 12, padding: 20, marginBottom: 12, cursor: "pointer", transition: "all 0.3s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${COLORS.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: COLORS.gold }}>{l.num}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.white }}>{l.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}>{l.desc}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 80 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: l.status >= 70 ? COLORS.green : l.status >= 40 ? COLORS.gold : COLORS.blue }}>{l.status}%</div>
                    <ProgressBar value={l.status} color={l.status >= 70 ? COLORS.green : l.status >= 40 ? COLORS.gold : COLORS.blue} />
                  </div>
                </div>
                {expandedLayer === l.num && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${COLORS.border}`, fontSize: 13, color: COLORS.muted, lineHeight: 1.6 }}>
                    {l.num === 1 && "Every voice input across every device in MC 96 tagged with: acoustic signature hash, HVS biometric ID, timestamp + device origin, language + accent + speech rate, emotional tone markers (calm/excited/frustrated/focused). Encrypted at point of capture. Flows to the Aquarium, never to corporate training pipelines."}
                    {l.num === 2 && "Gabriel performs instant speaker ID. \"That's Rob. HVS-2026-CA-0001.\" Pulls: conversation history, preferred response style, technical depth (layman/engineer/architect), energy level, timezone. Voice IS authentication. No login needed. Works for anyone, any language, anywhere on Earth."}
                    {l.num === 3 && "Before ANY AI speaks back: check hearing profile, device speaker quality, preferred voice gender + accent + speed, technical term pronunciation (how YOU say Kubernetes), emotional cadence (warmth/urgency/casual confidence). Response rendered specifically for YOU. Not generic."}
                    {l.num === 4 && "Every conversation teaches. TTS clarity problem? Pronunciation update. Responding faster/slower than usual? Engagement signal — adjust pacing. Feedback flows to Aquarium. Next interaction, the system is smarter. Continuous, artist-driven evolution."}
                    {l.num === 5 && "Voice is a blockchain-registered asset in Cloudflare D1 + Arweave. Every AI touch is a billable event. \"Artist fingerprint touched 47 times this month. Revenue: $2,350.\" Deactivate any derivative instantly. Not after a lawsuit. Instantly."}
                    {l.num === 6 && "Preference DNA stored on YOUR machine. Secure token governs access. Revoke at any moment. Leave a platform? Preferences leave with you. No behavioral data hostage. The Aquarium is local-first, inspectable, transparent."}
                    {l.num === 7 && "Creative rights encoded in CODE, not Terms of Service. Cryptographic consent gates — no key, no access. Granular, revocable, auditable. Voice cannot be cloned without HVS authentication. Derivative work cannot be created without origin artist's cryptographic consent. If the code says no, the system cannot proceed. Period."}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TECH STACK */}
        {activeTab === "TECH STACK" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {categories.map(c => (
                <button key={c} onClick={() => setStackFilter(c)} style={{
                  padding: "6px 14px", borderRadius: 6, border: `1px solid ${stackFilter === c ? COLORS.gold : COLORS.border}`,
                  background: stackFilter === c ? `${COLORS.gold}22` : "transparent", color: stackFilter === c ? COLORS.gold : COLORS.muted,
                  cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: 1, fontFamily: "system-ui",
                }}>{c}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {filteredStack.map((s, i) => (
                <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.white }}>{s.tool}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{s.category}</div>
                    </div>
                    <div style={{
                      padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                      background: s.owned ? `${COLORS.green}22` : `${COLORS.blue}22`,
                      color: s.owned ? COLORS.green : COLORS.blue,
                    }}>{s.owned ? "SOVEREIGN" : "PARTNER"}</div>
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.white, marginTop: 8, lineHeight: 1.5 }}>{s.purpose}</div>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <span style={{ fontSize: 10, color: COLORS.dimText }}>{s.license}</span>
                    <span style={{ fontSize: 10, color: COLORS.dimText }}>{s.vendor}</span>
                  </div>
                  {s.note && <div style={{ fontSize: 10, color: COLORS.gold, marginTop: 6, fontStyle: "italic" }}>{s.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MC 96 NETWORK */}
        {activeTab === "MC 96 NETWORK" && (
          <div>
            <div style={{ fontSize: 12, color: COLORS.cyan, letterSpacing: 3, fontWeight: 700, marginBottom: 20 }}>MC 96 ECO UNIVERSE \u2022 DEVICE NETWORK</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
              {DEVICES.map((d, i) => (
                <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{d.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.white }}>{d.name}</div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: COLORS.muted }}>STATUS</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: d.status === "ONLINE" || d.status === "DEFAULT MIC" ? COLORS.green : d.status === "OUTPUT ONLY" ? COLORS.gold : COLORS.muted }}>{d.status}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: COLORS.muted }}>MIC</span>
                      <span style={{ fontSize: 11, color: d.mic.includes("LOCKED") || d.mic.includes("BLOCKED") ? COLORS.gold : COLORS.white }}>{d.mic}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: COLORS.muted }}>AUDIO</span>
                      <span style={{ fontSize: 11, color: COLORS.white }}>{d.audio}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.gold}33`, borderRadius: 12, padding: 24, marginTop: 20 }}>
              <div style={{ fontSize: 12, color: COLORS.gold, letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>MIC LOCK SERVICE</div>
              <div style={{ fontSize: 13, color: COLORS.white, lineHeight: 1.6 }}>
                mc96-mic-lock.sh polls every 2 seconds. If any device (RSP Beats, Bluetooth, anything) tries to hijack the input, it snaps back to Logitech USB within 2 seconds. Runs as launchd service — survives reboots, sleep/wake, all Bluetooth reconnections. RSP Beats forced to Output Only / A2DP codec.
              </div>
            </div>
          </div>
        )}

        {/* NUHOUSE PORTER */}
        {activeTab === "NUHOUSE PORTER" && (
          <div>
            <div style={{ background: "linear-gradient(135deg, #1a1025, #0d1520)", border: `1px solid ${COLORS.blue}44`, borderRadius: 16, padding: 32, marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.gold, letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>NOIZYFISH \u2022 RSP DESCENDANT #001</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.white, letterSpacing: 2, marginBottom: 8 }}>NUHOUSE PORTER</div>
              <div style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.7, maxWidth: 700 }}>
                First RSP Descendant. The voice of Robert Stephen Plowman channeled through a transatlantic soul architecture that nobody else on earth is running.
              </div>
            </div>
            <div style={{ fontSize: 12, color: COLORS.gold, letterSpacing: 3, fontWeight: 700, marginBottom: 16 }}>SONIC DNA</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { name: "Van Morrison", vibe: "Mystic vocal stream", color: "#8e44ad" },
                { name: "Otis Redding", vibe: "Raw chest-voice gut-punch", color: "#c0392b" },
                { name: "Zucchero", vibe: "Mediterranean gravel & grit", color: "#d4a017" },
                { name: "Memphis Horns", vibe: "Brass that hits the sternum", color: "#e67e22" },
                { name: "Muscle Shoals", vibe: "Swampy behind-the-beat pocket", color: "#27ae60" },
                { name: "Mavis Staples", vibe: "Gospel-soul fire", color: "#f39c12" },
                { name: "Neville Brothers", vibe: "NOLA second-line groove", color: "#2ecc71" },
                { name: "Tower of Power", vibe: "East Bay horn precision", color: "#3498db" },
                { name: "Squeeze", vibe: "British pop craftsmanship", color: "#9b59b6" },
                { name: "Canadian Northern Soul", vibe: "Cold climate, warm soul", color: "#1abc9c" },
              ].map(s => (
                <div key={s.name} style={{ background: COLORS.card, border: `1px solid ${s.color}44`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{s.vibe}</div>
                </div>
              ))}
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.cyan, letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>VOICE FOUNDATION</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold }}>RSP_001</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>Master voiceprint \u2022 3 recordings on iPhone 15 Pro Max \u2022 Creation: March 24, 2026</div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.blue }}>Production</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>Logic Pro \u2022 Demucs stem separation \u2022 iZotope mastering \u2022 MC 96 audio network</div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.green }}>Distribution</div>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>DistroKid (interim) \u2022 Direct-to-fan via Cloudflare R2 (goal) \u2022 100% royalties retained</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 11, color: COLORS.dimText, letterSpacing: 1 }}>FISHMUSICINC.COM \u2022 NOIZYFISH \u2022 NOIZYVOX \u2022 NOIZYKIDZ \u2022 NOIZYLAB</div>
        <div style={{ fontSize: 11, color: COLORS.dimText }}>The voice is the asset. The artist is the authority. The code is the law.</div>
        <div style={{ fontSize: 11, color: COLORS.gold }}>Robert Stephen Plowman \u2022 2026</div>
      </div>
    </div>
  );
}
