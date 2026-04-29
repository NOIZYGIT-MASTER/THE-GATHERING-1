# Rotate the Cloudflare account deploy token

**When to run:**
- Scheduled: every 90 days (per `engr-keys/cloudflare-account-token.yaml`).
- Emergency: any time the token is suspected to be exposed.
- Emergency: any time `wrangler whoami` returns an unexpected account.

**Who runs it:**
The architect regenerates the token in the Cloudflare dashboard. ENGR
stores it in the macOS keychain. Pops reviews the rotation event row.

---

## Pre-flight checks

Before step 1, confirm all of the following are true. If any fails,
halt and fix before continuing.

1. `wrangler --version` runs and prints a version.
2. `security find-generic-password -s cf-noizy-deploy >/dev/null 2>&1`
   returns success (a prior token is in the keychain).
3. `wrangler whoami` currently succeeds and prints `Account Name: NOIZY`.
4. You have a browser session logged in to the Cloudflare dashboard
   as the NOIZY account owner.
5. No deploy is in flight. `wrangler deployments list` shows no
   "in_progress" status.

---

## Steps

### 1. Emit the proposed-rotation event

In the mesh, write a row to `events` with:

- `kind = 'key_rotation_proposed'`
- `actor = 'architect'`
- `ref_id = 'cloudflare-account-token'`
- `payload` = `{ "reason": "<scheduled | emergency | exposure>" }`

This is the Pops-review gate. Do not proceed until Pops writes the
matching `kind = 'pops_clear'` row referencing this proposal.

### 2. Generate the replacement token

1. Open Cloudflare dashboard → **My Profile** → **API Tokens**.
2. Click **Create Token** → **Create Custom Token**.
3. Name: `noizy-deploy-YYYY-MM-DD` (use today's date).
4. Permissions (exactly these, no more):
   - Account → Workers Scripts → Edit
   - Account → D1 → Edit
   - Account → R2 Storage → Read
5. Account Resources: **Include → NOIZY account only**.
6. Zone Resources: **All zones from an account → NOIZY** (required for
   custom domain bindings; leave this off if the Worker has no
   custom domain).
7. TTL: leave blank (no expiry). Rotation is this runbook's job, not
   Cloudflare's.
8. Click **Continue to summary** → **Create Token**.
9. Copy the token **once**. The dashboard will never show it again.

### 3. Do not paste the token anywhere yet

- Not into Slack.
- Not into a text editor.
- Not into a shell with history enabled.

The only destination is the keychain, in step 4.

### 4. Store the new token in the keychain

Run this in a shell where `HISTFILE=/dev/null` or where the command
will not be logged. From the terminal:

```bash
unset HISTFILE
security add-generic-password \
  -s cf-noizy-deploy \
  -a "$USER" \
  -w '<PASTE_TOKEN_HERE>' \
  -U
```

The `-U` flag updates an existing entry. Paste the token into the
`-w` position exactly once. When the command returns, the token is
in the keychain and nowhere else.

### 5. Verify the new token is alive

```bash
export CLOUDFLARE_API_TOKEN="$(security find-generic-password \
  -s cf-noizy-deploy -w)"
wrangler whoami
```

Expected output must contain:

- `Account Name: NOIZY`
- The token's scoped permissions listed below.

If the output shows a different account, **halt**. The token was
created against the wrong account. Delete it in the dashboard, then
restart at step 2.

### 6. Revoke the old token

In the dashboard → **API Tokens** → find the previous
`noizy-deploy-<earlier-date>` entry → **Roll** or **Delete**. The
dashboard will confirm with a success banner.

### 7. Run a no-op deploy to prove the full chain works

```bash
wrangler d1 execute lucy --command "SELECT 1 AS alive;"
```

Expected: a single row `{alive: 1}`. This proves the token can reach
D1, which is the sensitive read path.

### 8. Update the manifest

Edit `engr-keys/cloudflare-account-token.yaml`. Update exactly:

- `last_rotated: YYYY-MM-DD` — today.

Do not modify any other field without a separate Pops review.

### 9. Emit the completed-rotation event

Write to `events`:

- `kind = 'key_rotated'`
- `actor = 'engr'`
- `ref_id = 'cloudflare-account-token'`
- `payload` = `{ "rotated_at": "<ISO-8601>", "verify": "wrangler whoami OK" }`

---

## Verification

The rotation is complete when all of the following are true:

- `wrangler whoami` prints `Account Name: NOIZY`.
- The previous token is revoked in the dashboard (its row is gone).
- `engr-keys/cloudflare-account-token.yaml` shows today as
  `last_rotated`.
- Two event rows exist for this rotation:
  `key_rotation_proposed` → `pops_clear` → `key_rotated`.

---

## Rollback

If step 5 fails (new token does not authenticate):

1. **Do not revoke the old token yet.** Step 6 has not run.
2. Restore the previous token in the keychain with
   `security add-generic-password -s cf-noizy-deploy -a "$USER" -w '<OLD>' -U`
   if you kept it. If you did not, the old token is still live in the
   dashboard and can be re-copied — **wait**, you cannot re-copy it;
   regenerate it instead and treat that as an emergency rotation.
3. Halt the runbook. Open an incident row and escalate to the
   architect.

If step 7 fails (deploy path broken after rotation):

1. Re-check the token's scoped permissions in the dashboard. The
   most common cause is missing `D1 → Edit`.
2. If permissions are correct, re-run step 5. Intermittent failures
   point at Cloudflare's side, not the token.

---

## Event rows this runbook expects

| # | kind                       | Who writes it |
|---|----------------------------|---------------|
| 1 | `key_rotation_proposed`    | architect     |
| 2 | `pops_clear`               | pops          |
| 3 | `key_rotated`              | engr          |

All three must exist, in order, with the same `ref_id`.

---

## Non-negotiables

- The token value never appears outside the keychain. Not in repo
  history, not in shell history, not in a screenshot.
- No rotation runs without the Pops-clear row.
- No rotation skips step 6 (revoke old token). A token that lingers
  after rotation is a live credential the architect does not control.
- If rotation fails mid-run, the incident is logged even if the
  architect retries immediately. Failed rotations are events too.
