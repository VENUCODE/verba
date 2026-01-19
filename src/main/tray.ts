import { Tray, Menu, nativeImage, NativeImage } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;

export function createTray(
  onShow: () => void,
  onQuit: () => void
): Tray {
  // Load the wave-sound.png icon (16x16, perfect for tray)
  const iconPath = path.join(__dirname, '../../assets/wave-sound.png');
  let icon: NativeImage;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      console.warn('Tray icon not found, using fallback');
      icon = createDefaultIcon();
    }
  } catch (error) {
    console.error('Failed to load tray icon:', error);
    icon = createDefaultIcon();
  }

  tray = new Tray(icon);
  tray.setToolTip('Voice Transcriber');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: onShow,
    },
    {
      label: 'Start Recording',
      click: () => {
        // This will be handled by renderer
        onShow();
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: onShow,
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: onQuit,
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    onShow();
  });

  return tray;
}

function createDefaultIcon(): NativeImage {
  // Fallback: Simple cyan waveform bars (matching wave-sound.png style)
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  
  // Cyan color (matching the wave-sound.png)
  const r = 34;
  const g = 211;
  const b = 238;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let alpha = 0;
      
      // Create vertical waveform bars
      const barPositions = [2, 4, 6, 8, 10, 12, 14];
      if (barPositions.includes(x)) {
        // Vary bar heights to create waveform effect
        const barHeights = [6, 10, 8, 12, 8, 10, 6];
        const barIndex = barPositions.indexOf(x);
        const barHeight = barHeights[barIndex];
        const yStart = Math.floor((size - barHeight) / 2);
        const yEnd = yStart + barHeight;
        
        if (y >= yStart && y <= yEnd) {
          alpha = 255;
        }
      }
      
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = alpha;
    }
  }
  
  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

export function updateTrayIcon(isRecording: boolean): void {
  if (!tray) return;

  const icon = isRecording ? createRecordingIcon() : createDefaultIcon();
  tray.setImage(icon.resize({ width: 16, height: 16 }));
}

function createRecordingIcon(): NativeImage {
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist <= radius) {
        buffer[idx] = 239;     // R (red for recording)
        buffer[idx + 1] = 68;  // G
        buffer[idx + 2] = 68;  // B
        buffer[idx + 3] = 255; // A
      } else {
        buffer[idx + 3] = 0;
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
