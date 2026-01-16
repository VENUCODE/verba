import { app, BrowserWindow, ipcMain, clipboard } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { AppConfig, IPC_CHANNELS, DEFAULT_CONFIG } from '../shared/types';
import { createTray } from './tray';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { transcribeAudio, transcribeAudioStream } from './transcription';

// Initialize store
const store = new Store<{ config: AppConfig; isFirstLaunch: boolean }>({
  defaults: {
    config: DEFAULT_CONFIG,
    isFirstLaunch: true,
  },
  encryptionKey: 'voice-transcriber-secure-key',
});

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 350,
    minHeight: 450,
    frame: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    const config = store.get('config');
    if (!config.startMinimized) {
      mainWindow?.show();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  return mainWindow;
}

function setupIPC(): void {
  // Config handlers
  ipcMain.handle(IPC_CHANNELS.GET_CONFIG, () => {
    return store.get('config');
  });

  ipcMain.handle(IPC_CHANNELS.SET_CONFIG, (_, config: Partial<AppConfig>) => {
    const currentConfig = store.get('config');
    const newConfig = { ...currentConfig, ...config };
    store.set('config', newConfig);

    // Re-register shortcuts if hotkey changed
    if (config.hotkey && config.hotkey !== currentConfig.hotkey) {
      unregisterShortcuts();
      registerShortcuts(newConfig.hotkey, () => {
        mainWindow?.webContents.send(IPC_CHANNELS.HOTKEY_TRIGGERED);
      });
    }

    return newConfig;
  });

  ipcMain.handle(IPC_CHANNELS.IS_FIRST_LAUNCH, () => {
    return store.get('isFirstLaunch');
  });

  // Mark first launch as complete
  ipcMain.handle('config:completeSetup', () => {
    store.set('isFirstLaunch', false);
    return true;
  });

  // Transcription handler
  ipcMain.handle(IPC_CHANNELS.TRANSCRIBE, async (_, audioBuffer: ArrayBuffer) => {
    const config = store.get('config');
    if (!config.apiKey) {
      throw new Error('API key not configured');
    }
    return transcribeAudio(audioBuffer, config.apiKey, {
      model: config.model,
      responseFormat: config.responseFormat || 'text',
      language: config.language,
      temperature: config.temperature,
    });
  });

  // Streaming transcription handler
  ipcMain.handle(IPC_CHANNELS.TRANSCRIBE_STREAM, async (_event, audioBuffer: ArrayBuffer) => {
    const config = store.get('config');
    if (!config.apiKey) {
      throw new Error('API key not configured');
    }

    const options = {
      model: config.model,
      responseFormat: config.responseFormat || 'text',
      language: config.language,
      temperature: config.temperature,
    };

    try {
      let fullText = '';
      for await (const chunk of transcribeAudioStream(audioBuffer, config.apiKey, options)) {
        fullText += chunk;
        // Send chunk to renderer
        mainWindow?.webContents.send(IPC_CHANNELS.TRANSCRIPTION_CHUNK, chunk);
      }
      return fullText;
    } catch (error: any) {
      throw error;
    }
  });

  // Paste text handler
  ipcMain.handle(IPC_CHANNELS.PASTE_TEXT, async (_, text: string) => {
    try {
      clipboard.writeText(text);
      // Simulate Ctrl+V / Cmd+V using nut-js
      // Note: This requires @nut-tree-fork/nut-js to be installed
      const { keyboard, Key } = await import('@nut-tree-fork/nut-js');
      
      if (process.platform === 'darwin') {
        await keyboard.pressKey(Key.LeftCmd);
        await keyboard.pressKey(Key.V);
        await keyboard.releaseKey(Key.V);
        await keyboard.releaseKey(Key.LeftCmd);
      } else {
        await keyboard.pressKey(Key.LeftControl);
        await keyboard.pressKey(Key.V);
        await keyboard.releaseKey(Key.V);
        await keyboard.releaseKey(Key.LeftControl);
      }
      return true;
    } catch (error: any) {
      console.error('Failed to paste text:', error);
      // Fallback: at least copy to clipboard
      clipboard.writeText(text);
      throw new Error('Failed to paste text automatically. Text copied to clipboard.');
    }
  });

  // Window handlers
  ipcMain.handle(IPC_CHANNELS.MINIMIZE_TO_TRAY, () => {
    mainWindow?.hide();
  });

  ipcMain.handle(IPC_CHANNELS.SHOW_WINDOW, () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  ipcMain.handle(IPC_CHANNELS.QUIT_APP, () => {
    isQuitting = true;
    app.quit();
  });
}

app.whenReady().then(() => {
  createWindow();
  setupIPC();

  // Create tray
  createTray(
    () => {
      mainWindow?.show();
      mainWindow?.focus();
    },
    () => {
      isQuitting = true;
      app.quit();
    }
  );

  // Register shortcuts
  const config = store.get('config');
  if (config.apiKey) {
    registerShortcuts(config.hotkey, () => {
      mainWindow?.webContents.send(IPC_CHANNELS.HOTKEY_TRIGGERED);
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  unregisterShortcuts();
});
