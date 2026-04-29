import { useState, useEffect } from "react";

const PHASES = [
  {
    id: "P1", label: "Phase 1", time: "Months 1–3", color: "#F59E0B", actors: 50,
    title: "The Founding 50",
    missions: [
      "Identify 5–10 community pillars (coaches, YouTubers, forum leaders)",
      "Offer founding member deal — best terms ever, named credit, creative input",
      "Launch DreamChamber private beta — let them experience ownership",
      "Use the anti-deepfake opening line every single time",
      "Begin formal SAG-AFTRA dialogue",
      "Publish contract terms publicly — let the terms do the talking",
    ]
  },
  {
    id: "P2", label: "Phase 2", time: "Months 4–6", color: "#A855F7", actors: 200,
    title: "The Engine Ignites",
    missions: [
      "Open referral engine — royalty bonus for every qualified referral",
      "Activate audiobook narrator outreach to ACX and Findaway Voices",
      "First public community appearances — Q&As, no hard selling",
      "Founding member testimonials go live — authentic, unscripted",
      "First public NOIZYVOX artist profiles launch",
      "Channel 4 regional partners identified in UK, Canada, Australia",
    ]
  },
  {
    id: "P3", label: "Phase 3", time: "Months 7–12", color: "#06B6D4", actors: 500,
    title: "Public Launch",
    missions: [
      "NOIZYVOX public launch — founding member stories lead the narrative",
      "UK, Canada, Australia expansion via regional community partners",
      "Community flywheel self-sustaining — referral engine producing daily",
      "SAG-AFTRA framework dialogue reaches public milestone or formal partnership",
      "500 actors, 8+ languages, every content category covered",
      "DreamChamber open to all NOIZYVOX members",
    ]
  },
  {
    id: "P4", label: "Year 2", time: "Months 13–24", color: "#10B981", actors: 750,
    title: "Global Expansion",
    missions: [
      "Japan: anime/dubbing community via Tokyo regional partner",
      "Brazil: Portuguese-language expansion via Sao Paulo community",
      "Korea: K-drama dubbing and gaming voice community",
      "India: Hindi, Tamil, Bengali — largest linguistic expansion",
      "750 actors, 15+ languages — surpasses any synthetic competitor",
      "NOIZYVOX becomes the story every voice actor community tells",
    ]
  },
  {
    id: "P5", label: "Year 3", time: "Months 25–36", color: "#F97316", actors: 1000,
    title: "The Empire",
    missions: [
      "1,000 artists across 20+ languages — the moat is complete",
      "Arabic, Swahili, Amharic, Bahasa, Thai, Vietnamese expansion",
      "More linguistic and emotional range than any synthetic system on earth",
      "NOIZYVOX narrative: 'the platform where great voice actors chose to build their legacy'",
      "The talent now recruits itself — community mission propagates independently",
      "Partner licensing to Anthropic, Apple, Google — the Voice Army is the product",
    ]
  },
];

const CHANNELS = [
  {
    n: "01", name: "Voice Acting\nCommunities", color: "#F59E0B",
    icon: "🎙",
    cost: "Near zero",
    targets: ["r/VoiceActing (180K+)", "Voice123 forums", "Behind the Voice Actors", "Discord servers"],
    strategy: "Show up as a contributor — not an advertiser. Sponsor events, do Q&As, let founding members share authentically. Community trust compounds when earned, never when bought.",
    unlock: "Founding 50 → Phase 1"
  },
  {
    n: "02", name: "SAG-AFTRA\nUnion Pivot", color: "#A855F7",
    icon: "⚖",
    cost: "Staff time only",
    targets: ["SAG-AFTRA leadership", "AI policy committee", "Professional union members", "Union newsletter"],
    strategy: "Counterintuitive: treat the union as an ally. Open formal dialogue about a SAG-AFTRA aligned AI voice framework. Even informal endorsement unlocks the most professional tier of North American talent overnight.",
    unlock: "Elite professional tier"
  },
  {
    n: "03", name: "Audiobook\nNarrator Pipeline", color: "#06B6D4",
    icon: "📖",
    cost: "Targeted outreach",
    targets: ["ACX (Audible)", "Findaway Voices", "Speechify narrators", "Prolific narrator community"],
    strategy: "Narrators understand voice economics. The NOIZYVOX pitch — a royalty stream stacked on top of work already completed — is a natural yes. Target prolific narrators who produce thousands of hours yearly.",
    unlock: "Volume + quality"
  },
  {
    n: "04", name: "Animation +\nGaming Adjacent", color: "#10B981",
    icon: "🎮",
    cost: "Regional partnerships",
    targets: ["Atlanta, GA", "Toronto, Canada", "London, UK", "Sydney + Tokyo"],
    strategy: "The best voice talent is not all in LA. Secondary markets have deep pools of character voice actors doing animation, games, and dubbing — with geographic and linguistic diversity that fuels global licensing value.",
    unlock: "Geographic + linguistic diversity"
  },
  {
    n: "05", name: "Founding Member\nReferral Engine", color: "#F97316",
    icon: "🔗",
    cost: "Royalty bonus only",
    targets: ["All founding members", "Happy current members", "Community connectors", "Guild ambassadors"],
    strategy: "Twenty happy founding members with referral incentives can source 200 actors faster than any advertising campaign. Voice actors know voice actors. The community is smaller and more networked than it looks from outside.",
    unlock: "Exponential growth"
  },
];

