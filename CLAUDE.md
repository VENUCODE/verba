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

This is an Electron desktop application (Electron 28) with a React frontend. The app provides voice transcription using OpenAI's Whisper and GPT-4o transcription models.

### Process Structure

**Main Process** (`src/main/`):
- `index.ts` - Application entry, window management, IPC handler setup
- `transcription.ts` - OpenAI API integration for audio transcription (supports streaming for GPT-4o models)
- `shortcuts.ts` - Global hotkey registration using Electron's globalShortcut
- `tray.ts` - System tray icon and menu

**Preload** (`src/preload/index.ts`):
- Bridges main and renderer processes via `contextBridge`
- Exposes `window.electronAPI` with typed methods for IPC communication
- IPC channels are duplicated here (not imported) due to sandboxed context restrictions

**Renderer Process** (`src/renderer/`):
- React 18 with TypeScript, styled with Tailwind CSS
- Entry: `main.tsx` → `App.tsx`
- State management via Zustand (`store/configStore.ts`)

### Window Architecture

The app uses two window types:
1. **Main Window (CompactBar)** - Frameless, transparent, always-on-top floating bar for recording
2. **Panel Window** - Standard window for Settings and History tabs

Window sizing is carefully managed with:
- Drag guards to prevent resize conflicts during window dragging
- Content-based auto-sizing via `useWindowAutoSize` hook
- Auto-collapse after 1 minute of inactivity

### IPC Communication Pattern

All IPC channels are defined in `src/shared/types.ts` as `IPC_CHANNELS` constant. The pattern:
1. Main process registers handlers with `ipcMain.handle()`
2. Preload exposes methods via `contextBridge.exposeInMainWorld()`
3. Renderer calls via `window.electronAPI.*`

### Key Data Flow

1. **Recording**: Browser MediaRecorder API captures audio in renderer
2. **Transcription**: Audio buffer sent to main process via IPC → OpenAI API call
3. **Auto-paste**: Uses `@nut-tree-fork/nut-js` to simulate Ctrl+V after copying to clipboard
4. **Config Storage**: `electron-store` with encryption for API key security
5. **History**: Stored in localStorage (renderer), limited to 50 items

### Configuration

App configuration (`AppConfig` type) is stored encrypted via `electron-store` and includes:
- API key, model selection (whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe)
- Hotkey, recording settings, response format options

Default hotkey: `CommandOrControl+Shift+Space`

## Key Files for Common Changes

- **Adding IPC channels**: Update `src/shared/types.ts` (IPC_CHANNELS), `src/preload/index.ts`, and `src/main/index.ts`
- **UI components**: `src/renderer/components/` - CompactBar is the main recording interface
- **Transcription logic**: `src/main/transcription.ts`
- **State management**: `src/renderer/store/configStore.ts`
