# MC 96 ECO UNIVERSE — Full Network Setup

## Devices
- **Mac (primary workstation)** — command center, runs all services
- **iPad Pro 12.9" (2nd Gen)** — secondary display, Claude access via Safari
- **iPhone 15 Pro Max** — mobile Claude access, remote mic/monitor
- **Logitech C10 AT USB Camera** — permanent default microphone (locked via mc96-mic-lock)
- **RSP Beats** — Bluetooth audio OUTPUT only (mic override prevented)

---

## 1. Audio MIDI Setup — MC 96 Network

Your MC 96 network is already configured in Audio MIDI Setup. To verify and extend it:

### Verify the Network Device
1. Open **Audio MIDI Setup** (Spotlight → "Audio MIDI Setup")
2. In the sidebar, look for **Network** — click it
3. Your MC 96 session should appear. If not:
   - Click the **+** under "My Sessions"
   - Name it **MC 96**
   - Set port to default (any available)
   - Enable it

### Add iPad as a Network Audio Source
The iPad Pro 12.9" 2nd Gen supports AirPlay. To bring it into the MC 96 network:
1. On the Mac, open **Audio MIDI Setup** → **Network**
2. The iPad should appear under "Available Connections" when on the same Wi-Fi
3. Select it and click **Connect**
4. Alternatively, create a **Multi-Output Device**:
   - Click **+** at bottom-left → "Create Multi-Output Device"
   - Check your Mac output AND the iPad (via AirPlay)
   - Name it **MC 96 Output**

### iPhone 15 Pro Max
- Use AirPlay to stream audio from Mac to iPhone
- Or use iPhone as a remote mic via **Continuity Camera** (macOS Ventura+)
- For Claude access: use the Claude iOS app or Safari → claude.ai

---

## 2. Spoken Content — Hear Claude on Every Device

### Mac
1. **System Settings → Accessibility → Spoken Content**
2. Turn on **Speak Selection**
3. Set keyboard shortcut (default: Option + Esc)
4. Choose a premium voice (Siri voices recommended)
5. Now highlight any Claude response → hit shortcut → Mac reads it aloud

### iPad
1. **Settings → Accessibility → Spoken Content**
2. Turn on **Speak Selection**
3. Turn on **Speak Screen** (two-finger swipe down from top to read full page)
4. Select text in Safari (claude.ai) → tap **Speak**

### iPhone
1. **Settings → Accessibility → Spoken Content**
2. Same setup as iPad — Speak Selection + Speak Screen
3. Works in Claude iOS app and Safari

---

## 3. Microphone Routing — Logitech USB Locked

The mic-lock service (installed via mc96-install.sh) ensures:
- Logitech USB camera is ALWAYS the default system input
- When RSP Beats connect via Bluetooth, the system tries to switch — mic-lock overrides it within 2 seconds
- Beats are used for OUTPUT audio only
- This persists across reboots, sleep/wake, and any Bluetooth reconnection

### SoundSource Additional Config
In SoundSource, for extra insurance:
- Find your RSP Beats in the device list
- Set the **Mode dropdown** to **"Output Only"**
- This tells macOS to use the higher-quality A2DP codec (better sound)
  AND prevents the Beats from even registering as an input device

---

## 4. Claude on Every Device

| Device | Access Method | Voice |
|--------|-------------|-------|
| Mac | Cowork mode (this session), claude.ai, Claude Desktop app | Speak Selection shortcut |
| iPad | Safari → claude.ai, Claude iOS app | Speak Selection / Speak Screen |
| iPhone | Claude iOS app, Safari → claude.ai | Speak Selection / Speak Screen |

All devices share the same Claude account. Conversations sync.
Your preferences, memory, and MCP connections persist server-side.

---

## 5. Quick Reference Commands (Mac Terminal)

```bash
# Check what input device is currently active
SwitchAudioSource -t input -c

# List all input devices
SwitchAudioSource -t input -a

# List all output devices
SwitchAudioSource -t output -a

# Manually force Logitech as input
SwitchAudioSource -t input -s "USB Audio Device"

# Check mic-lock service log
cat /tmp/mc96-mic-lock.log

# Restart mic-lock service
launchctl unload ~/Library/LaunchAgents/com.mc96.miclock.plist
launchctl load ~/Library/LaunchAgents/com.mc96.miclock.plist
```
