import { useState, useEffect, useRef } from "react";

const C = {
  amber: "#F59E0B", cyan: "#06B6D4", purple: "#A855F7",
  green: "#10B981", orange: "#F97316", blue: "#60A5FA",
  dark: "#020409", ink: "#0A0F1E", muted: "#6B7280",
  white: "#FFFFFF", offwhite: "#F9FAFB", gold: "#D97706",
};

const AUDIENCES = {
  ALL: { label: "UNIVERSAL", color: C.amber, accent: C.cyan },
  ANTHROPIC: { label: "ANTHROPIC", color: "#7C3AED", accent: "#A78BFA" },
  APPLE: { label: "APPLE", color: "#1D1D1F", accent: "#86868B" },
  GOOGLE: { label: "GOOGLE", color: "#1A73E8", accent: "#4285F4" },
};

const STATS = [
  { n: "40", label: "Years of\nProfessional Credits" },
  { n: "34TB", label: "THE AQUARIUM\nArchive" },
  { n: "200+", label: "Cultural Contexts\nMapped" },
  { n: "5", label: "Brands\nOne Ecosystem" },
  { n: "75%", label: "Artist Revenue\nSplit" },
  { n: "60+", label: "Cloudflare Workers\nBuilt" },
];

const PILLARS = [
  {
    icon: "◈",
    title: "ARTIST CREATOR FIRST",
    body: "Every platform in the AI audio space was built on human creative work without adequate consent, credit, or compensation. NOIZY reverses this completely. 75/25 perpetual splits. No buyout clauses. Consent encoded as infrastructure.",
    tags: ["ANTHROPIC", "ALL"],
  },
  {
    icon: "◉",
    title: "ACCESSIBILITY IS ARCHITECTURE",
    body: "Rob Plowman lives with a C3 spinal injury. GORUNFREE — one command accomplishes everything — was born from necessity. NOIZYKIDZ delivers music through haptic vibration. LIFELUV is AI companionship for people who need it most. None of this is retrofit. All of it is core design.",
    tags: ["APPLE", "ALL"],
  },
  {
    icon: "◎",
    title: "CULTURAL INTELLIGENCE",
    body: "200+ cultural audio contexts. Not genre tags — actual sonic memory. Rhythm patterns, harmonic relationships, textural qualities that carry meaning for specific communities globally. Built with human experts from those cultures, not inferred from biased training data.",
    tags: ["GOOGLE", "ALL"],
  },
  {
    icon: "◐",
    title: "SOVEREIGN STACK",
    body: "The entire SUPERSONIC AI STACK v2.0 runs locally on GOD — a Mac Studio M2 Ultra with 192GB RAM. Air-gap capable. Zero cloud dependency required. 9 layers. 19 models. $16,000+/year in API savings. Built for permanence, not platform dependency.",
    tags: ["ANTHROPIC", "ALL"],
  },
  {
    icon: "◑",
    title: "CONSENT AS CODE",
    body: "No voice, no archive, no creative asset enters the NOIZY ecosystem without documented permission and a provenance chain. NOIZYVOX is the first AI voice guild built on hard law — not checkbox UX. The artists who made AI possible deserve to own what comes next.",
    tags: ["ANTHROPIC", "GOOGLE", "ALL"],
  },
  {
    icon: "◒",
    title: "THE 500-YEAR VISION",
    body: "Most tech companies plan in quarters. NOIZY plans in centuries. THE AQUARIUM is a contribution to the cultural record — 34TB of original creative work spanning 40 years. The cultural intelligence layer preserves sonic traditions that globalization threatens to erase.",
    tags: ["ALL"],
  },
];

