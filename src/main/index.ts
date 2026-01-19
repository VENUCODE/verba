import { app, BrowserWindow, ipcMain, clipboard, screen } from 'electron';
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
let panelWindow: BrowserWindow | null = null;
let isQuitting = false;
let lastRequestedWindowSize = { width: 240, height: 40 };
let isDragGuardActive = false;
let dragGuardTimeout: NodeJS.Timeout | null = null;

const WINDOW_LIMITS = {
  MIN_WIDTH: 160,
  MAX_WIDTH: 420,
  MIN_HEIGHT: 44,
  MAX_HEIGHT: 160,
  EDGE_MARGIN: 12,
};

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Normalize DPI scaling to keep renderer + BrowserWindow sizes in sync
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

function createWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: 240,
    height: 40,
    useContentSize: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    x: Math.floor((screenWidth - 240) / 2),
    y: 20,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false,
  });
  lastRequestedWindowSize = { width: 240, height: 40 };

  // Keep window within screen bounds when moved
  mainWindow.on('will-move', (event, newBounds) => {
    const { x, y, width, height } = newBounds;
    const maxX = screenWidth - width;
    const maxY = screenHeight - height;
    
    const constrainedX = Math.max(0, Math.min(x, maxX));
    const constrainedY = Math.max(0, Math.min(y, maxY));
    
    if (x !== constrainedX || y !== constrainedY) {
      event.preventDefault();
      mainWindow?.setPosition(constrainedX, constrainedY);
    }
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
      // Resize for setup if needed
      if (store.get('isFirstLaunch') || !config.apiKey) {
        mainWindow?.setContentSize(400, 500, false);
        lastRequestedWindowSize = { width: 400, height: 500 };
      } else {
        mainWindow?.setContentSize(240, 40, false);
        lastRequestedWindowSize = { width: 240, height: 40 };
      }
      mainWindow?.show();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('resize', () => {
    if (!mainWindow || isDragGuardActive) {
      return;
    }
    const { width, height } = mainWindow.getContentBounds();
    const widthDiff = Math.abs(width - lastRequestedWindowSize.width);
    const heightDiff = Math.abs(height - lastRequestedWindowSize.height);
    if (widthDiff > 2 || heightDiff > 2) {
      mainWindow.setContentSize(
        lastRequestedWindowSize.width,
        lastRequestedWindowSize.height,
        false
      );
    }
  });

  return mainWindow;
}

function openPanelWindow(initialTab: 'settings' | 'history' = 'settings') {
  if (panelWindow) {
    panelWindow.show();
    panelWindow.focus();
    panelWindow.webContents.send(IPC_CHANNELS.PANEL_SET_TAB, initialTab);
    return panelWindow;
  }

  const PANEL_CONSTRAINTS = {
    MIN_WIDTH: 520,
    MIN_HEIGHT: 450,
    MAX_WIDTH: 1024,
    MAX_HEIGHT: 900,
  };

  panelWindow = new BrowserWindow({
    width: 520,
    height: 560,
    minWidth: PANEL_CONSTRAINTS.MIN_WIDTH,
    minHeight: PANEL_CONSTRAINTS.MIN_HEIGHT,
    maxWidth: PANEL_CONSTRAINTS.MAX_WIDTH,
    maxHeight: PANEL_CONSTRAINTS.MAX_HEIGHT,
    useContentSize: true,
    frame: false,
    transparent: false,
    backgroundColor: '#040713',
    resizable: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // Enforce constraints during resize to prevent edge cases where min/max might not apply
  panelWindow.on('will-resize', (event, newBounds) => {
    const { width, height } = newBounds;

    // Check if dimensions are within constraints
    if (
      width < PANEL_CONSTRAINTS.MIN_WIDTH ||
      width > PANEL_CONSTRAINTS.MAX_WIDTH ||
      height < PANEL_CONSTRAINTS.MIN_HEIGHT ||
      height > PANEL_CONSTRAINTS.MAX_HEIGHT
    ) {
      event.preventDefault();

      // Constrain to valid range
      const constrainedWidth = Math.max(
        PANEL_CONSTRAINTS.MIN_WIDTH,
        Math.min(width, PANEL_CONSTRAINTS.MAX_WIDTH)
      );
      const constrainedHeight = Math.max(
        PANEL_CONSTRAINTS.MIN_HEIGHT,
        Math.min(height, PANEL_CONSTRAINTS.MAX_HEIGHT)
      );

      // Apply constrained size
      panelWindow?.setContentSize(constrainedWidth, constrainedHeight, false);
    }
  });

  // Note: setAspectRatio() removed as it causes resize issues on Windows/Linux
  // The min/max dimensions and will-resize handler ensure the panel stays usable

  const loadPanel = async () => {
    if (!panelWindow) return;
    if (isDev) {
      await panelWindow.loadURL(`http://localhost:5173/?view=panel&tab=${initialTab}`);
    } else {
      await panelWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
        query: { view: 'panel', tab: initialTab },
      });
    }
  };

  loadPanel();

  panelWindow.webContents.on('did-finish-load', () => {
    panelWindow?.webContents.send(IPC_CHANNELS.PANEL_SET_TAB, initialTab);
  });

  panelWindow.once('ready-to-show', () => {
    panelWindow?.show();
    panelWindow?.focus();
  });

  panelWindow.on('closed', () => {
    panelWindow = null;
    if (!isQuitting) {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  return panelWindow;
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
    const config = store.get('config');
    // Register shortcuts after setup completion
    if (config.apiKey) {
      unregisterShortcuts();
      registerShortcuts(config.hotkey, () => {
        mainWindow?.webContents.send(IPC_CHANNELS.HOTKEY_TRIGGERED);
      });
    }
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
      
      // Make window semi-transparent instead of hiding completely
      if (mainWindow) {
        mainWindow.setOpacity(0.3);
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
      }
      
      // Small delay to let OS shift focus
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Simulate Ctrl+V / Cmd+V using nut-js
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
      
      // Restore window visibility smoothly
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.setOpacity(1);
          mainWindow.setIgnoreMouseEvents(false);
        }
      }, 300);
      
      return true;
    } catch (error: any) {
      console.error('Failed to paste text:', error);
      // Fallback: at least copy to clipboard
      clipboard.writeText(text);
      // Restore window even on error
      if (mainWindow) {
        mainWindow.setOpacity(1);
        mainWindow.setIgnoreMouseEvents(false);
      }
      throw new Error('Failed to paste text automatically. Text copied to clipboard.');
    }
  });

  // Window handlers
  ipcMain.handle(IPC_CHANNELS.MINIMIZE_TO_TRAY, () => {
    // Don't hide completely - just minimize to chip (handled by renderer)
    // Keep window visible but collapsed
    if (mainWindow) {
      const width = WINDOW_LIMITS.MIN_WIDTH;
      const height = WINDOW_LIMITS.MIN_HEIGHT;
      mainWindow.setContentSize(width, height, true);
      lastRequestedWindowSize = { width, height };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SHOW_WINDOW, () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  ipcMain.handle(IPC_CHANNELS.HIDE_MAIN_WINDOW, () => {
    mainWindow?.hide();
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_PANEL_WINDOW, (_, { tab }: { tab: 'settings' | 'history' }) => {
    mainWindow?.hide();
    openPanelWindow(tab);
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_PANEL_WINDOW, () => {
    if (panelWindow) {
      panelWindow.close();
      panelWindow = null;
    }
    if (!isQuitting) {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  ipcMain.handle(IPC_CHANNELS.QUIT_APP, () => {
    isQuitting = true;
    app.quit();
  });

  ipcMain.handle(IPC_CHANNELS.SET_DRAG_STATE, (_, { active }: { active: boolean }) => {
    if (active) {
      isDragGuardActive = true;
      if (dragGuardTimeout) {
        clearTimeout(dragGuardTimeout);
        dragGuardTimeout = null;
      }
    } else {
      if (dragGuardTimeout) {
        clearTimeout(dragGuardTimeout);
      }
      dragGuardTimeout = setTimeout(() => {
        isDragGuardActive = false;
        dragGuardTimeout = null;
        if (mainWindow) {
          mainWindow.setContentSize(
            lastRequestedWindowSize.width,
            lastRequestedWindowSize.height,
            false
          );
        }
      }, 180);
    }
  });

  // Get window bounds handler
  ipcMain.handle(IPC_CHANNELS.GET_WINDOW_BOUNDS, () => {
    if (mainWindow) {
      return mainWindow.getContentBounds();
    }
    return null;
  });

  // Window resize handler
  ipcMain.handle(IPC_CHANNELS.RESIZE_WINDOW, (_, { width, height }: { width: number; height: number }) => {
    if (!mainWindow || isDragGuardActive) {
      return;
    }

    const currentBounds = mainWindow.getContentBounds();
    const display = screen.getDisplayNearestPoint({ x: currentBounds.x, y: currentBounds.y });
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

    const maxWidth = Math.max(
      WINDOW_LIMITS.MIN_WIDTH,
      Math.min(WINDOW_LIMITS.MAX_WIDTH, screenWidth - WINDOW_LIMITS.EDGE_MARGIN)
    );
    const maxHeight = Math.max(
      WINDOW_LIMITS.MIN_HEIGHT,
      Math.min(WINDOW_LIMITS.MAX_HEIGHT, screenHeight - WINDOW_LIMITS.EDGE_MARGIN)
    );

    const targetWidth = clamp(Math.round(width), WINDOW_LIMITS.MIN_WIDTH, maxWidth);
    const targetHeight = clamp(Math.round(height), WINDOW_LIMITS.MIN_HEIGHT, maxHeight);

    if (
      Math.abs(targetWidth - lastRequestedWindowSize.width) < 2 &&
      Math.abs(targetHeight - lastRequestedWindowSize.height) < 2
    ) {
      return;
    }

    lastRequestedWindowSize = { width: targetWidth, height: targetHeight };

    // Use setBounds instead of setContentSize to prevent system dimension tooltip
    const windowBounds = mainWindow.getBounds();
    mainWindow.setBounds({
      x: windowBounds.x,
      y: windowBounds.y,
      width: targetWidth,
      height: targetHeight
    }, false);
  });

  // Set always on top handler
  ipcMain.handle(IPC_CHANNELS.SET_ALWAYS_ON_TOP, (_, flag: boolean) => {
    mainWindow?.setAlwaysOnTop(flag);
  });

  // Check if cursor is in active input field
  ipcMain.handle(IPC_CHANNELS.CHECK_ACTIVE_INPUT, async () => {
    try {
      // Try to get focused element info (limited in Electron)
      // For now, we'll assume there's an active input
      // A better approach would be to check the focused window's active element
      // but that requires more complex native integration
      // In practice, we'll rely on the user clicking in a text field first
      return true; // Simplified - always return true for now
    } catch (error) {
      console.error('Failed to check active input:', error);
      return false;
    }
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
