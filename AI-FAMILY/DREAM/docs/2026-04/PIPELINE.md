# AUDIO PIPELINE — Seven stages, seven gates

**Purpose:** describe end-to-end how a single utterance becomes a
posted transcript inside the mesh, and name the consent gate that
stands at each stage. No utterance passes a gate silently.

## The seven stages

```
1. Wake         → 2. Listen     → 3. Capture     → 4. Persist
                                                       │
8. Archive ←── 7. Post ←── 6. Transcribe ←── 5. Transport
```

### 1. Wake
Device detects a wake condition (tap, keyword, hardware button).

**Gate:** visible UI acknowledgement. If the user did not see it wake,
it did not wake.

### 2. Listen
Rolling 3-second RAM-only buffer. Nothing persists.

**Gate:** visible "listening" indicator, always on while in state.
Silence timeout returns to idle.

### 3. Capture
Explicit user confirmation elevates the rolling buffer into a named
capture. Audio now accumulates until end-of-utterance or cap.

**Gate:** explicit confirmation action (tap, keyword, button). A
capture that starts without a confirmation is a bug and must halt.

### 4. Persist
The capture buffer is written to device-local storage with an id,
duration, hash, and source device stamp.

**Gate:** storage quota check. If the device is over quota, capture
is refused with a visible error, not silently dropped.

### 5. Transport
The buffer is sent from the source device to the transcription target.
Today that is the mesh's Worker endpoint or a local STT runner.

**Gate:** shared-secret header (`x-lucy-auth`). Traffic leaves the
mesh only to allowlisted endpoints. Pops vetoes any other destination.

### 6. Transcribe
The buffer becomes text. The text carries a reference back to the
buffer id and the source device.

**Gate:** model id is read from config, not hardcoded. A failed STT
call returns a typed error; it never silently falls back to a
different provider.

### 7. Post
The transcript is written as an `events` row with
`kind = 'voice_transcript'`. This is the moment the utterance becomes
visible to other agents.

**Gate:** the row must include: `buffer_id`, `device`, `transcribed_at`,
`model_id`, `confidence` (if available), and the full text.

### 8. Archive
Retention policy runs. Audio files older than the policy window move
to cold storage or are destroyed, per policy. Transcripts are kept.

**Gate:** the architect-approved retention window. Default is
**72 hours for raw audio, forever for transcripts**, overridable per
capture by a `retain_audio` flag on the post event.

## Per-stage event rows

Every stage emits exactly one event row at completion:

| Stage       | kind                   |
|-------------|------------------------|
| Wake        | `voice_wake`           |
| Listen      | (state machine only)   |
| Capture     | `voice_capture_start`  |
| Persist     | `voice_capture_saved`  |
| Transport   | `voice_buffer_sent`    |
| Transcribe  | `voice_transcribed`    |
| Post        | `voice_transcript`     |
| Archive     | `voice_archived`       |

A missing event row means the stage did not happen; the buffer is
treated as orphaned and surfaced to the architect for review.

## Non-negotiables

- No stage runs without the previous stage's event row in place.
- No silent capture. Every capture has a visible indicator on the
  source device while it is active.
- No cross-device audio forwarding without an explicit `transport` row.
- No transcription without an explicit model id in config.
- No retention beyond the policy window without an explicit
  `retain_audio` flag on the post event.
- Pops has veto authority on any change to the transport allowlist.
