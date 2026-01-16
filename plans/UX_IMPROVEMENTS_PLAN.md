# UX Improvements Plan

## Overview
Comprehensive UX overhaul for compact floating bar with professional design, auto-collapse, sound feedback, and improved interactions.

## 1. History Panel Fixes
- **Issue**: Can't click outside history area, rectangular shape, no gap
- **Fix**: 
  - Add `pointer-events: none` to overlay, `pointer-events: auto` to panel
  - Add border-radius (rounded-lg)
  - Add margin-top gap between bar and panel
  - Make panel clickable area properly contained

## 2. Minimize to Tray
- **Issue**: App disappears completely
- **Fix**: Ensure tray icon is always visible and accessible
- **Status**: Tray already exists, just need to verify it's working

## 3. Cursor Styling
- **Issue**: Arrow cursor on buttons
- **Fix**: Add `cursor-pointer` to all interactive buttons

## 4. Recording Mode UI
- **Issue**: Icons visible during recording
- **Fix**:
  - Hide history/settings icons when recording
  - Add smooth fade-in/out transitions
  - Hotkey to show icons (double-tap hotkey or separate show UI hotkey)
  - Click on bar to expand icons with animation

## 5. Drag Handle
- **Issue**: Horizontal dots
- **Fix**: Change to vertical dots (3 vertical dots)

## 6. Auto-Collapse Feature
- **Requirement**: Expand for 1 min after last use, then collapse to chip (200px width, 10px height)
- **Implementation**:
  - Track last interaction time
  - Timer to collapse after 60 seconds of inactivity
  - Collapse to minimal chip state
  - Expand on hover or click

## 7. History Buttons
- **Issue**: Vibrant colored buttons
- **Fix**: Replace with icon-only buttons with subtle hover states

## 8. Professional Gradient Background
- **Requirement**: Gradient and professional background
- **Implementation**: 
  - Use gradient from blue to purple/indigo
  - Add subtle backdrop blur
  - Professional glassmorphism effect

## 9. Active Input Detection
- **Requirement**: Check if cursor is in active input before transcribing
- **Implementation**:
  - Add IPC handler to check active input
  - Show notification if not in input field
  - Play notification sound
  - Don't start recording if not in input

## 10. Sound Feedback
- **Requirement**: Professional sounds for activate/close/pause
- **Implementation**:
  - Create audio files or use Web Audio API tones
  - Play sound on: start recording, stop recording, error, success
  - Subtle, professional tones

## 11. Paste UX Improvement
- **Issue**: Window closes and reopens (bad UX)
- **Fix**:
  - Keep window visible but blurred/transparent
  - Don't hide window completely
  - Show brief success indicator
  - Restore focus smoothly

## Files to Modify

1. `src/renderer/components/CompactBar.tsx` - Main bar component
2. `src/renderer/components/ExpandablePanel.tsx` - History/settings panel
3. `src/renderer/App.tsx` - Main app logic, auto-collapse
4. `src/main/index.ts` - IPC handlers for active input check, paste improvement
5. `src/preload/index.ts` - Add active input check API
6. `src/renderer/index.css` - Gradient styles, animations
7. `src/renderer/utils/sounds.ts` - Sound feedback utilities (new file)

## Implementation Order

1. Fix history panel (border-radius, gap, click issues)
2. Fix cursor styling
3. Add gradient background
4. Implement auto-collapse feature
5. Hide icons during recording with transitions
6. Change drag handle to vertical
7. Update history buttons to icons
8. Add active input detection
9. Improve paste UX
10. Add sound feedback
