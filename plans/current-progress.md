# Progress Log – 2026-01-16

## Completed Fixes
- Stabilized compact window sizing: clamped Electron `BrowserWindow` to 160–420px width / 44–160px height and added drag guard IPC so drag motions can’t inflate the shell.
- Hooked renderer auto-sizing into the guard (`useWindowAutoSize`) with max bounds and post-drag debouncing; removed legacy per-component resize calls.
- Restored glass-like rounded container styles via `.app-shell` / `.app-root`, eliminating the green ghost area noted in session page 6.
- Normalized the collapsed (160×44) and compact (216×56) states: DPI scaling is forced to 1:1, root layout now uses width/height 100%, and the chip fills the full window footprint so nothing clips or floats.
- Added a hide-to-tray control on the bar so the frameless window can be dismissed without leaving ghost regions.

## Remaining TODOs
- Split settings/history into a dedicated secondary window with tabbed UI so the compact bar never resizes.
- Verify the new collapsed/expanded transitions (especially after auto-expand) and collect screenshots/logs for `plans/window-resize-fix.md`.
