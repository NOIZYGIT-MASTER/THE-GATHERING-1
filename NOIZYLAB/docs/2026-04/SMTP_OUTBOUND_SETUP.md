# Outbound SMTP — Send as rsp@noisy.ai
### NOIZYFISH INC. | March 2026

---

## Architecture

| Layer | Provider | Purpose |
|-------|----------|---------|
| Inbound (receive) | Cloudflare Email Routing | Forward inbound mail to verified inbox |
| **Outbound (send)** | **External SMTP** | **Send mail as rsp@noisy.ai** |

This document covers **outbound SMTP configuration** for sending from `rsp@noisy.ai`.

---

## Three Options (Ranked for Creators)

### Option 1: Gmail SMTP ⭐ (Recommended)

**Why:** Reliable, free tier available, widely compatible, DKIM included.

#### Step 1: Enable Gmail App Passwords

1. Go to **Google Account** → **Security**
2. Enable **2-Factor Authentication** (if not already enabled)
3. Go back to **Security** → **App passwords**
4. Select: **Mail** + **Windows Computer**
5. Google generates a **16-character app password**
6. **Copy this password** (you'll need it in Step 2)

#### Step 2: Configure Your Mail Client

Choose your mail client: Outlook, Apple Mail, Thunderbird, or Mailbird.

**SMTP Settings:**
```
Server:    smtp.gmail.com
Port:      587 (TLS) or 465 (SSL)
Username:  your-gmail@gmail.com
Password:  16-character app password (from Step 1)
```

**Display/Send As:**
- In your mail client settings, set "Send As" or "From" to: `rsp@noisy.ai`
- Gmail will allow this if the address is verified in your account

#### Step 3: Verify rsp@noisy.ai in Gmail

1. In Gmail, go to **Settings** → **Accounts and Import** → **Send mail as**
2. Click **Add another email address**
3. Enter `rsp@noisy.ai`
4. Gmail sends a verification email to `rsp@noisy.ai`
5. Check your verified inbox (from Cloudflare Email Routing) for the verification email
6. Click the verification link
7. Return to Gmail Settings and confirm

#### Step 4: Update SPF Record

In Cloudflare DNS, update your SPF record:

**Current (Cloudflare only):**
```
@   TXT   v=spf1 include:_spf.mx.cloudflare.net ~all
```

**Updated (Cloudflare + Gmail):**
```
@   TXT   v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all
```

#### Step 5: Verify DKIM (Gmail Auto-Provides)

Gmail automatically handles DKIM for mail sent from your account. No additional configuration needed.

#### Step 6: Send Test Email

1. Compose a new email in your mail client
2. Verify "From" shows `rsp@noisy.ai`
3. Send to a test address you control (Gmail, another inbox, etc.)
4. Confirm the email arrives without bouncing
5. Check that sender is identified as `rsp@noisy.ai`

---

### Option 2: Outlook/Microsoft 365 SMTP

**Why:** Enterprise-grade, DKIM included, good uptime.

#### Step 1: Enable App Passwords

1. Go to **Microsoft Account** → **Security**
2. Enable **2-Factor Authentication** (if not already enabled)
3. Go to **Security** → **App passwords**
4. Select: **Mail** + **Windows**
5. Copy the generated password

#### Step 2: Configure Mail Client

**SMTP Settings:**
```
Server:    smtp.office365.com
Port:      587 (TLS) or 465 (SSL)
Username:  your-outlook@outlook.com
Password:  Generated app password (from Step 1)
```

**Send As:**
- Set "From" to: `rsp@noisy.ai`

#### Step 3: Add rsp@noisy.ai as Alias (Optional)

In Outlook online:
1. Settings → **Mail** → **Forwarding**
2. Add `rsp@noisy.ai` as an alias
3. Verify the alias

#### Step 4: Update SPF Record

```
@   TXT   v=spf1 include:_spf.mx.cloudflare.net include:outlook.com ~all
```

#### Step 5: Test Send

Compose and send a test email as `rsp@noisy.ai`. Verify delivery.

---

### Option 3: Fastmail SMTP ⭐⭐ (Creator Premium)

**Why:** Privacy-first, DKIM/SPF/DMARC all included, professional tooling.

#### Step 1: Generate SMTP Password

1. Go to **Fastmail Settings** → **Privacy & Security**
2. Click **Third-party apps**
3. Create a new password for **SMTP**
4. Copy the password

#### Step 2: Configure Mail Client

**SMTP Settings:**
```
Server:    smtp.fastmail.com
Port:      465 (SSL) or 587 (TLS)
Username:  your-fastmail@fastmail.com
Password:  Generated SMTP password (from Step 1)
```

**Send As:**
- Set "From" to: `rsp@noisy.ai`

#### Step 3: Add rsp@noisy.ai as Sending Address

In Fastmail:
1. Settings → **Identities**
2. Create new identity: `rsp@noisy.ai`
3. Verify the email (confirmation link sent to `rsp@noisy.ai`)
4. Check your verified inbox for the link

#### Step 4: Update SPF Record

```
@   TXT   v=spf1 include:_spf.mx.cloudflare.net include:fastmail.com ~all
```

#### Step 5: Enable DKIM (Fastmail Auto-Provides)

Fastmail automatically handles DKIM signing. No additional configuration.

#### Step 6: Test Send

Send test email as `rsp@noisy.ai`. Verify delivery and sender reputation.

---

## Verification Checklist

After SMTP configuration, run these checks:

- [ ] **Test send succeeds**
  - Compose email in mail client
  - "From" shows `rsp@noisy.ai`
  - Recipient receives it without bounce
  - Sender IP is your provider's (Gmail/Outlook/Fastmail)

- [ ] **SPF record is correct**
  - Run: `dig noisy.ai TXT` (or use mxtoolbox.com)
  - Should show both Cloudflare + SMTP provider includes
  - Example: `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`

- [ ] **DKIM is signed**
  - Forward a test email to dkim@dkimvalidator.com
  - Automated response confirms DKIM pass/fail
  - Should show PASS for your SMTP provider

- [ ] **Inbound routing still works**
  - Send email to `rsp@noisy.ai` from external account
  - Confirm it arrives in your verified inbox
  - (Inbound and outbound are separate layers)

---

## Recommendation for Rob

**Start with Gmail:**
- Free tier
- Familiar interface
- DKIM auto-included
- 5-minute setup

**Upgrade to Fastmail later:**
- Full email sovereignty
- DMARC support
- Professional tooling
- Premium features

---

## DNS Final State (After SMTP Setup)

```
noisy.ai

MX      10  route1.mx.cloudflare.net
MX      20  route2.mx.cloudflare.net
MX      30  route3.mx.cloudflare.net

TXT     v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all

CNAME   _dmarc  _dmarc.fastmail.com (optional, if Fastmail DMARC enabled)
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Mail sent as rsp@noisy.ai bounces | Verify address in mail client's "Send As" settings. Confirm provider has rsp@noisy.ai registered. |
| SPF check fails | Ensure SPF record includes both Cloudflare AND SMTP provider. Use mxtoolbox to verify. |
| DKIM signature missing | Confirm mail client is using correct SMTP credentials. Some clients bypass DKIM if auth fails. |
| Mail lands in spam | Run DKIM validator test (dkim@dkimvalidator.com). Check SPF align. May need to warm domain. |
| Inbound mail stops arriving | Inbound and outbound are separate. If inbound breaks, check Cloudflare Email Routing routing rules (separate from SMTP). |

---

## Clean Separation (Why This Matters)

**Cloudflare Email Routing** (inbound):
- Receive mail at `rsp@noisy.ai`
- No server to run
- No maintenance
- Included free

**External SMTP** (outbound):
- Send mail as `rsp@noisy.ai`
- Separate credentials
- Provider handles reputation
- You control provider choice

This separation is **intentional design**. You own your domain but outsource the heavy lifting:
- Inbound: Cloudflare's global infrastructure
- Outbound: Your provider's sending reputation

Professional creators do this all the time.

---

*rsp@noizyfish.com | noizy.ai | NOIZYFISH INC.*
*Created: March 30, 2026*
