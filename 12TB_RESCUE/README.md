# 12TB Rescue

Purpose: collect ideas, code references, and library metadata without putting audio or video in Git.

Hard rules:

- No audio or video files in Git, ever.
- Git stores code, manifests, plans, APIs, and small text notes only.
- Audio/video libraries go to OneDrive `AUDIO_CORAL` or external storage.
- Source drives are scanned first; moving/copying happens only from reviewed manifests.
- The system drive is not used for bulk staging.

Initial source order:

1. Google Drive
2. `/Volumes/12TB`
3. `/Volumes/MAG 4TB`
4. Other local and network drives
5. `/Users/m2ultra/Downloads`

Use the tools in `tools/` to inventory first, then migrate from reviewed manifests.
