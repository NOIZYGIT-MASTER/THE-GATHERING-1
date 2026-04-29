# ENGR-KEYS — Manifest format

**Rule zero:** this directory holds a **manifest of keys**, never the
keys themselves. Values live in the system keychain, a Worker secret
binding, or a hardware token. Pops reviews every add.

## What belongs here

A single file per key. Each file describes the key — what it unlocks,
who rotates it, where the value actually lives, and how to verify the
key is alive without exposing it.

Filename convention: `<scope>-<purpose>.yaml`, lowercase, no spaces.

Examples of good filenames:

- `cloudflare-account-token.yaml`
- `anthropic-api-key.yaml`
- `mickey-p-ssh.yaml`
- `gabriel-device-shared-secret.yaml`

## Manifest schema

```yaml
id:            <slug>                 # must match the filename stem
purpose:       <one-line description>
owner:         <agent or person>      # who is accountable
rotation:      <cadence>              # e.g. "90d", "on-breach", "never"
last_rotated:  <YYYY-MM-DD>
storage:
  location:    <keychain | worker-secret | hardware-token | env-file>
  reference:   <how to find it, not the value>
usage:
  consumers:   [list, of, agents, or, services]
  scope:       <exact permission it grants>
verify:
  method:      <how to prove the key is alive>
  expected:    <what a healthy response looks like>
rotate:
  runbook:     <path to rotation runbook, relative to repo root>
veto_class:    identity                # per Pops veto protocol
notes:         <anything a future reader needs>
```

## Non-fields (these never appear)

- **No key values.** Not encrypted, not base64, not "just this once".
- **No fingerprints that leak structure** (e.g., don't paste the first
  8 chars of a token).
- **No environment variable names that alias secret values into
  shells.** If the key must be sourced into a shell, the manifest
  points to a runbook; the shell command lives there, not here.

## Example

`cloudflare-account-token.yaml`:

```yaml
id:            cloudflare-account-token
purpose:       Deploy Lucy Workers, manage D1, read R2 buckets
owner:         ENGR
rotation:      90d
last_rotated:  2026-04-01
storage:
  location:    keychain
  reference:   'security find-generic-password -s cf-noizy-deploy'
usage:
  consumers:   [engr, heaven-deploy]
  scope:       'Account:Workers Scripts:Edit, Account:D1:Edit, Account:R2:Read'
verify:
  method:      'wrangler whoami'
  expected:    'Account Name: NOIZY'
rotate:
  runbook:     agents/engr/runbooks/rotate-cloudflare-token.md
veto_class:    identity
notes:         'Scoped to the NOIZY account only. Never grants zone-wide DNS.'
```

## Lifecycle

1. **Add.** New manifest file + Pops review. Pops writes an
   `events` row with `kind = 'key_manifest_added'` and the manifest id.
2. **Rotate.** The rotation runbook runs. The new value lands in its
   storage location. The manifest's `last_rotated` is updated. A second
   `events` row with `kind = 'key_rotated'` is written.
3. **Retire.** When the key is no longer used, the manifest file moves
   to `engr-keys/retired/` with a one-line tombstone appended. The
   value in storage is destroyed. A third `events` row with
   `kind = 'key_retired'` closes the record.

## Non-negotiables

- Pops reviews every add, rotate, and retire.
- A key cannot be added without a rotation runbook already in place.
- A key cannot be added without a verify method the architect can run.
- If a manifest file is ever found to contain a value, that value is
  treated as compromised — rotated within the hour, no exceptions.
