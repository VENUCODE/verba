# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run dev              # Start development mode (Vite + Electron concurrently)
npm run build            # Build for production (Vite build + TypeScript compile)
npm run package          # Package for current platform
npm run package:win      # Package for Windows (.exe installer + portable)
npm run package:mac      # Package for macOS (.dmg)
npm run package:linux    # Package for Linux (.AppImage + .deb)
```

Build outputs:
- Development: `dist/` (compiled code)
- Release: `release/` (packaged applications)

## Architecture Overview

Electron 28 desktop application with React 18 frontend for voice transcription using OpenAI's Whisper and GPT-4o models.

### Process Structure

**Main Process** (`src/main/`):
- `index.ts` - Application entry, window management, IPC handlers, auto-paste logic
- `transcription.ts` - OpenAI API integration (supports streaming for GPT-4o models)
- `shortcuts.ts` - Global hotkey registration via Electron's globalShortcut
- `tray.ts` - System tray icon and menu

**Preload** (`src/preload/index.ts`):
- Bridges main/renderer via `contextBridge`, exposes `window.electronAPI`
- IPC channels are duplicated here (not imported) due to sandboxed context restrictions

**Renderer Process** (`src/renderer/`):
- React 18 + TypeScript + Tailwind CSS
- State management: Zustand (`store/configStore.ts`)

### Window Architecture

Three window types managed in `src/main/index.ts`:

1. **Setup Window** - First-launch wizard for API key and model selection
2. **Main Window (CompactBar)** - Frameless, transparent, always-on-top floating bar
3. **Panel Window** - Standard window for Settings and History tabs

Window behavior:
- Drag guards prevent resize conflicts during dragging (`SET_DRAG_STATE` IPC)
- Content-based auto-sizing via `useWindowAutoSize` hook
- Auto-collapse to chip after 1 minute of inactivity

### IPC Communication Pattern

All channels defined in `src/shared/types.ts` as `IPC_CHANNELS`:
1. Main process: `ipcMain.handle(channel, handler)`
2. Preload: `contextBridge.exposeInMainWorld('electronAPI', { ... })`
3. Renderer: `window.electronAPI.methodName()`

### Key Data Flows

**Recording & Transcription:**
1. `useAudioRecorder` hook captures audio via MediaRecorder API
2. Silence detection algorithm monitors audio levels via Web Audio API AnalyserNode
3. Audio blob sent to main process → OpenAI API → result returned via IPC

**Auto-paste:**
1. Main window hides, stores target window reference
2. Text copied to clipboard
3. `@nut-tree-fork/nut-js` simulates Ctrl+V
4. Requires careful timing for window focus management

**Silence Detection** (`useAudioRecorder.ts`):
- Calibration phase (1.5s) establishes noise baseline
- Speech confirmation requires 3+ consecutive samples above threshold
- Silence detection requires 5+ consecutive samples below threshold
- Adaptive threshold tracks peak speech level with decay

### Configuration

`AppConfig` type stored encrypted via `electron-store`:
- API key, model selection, hotkey, recording settings
- Silence detection: `silenceDetectionEnabled`, `silenceDurationMs`
- Auto-paste: `autoPasteEnabled`

Constants in `src/renderer/constants.ts` include `SILENCE_DETECTION` settings.

## Key Files for Common Changes

| Change Type | Files to Modify |
|-------------|-----------------|
| Add IPC channel | `src/shared/types.ts` (IPC_CHANNELS), `src/preload/index.ts`, `src/main/index.ts` |
| Recording logic | `src/renderer/hooks/useAudioRecorder.ts` |
| Silence detection tuning | `src/renderer/constants.ts` (SILENCE_DETECTION object) |
| Main UI | `src/renderer/components/CompactBar.tsx` |
| Settings/History UI | `src/renderer/pages/PanelWindow.tsx` |
| Transcription API | `src/main/transcription.ts` |
| State management | `src/renderer/store/configStore.ts` |
| Window management | `src/main/index.ts` (createMainWindow, createPanelWindow, etc.) |