const BRANDS = [
  { name: "NOIZY.ai", role: "Flagship AI Audio Platform", color: C.amber, status: "LIVE", detail: "200 cultural contexts · Signal-reactive · SUPERSONIC STACK v2.0" },
  { name: "NOIZYVOX", role: "AI Voice Artist Guild", color: C.purple, status: "IN PROGRESS", detail: "75/25 perpetual splits · Consent-first · RSP_001 is voice #0001" },
  { name: "NOIZYLAB", role: "Ottawa Tech Command Center", color: C.green, status: "Q2 2026", detail: "CPU repair · Physical infrastructure · $389K projected annual" },
  { name: "NOIZYKIDZ", role: "Haptic Music & Accessibility", color: C.orange, status: "Q3 2026", detail: "Music felt through the body · For Nims · LIFELUV integration" },
  { name: "FISH MUSIC INC.", role: "Heritage Catalog (est. 1996)", color: C.blue, status: "ACTIVE", detail: "34TB THE AQUARIUM · Ed Edd n Eddy · Dragon Tales · Transformers" },
];

const PARTNERSHIPS = {
  ANTHROPIC: {
    hook: "You want AI that serves human creativity. We built it.",
    points: [
      "Privacy-first: 34TB sovereign archive, zero data leaves without permission",
      "Accessibility-first: GORUNFREE + NOIZYKIDZ + LIFELUV — designed in, not bolted on",
      "Artist-first: 75/25 splits, consent-as-code — the ethical AI audio model",
      "Human-AI creative partnership: NOIZY itself was built with Claude — it IS the proof",
    ],
    close: "This is not a fellowship application. It is a working implementation of everything you say you want AI to do in the world.",
  },
  APPLE: {
    hook: "You made accessibility a product category. We made it the founding condition.",
    points: [
      "NOIZYKIDZ + Taptic Engine: haptic music for children with hearing differences",
      "NOIZYVOX + Voice accessibility: ethical AI voice in the Apple ecosystem",
      "GORUNFREE: voice-first interface design that out-innovates anything retrofitted",
      "NOIZY.ai + Apple Music: 200-cultural-context intelligence for international expansion",
    ],
    close: "Apple built the world's most accessible major platform. NOIZY built audio for the people your platform exists to serve.",
  },
  GOOGLE: {
    hook: "You have the distribution. We have the cultural intelligence.",
    points: [
      "Gemma2 already in the SUPERSONIC STACK — the integration is half done",
      "200-cultural-context engine: the missing layer for YouTube Music globally",
      "Google Workspace: GABRIEL agent automation built on your infrastructure",
      "NOIZYVOX: the ethical voice guild YouTube Music needs before legislation forces it",
    ],
    close: "Google has reach across every culture on earth. NOIZY has the sonic intelligence to serve them authentically.",
  },
};

const useCounter = (target, duration = 1200, started = false) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!started) return;
    const isFloat = target.toString().includes(".");
    const num = parseFloat(target);
    const steps = 40;
    const inc = num / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= num) { setVal(num); clearInterval(t); }
      else setVal(isFloat ? cur : Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(t);
  }, [started]);
  return val;
};

const StatCard = ({ n, label, started }) => {
  const num = parseFloat(n);
  const suffix = n.replace(/[\d.]/g, "");
  const counted = useCounter(num, 1400, started);
  const display = isNaN(num) ? n : (Number.isInteger(num) ? Math.floor(counted) : counted.toFixed(0)) + suffix;

  return (
    <div style={{
      background: "linear-gradient(135deg, #0D1117 0%, #161B22 100%)",
      border: `1px solid ${C.amber}33`,
      borderRadius: 12,
      padding: "24px 20px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`,
      }} />
      <div style={{
        fontSize: 42, fontWeight: 900, color: C.amber,
        fontFamily: "'Bebas Neue', 'Impact', sans-serif",
        letterSpacing: 2, lineHeight: 1,
      }}>{display}</div>
      <div style={{
        fontSize: 11, color: "#8B949E", marginTop: 8,
        whiteSpace: "pre-line", lineHeight: 1.5, letterSpacing: 1,
        textTransform: "uppercase", fontFamily: "monospace",
      }}>{label}</div>
    </div>
  );
};

