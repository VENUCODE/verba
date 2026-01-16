# Verba - Testing Guide

## Prerequisites

- Node.js 18+
- Valid OpenAI API key
- Microphone access

## Quick Start

```bash
npm install
npm run dev
```

## Core Functionality Tests

### Setup Flow
| Test | Steps | Expected |
|------|-------|----------|
| First launch | Start app fresh | Setup screen appears |
| API key validation | Enter invalid key | Error message shown |
| Setup completion | Enter valid key, select model | Transitions to compact bar |

### Recording
| Test | Steps | Expected |
|------|-------|----------|
| Start recording | Click mic button | Visualizer animates, timer starts |
| Stop recording | Click mic button again | Recording stops, transcription begins |
| Hotkey recording | Press Ctrl+Shift+Space | Recording toggles |
| Max duration | Record past limit | Auto-stops at configured duration |

### Transcription
| Test | Steps | Expected |
|------|-------|----------|
| Basic transcription | Record short audio | Text appears and auto-pastes |
| Model switch | Change model in settings | Next transcription uses new model |
| Network error | Disconnect internet | Clear error message shown |
| Invalid API key | Use expired key | Auth error with retry option |

### Window Behavior
| Test | Steps | Expected |
|------|-------|----------|
| Drag | Drag by handle | Window moves, stays on screen |
| Auto-collapse | Wait 60s without interaction | Collapses to chip |
| Expand | Hover over collapsed chip | Expands to full bar |
| Panel open | Click settings icon | Panel window opens |

## Model-Specific Tests

### whisper-1
- [ ] Standard transcription works
- [ ] Verbose JSON returns timestamps
- [ ] SRT/VTT export generates valid subtitle files

### gpt-4o-transcribe
- [ ] Transcription with high accuracy
- [ ] Streaming delivers chunks via IPC

### gpt-4o-mini-transcribe
- [ ] Transcription works
- [ ] Faster than full gpt-4o

## Platform Build Tests

### Windows
```bash
npm run package:win
```
- [ ] Installer (`release/*.exe`) installs correctly
- [ ] Portable version runs without installation
- [ ] Global hotkeys work system-wide
- [ ] System tray icon appears

### macOS
```bash
npm run package:mac
```
- [ ] DMG mounts and app copies to Applications
- [ ] Global hotkeys work
- [ ] Menu bar tray icon works

### Linux
```bash
npm run package:linux
```
- [ ] AppImage runs directly
- [ ] DEB package installs
- [ ] Hotkeys work (X11)

## Error Scenarios

| Scenario | Trigger | Expected Message |
|----------|---------|------------------|
| No microphone | Disconnect mic | "No microphone detected" |
| Permission denied | Deny mic access | "Microphone permission denied" |
| Rate limited | Exceed API quota | "Rate limit exceeded, retry later" |
| File too large | Record very long audio | "Audio file too large (25MB max)" |

## Performance Checks

| Metric | Target |
|--------|--------|
| App startup | < 3 seconds |
| Recording start | Immediate |
| Memory (idle) | < 200MB |
| Transcription | Depends on audio length + model |

## History & Export

- [ ] Transcriptions appear in history after completion
- [ ] Search filters results correctly
- [ ] Sort by date/duration works
- [ ] Export TXT includes metadata
- [ ] Export JSON is valid parseable JSON
- [ ] Export SRT has correct timing format

## Regression Checklist

After changes, verify:
- [ ] API key persists after restart
- [ ] Selected model persists
- [ ] History loads on startup
- [ ] Hotkey still registered
- [ ] Window sizing stable during drag
