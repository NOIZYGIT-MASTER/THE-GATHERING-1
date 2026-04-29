import React, { useState } from "react";

// ============================================================
// RSP_001 AUTOMATION PANEL — NOIZY Command Center
// File: dreamjam/src/panels/rsp001-automation-panel.tsx
// Author: Robert Stephen Plowman (RSP_001)
// Date: April 5, 2026
// Purpose: Founding actor's operational dashboard for
//          HEAVEN17, Voice DNA, Kill Switch, Royalties,
//          Consent Tokens, and Guild Governance.
// ============================================================

// --- Types (from packages/schemas) ---
interface ConsentToken {
  id: string;
  licensee: string;
  scope: string;
  territory: string;
  status: "active" | "paused" | "revoked";
  expiresAt: string;
  synthesesCount: number;
  revenue: number;
}

interface VoiceDNAProfile {
  actorId: string;
  hash: string;
  registeredAt: string;
  lastCertified: string;
  matchThreshold: number;
  status: "active" | "recertification_due" | "locked";
  sessionsRecorded: number;
  hoursOfReference: number;
}

interface RoyaltyEntry {
  id: string;
  date: string;
  licensee: string;
  grossRevenue: number;
  artistShare: number;
  noizyShare: number;
  status: "paid" | "pending" | "scheduled";
}

interface DetectionAlert {
  id: string;
  timestamp: string;
  source: string;
  platform: string;
  similarityScore: number;
  status: "investigating" | "confirmed" | "cleared" | "enforcing";
  evidenceUrl: string;
}

// --- Mock Data (replace with HEAVEN17 API calls) ---
const MOCK_TOKENS: ConsentToken[] = [
  { id: "hvs_tk_001", licensee: "Meridian Studios", scope: "commercial_broadcast", territory: "USA_CA_NY", status: "active", expiresAt: "2026-12-25", synthesesCount: 847, revenue: 12450 },
  { id: "hvs_tk_002", licensee: "NeonWave Records", scope: "personal_podcast", territory: "GLOBAL", status: "active", expiresAt: "2027-03-15", synthesesCount: 2103, revenue: 8920 },
  { id: "hvs_tk_003", licensee: "Apex Media Group", scope: "enterprise_film", territory: "EU_UK", status: "paused", expiresAt: "2026-09-30", synthesesCount: 156, revenue: 45200 },
  { id: "hvs_tk_004", licensee: "SynthLab AI", scope: "commercial_broadcast", territory: "APAC", status: "revoked", expiresAt: "2026-06-01", synthesesCount: 0, revenue: 0 },
];

const MOCK_VOICE_DNA: VoiceDNAProfile = {
  actorId: "RSP_001",
  hash: "sha256:7f4a9e2c8b1d3f6a...",
  registeredAt: "2025-06-15T10:30:00Z",
  lastCertified: "2026-03-25T14:30:00Z",
  matchThreshold: 0.95,
  status: "active",
  sessionsRecorded: 47,
  hoursOfReference: 28.5,
};

const MOCK_ROYALTIES: RoyaltyEntry[] = [
  { id: "roy_001", date: "2026-04-02", licensee: "Meridian Studios", grossRevenue: 3200, artistShare: 2400, noizyShare: 800, status: "paid" },
  { id: "roy_002", date: "2026-04-03", licensee: "NeonWave Records", grossRevenue: 1800, artistShare: 1350, noizyShare: 450, status: "paid" },
  { id: "roy_003", date: "2026-04-04", licensee: "Apex Media Group", grossRevenue: 8500, artistShare: 6375, noizyShare: 2125, status: "scheduled" },
  { id: "roy_004", date: "2026-04-05", licensee: "Meridian Studios", grossRevenue: 2100, artistShare: 1575, noizyShare: 525, status: "pending" },
];

const MOCK_ALERTS: DetectionAlert[] = [
  { id: "det_001", timestamp: "2026-04-05T08:12:00Z", source: "C2PA Mismatch", platform: "YouTube", similarityScore: 0.97, status: "investigating", evidenceUrl: "https://evidence.noizylab.internal/case-047" },
  { id: "det_002", timestamp: "2026-04-04T22:45:00Z", source: "Community Report", platform: "TikTok", similarityScore: 0.91, status: "confirmed", evidenceUrl: "https://evidence.noizylab.internal/case-046" },
];