export default function NoizyManifesto() {
  const [audience, setAudience] = useState("ALL");
  const [activePillar, setActivePillar] = useState(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [activePartner, setActivePartner] = useState("ANTHROPIC");
  const [scrollY, setScrollY] = useState(0);
  const statsRef = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setStatsVisible(true);
    }, { threshold: 0.2 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const aud = AUDIENCES[audience];
  const filteredPillars = PILLARS.filter(p =>
    p.tags.includes("ALL") || p.tags.includes(audience) || audience === "ALL"
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020409",
      color: "#E6EDF3",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      overflowX: "hidden",
    }}>
      {/* HERO */}
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "60px 24px 80px",
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, #1A0A0020, transparent),
                     radial-gradient(ellipse 60% 40% at 80% 50%, #06B6D408, transparent),
                     radial-gradient(ellipse 50% 50% at 20% 80%, #F59E0B06, transparent)`,
      }}>
        {/* Grain overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
          pointerEvents: "none",
        }} />

        {/* Audience selector */}
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 100,
          display: "flex", gap: 8, background: "#0D1117CC",
          backdropFilter: "blur(12px)", padding: "8px 12px",
          borderRadius: 40, border: "1px solid #30363D",
        }}>
          {Object.entries(AUDIENCES).map(([k, v]) => (
            <button key={k} onClick={() => setAudience(k)} style={{
              padding: "5px 12px", borderRadius: 20, border: "none",
              cursor: "pointer", fontSize: 10, fontWeight: 700,
              letterSpacing: 1, transition: "all 0.2s",
              background: audience === k ? v.color : "transparent",
              color: audience === k ? "#000" : "#8B949E",
            }}>{v.label}</button>
          ))}
        </div>

        <div style={{ textAlign: "center", maxWidth: 900, position: "relative" }}>
          {/* Tagline */}
          <div style={{
            fontSize: 11, letterSpacing: 4, color: C.muted, marginBottom: 32,
            fontFamily: "monospace", textTransform: "uppercase",
          }}>
            RSP_001 · NOIZYFISH INC. · MC96ECO · OTTAWA · 2026
          </div>

          {/* Main title */}
          <div style={{ marginBottom: 8 }}>
            <span style={{
              fontSize: "clamp(72px, 14vw, 140px)", fontWeight: 900,
              color: C.amber, letterSpacing: -4, lineHeight: 0.9,
              fontFamily: "'Bebas Neue', 'Impact', sans-serif", display: "block",
            }}>NOIZY</span>
          </div>

          <div style={{
            fontSize: "clamp(16px, 3vw, 24px)", color: "#8B949E",
            letterSpacing: 3, marginBottom: 48, fontFamily: "monospace",
            textTransform: "uppercase",
          }}>
            The Culturally Intelligent AI Audio Ecosystem
          </div>

          {/* The one-liner */}
          <div style={{
            fontSize: "clamp(18px, 2.5vw, 22px)",
            color: "#E6EDF3", lineHeight: 1.6, maxWidth: 720,
            margin: "0 auto 48px", fontStyle: "italic",
          }}>
            "Built by a 40-year professional creator who needed it.
            <br />
            Designed for everyone who needs it most."
          </div>

          {/* Manifesto line */}
          <div style={{
            display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap",
            fontSize: 13, color: C.amber, letterSpacing: 2,
            fontFamily: "monospace", fontWeight: 700,
          }}>
            {["HONOR", "RESPECT", "GATHER", "NURTURE", "PRESERVE"].map(w => (
              <span key={w}>{w}</span>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
          fontSize: 11, color: "#484F58", letterSpacing: 3, fontFamily: "monospace",
          animation: "pulse 2s ease-in-out infinite",
        }}>
          ↓ THE FULL STORY
        </div>
      </div>

      {/* STATS */}
      <div ref={statsRef} style={{
        padding: "80px 24px",
        background: "#0A0F1E",
        borderTop: `1px solid ${C.amber}22`,
        borderBottom: `1px solid ${C.amber}22`,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            fontSize: 11, letterSpacing: 4, color: C.amber, textAlign: "center",
            marginBottom: 48, fontFamily: "monospace",
          }}>THE PROOF</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
          }}>
            {STATS.map((s, i) => (
              <StatCard key={i} {...s} started={statsVisible} />
            ))}
          </div>
        </div>
      </div>

      {/* THE TRANSMISSION */}
      <div style={{ padding: "100px 24px", background: "#020409" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            width: 1, height: 60, background: `linear-gradient(${C.amber}, transparent)`,
            margin: "0 auto 48px", opacity: 0.6,
          }} />
          <p style={{
            fontSize: "clamp(22px, 3vw, 30px)", lineHeight: 1.7, color: "#E6EDF3",
            fontStyle: "italic", marginBottom: 32,
          }}>
            "The transmission was always there. We are just now building the cable."
          </p>
          <p style={{ fontSize: 16, color: "#8B949E", lineHeight: 1.8, marginBottom: 24 }}>
            Forty years of professional music — Ed Edd n Eddy, Dragon Tales, Johnny Test, Transformers, Barbie — accumulated not as nostalgia but as a 34-terabyte research corpus. The living proof that a single human creative life, fully documented and properly indexed, contains more musical intelligence than most AI companies have access to.
          </p>
          <p style={{ fontSize: 16, color: "#8B949E", lineHeight: 1.8 }}>
            NOIZY exists because the music industry has spent 25 years exploiting creators while platforms extract value. It exists because accessibility keeps getting retrofitted instead of designed in. It exists because cultural intelligence in AI audio means nothing if it's built without the communities it claims to serve.
          </p>
          <div style={{
            width: 1, height: 60, background: `linear-gradient(transparent, ${C.amber})`,
            margin: "48px auto 0", opacity: 0.6,
          }} />
        </div>
      </div>

      {/* SIX PILLARS */}
      <div style={{
        padding: "80px 24px 100px",
        background: "#0A0F1E",
        borderTop: `1px solid ${C.amber}22`,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            fontSize: 11, letterSpacing: 4, color: C.amber,
            marginBottom: 12, fontFamily: "monospace",
          }}>THE SIX PILLARS</div>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900,
            color: "#E6EDF3", marginBottom: 48, lineHeight: 1.1,
          }}>What we believe.<br />
            <span style={{ color: "#484F58", fontSize: "0.7em", fontWeight: 400 }}>
              What we've built.
            </span>
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}>
            {filteredPillars.map((p, i) => (
              <div key={i}
                onClick={() => setActivePillar(activePillar === i ? null : i)}
                style={{
                  background: activePillar === i
                    ? "linear-gradient(135deg, #161B22, #0D1117)"
                    : "linear-gradient(135deg, #0D1117, #0A0F1E)",
                  border: `1px solid ${activePillar === i ? C.amber : "#30363D"}`,
                  borderRadius: 16, padding: "28px 24px",
                  cursor: "pointer", transition: "all 0.3s",
                  position: "relative", overflow: "hidden",
                }}>
                {activePillar === i && (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`,
                  }} />
                )}
                <div style={{
                  fontSize: 28, marginBottom: 16, color: C.amber, lineHeight: 1,
                }}>{p.icon}</div>
                <div style={{
                  fontSize: 13, fontWeight: 800, letterSpacing: 2,
                  color: "#E6EDF3", marginBottom: 12, fontFamily: "monospace",
                }}>{p.title}</div>
                <div style={{
                  fontSize: 15, color: "#8B949E", lineHeight: 1.7,
                  maxHeight: activePillar === i ? 300 : 72,
                  overflow: "hidden", transition: "max-height 0.4s ease",
                }}>{p.body}</div>
                <div style={{
                  marginTop: 16, fontSize: 11, color: C.amber,
                  fontFamily: "monospace", opacity: activePillar === i ? 0 : 0.7,
                }}>▼ expand</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* THE ECOSYSTEM */}
      <div style={{ padding: "80px 24px 100px", background: "#020409" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            fontSize: 11, letterSpacing: 4, color: C.amber,
            marginBottom: 12, fontFamily: "monospace",
          }}>THE MC96ECO UNIVERSE</div>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900,
            color: "#E6EDF3", marginBottom: 48,
          }}>Five brands. One ecosystem.<br />
            <span style={{ color: "#484F58", fontSize: "0.7em", fontWeight: 400 }}>
              All sovereign. All live or on-deck.
            </span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {BRANDS.map((b, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "200px 1fr 120px",
                gap: 24, alignItems: "center",
                padding: "20px 28px",
                background: "#0D1117",
                borderRadius: 12,
                borderLeft: `4px solid ${b.color}`,
                transition: "all 0.2s",
              }}>
                <div>
                  <div style={{
                    fontSize: 15, fontWeight: 800, color: b.color,
                    fontFamily: "monospace", letterSpacing: 1,
                  }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: "#484F58", marginTop: 4 }}>{b.role}</div>
                </div>
                <div style={{ fontSize: 13, color: "#8B949E" }}>{b.detail}</div>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                  color: b.color, fontFamily: "monospace",
                  background: `${b.color}18`, padding: "4px 10px",
                  borderRadius: 20, textAlign: "center", border: `1px solid ${b.color}44`,
                }}>{b.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PARTNERSHIP SECTION */}
      <div style={{
        padding: "80px 24px 100px",
        background: "#0A0F1E",
        borderTop: `1px solid ${C.amber}22`,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            fontSize: 11, letterSpacing: 4, color: C.amber,
            marginBottom: 12, fontFamily: "monospace",
          }}>THE CONVERSATION</div>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900,
            color: "#E6EDF3", marginBottom: 48,
          }}>Why we're talking.</h2>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 12, marginBottom: 40, flexWrap: "wrap" }}>
            {Object.keys(PARTNERSHIPS).map(k => (
              <button key={k} onClick={() => setActivePartner(k)} style={{
                padding: "10px 24px", borderRadius: 24, border: "none",
                cursor: "pointer", fontSize: 12, fontWeight: 700,
                letterSpacing: 2, fontFamily: "monospace",
                transition: "all 0.2s",
                background: activePartner === k
                  ? AUDIENCES[k]?.color || C.amber
                  : "#161B22",
                color: activePartner === k ? "#000" : "#8B949E",
                border: `1px solid ${activePartner === k ? "transparent" : "#30363D"}`,
              }}>{k}</button>
            ))}
          </div>

          {/* Partnership content */}
          {(() => {
            const p = PARTNERSHIPS[activePartner];
            const a = AUDIENCES[activePartner] || AUDIENCES.ALL;
            return (
              <div style={{
                background: "#161B22",
                border: `1px solid ${a.color}44`,
                borderRadius: 20, padding: "40px 36px",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(90deg, transparent, ${a.color}, transparent)`,
                }} />
                <p style={{
                  fontSize: "clamp(20px, 2.5vw, 26px)", fontWeight: 700,
                  color: "#E6EDF3", marginBottom: 36, lineHeight: 1.4,
                  fontStyle: "italic",
                }}>"{p.hook}"</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 36 }}>
                  {p.points.map((pt, i) => (
                    <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: `${a.color}22`, border: `1px solid ${a.color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, color: a.color, marginTop: 1,
                      }}>{i + 1}</div>
                      <div style={{ fontSize: 16, color: "#8B949E", lineHeight: 1.6 }}>{pt}</div>
                    </div>
                  ))}
                </div>

                <div style={{
                  borderTop: `1px solid ${a.color}33`, paddingTop: 28,
                  fontSize: 16, color: "#E6EDF3", lineHeight: 1.7, fontStyle: "italic",
                }}>{p.close}</div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* THE STACK */}
      <div style={{ padding: "80px 24px", background: "#020409" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            fontSize: 11, letterSpacing: 4, color: C.amber,
            marginBottom: 12, fontFamily: "monospace",
          }}>SUPERSONIC AI STACK v2.0</div>
          <h2 style={{
            fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 900,
            color: "#E6EDF3", marginBottom: 40,
          }}>9 layers. 19 models. Sovereign.</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
          }}>
            {[
              { n: "01", t: "MUSIC GEN", m: "MusicGen · Meta", c: C.amber },
              { n: "02", t: "VOICE CLONE", m: "MaskGCT · XTTS v2 · Fish Speech · RVC", c: C.purple },
              { n: "03", t: "AUDIO ENV", m: "Tango 2 · Ambient + Environmental", c: C.cyan },
              { n: "04", t: "SIGNAL ANALYSIS", m: "Librosa · Real-time reactive scoring", c: C.green },
              { n: "05", t: "AUDIO FX", m: "pedalboard · Effects + mastering chain", c: C.orange },
              { n: "06", t: "LANG INTEL", m: "Gemma2 · Cultural context reasoning", c: C.blue },
              { n: "07", t: "INFERENCE", m: "GOD · M2 Ultra 192GB · Local sovereign", c: C.amber },
              { n: "08", t: "DISTRIBUTION", m: "Cloudflare · Workers + KV + D1 + R2", c: C.cyan },
              { n: "09", t: "ORCHESTRATION", m: "GABRIEL_V3 · Master agent system", c: C.purple },
            ].map((s) => (
              <div key={s.n} style={{
                background: "#0D1117", borderRadius: 12, padding: "20px 18px",
                border: `1px solid ${s.c}22`,
                borderTop: `2px solid ${s.c}`,
              }}>
                <div style={{
                  fontSize: 10, color: "#484F58", fontFamily: "monospace",
                  marginBottom: 8, letterSpacing: 2,
                }}>LAYER {s.n}</div>
                <div style={{
                  fontSize: 13, fontWeight: 800, color: s.c,
                  fontFamily: "monospace", marginBottom: 6, letterSpacing: 1,
                }}>{s.t}</div>
                <div style={{ fontSize: 12, color: "#8B949E", lineHeight: 1.5 }}>{s.m}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 32, padding: "20px 24px",
            background: "#0D1117", borderRadius: 12,
            border: `1px solid ${C.amber}44`,
            fontSize: 14, color: "#8B949E",
          }}>
            <span style={{ color: C.amber, fontWeight: 700 }}>$16,000+/year</span> in equivalent commercial API costs — all running locally on GOD. Air-gap capable. Zero external dependency required. Built for permanence, not platform lock-in.
          </div>
        </div>
      </div>

      {/* THE CLOSING */}
      <div style={{
        padding: "100px 24px 120px",
        background: "#0A0F1E",
        borderTop: `1px solid ${C.amber}22`,
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900,
            color: "#E6EDF3", marginBottom: 32, lineHeight: 1.2,
          }}>
            The gold mine is mapped.<br />
            <span style={{ color: C.amber }}>The build is live.</span>
          </div>
          <p style={{
            fontSize: 18, color: "#8B949E", lineHeight: 1.8, marginBottom: 48,
          }}>
            In 500 years, the platforms will have changed. The specific technologies will be unrecognizable. What will remain is the question of whether we chose, at this critical moment in the history of artificial intelligence, to build systems that honored human creativity, respected cultural heritage, and served the people who needed technology most.
          </p>
          <div style={{
            display: "inline-flex", flexDirection: "column", alignItems: "center",
            gap: 12, padding: "32px 48px",
            background: "linear-gradient(135deg, #161B22, #0D1117)",
            border: `1px solid ${C.amber}`,
            borderRadius: 20,
          }}>
            <div style={{
              fontSize: "clamp(18px, 2vw, 22px)", fontWeight: 800,
              color: C.amber, fontFamily: "monospace", letterSpacing: 3,
            }}>GORUNFREEX1000</div>
            <div style={{
              fontSize: 13, color: "#484F58", letterSpacing: 2,
              fontFamily: "monospace",
            }}>RSP_001 · MC96ECO · NOIZYFISH INC. · 2026</div>
          </div>

          <div style={{
            marginTop: 48, display: "flex", gap: 24, justifyContent: "center",
            flexWrap: "wrap", fontSize: 12, color: "#484F58",
            letterSpacing: 2, fontFamily: "monospace",
          }}>
            {["HONOR", "·", "RESPECT", "·", "GATHER", "·", "NURTURE", "·", "PRESERVE"].map((w, i) => (
              <span key={i} style={{ color: w === "·" ? "#30363D" : undefined }}>{w}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #020409; }
        ::-webkit-scrollbar-thumb { background: #F59E0B44; border-radius: 2px; }
      `}</style>
    </div>
  );
}
