# Verba - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Electron Application                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    IPC Bridge    ┌──────────────────────────┐ │
│  │   Main Process   │◄──────────────►  │    Renderer Process      │ │
│  │                  │                   │                          │ │
│  │  - Window Mgmt   │                   │  - React UI              │ │
│  │  - Global Hotkey │   contextBridge   │  - Audio Recording       │ │
│  │  - OpenAI API    │◄─────────────────►│  - State (Zustand)       │ │
│  │  - System Tray   │                   │  - Visualizers           │ │
│  │  - Auto-paste    │                   │                          │ │
│  │                  │                   │                          │ │
│  └──────────────────┘                   └──────────────────────────┘ │
│           │                                        │                 │
│           ▼                                        ▼                 │
│  ┌──────────────────┐                   ┌──────────────────────────┐ │
│  │  electron-store  │                   │     localStorage         │ │
│  │  (Encrypted)     │                   │     (History)            │ │
│  └──────────────────┘                   └──────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   OpenAI API     │
                    │  - whisper-1     │
                    │  - gpt-4o-*      │
                    └──────────────────┘
```

## Process Communication

### IPC Channel Pattern

All communication between main and renderer uses typed IPC channels defined in `src/shared/types.ts`:

```
Renderer                    Preload                     Main Process
────────                    ───────                     ────────────
window.electronAPI.* ──► contextBridge ──► ipcRenderer.invoke() ──► ipcMain.handle()
                                                                          │
                                          ipcRenderer.on() ◄── webContents.send() ◄─┘
```

### Key IPC Channels

| Category | Channel | Direction | Purpose |
|----------|---------|-----------|---------|
| Config | `config:get/set` | Bidirectional | Load/save app configuration |
| Transcription | `transcription:transcribe` | Renderer → Main | Send audio for transcription |
| Transcription | `transcription:chunk` | Main → Renderer | Stream transcription results |
| Window | `window:resize` | Renderer → Main | Request window resize |
| System | `system:hotkeyTriggered` | Main → Renderer | Notify hotkey press |
| System | `system:pasteText` | Renderer → Main | Auto-paste transcribed text |

## Window Architecture

### Dual Window System

The app uses two distinct windows optimized for different purposes:

```
┌─────────────────────────────────────────┐
│           Main Window (CompactBar)       │
├─────────────────────────────────────────┤
│ Properties:                              │
│   - Frameless, transparent              │
│   - Always on top                        │
│   - Draggable                            │
│   - Auto-collapses after 60s inactivity │
│                                          │
│ States:                                  │
│   - Collapsed: 160×44px (chip)          │
│   - Expanded:  216×56px (compact bar)   │
│   - Setup:     400×500px                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Panel Window (Settings/History)  │
├─────────────────────────────────────────┤
│ Properties:                              │
│   - Standard frame                       │
│   - Tabbed interface                     │
│   - 460×560px default                   │
│                                          │
│ Tabs:                                    │
│   - Settings (API, model, hotkeys)      │
│   - History (search, export)            │
└─────────────────────────────────────────┘
```

### Window Resize Management

Window sizing is tightly controlled to prevent visual glitches:

1. **Drag Guard**: IPC handshake prevents resize during window drag
2. **Content Size**: Uses `setContentSize()` with pixel clamping
3. **Auto-sizing**: `useWindowAutoSize` hook measures content and requests resize
4. **DPI Normalization**: Forces scale factor to 1:1 for consistent sizing

## Data Flow

### Recording → Transcription → Paste

```
1. User triggers recording (button or hotkey)
         │
         ▼
2. MediaRecorder captures audio (WebM/Opus)
         │
         ▼
3. Audio buffer sent via IPC to main process
         │
         ▼
4. Main process calls OpenAI API
   ├── whisper-1: Standard request
   └── gpt-4o-*: Streaming request
         │
         ▼
5. Transcription result returned
         │
         ▼
6. Auto-paste sequence:
   a. Copy text to clipboard
   b. Window becomes semi-transparent
   c. Focus shifts to target app
   d. Simulate Ctrl+V / Cmd+V
   e. Restore window
```

### State Management

```
┌─────────────────────────────────────────┐
│           Zustand Store                  │
├─────────────────────────────────────────┤
│ configStore.ts                           │
│ ├── config: AppConfig (from electron)   │
│ ├── status: idle|recording|transcribing │
│ ├── history: TranscriptionHistory[]     │
│ └── actions: setConfig, addToHistory... │
└─────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    electron-store         localStorage
    (encrypted)            (history)
```

## Component Hierarchy

```
App.tsx
├── [Setup Mode] Setup.tsx
│   └── Initial API key configuration
│
├── [Compact Mode] CompactBar.tsx
│   ├── MiniVisualizer.tsx (audio levels)
│   ├── VerticalBarsVisualizer.tsx
│   └── RecordingIndicator.tsx
│
└── [Panel Mode] PanelWindow.tsx
    ├── Settings.tsx
    │   ├── ModelSelector.tsx
    │   └── HotkeyConfig.tsx
    └── TranscriptionHistory.tsx
```

## Key Technical Decisions

### 1. Frameless Window with Custom Drag
The compact bar uses a frameless window with `-webkit-app-region: drag` for native-feeling drag behavior while maintaining a minimal footprint.

### 2. Preload Script Duplication
IPC channels are duplicated in `preload/index.ts` (not imported from shared) because the preload script runs in a sandboxed context that cannot resolve external imports.

### 3. Auto-paste via nut-js
Uses `@nut-tree-fork/nut-js` for cross-platform keyboard simulation. The window temporarily becomes semi-transparent (not hidden) to maintain context while allowing focus shift.

### 4. Encrypted Configuration
API keys are stored using `electron-store` with encryption enabled. History is stored in localStorage (renderer) as it contains no sensitive data.

### 5. Streaming Transcription
GPT-4o models support streaming, delivering text chunks via `transcription:chunk` IPC events. Whisper-1 falls back to standard request/response.

## File Structure Reference

```
src/
├── main/                    # Electron main process
│   ├── index.ts            # App entry, window creation, IPC setup
│   ├── transcription.ts    # OpenAI API integration
│   ├── shortcuts.ts        # Global hotkey registration
│   └── tray.ts             # System tray icon
│
├── preload/
│   └── index.ts            # Context bridge, exposes electronAPI
│
├── renderer/               # React frontend
│   ├── App.tsx             # Root, routing between modes
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom hooks (audio, window sizing)
│   ├── pages/              # Full-page views
│   ├── store/              # Zustand state management
│   └── utils/              # Helpers (sounds, errors)
│
└── shared/
    ├── types.ts            # TypeScript interfaces, IPC channels
    ├── constants.ts        # Model options, default values
    └── errorHandling.ts    # Error parsing utilities
```

## External Dependencies

| Package | Purpose |
|---------|---------|
| `electron` | Desktop application framework |
| `react` + `react-dom` | UI framework |
| `zustand` | State management |
| `tailwindcss` | Styling |
| `openai` | API client for transcription |
| `@nut-tree-fork/nut-js` | Cross-platform keyboard automation |
| `electron-store` | Encrypted persistent storage |
| `lucide-react` | Icon library |
| `vite` | Build tool |
| `electron-builder` | Packaging |
