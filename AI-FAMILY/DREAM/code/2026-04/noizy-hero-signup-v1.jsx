import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   NOIZY.AI — Block 1 Hero + Quick Signup
   ───────────────────────────────────────────────────────────────────────
   Goal: >10% CTA click-through, >40% signup completion
   Author: Robert Stephen Plowman × Claude (Co-Architect)
   Version: 1.0.0 — April 12, 2026
   ═══════════════════════════════════════════════════════════════════════ */

// ─── Design Tokens ──────────────────────────────────────────────────────
const T = {
  bg: "#0D0D0D",
  surface: "rgba(161, 243, 255, 0.04)",
  surfaceHover: "rgba(161, 243, 255, 0.08)",
  border: "rgba(161, 243, 255, 0.12)",
  borderBright: "rgba(161, 243, 255, 0.25)",
  text: "#FFFFFF",
  textDim: "rgba(255, 255, 255, 0.65)",
  textMuted: "rgba(255, 255, 255, 0.38)",
  primary: "#A1F3FF",
  primaryDim: "rgba(161, 243, 255, 0.6)",
  accent: "#D9FF00",
  accentDim: "rgba(217, 255, 0, 0.7)",
  danger: "#FF4D6A",
  success: "#4ADE80",
  radius: "6px",
  radiusLg: "12px",
  fontSystem: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
  fontMono: "'SF Mono', 'JetBrains Mono', 'Fira Code', Monaco, monospace",
};

// ─── Copy Variants ──────────────────────────────────────────────────────
const COPY_VARIANTS = {
  A: {
    id: "A",
    headline: "Your Voice. Your Rules.",
    subhead: "No Exceptions.",
    body: "The first platform where consent is executable code. Artists keep 75% of every dollar. AI works for you — not the other way around.",
    cta: "Claim Your Voice",
    ctaSecondary: "See How It Works",
  },
  B: {
    id: "B",
    headline: "Consent Is Law.",
    subhead: "Not a Checkbox.",
    body: "NOIZY.AI protects the artists who power AI. Cryptographic consent. Immutable never-clauses. 75% creator royalties — enforced at the edge.",
    cta: "Join the Guild",
    ctaSecondary: "Read the Manifesto",
  },
  C: {
    id: "C",
    headline: "AI Needs Your Voice.",
    subhead: "You Deserve the Keys.",
    body: "We built the infrastructure that puts artists in control. Your voice DNA is sovereign. Your consent is cryptographic. Your royalties are automatic.",
    cta: "Start Free Trial",
    ctaSecondary: "Explore the Platform",
  },
};

// ─── Preference Options ─────────────────────────────────────────────────
const PREFERENCES = [
  { id: "voice-actor", label: "Voice Actor", icon: "🎙" },
  { id: "studio", label: "Studio / Publisher", icon: "🎛" },
  { id: "developer", label: "Developer / API", icon: "⌨" },
  { id: "curious", label: "Just Curious", icon: "✦" },
];

// ─── Analytics Stub ─────────────────────────────────────────────────────
function track(event, props = {}) {
  console.log(`[NOIZY Analytics] ${event}`, { ...props, ts: Date.now() });
  // Replace with: posthog.capture(event, props) or segment.track(event, props)
}

