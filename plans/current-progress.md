# Progress Log – 2026-01-16

## Completed Fixes
- Stabilized compact window sizing: clamped Electron `BrowserWindow` to 160–420px width / 44–160px height and added drag guard IPC so drag motions can’t inflate the shell.
- Hooked renderer auto-sizing into the guard (`useWindowAutoSize`) with max bounds and post-drag debouncing; removed legacy per-component resize calls.
- Restored glass-like rounded container styles via `.app-shell` / `.app-root`, eliminating the green ghost area noted in session page 6.
- Added close-to-tray button and ensured chip/minimize flows call `resizeWindow(120,10)` only when collapsed.

## Remaining TODOs
- Split settings/history into a dedicated secondary window with tabbed UI so the compact bar never resizes.
- Fix the “hover after minimize” bug: when the chip auto-expands due to pointer movement, the window should immediately resize to fit the bar again.
- Capture verification screenshots/logs and fill in the last two items in `plans/window-resize-fix.md` after testing.
