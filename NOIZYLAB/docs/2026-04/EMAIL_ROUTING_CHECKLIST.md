# RSP@NOISY.AI — Email Routing Checklist
### NOIZYFISH INC. | March 2026

---

## Purpose

Receive email at `rsp@noisy.ai` via Cloudflare Email Routing (inbound).
Send as `rsp@noisy.ai` via external SMTP provider (Gmail, Outlook, etc.).

---

## Architecture

| Layer | Provider | Purpose |
|-------|----------|---------|
| Inbound (receive) | Cloudflare Email Routing | Forward inbound mail to verified inbox |
| Outbound (send) | External SMTP (Gmail/Outlook/Fastmail) | Send mail as rsp@noisy.ai |

**Key fact:** Cloudflare handles *receive only*. Sending requires separate SMTP configuration.

---

## Setup Checklist — Inbound (Cloudflare)

- [ ] **1. Open Cloudflare Dashboard**
  - Zone: `noisy.ai`
  - Navigate to: Email → Email Routing

- [ ] **2. Enable Email Routing**
  - Click "Add records and enable"
  - Cloudflare auto-adds MX + SPF records

- [ ] **3. Add Destination Inbox**
  - Go to "Destination addresses"
  - Add your real inbox email (Gmail, iCloud, Outlook, etc.)
  - **Verify the email** (required — verification email must land before routes activate)

- [ ] **4. Create Routing Rule: `rsp@noisy.ai`**
  - Go to "Routing rules"
  - Custom address: `rsp@noisy.ai`
  - Action: Send to email
  - Destination: Your verified inbox
  - Save

- [ ] **5. (Optional) Create `hello@noisy.ai`**
  - Custom address: `hello@noisy.ai`
  - Same destination inbox
  - Save

- [ ] **6. (Optional) Enable Catch-All for Warm-Up**
  - During initial setup, enable catch-all `*@noisy.ai`
  - Action: Send to email
  - Destination: Your verified inbox
  - **Note:** Disable this once domain is warm. Catch-all can become a spam sink.

- [ ] **7. Verify DNS Records**
  - Check that MX + SPF records are present:
    - **MX records** → Cloudflare mail exchangers (route1, route2, route3)
    - **SPF TXT record** → `v=spf1 include:_spf.mx.cloudflare.net ~all`

---

## DNS Records (Expected)

### MX Records
```
@   MX   10   route1.mx.cloudflare.net
@   MX   20   route2.mx.cloudflare.net
@   MX   30   route3.mx.cloudflare.net
```

### SPF Record
```
@   TXT   v=spf1 include:_spf.mx.cloudflare.net ~all
```

**Note:** This SPF only authorizes Cloudflare for inbound routing. Outbound sending requires SMTP provider's SPF records.

---

## Setup Checklist — Outbound (SMTP Provider)

Once inbound is live, configure outbound SMTP separately.

### Option 1: Gmail SMTP (Recommended for creators)

- [ ] **Enable Gmail App Passwords** (2FA required)
  - Google Account → Security → App passwords
  - Select Mail + Windows Computer
  - Copy the 16-character app password

- [ ] **Configure Mail Client (Outlook, Apple Mail, Thunderbird)**
  - SMTP Server: `smtp.gmail.com`
  - Port: `587` (TLS)
  - Username: `your-gmail@gmail.com`
  - Password: 16-character app password
  - Send as: `rsp@noisy.ai` (set in client as display address)

- [ ] **Update SPF Record** (if needed)
  ```
  @   TXT   v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all
  ```

### Option 2: Outlook/Microsoft 365 SMTP

- [ ] **Enable App Passwords**
  - Microsoft Account → Security → App passwords
  - Copy the generated password

- [ ] **Configure Mail Client**
  - SMTP Server: `smtp.office365.com`
  - Port: `587` (TLS)
  - Username: `your-outlook@outlook.com`
  - Password: Generated app password
  - Send as: `rsp@noisy.ai`

- [ ] **Update SPF Record**
  ```
  @   TXT   v=spf1 include:_spf.mx.cloudflare.net include:outlook.com ~all
  ```

### Option 3: Fastmail (Premium, creator-friendly)

- [ ] **Generate SMTP Password**
  - Fastmail Settings → Privacy & Security → Third-party apps
  - Create password for SMTP

- [ ] **Configure Mail Client**
  - SMTP Server: `smtp.fastmail.com`
  - Port: `465` (SSL) or `587` (TLS)
  - Username: `your-fastmail@fastmail.com`
  - Password: Generated SMTP password
  - Send as: `rsp@noisy.ai`

- [ ] **Update SPF Record**
  ```
  @   TXT   v=spf1 include:_spf.mx.cloudflare.net include:fastmail.com ~all
  ```

---

## Verification Checklist

After setup, verify end-to-end:

- [ ] **Inbound Test**
  - Send email to `rsp@noisy.ai` from external account
  - Check that it arrives in your verified inbox within 5 minutes
  - If no mail arrives: check destination verification status in Cloudflare

- [ ] **Outbound Test**
  - Send email from your mail client
  - Verify "From:" shows `rsp@noisy.ai`
  - Check that recipient receives it without bouncing

- [ ] **SPF Validation**
  - Use mxtoolbox.com or similar to check SPF
  - Should show both Cloudflare + SMTP provider includes

- [ ] **Catch-All Disabled (After Warm-Up)**
  - If catch-all was enabled, disable it once domain is warm
  - Go to Cloudflare Email Routing → disable catch-all rule

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Destination email not verifying | Check spam folder for Cloudflare verification email. Whitelist `noreply@cloudflare.com` if needed. |
| Mail not arriving at destination | Ensure destination is marked "Verified" in Cloudflare. Routes do not activate until verified. |
| Sending as `rsp@noisy.ai` fails | Verify SMTP credentials are correct. Test with telnet or mail client diagnostics. |
| SPF check failing | Ensure both Cloudflare + SMTP provider includes are in SPF record (space-separated). |
| Catch-all is catching spam | Disable catch-all once domain is warm. Use only explicit `rsp@noisy.ai` rule. |

---

## Clean Separation (Architecture Note)

Cloudflare Email Routing is **designed for receive-only**.

This separation is intentional:
- **Inbound:** Cloudflare (no server, no maintenance, included free)
- **Outbound:** Your mail provider (authentication, compliance, reputation)

This is how professional creators handle domain mail. No single vendor lock-in.

---

*rsp@noizyfish.com | noizy.ai | NOIZYFISH INC.*
*Created: March 30, 2026*
