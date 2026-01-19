export interface AppConfig {
  apiKey: string;
  model: WhisperModel;
  maxDuration: number; // in seconds
  hotkey: string;
  launchAtStartup: boolean;
  startMinimized: boolean;
  selectedInputDevice: string | null;
  responseFormat?: ResponseFormat;
  language?: string;
  temperature?: number;
  // Silence detection settings
  silenceDetectionEnabled?: boolean;  // Enable auto-stop on silence
  silenceDurationMs?: number;         // Silence duration threshold (ms)
  silenceThreshold?: number;          // Audio level threshold (0-1)
  // Auto-paste setting
  autoPasteEnabled?: boolean;         // Enable auto-paste of transcribed text
}

export type WhisperModel = 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';

export type ResponseFormat = 'text' | 'json' | 'verbose_json' | 'srt' | 'vtt';

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  audioLevel: number;
  error: string | null;
}

export interface TranscriptionResult {
  text: string;
  duration: number;
  timestamp: number;
}

export interface TranscriptionHistory {
  id: string;
  text: string;
  duration: number;
  timestamp: number;
  model: WhisperModel;
}

export type AppStatus = 'idle' | 'recording' | 'transcribing' | 'error';

// IPC Channel names
export const IPC_CHANNELS = {
  // Config
  GET_CONFIG: 'config:get',
  SET_CONFIG: 'config:set',
  IS_FIRST_LAUNCH: 'config:isFirstLaunch',

  // Recording
  START_RECORDING: 'recording:start',
  STOP_RECORDING: 'recording:stop',
  RECORDING_STATUS: 'recording:status',

  // Transcription
  TRANSCRIBE: 'transcription:transcribe',
  TRANSCRIBE_STREAM: 'transcription:transcribeStream',
  TRANSCRIPTION_RESULT: 'transcription:result',
  TRANSCRIPTION_CHUNK: 'transcription:chunk',

  // System
  CHECK_ACTIVE_INPUT: 'system:checkActiveInput',
  PASTE_TEXT: 'system:pasteText',
  SHOW_NOTIFICATION: 'system:showNotification',
  HOTKEY_TRIGGERED: 'system:hotkeyTriggered',

  // Window
  MINIMIZE_TO_TRAY: 'window:minimizeToTray',
  SHOW_WINDOW: 'window:show',
  QUIT_APP: 'window:quit',
  RESIZE_WINDOW: 'window:resize',
  SET_ALWAYS_ON_TOP: 'window:setAlwaysOnTop',
  GET_WINDOW_BOUNDS: 'window:getBounds',
  OPEN_PANEL_WINDOW: 'window:openPanel',
  CLOSE_PANEL_WINDOW: 'window:closePanel',
  PANEL_SET_TAB: 'window:panelSetTab',
  HIDE_MAIN_WINDOW: 'window:hideMain',
  SET_DRAG_STATE: 'window:setDragState',
  MOVE_WINDOW: 'window:move',
  OPEN_SETUP_WINDOW: 'window:openSetup',
  CLOSE_SETUP_WINDOW: 'window:closeSetup',
} as const;


// Default configuration
export const DEFAULT_CONFIG: AppConfig = {
  apiKey: '',
  model: 'gpt-4o-mini-transcribe',
  maxDuration: 120,
  hotkey: 'CommandOrControl+Shift+Space',
  launchAtStartup: false,
  startMinimized: false,
  selectedInputDevice: null,
  responseFormat: 'text',
  language: undefined,
  temperature: 0,
  // Silence detection defaults (enabled by default)
  silenceDetectionEnabled: true,
  silenceDurationMs: 3000,    // 3 seconds
  silenceThreshold: 0.02,     // 2% of max audio level
  // Auto-paste enabled by default
  autoPasteEnabled: true,
};

// Constants
export const WHISPER_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const MIN_RECORDING_DURATION = 30; // 30 seconds
export const MAX_RECORDING_DURATION = 300; // 5 minutes