const NEVER_CLAUSES = [
  "NO_VOICE_EXPORT_WITHOUT_CONSENT_KEY",
  "NO_MODEL_TRAINING_OUTSIDE_APPROVED_SCOPE",
  "NO_IDENTITY_IMPERSONATION",
  "NO_SUBLICENSING",
  "NO_NSFW",
  "NO_POLITICAL_PERSUASION",
  "NO_MEDICAL_ADVICE",
] as const;

// --- Component ---
type TabId = "overview" | "tokens" | "voicedna" | "royalties" | "enforcement" | "killswitch";

export default function RSP001AutomationPanel() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [tokens, setTokens] = useState(MOCK_TOKENS);
  const [killSwitchTarget, setKillSwitchTarget] = useState("");
  const [killSwitchConfirm, setKillSwitchConfirm] = useState(false);
  const [killSwitchFired, setKillSwitchFired] = useState(false);

  const totalRevenue = MOCK_ROYALTIES.reduce((sum, r) => sum + r.artistShare, 0);
  const activeTokenCount = tokens.filter((t) => t.status === "active").length;
  const totalSyntheses = tokens.reduce((sum, t) => sum + t.synthesesCount, 0);

  function handleKillSwitch(tokenId: string) {
    setTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId ? { ...t, status: "revoked" as const, synthesesCount: 0 } : t
      )
    );
    setKillSwitchFired(true);
    setKillSwitchConfirm(false);
    setKillSwitchTarget("");
    setTimeout(() => setKillSwitchFired(false), 3000);
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tokens", label: "Consent Tokens" },
    { id: "voicedna", label: "Voice DNA" },
    { id: "royalties", label: "Royalties" },
    { id: "enforcement", label: "Enforcement" },
    { id: "killswitch", label: "Kill Switch" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-wide">
              <span className="text-yellow-500">NOIZY</span>{" "}
              <span className="text-gray-400 font-normal">/ RSP_001 Automation Panel</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1 tracking-wider uppercase">
              Heaven17 Console &mdash; Founding Actor Command Center
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/30 border border-green-700/40 text-green-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              HEAVEN17 LIVE
            </span>
            <span className="text-xs text-gray-500">RSP_001</span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-gray-800 px-6">
        <div className="flex gap-1 max-w-7xl mx-auto overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-yellow-500 text-yellow-500"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Kill Switch Fired Banner */}
      {killSwitchFired && (
        <div className="bg-red-900/40 border-b border-red-700/50 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-red-300 text-sm">
            <span className="font-bold">KILL SWITCH ACTIVATED</span> &mdash; Token revoked. All
            future syntheses blocked. Licensee notified. Ledger updated.
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* ===== OVERVIEW ===== */}
        {activeTab === "overview" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">System Overview</h2>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Active Tokens" value={activeTokenCount.toString()} accent="yellow" />
              <StatCard label="Total Syntheses" value={totalSyntheses.toLocaleString()} accent="blue" />
              <StatCard label="Artist Revenue (MTD)" value={`$${totalRevenue.toLocaleString()}`} accent="green" />
              <StatCard label="Detection Alerts" value={MOCK_ALERTS.length.toString()} accent="red" />
            </div>

            {/* Voice DNA Status */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-yellow-500 tracking-wide uppercase">Voice DNA Vault</h3>
                <StatusBadge status={MOCK_VOICE_DNA.status === "active" ? "active" : "warning"} label={MOCK_VOICE_DNA.status} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-500 block">Actor ID</span><span className="font-mono">{MOCK_VOICE_DNA.actorId}</span></div>
                <div><span className="text-gray-500 block">Sessions</span>{MOCK_VOICE_DNA.sessionsRecorded}</div>
                <div><span className="text-gray-500 block">Reference Hours</span>{MOCK_VOICE_DNA.hoursOfReference}h</div>
                <div><span className="text-gray-500 block">Match Threshold</span>{(MOCK_VOICE_DNA.matchThreshold * 100).toFixed(0)}%</div>
              </div>
            </div>

            {/* Never Clauses */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-red-400 tracking-wide uppercase mb-3">Constitutional Never Clauses</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {NEVER_CLAUSES.map((clause) => (
                  <div key={clause} className="flex items-center gap-2 text-sm py-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="font-mono text-xs text-gray-300">{clause}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-3">These are immutable. Constitutional-level law. If this list changes, governance hashes must recompile.</p>
            </div>
          </div>
        )}

        {/* ===== CONSENT TOKENS ===== */}
        {activeTab === "tokens" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Consent Tokens</h2>
            <div className="space-y-3">
              {tokens.map((token) => (
                <div key={token.id} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{token.licensee}</h3>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">{token.id}</p>
                    </div>
                    <StatusBadge
                      status={token.status === "active" ? "active" : token.status === "paused" ? "warning" : "danger"}
                      label={token.status}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-gray-500 block text-xs">Scope</span>{token.scope.replace(/_/g, " ")}</div>
                    <div><span className="text-gray-500 block text-xs">Territory</span>{token.territory}</div>
                    <div><span className="text-gray-500 block text-xs">Expires</span>{token.expiresAt}</div>
                    <div><span className="text-gray-500 block text-xs">Syntheses</span>{token.synthesesCount.toLocaleString()}</div>
                  </div>
                  {token.status === "active" && (
                    <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2">
                      <button className="px-3 py-1.5 text-xs bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 rounded hover:bg-yellow-900/50 transition-colors">
                        Pause Token
                      </button>
                      <button
                        onClick={() => { setKillSwitchTarget(token.id); setKillSwitchConfirm(true); setActiveTab("killswitch"); }}
                        className="px-3 py-1.5 text-xs bg-red-900/30 border border-red-700/40 text-red-400 rounded hover:bg-red-900/50 transition-colors"
                      >
                        Revoke (Kill Switch)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== VOICE DNA ===== */}
        {activeTab === "voicedna" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Voice DNA Vault</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-yellow-500 uppercase tracking-wide mb-3">Biometric Profile</h3>
                  <div className="space-y-3 text-sm">
                    <InfoRow label="Actor ID" value={MOCK_VOICE_DNA.actorId} mono />
                    <InfoRow label="Voice DNA Hash" value={MOCK_VOICE_DNA.hash} mono />
                    <InfoRow label="Registered" value={new Date(MOCK_VOICE_DNA.registeredAt).toLocaleDateString()} />
                    <InfoRow label="Last Certified" value={new Date(MOCK_VOICE_DNA.lastCertified).toLocaleDateString()} />
                    <InfoRow label="Match Threshold" value={`${(MOCK_VOICE_DNA.matchThreshold * 100).toFixed(0)}% (legal threshold for prosecution)`} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-500 uppercase tracking-wide mb-3">Recording Stats</h3>
                  <div className="space-y-3 text-sm">
                    <InfoRow label="Sessions Recorded" value={MOCK_VOICE_DNA.sessionsRecorded.toString()} />
                    <InfoRow label="Hours of Reference" value={`${MOCK_VOICE_DNA.hoursOfReference}h`} />
                    <InfoRow label="Encryption" value="AES-256 (migrating to ML-KEM Q3 2026)" />
                    <InfoRow label="Training Access" value="LOCKED — Never used for fine-tuning" />
                    <InfoRow label="Next Re-Certification" value="June 15, 2026" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Vault Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-950 rounded p-3 border border-gray-800">
                  <span className="text-green-400 text-xs font-semibold block mb-1">SPECTRAL LAYER</span>
                  <span className="text-gray-400">DWPT watermark active. &lt;0.2dB SNR loss. Survives MP3/AAC/Opus compression.</span>
                </div>
                <div className="bg-gray-950 rounded p-3 border border-gray-800">
                  <span className="text-blue-400 text-xs font-semibold block mb-1">C2PA LAYER</span>
                  <span className="text-gray-400">v2.2 manifest. Cryptographic signing via HEAVEN17. Tamper-evident hash chain.</span>
                </div>
                <div className="bg-gray-950 rounded p-3 border border-gray-800">
                  <span className="text-yellow-400 text-xs font-semibold block mb-1">LEDGER LAYER</span>
                  <span className="text-gray-400">Append-only hash chain. Indexed by output SHA-256. Forensic evidence grade.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== ROYALTIES ===== */}
        {activeTab === "royalties" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Royalties — 75/25 Sacred Law</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatCard label="Artist Share (MTD)" value={`$${totalRevenue.toLocaleString()}`} accent="green" />
              <StatCard label="Gross Revenue (MTD)" value={`$${MOCK_ROYALTIES.reduce((s, r) => s + r.grossRevenue, 0).toLocaleString()}`} accent="yellow" />
              <StatCard label="Split Integrity" value="75 / 25" accent="blue" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Licensee</th>
                    <th className="px-5 py-3 text-right">Gross</th>
                    <th className="px-5 py-3 text-right">Your 75%</th>
                    <th className="px-5 py-3 text-right">NOIZY 25%</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ROYALTIES.map((r) => (
                    <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs">{r.date}</td>
                      <td className="px-5 py-3">{r.licensee}</td>
                      <td className="px-5 py-3 text-right font-mono">${r.grossRevenue.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-mono text-green-400">${r.artistShare.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right font-mono text-gray-500">${r.noizyShare.toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          status={r.status === "paid" ? "active" : r.status === "scheduled" ? "warning" : "info"}
                          label={r.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-3">75/25 split is burned into code at database level. Creator Council cannot change without 75% Guild Assembly supermajority. T+3 automatic payout.</p>
          </div>
        )}

        {/* ===== ENFORCEMENT ===== */}
        {activeTab === "enforcement" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Detection & Enforcement</h2>
            <div className="space-y-3">
              {MOCK_ALERTS.map((alert) => (
                <div key={alert.id} className={`bg-gray-900 border rounded-lg p-5 ${
                  alert.status === "confirmed" ? "border-red-700/50" : "border-gray-800"
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{alert.source} — {alert.platform}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(alert.timestamp).toLocaleString()}</p>
                    </div>
                    <StatusBadge
                      status={alert.status === "confirmed" ? "danger" : alert.status === "investigating" ? "warning" : "active"}
                      label={alert.status}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Similarity Score</span>
                      <span className={alert.similarityScore >= 0.95 ? "text-red-400 font-bold" : "text-yellow-400"}>
                        {(alert.similarityScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div><span className="text-gray-500 block text-xs">Platform</span>{alert.platform}</div>
                    <div><span className="text-gray-500 block text-xs">Evidence</span><span className="font-mono text-xs text-blue-400">{alert.id}</span></div>
                  </div>
                  {alert.status === "confirmed" && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <p className="text-xs text-red-300 mb-2">Similarity &gt; 95%: Presumptively unauthorized. Legal threshold met.</p>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 text-xs bg-red-900/30 border border-red-700/40 text-red-400 rounded hover:bg-red-900/50">
                          Issue Cease & Desist
                        </button>
                        <button className="px-3 py-1.5 text-xs bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 rounded hover:bg-yellow-900/50">
                          DMCA Takedown
                        </button>
                        <button className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded hover:bg-gray-700">
                          Escalate to Litigation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== KILL SWITCH ===== */}
        {activeTab === "killswitch" && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Kill Switch — Nuclear Revocation</h2>
            <p className="text-sm text-gray-500 mb-6">Instant, irreversible consent token revocation. All future syntheses under the target token will fail. Licensees notified by webhook. Ledger records immutable revocation event.</p>

            <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-6 mb-6">
              <h3 className="text-red-400 font-semibold text-sm uppercase tracking-wide mb-4">Select Token to Revoke</h3>
              <div className="space-y-2 mb-4">
                {tokens.filter((t) => t.status === "active").map((token) => (
                  <label key={token.id} className="flex items-center gap-3 p-3 rounded bg-gray-900/50 border border-gray-800 cursor-pointer hover:border-red-700/50 transition-colors">
                    <input
                      type="radio"
                      name="killTarget"
                      value={token.id}
                      checked={killSwitchTarget === token.id}
                      onChange={() => { setKillSwitchTarget(token.id); setKillSwitchConfirm(false); }}
                      className="accent-red-500"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-sm">{token.licensee}</span>
                      <span className="text-xs text-gray-500 ml-2 font-mono">{token.id}</span>
                    </div>
                    <span className="text-xs text-gray-500">{token.synthesesCount.toLocaleString()} syntheses</span>
                  </label>
                ))}
                {tokens.filter((t) => t.status === "active").length === 0 && (
                  <p className="text-sm text-gray-500 italic">No active tokens to revoke.</p>
                )}
              </div>

              {killSwitchTarget && !killSwitchConfirm && (
                <button
                  onClick={() => setKillSwitchConfirm(true)}
                  className="px-5 py-2.5 bg-red-900/50 border border-red-700 text-red-300 rounded font-semibold text-sm hover:bg-red-800/50 transition-colors"
                >
                  Arm Kill Switch for {killSwitchTarget}
                </button>
              )}

              {killSwitchConfirm && (
                <div className="bg-red-900/30 border border-red-600/50 rounded p-4 mt-2">
                  <p className="text-red-300 text-sm font-semibold mb-2">CONFIRM REVOCATION</p>
                  <p className="text-red-200/70 text-xs mb-3">
                    This will immediately revoke <span className="font-mono">{killSwitchTarget}</span>. All future syntheses will fail.
                    Licensee receives instant webhook notification. This action is logged to the immutable ledger and cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleKillSwitch(killSwitchTarget)}
                      className="px-5 py-2 bg-red-700 text-white rounded font-bold text-sm hover:bg-red-600 transition-colors"
                    >
                      FIRE KILL SWITCH
                    </button>
                    <button
                      onClick={() => { setKillSwitchConfirm(false); setKillSwitchTarget(""); }}
                      className="px-5 py-2 bg-gray-800 text-gray-300 rounded text-sm hover:bg-gray-700 transition-colors"
                    >
                      Stand Down
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Kill Switch Protocol</h3>
              <div className="text-sm text-gray-400 space-y-2">
                <p><span className="text-yellow-500 font-mono text-xs">POST</span> /heaven17.noizylab.workers.dev/tokens/&#123;token_id&#125;/revoke</p>
                <p>Once revoked: All future syntheses fail (Covenant Validator rejects token). Platform webhooks fire. Licensee notified. Ledger records immutable revocation. C2PA credential marked "consent revoked."</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 mt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-600">
          <span>NOIZY / HEAVEN17 Console v1.0 — The Plowman Standard</span>
          <span>RSP_001 &mdash; Robert Stephen Plowman &mdash; April 5, 2026</span>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-components ---
function StatCard({ label, value, accent }: { label: string; value: string; accent: "yellow" | "blue" | "green" | "red" }) {
  const colors = {
    yellow: "text-yellow-500 border-yellow-700/30 bg-yellow-900/10",
    blue: "text-blue-400 border-blue-700/30 bg-blue-900/10",
    green: "text-green-400 border-green-700/30 bg-green-900/10",
    red: "text-red-400 border-red-700/30 bg-red-900/10",
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[accent]}`}>
      <span className="text-2xl font-bold block">{value}</span>
      <span className="text-xs text-gray-500 mt-1 block">{label}</span>
    </div>
  );
}

function StatusBadge({ status, label }: { status: "active" | "warning" | "danger" | "info"; label: string }) {
  const colors = {
    active: "bg-green-900/30 border-green-700/40 text-green-400",
    warning: "bg-yellow-900/30 border-yellow-700/40 text-yellow-400",
    danger: "bg-red-900/30 border-red-700/40 text-red-400",
    info: "bg-blue-900/30 border-blue-700/40 text-blue-400",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${colors[status]}`}>
      {label}
    </span>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-gray-500">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
