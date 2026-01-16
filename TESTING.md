# Voice Transcriber - Testing Guide

This document provides comprehensive testing procedures for the Voice Transcriber application across all platforms.

## Prerequisites

Before testing, ensure you have:

1. **Dependencies Installed**
   ```bash
   npm install
   ```

2. **Valid OpenAI API Key**
   - Obtain an API key from https://platform.openai.com/api-keys
   - Ensure your account has access to the transcription models

3. **Microphone Access**
   - Grant microphone permissions to your browser/system
   - Test your microphone is working

## Development Testing

### Running in Development Mode

```bash
npm run dev
```

This starts:
- Vite dev server on http://localhost:5173
- Electron app with hot reload

### Build Testing

```bash
npm run build
```

Verifies TypeScript compilation and Vite build.

## Functional Testing Checklist

### 1. Initial Setup Flow

- [ ] Application launches successfully
- [ ] Setup screen appears on first launch
- [ ] API key input field is visible
- [ ] Can paste/enter API key
- [ ] API key validation works
- [ ] Setup completes and navigates to home screen

### 2. Model Selection

Test all three models:

#### GPT-4o Transcribe
- [ ] Can select in settings
- [ ] Shows correct description and features
- [ ] Transcription works
- [ ] Streaming transcription works (if applicable)
- [ ] Error handling for invalid API key
- [ ] Error handling for rate limits

#### GPT-4o Mini Transcribe
- [ ] Can select in settings
- [ ] Shows correct description and features
- [ ] Transcription works
- [ ] Streaming transcription works (if applicable)
- [ ] Cost indicator shows correct level

#### Whisper-1
- [ ] Can select in settings
- [ ] Shows timestamp features
- [ ] Transcription works
- [ ] Response format options work (text, json, verbose_json, srt, vtt)
- [ ] Timestamp granularities work

### 3. Recording Functionality

- [ ] Click to start recording
- [ ] Microphone indicator shows activity
- [ ] Waveform visualizer animates
- [ ] Duration counter updates
- [ ] Can stop recording manually
- [ ] Auto-stops at max duration
- [ ] File size limit enforced (25MB)

### 4. Transcription Process

- [ ] "Transcribing..." status shows
- [ ] Loading indicator displays
- [ ] Completes successfully
- [ ] Text is pasted automatically (requires @nut-tree-fork/nut-js)
- [ ] Added to history
- [ ] Error messages are clear and helpful

### 5. Global Hotkey

Test all hotkey options:
- [ ] Ctrl+Shift+Space (default)
- [ ] Ctrl+Alt+R
- [ ] Ctrl+Shift+R
- [ ] F9
- [ ] F10

Verify:
- [ ] Hotkey starts recording when app is not focused
- [ ] Hotkey stops recording when already recording
- [ ] Changing hotkey in settings updates immediately

### 6. Settings Page

#### API Configuration
- [ ] Can update API key
- [ ] Can change model
- [ ] Model selector shows all options with details
- [ ] Settings persist after restart

#### Advanced Settings
- [ ] Response format selection works
- [ ] Language field accepts ISO codes
- [ ] Temperature slider works (0-1)
- [ ] Format restrictions enforced (e.g., SRT only for whisper-1)

#### Recording Settings
- [ ] Max duration dropdown works
- [ ] Audio device selector shows available mics
- [ ] Selected device persists

#### Behavior Settings
- [ ] Launch at startup toggle
- [ ] Start minimized toggle
- [ ] Settings save successfully

### 7. History Management

- [ ] Transcriptions appear in history
- [ ] Search functionality works
- [ ] Sort options work (recent, oldest, duration)
- [ ] Copy to clipboard button works
- [ ] History persists between sessions
- [ ] Can clear history

#### Export Functionality
- [ ] Export to TXT works
- [ ] Export to JSON works
- [ ] Export to SRT works
- [ ] Exported files have correct content
- [ ] Exported filenames include timestamp

### 8. Error Handling

Test error scenarios:

#### API Errors
- [ ] Invalid API key shows clear message
- [ ] Rate limit shows retry message
- [ ] Network error shows connectivity message
- [ ] Server error (5xx) shows appropriate message

