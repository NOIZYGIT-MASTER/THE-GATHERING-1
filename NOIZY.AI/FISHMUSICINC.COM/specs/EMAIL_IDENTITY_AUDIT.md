# FISHMUSICINC Email Identity Audit

Status: active remediation
Scope: fishmusicinc.com, rp@fishmusicinc.com, rsp@fishmusicinc.com

## Canonical rule

- Current public contact: `rsp@fishmusicinc.com`
- Legacy/audit-only identity: `rp@fishmusicinc.com`
- Do not treat `rp@fishmusicinc.com` as the canonical mailbox unless it is intentionally restored as an alias.

## Live DNS verification

Run from GOD / M2 Ultra:

```bash
dig NS fishmusicinc.com +short
dig MX fishmusicinc.com +short
dig TXT fishmusicinc.com +short
dig TXT _dmarc.fishmusicinc.com +short
```

Interpretation:

- `route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, `route3.mx.cloudflare.net` = Cloudflare Email Routing.
- `*.mail.protection.outlook.com` = Microsoft 365 / Exchange Online.
- `aspmx.l.google.com` plus alternates = Google Workspace.
- `mx01.mail.icloud.com`, `mx02.mail.icloud.com` = Apple iCloud+ Custom Domain.
- no MX = receiving mail is broken or not configured.

## Cloudflare Email Routing verification

In Cloudflare dashboard for `fishmusicinc.com`:

1. Open **Email** → **Email Routing**.
2. Confirm destination address is verified.
3. Confirm these custom addresses exist or are intentionally absent:
   - `rsp@fishmusicinc.com`
   - `rp@fishmusicinc.com` as legacy catch alias, if needed
   - catch-all, if intentionally enabled
4. Confirm destination is one of:
   - `rsp@noizy.ai`
   - `rsplowman@icloud.com`

## Alias decision

Recommended:

```text
rp@fishmusicinc.com  → same destination as rsp@fishmusicinc.com
rsp@fishmusicinc.com → canonical public contact
```

Reason: catches old Google/Workspace/dev references without restoring `rp@fishmusicinc.com` as the main identity.

## Script remediation

Hardcoded references to:

```text
GoogleDrive-rp@fishmusicinc.com
```

must be replaced with configurable media drive resolution.

Preferred environment variable:

```bash
export NOIZY_MEDIA_DRIVE="~/Library/CloudStorage/GoogleDrive-rsplowman@icloud.com/My Drive"
```

Temporary legacy override only if the old drive mount is still needed:

```bash
export NOIZY_ALLOW_LEGACY_RP_DRIVE=1
```

## Current remediation commit intent

- Remove default dependency on `GoogleDrive-rp@fishmusicinc.com`.
- Prefer `NOIZY_MEDIA_DRIVE`.
- Prefer known current mounts.
- Use local vault fallback if no cloud media drive exists.
