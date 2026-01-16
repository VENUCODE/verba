import { globalShortcut } from 'electron';

let registeredShortcut: string | null = null;

export function registerShortcuts(
  hotkey: string,
  onTrigger: () => void
): boolean {
  // Unregister existing shortcut first
  unregisterShortcuts();

  try {
    const success = globalShortcut.register(hotkey, () => {
      onTrigger();
    });

    if (success) {
      registeredShortcut = hotkey;
      console.log(`Shortcut registered: ${hotkey}`);
    } else {
      console.error(`Failed to register shortcut: ${hotkey}`);
    }

    return success;
  } catch (error) {
    console.error('Error registering shortcut:', error);
    return false;
  }
}

export function unregisterShortcuts(): void {
  if (registeredShortcut) {
    try {
      globalShortcut.unregister(registeredShortcut);
      registeredShortcut = null;
    } catch (error) {
      console.error('Error unregistering shortcut:', error);
    }
  }
}

export function isShortcutRegistered(): boolean {
  return registeredShortcut !== null;
}

export function getRegisteredShortcut(): string | null {
  return registeredShortcut;
}
