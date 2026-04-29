# NOIZYVOX Notification Hooks — Integration Guide
### NOIZYFISH INC. | March 2026

---

## Overview

NOIZYVOX notification hooks fire on critical events across the consent + payment + voice session lifecycle:

| Event | Trigger | Recipients | Use Case |
|-------|---------|-----------|----------|
| `consent_granted` | Heaven17 approves consent scope | Licensee + admin log | Consent approval confirmation |
| `consent_denied` | Heaven17 blocks consent scope | Admin only | Policy violation alert |
| `payment_received` | Stripe webhook: payment_intent.succeeded | Licensee + admin | Payment confirmation + receipt |
| `voice_session_recorded` | NOIZYSTREAM: session ends, file archived | Actor + admin | Session complete confirmation |
| `licensee_onboarded` | New licensee account created + verified | Admin | New customer alert |

All events:
- Log to `NOIZYVOXNotificationHooks.notificationLog` (in-memory for session; use D1 for persistence)
- Send Discord embed (if webhook configured)
- Send email notification (if recipient email valid)
- Include timestamp + event metadata + actor/licensee identifier

---

## Setup (3 Steps)

### Step 1: Load Notification Hooks into Heaven17 Worker

In your `cloudflare/workers/consent-gateway/` worker:

```javascript
import { NOIZYVOXNotificationHooks } from "../../scripts/noizyvox-notification-hooks.js";

export default {
  async fetch(request, env) {
    const hooks = new NOIZYVOXNotificationHooks({
      webhookUrl: env.DISCORD_AUDIT_WEBHOOK,
      smtpUser: "rsp@noisy.ai",
      adminEmail: "rsplowman@icloud.com"
    });

    // ... your existing consent-gateway logic ...

    // Example: When Heaven17 approves consent
    if (consentResult.approved) {
      await hooks.onConsentGranted({
        actor: request.actor,
        scope: request.scope,
        voiceDna: request.voiceDna
      });
    }

    return new Response(JSON.stringify(consentResult));
  }
};
```

---

### Step 2: Wire Stripe Webhooks to Payment Notifications

Create a Stripe webhook endpoint that listens for `payment_intent.succeeded`:

```javascript
// Example: Cloudflare Worker or Node.js endpoint
export async function handleStripeWebhook(event, env) {
  if (event.type !== "payment_intent.succeeded") return;

  const hooks = new NOIZYVOXNotificationHooks({
    webhookUrl: env.DISCORD_AUDIT_WEBHOOK,
    adminEmail: "rsplowman@icloud.com"
  });

  const paymentIntent = event.data.object;

  await hooks.onPaymentReceived({
    licensee: paymentIntent.customer_email,
    amount: paymentIntent.amount / 100, // Convert from cents
    tier: paymentIntent.metadata.tier || "standard",
    paymentId: paymentIntent.id
  });
}
```

**Stripe Dashboard Setup:**
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-worker.workers.dev/stripe-webhook`
4. Events to send: `payment_intent.succeeded`
5. Copy signing secret → save as `STRIPE_WEBHOOK_SECRET` in Cloudflare env vars
6. Verify webhook signature in handler (see Stripe docs)

---

### Step 3: Configure Discord + Email Environment Variables

**In Cloudflare Workers:**

```bash
wrangler secret put DISCORD_AUDIT_WEBHOOK
# Paste your Discord webhook URL (format: https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN)

wrangler secret put SMTP_PASSWORD
# Paste your Gmail app password (from SMTP_OUTBOUND_SETUP.md)
```

**Or in `wrangler.jsonc`** (for local env):

```json
{
  "env": {
    "production": {
      "vars": {
        "ADMIN_EMAIL": "rsplowman@icloud.com"
      },
      "secrets": [
        "DISCORD_AUDIT_WEBHOOK",
        "SMTP_PASSWORD"
      ]
    }
  }
}
```

---

## Discord Webhook Setup (30 seconds)

1. In your Discord server, create or select a channel for alerts (e.g., #noizyvox-alerts)
2. Right-click channel → **Edit Channel**
3. Go to **Integrations** → **Webhooks**
4. Click **Create Webhook**
5. Name it: `NOIZYVOX Notifications`
6. Copy the webhook URL
7. Paste into `DISCORD_AUDIT_WEBHOOK` secret

Example webhook URL:
```
https://discord.com/api/webhooks/1234567890/abcdefghijklmnop
```

---

## Event Flow Examples

### Example 1: Consent Granted → Notification Chain

```
1. Licensee requests consent via Heaven17 (/verify endpoint)
2. Heaven17 approves: scope=speech_to_text, actor=licensee_123
3. Heaven17 calls: hooks.onConsentGranted({...})
4. Notification hooks fires:
   - Discord: Gold embed ✅ Consent Granted — licensee_123 — speech_to_text
   - Email: To licensee_123 | Subject: Consent Approved: speech_to_text
