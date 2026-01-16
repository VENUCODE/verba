import { create } from 'zustand';
import { AppConfig, AppStatus, TranscriptionHistory } from '../../shared/types';

const DEFAULT_CONFIG: AppConfig = {
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
};

export const HISTORY_STORAGE_KEY = 'voice-transcriber-history-v1';

const readHistoryFromStorage = (): TranscriptionHistory[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.warn('Failed to read history from storage', error);
    return [];
  }
};

const persistHistory = (history: TranscriptionHistory[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to persist history', error);
  }
};

interface ConfigStore {
  config: AppConfig;
  isFirstLaunch: boolean;
  status: AppStatus;
  recordingDuration: number;
  audioLevel: number;
  error: string | null;
  history: TranscriptionHistory[];

  // Actions
  setConfig: (config: Partial<AppConfig>) => void;
  setIsFirstLaunch: (value: boolean) => void;
  setStatus: (status: AppStatus) => void;
  setRecordingDuration: (duration: number) => void;
  setAudioLevel: (level: number) => void;
  setError: (error: string | null) => void;
  addToHistory: (item: Omit<TranscriptionHistory, 'id'>) => void;
  clearHistory: () => void;
  hydrateHistory: () => void;
  exportHistory: (format: 'txt' | 'json' | 'srt') => void;
  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<AppConfig>) => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  isFirstLaunch: true,
  status: 'idle',
  recordingDuration: 0,
  audioLevel: 0,
  error: null,
  history: readHistoryFromStorage(),

  setConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  setIsFirstLaunch: (value) => set({ isFirstLaunch: value }),

  setStatus: (status) => set({ status }),

  setRecordingDuration: (duration) => set({ recordingDuration: duration }),

  setAudioLevel: (level) => set({ audioLevel: level }),

  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  addToHistory: (item) =>
    set((state) => ({
      history: (() => {
        const next = [
          {
            ...item,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          },
          ...state.history,
        ].slice(0, 50);
        persistHistory(next);
        return next;
      })(),
    })),

  clearHistory: () => {
    persistHistory([]);
    set({ history: [] });
  },

  hydrateHistory: () => {
    const stored = readHistoryFromStorage();
    set({ history: stored });
  },

  exportHistory: (format: 'txt' | 'json' | 'srt') => {
    const state = get();
    const history = state.history;

    if (history.length === 0) {
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'txt':
        content = history
          .map((item, idx) => {
            const date = new Date(item.timestamp).toLocaleString();
            return `[${idx + 1}] ${date} - ${item.model} (${item.duration}s)\n${item.text}\n${'='.repeat(80)}\n`;
          })
          .join('\n');
        filename = `transcriptions-${Date.now()}.txt`;
        mimeType = 'text/plain';
        break;

      case 'json':
        content = JSON.stringify(history, null, 2);
        filename = `transcriptions-${Date.now()}.json`;
        mimeType = 'application/json';
        break;

      case 'srt':
        // SRT format with sequential numbering
        content = history
          .map((item, idx) => {
            const startTime = '00:00:00,000';
            const duration = item.duration * 1000;
            const endMs = duration % 1000;
            const endSec = Math.floor(duration / 1000) % 60;
            const endMin = Math.floor(duration / 60000) % 60;
            const endHour = Math.floor(duration / 3600000);
            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:${String(endSec).padStart(2, '0')},${String(endMs).padStart(3, '0')}`;

            return `${idx + 1}\n${startTime} --> ${endTime}\n${item.text}\n`;
          })
          .join('\n');
        filename = `transcriptions-${Date.now()}.srt`;
        mimeType = 'application/x-subrip';
        break;
    }

    // Create download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  loadConfig: async () => {
    try {
      const [config, isFirstLaunch] = await Promise.all([
        window.electronAPI.getConfig(),
        window.electronAPI.isFirstLaunch(),
      ]);
      set({ config, isFirstLaunch });
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  },

  saveConfig: async (config) => {
    try {
      const newConfig = await window.electronAPI.setConfig(config);
      set({ config: newConfig });
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  },
}));