#### Recording Errors
- [ ] Microphone permission denied shows message
- [ ] No microphone detected shows message
- [ ] Microphone in use shows message

#### File Errors
- [ ] File too large shows size limit
- [ ] Unsupported format shows format message

### 9. UI/UX Testing

- [ ] All buttons are responsive
- [ ] Animations are smooth
- [ ] Text is readable
- [ ] Colors have good contrast
- [ ] Layout adapts to window resize
- [ ] No visual glitches
- [ ] Loading states are clear

### 10. System Tray

- [ ] Tray icon appears
- [ ] Tray menu shows options
- [ ] "Show Window" brings app to front
- [ ] "Quit" closes app completely
- [ ] Minimize to tray works
- [ ] Close button minimizes to tray

## Platform-Specific Testing

### Windows Testing

```bash
npm run package:win
```

**Test Items:**
- [ ] Installer (NSIS) works
- [ ] Portable version works
- [ ] Icon displays correctly
- [ ] Hotkeys work system-wide
- [ ] Microphone permission prompt
- [ ] Text pasting works (Ctrl+V)
- [ ] Tray icon visible in system tray
- [ ] Startup on login works

**File Locations:**
- Built app: `release/win-unpacked/`
- Installer: `release/*.exe`

### macOS Testing

```bash
npm run package:mac
```

**Test Items:**
- [ ] DMG mounts successfully
- [ ] App copies to Applications
- [ ] Icon displays correctly
- [ ] Hotkeys work system-wide
- [ ] Microphone permission prompt
- [ ] Text pasting works (Cmd+V)
- [ ] Menu bar icon works
- [ ] Startup on login works
- [ ] Gatekeeper/signing (may require dev signing)

**File Locations:**
- Built app: `release/mac/`
- DMG: `release/*.dmg`

### Linux Testing

```bash
npm run package:linux
```

**Test Items:**
- [ ] AppImage runs
- [ ] DEB package installs
- [ ] Icon displays correctly
- [ ] Hotkeys work system-wide
- [ ] Microphone permission prompt
- [ ] Text pasting works (Ctrl+V)
- [ ] System tray icon visible
- [ ] Desktop entry created

**File Locations:**
- AppImage: `release/*.AppImage`
- DEB: `release/*.deb`

**Note:** Text pasting on Linux requires X11. Wayland may have limitations.

## Performance Testing

- [ ] App starts in < 3 seconds
- [ ] Recording starts immediately
- [ ] Transcription completes in reasonable time
- [ ] Memory usage stays under 200MB idle
- [ ] CPU usage normal during recording
- [ ] No memory leaks after multiple recordings

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] Screen reader compatible (basic)
- [ ] High contrast mode works

## Integration Testing

### OpenAI API Integration
- [ ] whisper-1 endpoint works
- [ ] gpt-4o-transcribe endpoint works
- [ ] gpt-4o-mini-transcribe endpoint works
- [ ] Streaming works for supported models
- [ ] Error responses handled correctly

### System Integration
- [ ] Microphone access works
- [ ] Clipboard integration works
- [ ] Keyboard automation works
- [ ] File system access works
- [ ] System tray integration works

## Regression Testing

After making changes, verify:
- [ ] All previous features still work
- [ ] No new console errors
- [ ] No performance degradation
- [ ] Settings still persist
- [ ] History still loads

## Known Limitations

1. **Streaming Transcription**: Only works with gpt-4o models
2. **Timestamp Features**: Only available with whisper-1
3. **Text Pasting**: Requires @nut-tree-fork/nut-js installation
4. **Linux Wayland**: Text pasting may not work on Wayland
5. **File Size**: Maximum 25MB audio file (OpenAI limit)

## Bug Reporting

When reporting bugs, include:
- Operating system and version
- Node.js version
- Electron version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Screenshots/videos (if applicable)

## Test Automation (Future)

Consider adding:
- Unit tests with Jest
- Integration tests with Playwright
- E2E tests for critical paths
- CI/CD pipeline with GitHub Actions