5. Event logged to notificationLog
```

### Example 2: Payment Received → Notification Chain

```
1. Licensee purchases "Pro" tier via NOIZYVOX payment link
2. Stripe payment succeeds: amount=$99, customer=licensee_123@example.com
3. Stripe webhook triggers: handleStripeWebhook(payment_intent.succeeded)
4. Webhook calls: hooks.onPaymentReceived({...})
5. Notification hooks fires:
   - Discord: Gold embed 💰 Payment Received — licensee_123 — Pro — $99
   - Email: To licensee_123@example.com | Subject: Payment Confirmed: Pro License
6. Event logged to notificationLog
```

### Example 3: Voice Session Recorded → Notification Chain

```
1. Actor (RSP_001) records voice session in NOIZYSTREAM
2. Session ends, file archived to R2
3. NOIZYSTREAM calls: hooks.onVoiceSessionRecorded({...})
4. Notification hooks fires:
   - Discord: Gold embed 🎙️ Voice Session Recorded — RSP_001 — 2m30s
   - Email: To RSP_001 | Subject: Voice Session Complete: [sessionId]
5. Event logged to notificationLog
```

---

## Testing (Local)

### Test 1: Consent Granted

```javascript
const hooks = new NOIZYVOXNotificationHooks({
  webhookUrl: "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN",
  adminEmail: "rsplowman@icloud.com"
});

await hooks.onConsentGranted({
  actor: "test_actor_001",
  scope: "speech_to_text",
  voiceDna: "RSP_001"
});

// Check: Discord channel should have ✅ Consent Granted message
// Check: notificationLog should have 1 entry
```

### Test 2: Payment Received

```javascript
await hooks.onPaymentReceived({
  licensee: "test_licensee@example.com",
  amount: 99,
  tier: "pro",
  paymentId: "pi_test_12345"
});

// Check: Email logged to console
// Check: Discord should have 💰 Payment Received message
```

### Test 3: Get Notification Summary

```javascript
const summary = hooks.getNotificationSummary(24); // Last 24 hours
console.log(summary);

// Output:
// {
//   totalEvents: 5,
//   byType: {
//     consent_granted: 2,
//     payment_received: 1,
//     voice_session_recorded: 2
//   },
//   timeRange: {
//     from: "2026-03-30T12:00:00.000Z",
//     to: "2026-03-31T12:00:00.000Z"
//   }
// }
```

---

## Integration with Empire Status Email

The `notificationLog` can be queried for dashboard updates:

```javascript
// In empire-status-email.js, add section:
const hooks = new NOIZYVOXNotificationHooks({...});
const summary = hooks.getNotificationSummary(24);

const notificationSection = `
<h2>📬 Notifications (Last 24h)</h2>
<table>
  <tr>
    <th>Event Type</th>
    <th>Count</th>
  </tr>
  ${Object.entries(summary.byType).map(([type, count]) => `
    <tr>
      <td>${type}</td>
      <td>${count}</td>
    </tr>
  `).join('')}
</table>
`;

// Insert into email template
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Discord embeds not appearing | Verify webhook URL is correct. Test with curl: `curl -X POST -H "Content-Type: application/json" -d '{"embeds":[{"description":"test"}]}' YOUR_WEBHOOK_URL` |
| Email notifications not sending | SMTP not configured. Complete SMTP_OUTBOUND_SETUP.md first. Verify credentials in env vars. |
| Events not logging | Ensure hooks.onXxx() is called after event fires. Check for async/await errors. |
| Notification log grows unbounded | In production, persist to D1 instead of in-memory. Rotate logs on cron schedule. |
| Payment webhook not triggering | Verify Stripe webhook endpoint URL is correct. Check Stripe dashboard → Developers → Webhooks → Event Deliveries for delivery logs. |

---

## Production Checklist

- [ ] Discord webhook configured + tested in #noizyvox-alerts channel
- [ ] SMTP credentials loaded into Cloudflare env (SMTP_PASSWORD, ADMIN_EMAIL)
- [ ] Stripe webhook endpoint deployed and signing secret verified
- [ ] Heaven17 worker imports + calls hooks.onConsentGranted/Denied
- [ ] NOIZYSTREAM calls hooks.onVoiceSessionRecorded on session end
- [ ] Licensee onboarding flow calls hooks.onLicenseeOnboarded
- [ ] Empire status email includes notification summary section
- [ ] All hooks tested against staging before production deploy

---

*rsp@noizyfish.com | noizy.ai | NOIZYFISH INC.*
*Created: March 30, 2026*
