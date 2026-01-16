# Window Resize Stability Plan

## Objective
Keep the compact recorder window tightly bound to its visible content even while users drag it against screen boundaries. Eliminate the ghost area highlighted in @session/page-006 and reach the reliability described in page 7.

## Root Causes (from session pages 5–7)
- `ResizeObserver` kept firing during drags, and queued measurements were flushed right after `mouseup`, passing oversized dimensions to `window:resize`.
- `RESIZE_WINDOW` in `src/main/index.ts` trusted every renderer request and updated `lastRequestedWindowSize`, so a single oversized measurement became the new normal.
- `.app-shell` / `.app-root` had no max bounds, so any padding/overlay growth inflated the measured DOM size.

## Fix Checklist
- [x] Add explicit min/max content bounds and a drag-guard IPC handshake in the main process.
- [x] Update `useWindowAutoSize` + `App` to cooperate with the drag guard, clamp measurements, and debounce post-drag resizes.
- [x] Tighten `.app-shell` and `.app-root` styles so the DOM never exceeds the intended footprint.
- [x] Normalize DPI scaling + collapsed/expanded base dimensions so the 160x44 chip and 216x56 compact bar map 1:1 to the window.
- [ ] Verify by dragging the bar against all edges for 30+ seconds with debug borders visible and capture screenshots/logs.
- [ ] Record test evidence + final status back into this plan.
