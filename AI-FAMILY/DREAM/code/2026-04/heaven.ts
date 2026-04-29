// ═══════════════════════════════════════════════════════════════════════
// HEAVEN API Client
// Connects the landing page to the consent kernel.
// ═══════════════════════════════════════════════════════════════════════

const HEAVEN_URL = process.env.NEXT_PUBLIC_HEAVEN_URL || 'https://heaven.noizy.ai';

interface SignupData {
  email: string;
  name: string;
  role: 'artist' | 'licensee' | 'curious';
  source: string;
}

interface HeavenResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Submit a signup to HEAVEN's /v1/signup endpoint.
 * This stores interest in KV and triggers the welcome flow.
 */
export async function submitSignup(data: SignupData): Promise<HeavenResponse> {
  try {
    const response = await fetch(`${HEAVEN_URL}/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'HEAVEN-API-Version': '2026-04-12',
      },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        role: data.role,
        source: data.source,
        signed_up_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: err.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Get HEAVEN health status — used for the "system alive" indicator
 */
export async function getHealthStatus(): Promise<{ alive: boolean; version: string }> {
  try {
    const response = await fetch(`${HEAVEN_URL}/v1/health`, {
      headers: { 'HEAVEN-API-Version': '2026-04-12' },
    });
    if (response.ok) {
      const data = await response.json();
      return { alive: true, version: data.version || 'v18' };
    }
    return { alive: false, version: 'unknown' };
  } catch {
    return { alive: false, version: 'unknown' };
  }
}

/**
 * Get the 9 Never Clauses — for the "What We'll Never Do" section
 */
export async function getNeverClauses(): Promise<string[]> {
  try {
    const response = await fetch(`${HEAVEN_URL}/v1/never-clauses`, {
      headers: { 'HEAVEN-API-Version': '2026-04-12' },
    });
    if (response.ok) {
      const data = await response.json();
      return data.clauses?.map((c: { clause_text: string }) => c.clause_text) || [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Get A/B test variant for copy experiments
 */
export async function getVariant(experimentId: string): Promise<string> {
  try {
    const response = await fetch(`${HEAVEN_URL}/v1/variant?experiment=${experimentId}`, {
      headers: { 'HEAVEN-API-Version': '2026-04-12' },
    });
    if (response.ok) {
      const data = await response.json();
      return data.variant || 'A';
    }
    return 'A';
  } catch {
    return 'A';
  }
}
