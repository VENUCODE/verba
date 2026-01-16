import { Tray, Menu, nativeImage, NativeImage } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;

export function createTray(
  onShow: () => void,
  onQuit: () => void
): Tray {
  // Create tray icon
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');

  // Create a simple icon if file doesn't exist
  let icon: NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = createDefaultIcon();
    }
  } catch {
    icon = createDefaultIcon();
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
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
  // Create a simple 16x16 icon programmatically
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Create a simple circle
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist <= radius) {
        buffer[idx] = 59;      // R
        buffer[idx + 1] = 130; // G
        buffer[idx + 2] = 246; // B
        buffer[idx + 3] = 255; // A
      } else {
        buffer[idx + 3] = 0;   // Transparent
      }
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
