import { contextBridge, ipcRenderer } from 'electron';

// Inline IPC channels to avoid import issues in sandboxed preload context
const IPC_CHANNELS = {
  GET_CONFIG: 'config:get',
  SET_CONFIG: 'config:set',
  IS_FIRST_LAUNCH: 'config:isFirstLaunch',
  TRANSCRIBE: 'transcription:transcribe',
  TRANSCRIBE_STREAM: 'transcription:transcribeStream',
  TRANSCRIPTION_CHUNK: 'transcription:chunk',
  PASTE_TEXT: 'system:pasteText',
  HOTKEY_TRIGGERED: 'system:hotkeyTriggered',
  MINIMIZE_TO_TRAY: 'window:minimizeToTray',
  SHOW_WINDOW: 'window:show',
  QUIT_APP: 'window:quit',
  RESIZE_WINDOW: 'window:resize',
  SET_ALWAYS_ON_TOP: 'window:setAlwaysOnTop',
  GET_WINDOW_BOUNDS: 'window:getBounds',
  CHECK_ACTIVE_INPUT: 'system:checkActiveInput',
  OPEN_PANEL_WINDOW: 'window:openPanel',
  CLOSE_PANEL_WINDOW: 'window:closePanel',
  PANEL_SET_TAB: 'window:panelSetTab',
  HIDE_MAIN_WINDOW: 'window:hideMain',
  SET_DRAG_STATE: 'window:setDragState',
} as const;

// Type for AppConfig (inline to avoid import)
interface AppConfig {
  apiKey: string;
  model: string;
  maxDuration: number;
  hotkey: string;
  launchAtStartup: boolean;
  startMinimized: boolean;
  selectedInputDevice: string | null;
  responseFormat?: string;
  language?: string;
  temperature?: number;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke(IPC_CHANNELS.GET_CONFIG),
  setConfig: (config: Partial<AppConfig>): Promise<AppConfig> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_CONFIG, config),
  isFirstLaunch: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.IS_FIRST_LAUNCH),
  completeSetup: (): Promise<boolean> => ipcRenderer.invoke('config:completeSetup'),

  // Transcription
  transcribe: (audioBuffer: ArrayBuffer): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIBE, audioBuffer),
  transcribeStream: (audioBuffer: ArrayBuffer): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIBE_STREAM, audioBuffer),

  // System
  pasteText: (text: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.PASTE_TEXT, text),

  // Window
  minimizeToTray: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.MINIMIZE_TO_TRAY),
  showWindow: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.SHOW_WINDOW),
  quitApp: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.QUIT_APP),
  resizeWindow: (width: number, height: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESIZE_WINDOW, { width, height }),
  setAlwaysOnTop: (flag: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_ALWAYS_ON_TOP, flag),
  getWindowBounds: (): Promise<any> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_WINDOW_BOUNDS),
  checkActiveInput: (): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_ACTIVE_INPUT),
  openPanelWindow: (tab: 'settings' | 'history'): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_PANEL_WINDOW, { tab }),
  closePanelWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.CLOSE_PANEL_WINDOW),
  hideMainWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.HIDE_MAIN_WINDOW),
  setDragState: (active: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_DRAG_STATE, { active }),

  // Event listeners
  onHotkeyTriggered: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.HOTKEY_TRIGGERED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.HOTKEY_TRIGGERED, handler);
    };
  },
  onTranscriptionChunk: (callback: (chunk: string) => void) => {
    const handler = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_CHUNK, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIPTION_CHUNK, handler);
    };
  },
  onPanelTabChange: (callback: (tab: 'settings' | 'history') => void) => {
    const handler = (_: any, tab: 'settings' | 'history') => callback(tab);
    ipcRenderer.on(IPC_CHANNELS.PANEL_SET_TAB, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.PANEL_SET_TAB, handler);
    };
  },
});

// Type declaration for renderer
export interface ElectronAPI {
  getConfig: () => Promise<AppConfig>;
  setConfig: (config: Partial<AppConfig>) => Promise<AppConfig>;
  isFirstLaunch: () => Promise<boolean>;
  completeSetup: () => Promise<boolean>;
  transcribe: (audioBuffer: ArrayBuffer) => Promise<string>;
  transcribeStream: (audioBuffer: ArrayBuffer) => Promise<string>;
  pasteText: (text: string) => Promise<boolean>;
  minimizeToTray: () => Promise<void>;
  showWindow: () => Promise<void>;
  quitApp: () => Promise<void>;
  resizeWindow: (width: number, height: number) => Promise<void>;
  setAlwaysOnTop: (flag: boolean) => Promise<void>;
  getWindowBounds: () => Promise<any>;
  checkActiveInput: () => Promise<boolean>;
  openPanelWindow: (tab: 'settings' | 'history') => Promise<void>;
  closePanelWindow: () => Promise<void>;
  hideMainWindow: () => Promise<void>;
  setDragState: (active: boolean) => Promise<void>;
  onHotkeyTriggered: (callback: () => void) => () => void;
  onTranscriptionChunk: (callback: (chunk: string) => void) => () => void;
  onPanelTabChange: (callback: (tab: 'settings' | 'history') => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
