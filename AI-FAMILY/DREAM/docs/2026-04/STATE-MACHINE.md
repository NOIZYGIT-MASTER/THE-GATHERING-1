# VOICE-STATE — State machine

**Purpose:** define, once, what states the voice surface can be in and
how it moves between them. Every voice-capable device (Gabriel, Lucy,
Claude-God) implements this same machine so the architect never has to
guess what the system is doing.

## States

| State        | Meaning                                                       |
|--------------|---------------------------------------------------------------|
| `idle`       | Microphone inactive. No audio in memory. Safe resting state.  |
| `listening`  | Mic active, short rolling buffer held in memory, no storage.  |
| `capturing`  | Architect-confirmed capture is in progress. Writing to buffer.|
| `buffered`   | Capture complete. Audio in a named buffer, not yet transcribed.|
| `transcribed`| Buffer has been sent to STT. Text exists, audio kept per policy.|
| `posted`     | Transcript is now in the mesh as an `events` row. Done.       |
| `error`      | Anything unexpected. Machine halts here until architect clears.|

## Transitions

```
idle ──(wake)──────────────► listening
listening ──(silence timeout)──► idle
listening ──(confirm)──────► capturing
capturing ──(end-of-utterance)► buffered
capturing ──(cancel)───────► idle          (buffer discarded)
buffered ──(transcribe)────► transcribed
transcribed ──(post)───────► posted
posted ──(next wake)───────► idle
* ──(any fault)────────────► error
error ──(architect clear)──► idle
```

Every transition writes an `events` row with `kind = 'voice_state'`
and fields `from`, `to`, `reason`, `device`. No transition is silent.

## Rules per state

### idle

- No audio captured. If audio is present in memory, that is a bug.
- Only `wake` can move out of this state.

### listening

- Rolling buffer is capped at 3 seconds and held in RAM only.
- Buffer is overwritten continuously; nothing persists.
- `silence timeout` is 1.5 seconds of silence → back to `idle`.
- `confirm` is an explicit user action (tap, keyword, button).

### capturing

- A named buffer is created. Audio is appended.
- A visible UI indicator is required on every device.
- The buffer has a hard cap (default 60 seconds). Hitting the cap is
  treated as `end-of-utterance`.
- `cancel` discards the buffer immediately and emits a
  `voice_state_cancel` event.

### buffered

- The buffer is labeled with an id, duration, and device.
- The buffer is **not** auto-transcribed. It waits for an explicit
  `transcribe` instruction (user tap, agent request, or the default
  policy "transcribe on post").

### transcribed

- Transcript is a first-class artifact. It carries back a reference
  to the buffer id.
- Retention policy for the audio itself lives in
  `audio-pipeline/PIPELINE.md`.

### posted

- The transcript has been written as an `events` row. The transition
  `transcribed → posted` is the only place a voice capture becomes
  visible to other agents.

### error

- The machine halts. No further transitions except `architect clear`.
- The event row includes the last known state and the fault reason.

## Non-negotiables

- No state transitions without an event row.
- No background capture. `listening` and `capturing` both require a
  visible UI indicator.
- No cross-device audio movement happens in the state machine itself —
  that is the audio pipeline's job. The state machine only describes
  what one device is doing right now.
- The error state never auto-clears. Only the architect clears errors.