const TERMS = [
  { term: "VOICE DNA OWNERSHIP", detail: "Actor owns their voice permanently. NOIZY licenses usage rights only — never ownership.", icon: "◈" },
  { term: "CONTENT CONTROL", detail: "Actor controls which content categories their voice can be used in. They set limits. They enforce them.", icon: "◉" },
  { term: "KILL SWITCH", detail: "Full revocation of future licensing at any time. No penalty. No questions asked. Immediate effect.", icon: "⏻" },
  { term: "REAL-TIME ROYALTIES", detail: "Per-use royalties tracked and accessible in real-time through the Artist Command Center.", icon: "◎" },
  { term: "FOUNDING RATE LOCK", detail: "Early members get founding royalty rates locked permanently — higher than later joiners, always.", icon: "◐" },
  { term: "AUDIT RIGHTS", detail: "Any actor can request a full usage audit at any time. NOIZYVOX provides it within 30 days.", icon: "◑" },
];

const STATS = [
  { n: "50", label: "Founding\nActors Needed", color: "#F59E0B" },
  { n: "1,000", label: "Target\n36 Months", color: "#A855F7" },
  { n: "20+", label: "Languages\nYear 3", color: "#06B6D4" },
  { n: "75%", label: "Artist\nRevenue Split", color: "#10B981" },
  { n: "5", label: "Recruitment\nChannels", color: "#F97316" },
  { n: "0", label: "Paid Ads\nRequired", color: "#60A5FA" },
];

