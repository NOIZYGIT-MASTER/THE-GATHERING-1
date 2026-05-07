# FISHMUSICINC Identity Guard

Purpose: prevent the old `rp@fishmusicinc.com` identity from creeping back into active scripts as a default.

## Canonical rule

```text
rsp@fishmusicinc.com = current public FISHMUSICINC contact
rp@fishmusicinc.com  = legacy/audit-only alias
```

## Media drive rule

Do not hardcode:

```text
GoogleDrive-rp@fishmusicinc.com
```

Use:

```bash
export NOIZY_MEDIA_DRIVE="/Users/m2ultra/Library/CloudStorage/GoogleDrive-rsplowman@icloud.com/My Drive"
```

or let the resolver pick from current mounts.

## Legacy escape hatch

Only for one-off recovery:

```bash
export NOIZY_ALLOW_LEGACY_RP_DRIVE=1
```

## Audit command

From repo root:

```bash
python3 scripts/audit_fishmusicinc_identity.py
```

The audit writes:

```text
NOIZY.AI/FISHMUSICINC.COM/receipts/identity-audit-latest.json
```