// ─── Waveform Bars ──────────────────────────────────────────────────────
function WaveformBars({ count = 24, active = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2px", height: "48px" }}>
      {Array.from({ length: count }, (_, i) => {
        const center = count / 2;
        const dist = Math.abs(i - center) / center;
        const baseHeight = 20 + (1 - dist) * 70;
        return (
          <div
            key={i}
            style={{
              width: "2.5px",
              height: `${baseHeight}%`,
              borderRadius: "2px",
              background: `linear-gradient(to top, ${T.primary}, ${T.accent})`,
              animation: active ? `waveBar 1.4s ease-in-out ${i * 0.06}s infinite` : "none",
              opacity: active ? 1 : 0.3,
              transition: "opacity 0.4s",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Trust Metric Card ──────────────────────────────────────────────────
function MetricCard({ value, label, accent = false }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: "1rem 0.5rem",
        textAlign: "center",
        transition: "border-color 0.3s, background 0.3s, transform 0.2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = T.borderBright;
        e.currentTarget.style.background = T.surfaceHover;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = T.border;
        e.currentTarget.style.background = T.surface;
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: accent ? T.accent : T.primary, fontFamily: T.fontMono, lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: "0.65rem", color: T.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.35rem" }}>
        {label}
      </div>
    </div>
  );
}

// ─── Primary CTA Button ─────────────────────────────────────────────────
function CTAButton({ children, onClick, variant = "primary", style: extraStyle = {} }) {
  const [hover, setHover] = useState(false);
  const isPrimary = variant === "primary";

  const base = {
    padding: isPrimary ? "0.875rem 2rem" : "0.875rem 1.5rem",
    background: isPrimary ? (hover ? T.accent : T.primary) : "transparent",
    color: isPrimary ? T.bg : (hover ? T.primary : T.textDim),
    border: isPrimary ? "none" : `1px solid ${hover ? T.borderBright : T.border}`,
    borderRadius: T.radius,
    fontWeight: 700,
    fontSize: isPrimary ? "1rem" : "0.9rem",
    fontFamily: T.fontSystem,
    cursor: "pointer",
    transition: "all 0.25s ease",
    letterSpacing: isPrimary ? "0.02em" : "0",
    transform: hover && isPrimary ? "translateY(-1px)" : "translateY(0)",
    boxShadow: hover && isPrimary ? `0 8px 32px rgba(161, 243, 255, 0.2)` : "none",
    ...extraStyle,
  };

  return (
    <button style={base} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {children}
    </button>
  );
}

// ─── Signup Modal ───────────────────────────────────────────────────────
function SignupModal({ open, onClose, copyVariant }) {
  const [email, setEmail] = useState("");
  const [preference, setPreference] = useState(null);
  const [step, setStep] = useState(1); // 1 = email, 2 = preference, 3 = done
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
      track("signup_modal_opened", { variant: copyVariant });
    }
  }, [open, copyVariant]);

  // Trap focus and handle Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      track("signup_email_invalid", { email_domain: email.split("@")[1] || "none" });
      return;
    }
    setError("");
    setStep(2);
    track("signup_email_entered", { email_domain: email.split("@")[1] });
  };

  const handlePreferenceSelect = (pref) => {
    setPreference(pref);
    setSubmitting(true);
    track("signup_preference_selected", { preference: pref });

    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setStep(3);
      track("signup_completed", {
        email_domain: email.split("@")[1],
        preference: pref,
        variant: copyVariant,
      });
    }, 800);
  };

  const handleClose = () => {
    if (step < 3) {
      track("signup_abandoned", { step, variant: copyVariant });
    }
    setStep(1);
    setEmail("");
    setPreference(null);
    setError("");
    onClose();
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Sign up for NOIZY.AI"
    >
      <div
        ref={modalRef}
        style={{
          background: "#111111",
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusLg,
          padding: "2rem",
          maxWidth: "440px",
          width: "100%",
          position: "relative",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close signup"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            border: "none",
            color: T.textMuted,
            fontSize: "1.25rem",
            cursor: "pointer",
            padding: "0.25rem",
            lineHeight: 1,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.textMuted)}
        >
          ✕
        </button>

        {/* Step 1: Email */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: T.primary, marginBottom: "0.5rem", fontWeight: 600 }}>
              Step 1 of 2
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: T.text, marginBottom: "0.5rem", fontFamily: T.fontSystem }}>
              Claim your place in the Guild
            </h2>
            <p style={{ fontSize: "0.85rem", color: T.textDim, marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Your email starts everything. No spam. No selling. Just access.
            </p>
            <form onSubmit={handleEmailSubmit}>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                autoComplete="email"
                aria-label="Email address"
                aria-invalid={!!error}
                aria-describedby={error ? "email-error" : undefined}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${error ? T.danger : T.border}`,
                  borderRadius: T.radius,
                  color: T.text,
                  fontSize: "1rem",
                  fontFamily: T.fontSystem,
                  marginBottom: error ? "0.25rem" : "1rem",
                  transition: "border-color 0.2s",
                  outline: "none",
                }}
                onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = T.primary; }}
                onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = T.border; }}
              />
              {error && (
                <div id="email-error" role="alert" style={{ fontSize: "0.8rem", color: T.danger, marginBottom: "0.75rem" }}>
                  {error}
                </div>
              )}
              <CTAButton onClick={() => {}} style={{ width: "100%" }}>
                Continue →
              </CTAButton>
            </form>
            <p style={{ fontSize: "0.72rem", color: T.textMuted, marginTop: "1rem", textAlign: "center", lineHeight: 1.5 }}>
              By continuing, you agree to our Terms of Service.<br />
              We'll never share your data without explicit consent.
            </p>
          </div>
        )}

        {/* Step 2: Preference */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: T.primary, marginBottom: "0.5rem", fontWeight: 600 }}>
              Step 2 of 2
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: T.text, marginBottom: "0.5rem", fontFamily: T.fontSystem }}>
              What brings you to NOIZY?
            </h2>
            <p style={{ fontSize: "0.85rem", color: T.textDim, marginBottom: "1.25rem", lineHeight: 1.5 }}>
              This helps us show you the right tools first.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
              {PREFERENCES.map((pref) => (
                <PreferenceCard
                  key={pref.id}
                  pref={pref}
                  selected={preference === pref.id}
                  disabled={submitting}
                  onClick={() => handlePreferenceSelect(pref.id)}
                />
              ))}
            </div>
            {submitting && (
              <div style={{ textAlign: "center", marginTop: "1rem", color: T.textDim, fontSize: "0.85rem" }}>
                Setting up your account...
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✦</div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: T.text, marginBottom: "0.5rem", fontFamily: T.fontSystem }}>
              You're in.
            </h2>
            <p style={{ fontSize: "0.9rem", color: T.textDim, marginBottom: "0.5rem", lineHeight: 1.5 }}>
              Check <span style={{ color: T.primary }}>{email}</span> for your access link.
            </p>
            <p style={{ fontSize: "0.8rem", color: T.textMuted, marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Your voice sovereignty starts now.
            </p>
            <CTAButton onClick={handleClose}>
              Enter the DreamChamber
            </CTAButton>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Preference Card ────────────────────────────────────────────────────
function PreferenceCard({ pref, selected, disabled, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: selected ? "rgba(161, 243, 255, 0.1)" : hover ? T.surfaceHover : T.surface,
        border: `1px solid ${selected ? T.primary : hover ? T.borderBright : T.border}`,
        borderRadius: T.radius,
        padding: "1rem 0.75rem",
        textAlign: "center",
        cursor: disabled ? "wait" : "pointer",
        transition: "all 0.2s",
        opacity: disabled && !selected ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>{pref.icon}</div>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: selected ? T.primary : T.text }}>{pref.label}</div>
    </button>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────
export default function NoizyHeroSignup() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeVariant, setActiveVariant] = useState("A");
  const [heroVisible, setHeroVisible] = useState(false);
  const copy = COPY_VARIANTS[activeVariant];

  useEffect(() => {
    track("hero_page_view", { variant: activeVariant });
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCTAClick = useCallback(() => {
    track("hero_cta_clicked", { variant: activeVariant, cta_text: copy.cta });
    setModalOpen(true);
  }, [activeVariant, copy.cta]);

  const handleSecondaryClick = useCallback(() => {
    track("hero_secondary_clicked", { variant: activeVariant, cta_text: copy.ctaSecondary });
  }, [activeVariant, copy.ctaSecondary]);

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.fontSystem, color: T.text, overflowX: "hidden", WebkitFontSmoothing: "antialiased" }}>
      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes waveBar { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
        @keyframes glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }

        ::selection { background: rgba(161, 243, 255, 0.25); color: #fff; }

        @media (max-width: 640px) {
          .hero-metrics { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-cta-row { flex-direction: column !important; }
          .hero-cta-row button { width: 100% !important; }
        }
      `}</style>

      {/* Ambient background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(ellipse at 15% 30%, rgba(161, 243, 255, 0.03) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 70%, rgba(217, 255, 0, 0.015) 0%, transparent 55%)
        `,
      }} />

      {/* Skip link */}
      <a href="#main" style={{
        position: "absolute", top: "-40px", left: 0, background: T.primary, color: T.bg,
        padding: "0.5rem 1rem", zIndex: 2000, fontWeight: 600, textDecoration: "none", transition: "top 0.2s",
      }} onFocus={(e) => { e.currentTarget.style.top = "0"; }} onBlur={(e) => { e.currentTarget.style.top = "-40px"; }}>
        Skip to main content
      </a>

      {/* Variant Switcher — Dev Only (remove in production) */}
      <div style={{
        position: "fixed", top: "1rem", right: "1rem", zIndex: 900,
        display: "flex", gap: "0.35rem", background: "rgba(0,0,0,0.6)", padding: "0.35rem", borderRadius: T.radius,
        border: `1px solid ${T.border}`, backdropFilter: "blur(4px)",
      }}>
        <span style={{ fontSize: "0.6rem", color: T.textMuted, padding: "0.25rem 0.5rem", textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "center" }}>
          Copy
        </span>
        {["A", "B", "C"].map((v) => (
          <button
            key={v}
            onClick={() => { setActiveVariant(v); track("variant_switched", { to: v }); }}
            style={{
              padding: "0.25rem 0.6rem", fontSize: "0.7rem", fontWeight: 600,
              background: activeVariant === v ? T.primary : "transparent",
              color: activeVariant === v ? T.bg : T.textDim,
              border: `1px solid ${activeVariant === v ? T.primary : "transparent"}`,
              borderRadius: "4px", cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ─── HERO ───────────────────────────────────────────────────── */}
      <main id="main" style={{
        position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center",
        minHeight: "100vh", padding: "3rem 1.5rem 4rem", maxWidth: "860px", margin: "0 auto",
      }}>
        {/* Nav bar minimal */}
        <nav style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "6vh",
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(-8px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-1px" }}>
            NOIZY<span style={{ color: T.primary }}>.AI</span>
          </div>
          <button
            onClick={handleCTAClick}
            style={{
              padding: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: 600,
              background: "transparent", color: T.textDim, border: `1px solid ${T.border}`,
              borderRadius: T.radius, cursor: "pointer", transition: "all 0.2s", fontFamily: T.fontSystem,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.primary; e.currentTarget.style.color = T.primary; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textDim; }}
          >
            Sign Up
          </button>
        </nav>

        {/* Tagline */}
        <div style={{
          textAlign: "center",
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
        }}>
          <div style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: T.textMuted, marginBottom: "1rem" }}>
            Consent as Executable Code
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)", fontWeight: 800, letterSpacing: "-2px", lineHeight: 1.05, marginBottom: "0.25rem" }}>
            {copy.headline}
          </h1>
          <h2 style={{ fontSize: "clamp(2.5rem, 7vw, 4rem)", fontWeight: 800, letterSpacing: "-2px", lineHeight: 1.05, color: T.primary, marginBottom: "1.5rem" }}>
            {copy.subhead}
          </h2>
        </div>

        {/* Body copy */}
        <p style={{
          fontSize: "clamp(1rem, 2.5vw, 1.15rem)", color: T.textDim, textAlign: "center",
          maxWidth: "540px", lineHeight: 1.65, marginBottom: "2rem",
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s",
        }}>
          {copy.body}
        </p>

        {/* Waveform */}
        <div style={{
          marginBottom: "2rem",
          opacity: heroVisible ? 1 : 0,
          transition: "opacity 0.8s ease 0.5s",
        }}>
          <WaveformBars count={28} />
        </div>

        {/* CTA Row */}
        <div className="hero-cta-row" style={{
          display: "flex", gap: "0.75rem", marginBottom: "2.5rem", flexWrap: "wrap", justifyContent: "center",
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease 0.6s, transform 0.6s ease 0.6s",
        }}>
          <CTAButton onClick={handleCTAClick}>
            {copy.cta}
          </CTAButton>
          <CTAButton variant="secondary" onClick={handleSecondaryClick}>
            {copy.ctaSecondary}
          </CTAButton>
        </div>

        {/* Trust Metrics */}
        <div className="hero-metrics" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem",
          width: "100%", maxWidth: "640px", marginBottom: "3rem",
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease 0.8s, transform 0.6s ease 0.8s",
        }}>
          <MetricCard value="75%" label="Creator Royalty" accent />
          <MetricCard value="9" label="Never Clauses" />
          <MetricCard value="<30ms" label="Edge Latency" />
          <MetricCard value="∞" label="Consent Revoke" />
        </div>

        {/* Consent pillars */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem",
          width: "100%", maxWidth: "640px",
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease 1s, transform 0.6s ease 1s",
        }}>
          {[
            { title: "Voice Sovereignty", text: "Your voice DNA is cryptographically sealed. No one trains on it without your signed consent." },
            { title: "Immutable Never-Clauses", text: "Hard rules that can't be overridden. No impersonation. No sublicensing. No exceptions." },
            { title: "Transparent Ledger", text: "Every usage, every payment, every consent decision — logged immutably, visible to you." },
            { title: "Instant Revoke", text: "Pull your consent at any time. All downstream usage stops. Your voice returns to you." },
          ].map((pillar) => (
            <div key={pillar.title} style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "1.25rem", textAlign: "left",
            }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: T.primary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>
                {pillar.title}
              </div>
              <div style={{ fontSize: "0.85rem", color: T.textDim, lineHeight: 1.5 }}>
                {pillar.text}
              </div>
            </div>
          ))}
        </div>

        {/* Footer line */}
        <div style={{
          marginTop: "3rem", textAlign: "center",
          opacity: heroVisible ? 1 : 0, transition: "opacity 0.6s ease 1.2s",
        }}>
          <p style={{ fontSize: "0.75rem", color: T.textMuted, fontStyle: "italic" }}>
            "We are the new punk rockers: capitalist free thinkers who believe in peace, love, and understanding."
          </p>
          <p style={{ fontSize: "0.65rem", color: T.textMuted, marginTop: "0.5rem" }}>
            — Robert Stephen Plowman, Founder
          </p>
        </div>
      </main>

      {/* Signup Modal */}
      <SignupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        copyVariant={activeVariant}
      />
    </div>
  );
}