export default function VoiceArmyHQ() {
  const [activePhase, setActivePhase] = useState(0);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [tab, setTab] = useState("PHASES");

  const phase = PHASES[activePhase];

  return (
    <div style={{
      minHeight: "100vh", background: "#020409",
      color: "#E6EDF3", fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      overflowX: "hidden",
    }}>
      {/* HEADER */}
      <div style={{
        background: "linear-gradient(180deg, #0A0F1E 0%, #020409 100%)",
        borderBottom: "1px solid #F59E0B33",
        padding: "32px 32px 24px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#6B7280", marginBottom: 8, fontFamily: "monospace" }}>
            NOIZYVOX  ·  MC96ECO  ·  RSP_001
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: "#F59E0B", letterSpacing: -2, lineHeight: 1 }}>
              OPERATION
            </span>
            <span style={{ fontSize: 48, fontWeight: 900, color: "#E6EDF3", letterSpacing: -2, lineHeight: 1 }}>
              VOICE ARMY
            </span>
          </div>
          <div style={{ fontSize: 15, color: "#6B7280", marginTop: 8, fontStyle: "italic" }}>
            "Every other AI voice company is in a race to make human actors irrelevant. NOIZY is in a race to make them{" "}
            <span style={{ color: "#F59E0B", fontWeight: 700 }}>essential.</span>"
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ background: "#0A0F1E", borderBottom: "1px solid #30363D", padding: "20px 32px" }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12,
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              textAlign: "center", padding: "12px 8px",
              background: "#161B22", borderRadius: 10,
              border: `1px solid ${s.color}33`,
              borderTop: `2px solid ${s.color}`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color, letterSpacing: -1, lineHeight: 1, fontFamily: "monospace" }}>{s.n}</div>
              <div style={{ fontSize: 10, color: "#484F58", marginTop: 6, whiteSpace: "pre-line", lineHeight: 1.4, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* NAV TABS */}
      <div style={{ background: "#0D1117", borderBottom: "1px solid #30363D", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 0 }}>
          {["PHASES", "CHANNELS", "TERMS", "GLOBAL MAP"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "16px 24px", border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              fontFamily: "monospace", transition: "all 0.2s",
              background: "transparent",
              color: tab === t ? "#F59E0B" : "#484F58",
              borderBottom: `2px solid ${tab === t ? "#F59E0B" : "transparent"}`,
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>

        {/* ── PHASES TAB ── */}
        {tab === "PHASES" && (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24 }}>
            {/* Phase selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PHASES.map((p, i) => (
                <button key={i} onClick={() => setActivePhase(i)} style={{
                  textAlign: "left", padding: "16px 20px", borderRadius: 12,
                  border: `1px solid ${activePhase === i ? p.color : "#30363D"}`,
                  background: activePhase === i ? `${p.color}11` : "#0D1117",
                  cursor: "pointer", transition: "all 0.2s",
                  borderLeft: `4px solid ${p.color}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.color, fontFamily: "monospace", letterSpacing: 1 }}>{p.label}</span>
                    <span style={{ fontSize: 10, color: "#484F58", fontFamily: "monospace" }}>{p.actors} actors</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: activePhase === i ? "#E6EDF3" : "#8B949E" }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: "#484F58", marginTop: 2 }}>{p.time}</div>
                </button>
              ))}

              {/* Progress bar */}
              <div style={{ marginTop: 8, padding: "16px 20px", background: "#0D1117", borderRadius: 12, border: "1px solid #30363D" }}>
                <div style={{ fontSize: 10, color: "#484F58", letterSpacing: 2, marginBottom: 8, fontFamily: "monospace" }}>PROGRESS TO 1,000</div>
                <div style={{ height: 6, background: "#161B22", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${(PHASES[activePhase].actors / 1000) * 100}%`,
                    background: `linear-gradient(90deg, #F59E0B, ${PHASES[activePhase].color})`,
                    transition: "width 0.5s ease",
                  }} />
                </div>
                <div style={{ fontSize: 13, color: "#E6EDF3", fontWeight: 700, marginTop: 8, fontFamily: "monospace" }}>
                  {PHASES[activePhase].actors} <span style={{ color: "#484F58", fontWeight: 400 }}>/ 1,000 artists</span>
                </div>
              </div>
            </div>

            {/* Phase detail */}
            <div style={{
              background: "#0D1117", borderRadius: 16, padding: "32px",
              border: `1px solid ${phase.color}44`,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, transparent, ${phase.color}, transparent)`,
              }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: phase.color, fontFamily: "monospace", letterSpacing: 2, marginBottom: 8 }}>{phase.label}  ·  {phase.time}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#E6EDF3", lineHeight: 1 }}>{phase.title}</div>
                </div>
                <div style={{
                  padding: "12px 20px", background: `${phase.color}18`,
                  border: `1px solid ${phase.color}44`, borderRadius: 12,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: phase.color, fontFamily: "monospace", lineHeight: 1 }}>{phase.actors}</div>
                  <div style={{ fontSize: 10, color: "#8B949E", letterSpacing: 1, marginTop: 4 }}>ARTISTS</div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#484F58", letterSpacing: 3, marginBottom: 16, fontFamily: "monospace" }}>MISSION CHECKLIST</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {phase.missions.map((m, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: `${phase.color}22`, border: `1px solid ${phase.color}66`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: phase.color, marginTop: 1,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 15, color: "#C9D1D9", lineHeight: 1.6 }}>{m}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CHANNELS TAB ── */}
        {tab === "CHANNELS" && (
          <div>
            <div style={{ fontSize: 13, color: "#8B949E", marginBottom: 24, lineHeight: 1.7 }}>
              Five recruitment channels. All near-zero cost. The mission is not to advertise — it is to{" "}
              <span style={{ color: "#F59E0B" }}>earn trust</span> in the communities where voice actors already live.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
              {CHANNELS.map((ch, i) => (
                <div key={i}
                  onClick={() => setActiveChannel(activeChannel === i ? null : i)}
                  style={{
                    background: activeChannel === i ? "#161B22" : "#0D1117",
                    border: `1px solid ${activeChannel === i ? ch.color : "#30363D"}`,
                    borderLeft: `4px solid ${ch.color}`,
                    borderRadius: 14, padding: "24px", cursor: "pointer",
                    transition: "all 0.3s", position: "relative", overflow: "hidden",
                  }}>
                  {activeChannel === i && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg, transparent, ${ch.color}, transparent)`,
                    }} />
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 24 }}>{ch.icon}</div>
                    <div style={{
                      fontSize: 10, color: "#484F58", fontFamily: "monospace",
                      background: "#161B22", padding: "4px 10px", borderRadius: 20,
                      border: "1px solid #30363D",
                    }}>CH {ch.n}</div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: ch.color,
                    whiteSpace: "pre-line", marginBottom: 8, fontFamily: "monospace", letterSpacing: 0.5,
                  }}>{ch.name}</div>
                  <div style={{ fontSize: 11, color: "#484F58", marginBottom: 12 }}>
                    Cost: <span style={{ color: "#8B949E" }}>{ch.cost}</span>
                  </div>

                  <div style={{
                    maxHeight: activeChannel === i ? 400 : 0,
                    overflow: "hidden", transition: "max-height 0.4s ease",
                  }}>
                    <div style={{ borderTop: "1px solid #30363D", paddingTop: 16, marginTop: 8 }}>
                      <div style={{ fontSize: 10, color: "#484F58", letterSpacing: 2, marginBottom: 10, fontFamily: "monospace" }}>TARGETS</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                        {ch.targets.map((t, j) => (
                          <span key={j} style={{
                            fontSize: 11, color: ch.color, background: `${ch.color}11`,
                            padding: "3px 10px", borderRadius: 20, border: `1px solid ${ch.color}33`,
                          }}>{t}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "#484F58", letterSpacing: 2, marginBottom: 10, fontFamily: "monospace" }}>STRATEGY</div>
                      <div style={{ fontSize: 13, color: "#8B949E", lineHeight: 1.7, marginBottom: 12 }}>{ch.strategy}</div>
                      <div style={{
                        fontSize: 11, color: ch.color, fontFamily: "monospace",
                        background: `${ch.color}11`, padding: "6px 12px", borderRadius: 8,
                        border: `1px solid ${ch.color}33`,
                      }}>↗ {ch.unlock}</div>
                    </div>
                  </div>

                  {activeChannel !== i && (
                    <div style={{ fontSize: 11, color: "#484F58", fontFamily: "monospace", marginTop: 8 }}>▼ expand strategy</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TERMS TAB ── */}
        {tab === "TERMS" && (
          <div>
            <div style={{
              background: "#0D1117", border: "1px solid #F59E0B44", borderRadius: 16,
              padding: "28px 32px", marginBottom: 28,
            }}>
              <div style={{ fontSize: 11, color: "#F59E0B", letterSpacing: 3, fontFamily: "monospace", marginBottom: 12 }}>THE CONTRACT PRINCIPLE</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#E6EDF3", lineHeight: 1.5, fontStyle: "italic" }}>
                "Put these terms on the website from day one. Let actors read them, share them, and discuss them before any sales contact.{" "}
                <span style={{ color: "#F59E0B" }}>The terms do the talking. The contract is the pitch.</span>"
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {TERMS.map((t, i) => (
                <div key={i}
                  onClick={() => setActiveTerm(activeTerm === i ? null : i)}
                  style={{
                    background: activeTerm === i ? "#161B22" : "#0D1117",
                    border: `1px solid ${activeTerm === i ? "#F59E0B" : "#30363D"}`,
                    borderRadius: 14, padding: "24px", cursor: "pointer",
                    transition: "all 0.3s",
                  }}>
                  <div style={{ fontSize: 32, marginBottom: 12, color: "#F59E0B" }}>{t.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#E6EDF3", letterSpacing: 1.5, fontFamily: "monospace", marginBottom: 8 }}>{t.term}</div>
                  <div style={{
                    fontSize: 14, color: "#8B949E", lineHeight: 1.7,
                    maxHeight: activeTerm === i ? 200 : 44,
                    overflow: "hidden", transition: "max-height 0.4s ease",
                  }}>{t.detail}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, padding: "24px", background: "#0D1117", borderRadius: 14, border: "1px solid #30363D" }}>
              <div style={{ fontSize: 11, color: "#484F58", letterSpacing: 3, fontFamily: "monospace", marginBottom: 12 }}>THE 75/25 SPLIT — WHAT IT MEANS IN PRACTICE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#484F58", marginBottom: 8, fontFamily: "monospace" }}>NOIZYVOX (75% to artist)</div>
                  <div style={{ height: 24, background: "#161B22", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: "75%", background: "#F59E0B", borderRadius: "4px 0 0 4px" }} />
                    <div style={{ width: "25%", background: "#A855F7" }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11 }}>
                    <span style={{ color: "#F59E0B" }}>■ 75% Artist</span>
                    <span style={{ color: "#A855F7" }}>■ 25% Platform</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#484F58", marginBottom: 8, fontFamily: "monospace" }}>INDUSTRY AVERAGE (15-20% to artist)</div>
                  <div style={{ height: 24, background: "#161B22", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: "18%", background: "#F59E0B", borderRadius: "4px 0 0 4px" }} />
                    <div style={{ width: "82%", background: "#30363D" }} />
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11 }}>
                    <span style={{ color: "#F59E0B" }}>■ 18% Artist</span>
                    <span style={{ color: "#484F58" }}>■ 82% Platform</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── GLOBAL MAP TAB ── */}
        {tab === "GLOBAL MAP" && (
          <div>
            <div style={{ fontSize: 13, color: "#8B949E", marginBottom: 24, lineHeight: 1.7 }}>
              The long-term Voice Army is not 1,000 actors in English. It is voice intelligence that matches the{" "}
              <span style={{ color: "#F59E0B" }}>Cultural Resonance Engine's 200-context map</span> — one human voice anchor per context, scaling to multiple voices per context as the guild grows.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              {[
                { region: "NORTH AMERICA", langs: "English · French · Spanish", target: "200", phase: "Phase 1–2", color: "#F59E0B", status: "ACTIVE" },
                { region: "UK / EUROPE", langs: "English · German · French · Italian · Polish", target: "150", phase: "Phase 2–3", color: "#A855F7", status: "PHASE 2" },
                { region: "LATIN AMERICA", langs: "Portuguese · Spanish (regional variants)", target: "100", phase: "Phase 3", color: "#06B6D4", status: "PHASE 3" },
                { region: "EAST ASIA", langs: "Japanese · Korean · Mandarin", target: "150", phase: "Year 2", color: "#10B981", status: "YEAR 2" },
                { region: "SOUTH ASIA", langs: "Hindi · Tamil · Bengali · Urdu", target: "100", phase: "Year 2", color: "#F97316", status: "YEAR 2" },
                { region: "AFRICA / MENA", langs: "Arabic · Swahili · Amharic · Hausa", target: "100", phase: "Year 3", color: "#60A5FA", status: "YEAR 3" },
                { region: "SOUTHEAST ASIA", langs: "Bahasa · Thai · Vietnamese · Tagalog", target: "100", phase: "Year 3", color: "#EC4899", status: "YEAR 3" },
                { region: "REST OF WORLD", langs: "All remaining cultural contexts", target: "100", phase: "Year 3", color: "#6B7280", status: "YEAR 3" },
              ].map((r, i) => (
                <div key={i} style={{
                  background: "#0D1117", borderRadius: 14, padding: "24px",
                  border: `1px solid ${r.color}33`, borderLeft: `4px solid ${r.color}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "flex-start" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: r.color, fontFamily: "monospace", letterSpacing: 1 }}>{r.region}</div>
                    <div style={{
                      fontSize: 9, color: r.color, background: `${r.color}18`,
                      padding: "3px 8px", borderRadius: 20, border: `1px solid ${r.color}44`,
                      fontFamily: "monospace", letterSpacing: 1,
                    }}>{r.status}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#8B949E", marginBottom: 12, lineHeight: 1.5 }}>{r.langs}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: "#484F58", fontFamily: "monospace" }}>Target: <span style={{ color: "#8B949E" }}>{r.target} actors</span></div>
                    <div style={{ fontSize: 11, color: "#484F58", fontFamily: "monospace" }}>{r.phase}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 24, padding: "24px 28px",
              background: "#0D1117", borderRadius: 14, border: "1px solid #F59E0B44",
            }}>
              <div style={{ fontSize: 11, color: "#F59E0B", letterSpacing: 3, fontFamily: "monospace", marginBottom: 12 }}>THE MOAT AT 1,000</div>
              <div style={{ fontSize: 16, color: "#C9D1D9", lineHeight: 1.7 }}>
                1,000 authentic human voices in 20+ languages — all with their owners behind them — is a moat that{" "}
                <span style={{ color: "#F59E0B", fontWeight: 700 }}>no amount of synthetic AI training data can replicate.</span>
                {" "}The voices are not the product. The trust is the product. The ownership is the product. The community is the empire.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        borderTop: "1px solid #F59E0B22", padding: "24px 32px",
        background: "#0A0F1E", textAlign: "center",
        fontSize: 11, color: "#484F58", letterSpacing: 3, fontFamily: "monospace",
      }}>
        NOIZYVOX  ·  OPERATION VOICE ARMY  ·  ARTIST CREATOR FIRST  ·  CONSENT AS CODE  ·  GORUNFREEX1000
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { font-family: inherit; }
      `}</style>
    </div>
  );
}
