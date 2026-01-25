import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useConfigStore } from './store/configStore';
import Setup from './pages/Setup';
import CompactBar from './components/CompactBar';
import { useWindowAutoSize } from './hooks/useWindowAutoSize';
import PanelWindow from './pages/PanelWindow';

// Glow padding: 12px on each side = 24px total added to width and height
const GLOW_PADDING = 12;
const CHIP_WIDTH = 160 + (GLOW_PADDING * 2);
const CHIP_HEIGHT = 44 + (GLOW_PADDING * 2);
const EXPANDED_BASE_WIDTH = 280 + (GLOW_PADDING * 2);
const EXPANDED_BASE_HEIGHT = 60 + (GLOW_PADDING * 2);

function App() {
  const { isFirstLaunch, loadConfig, config, status } = useConfigStore();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const view = searchParams.get('view');
  const viewMode = view === 'panel' ? 'panel' : view === 'setup' ? 'setup' : 'compact';
  const initialPanelTab = (searchParams.get('tab') as 'settings' | 'history') || 'settings';
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expansionPhase, setExpansionPhase] = useState<'collapsed' | 'morphing' | 'expanding' | 'expanded' | 'collapsing'>('expanded');
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [expandedDimensions, setExpandedDimensions] = useState({ width: EXPANDED_BASE_WIDTH, height: EXPANDED_BASE_HEIGHT });
  const [isChipHovering, setIsChipHovering] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const mouseUpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const expansionTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const expandedDimensionsRef = useRef(expandedDimensions);
  const isCollapsedRef = useRef(isCollapsed);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  const { forceResize, notifyDragStart, notifyDragEnd } = useWindowAutoSize(contentRef, {
    minWidth: EXPANDED_BASE_WIDTH,
    maxWidth: 480 + (GLOW_PADDING * 2),
    minHeight: EXPANDED_BASE_HEIGHT,
    maxHeight: 240 + (GLOW_PADDING * 2),
    debounceMs: 80,
    changeThreshold: 3,
    padding: GLOW_PADDING * 2,
    enabled: viewMode === 'compact' && !isCollapsed && !(isFirstLaunch || !config.apiKey),
  });

  // Keep refs in sync with state
  useEffect(() => {
    expandedDimensionsRef.current = expandedDimensions;
  }, [expandedDimensions]);

  useEffect(() => {
    isCollapsedRef.current = isCollapsed;
  }, [isCollapsed]);

  const requestResize = useCallback(() => {
    requestAnimationFrame(() => {
      forceResize();
    });
  }, [forceResize]);

  useEffect(() => {
    const init = async () => {
      await loadConfig();
      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Auto-collapse after 1 minute of inactivity
  useEffect(() => {
    if (viewMode !== 'compact' || isFirstLaunch || !config.apiKey) return;

    const checkCollapse = () => {
      const timeSinceInteraction = Date.now() - lastInteraction;
      // Only collapse when idle (not during recording or transcribing) and not already collapsing
      if (timeSinceInteraction > 60000 && !isCollapsed && status === 'idle' && expansionPhase === 'expanded') {
        // Start collapsing animation
        setExpansionPhase('collapsing');

        // After animation, switch to chip
        setTimeout(() => {
          setIsCollapsed(true);
          setExpansionPhase('collapsed');
          void window.electronAPI.resizeWindow(CHIP_WIDTH, CHIP_HEIGHT);
        }, 400);
      }
    };

    const interval = setInterval(checkCollapse, 1000);
    return () => clearInterval(interval);
  }, [config.apiKey, isCollapsed, isFirstLaunch, lastInteraction, viewMode, status, expansionPhase]);

  // Track interactions
  useEffect(() => {
    if (viewMode !== 'compact') return;

    const handleExpansion = () => {
      // Clear all pending expansion timeouts to prevent race conditions
      expansionTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      expansionTimeoutsRef.current = [];

      // Clear hover visual state
      setIsChipHovering(false);

      // Phase 1 (0ms): Start morphing - chip fades while window starts resizing
      setExpansionPhase('morphing');

      // Delay window resize slightly for smoother visual transition
      const resizeTimeout = setTimeout(() => {
        void window.electronAPI.resizeWindow(expandedDimensionsRef.current.width, expandedDimensionsRef.current.height);
      }, 100);
      expansionTimeoutsRef.current.push(resizeTimeout);

      // Phase 2 (500ms): Switch to compact bar content - overlap with morph fade
      const timeout1 = setTimeout(() => {
        setIsCollapsed(false);
        setExpansionPhase('expanding');
      }, 500);
      expansionTimeoutsRef.current.push(timeout1);

      // Phase 3 (1100ms): Enable icon animations after bar fully appears
      const timeout2 = setTimeout(() => {
        setExpansionPhase('expanded');
        requestResize();
      }, 1100);
      expansionTimeoutsRef.current.push(timeout2);

      hoverTimeoutRef.current = null;
    };

    const handleInteraction = () => {
      setLastInteraction(Date.now());
      if (isCollapsedRef.current) {
        // Start hover timer if not already started
        if (!hoverTimeoutRef.current) {
          setIsChipHovering(true);
          hoverTimeoutRef.current = setTimeout(handleExpansion, 1000); // 1 second delay
        }
      }
    };

    const handleClick = () => {
      setLastInteraction(Date.now());

      // Only process clicks on the collapsed chip
      if (!isCollapsedRef.current) return;

      // If user was dragging, don't treat this as a click
      if (isDragging.current) {
        return;
      }

      // Pure click detected - expand immediately
      // Cancel any pending hover timer and expand immediately on click
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsChipHovering(false);
      handleExpansion();
    };

    const handleDoubleClick = () => {
      setLastInteraction(Date.now());
      if (isCollapsedRef.current) {
        // Double-click always expands, regardless of drag state
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setIsChipHovering(false);
        handleExpansion();
      }
    };

    const handleMouseLeave = () => {
      // Clear hover visual state
      setIsChipHovering(false);
      // Cancel hover timer if user moves mouse away
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Only track on collapsed chip
      if (!isCollapsedRef.current) return;

      // Track starting position using screenX/screenY for consistency
      // Screen coordinates are needed for window movement across different monitors
      dragStartPos.current = { x: e.screenX, y: e.screenY };
      lastMousePos.current = { x: e.screenX, y: e.screenY };
      isDragging.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Only process if we have a starting position (mousedown on collapsed chip)
      if (!dragStartPos.current || !isCollapsedRef.current) return;

      // Calculate total movement from initial mousedown position using screen coordinates
      const totalDeltaX = Math.abs(e.screenX - dragStartPos.current.x);
      const totalDeltaY = Math.abs(e.screenY - dragStartPos.current.y);

      // Threshold check: 5px movement = drag, less = potential click
      if (totalDeltaX > 5 || totalDeltaY > 5) {
        // Mark as dragging (this prevents click from firing)
        if (!isDragging.current) {
          isDragging.current = true;

          // Cancel hover timer immediately when drag is detected
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          setIsChipHovering(false);
        }

        // Calculate incremental movement delta for window positioning
        if (lastMousePos.current) {
          const moveDeltaX = e.screenX - lastMousePos.current.x;
          const moveDeltaY = e.screenY - lastMousePos.current.y;
          if (moveDeltaX !== 0 || moveDeltaY !== 0) {
            void window.electronAPI.moveWindow(moveDeltaX, moveDeltaY);
          }
        }
        lastMousePos.current = { x: e.screenX, y: e.screenY };
      } else {
        // Still within click threshold, treat as potential click with hover effect
        if (!isDragging.current) {
          handleInteraction();
        }
      }
    };

    const handleMouseUp = () => {
      // If we were dragging, cancel any pending hover timer
      if (isDragging.current && hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
        setIsChipHovering(false);
      }

      // Reset drag state immediately - no delay needed
      // The click handler will check isDragging.current synchronously
      dragStartPos.current = null;
      lastMousePos.current = null;

      // Keep isDragging.current true until after click event fires
      // This is handled by the mouseUpTimeout below
      if (isDragging.current) {
        // Reset after a microtask to let the click handler see the drag state
        if (mouseUpTimeoutRef.current) {
          clearTimeout(mouseUpTimeoutRef.current);
        }
        mouseUpTimeoutRef.current = setTimeout(() => {
          isDragging.current = false;
          mouseUpTimeoutRef.current = null;
        }, 10); // Reduced from 50ms to 10ms - just enough for click event
      } else {
        // Not dragging, can reset immediately
        isDragging.current = false;
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('click', handleClick);
    window.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('mouseleave', handleMouseLeave);

      // Clean up hover timeout on unmount
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // Clean up mouseUp timeout on unmount
      if (mouseUpTimeoutRef.current) {
        clearTimeout(mouseUpTimeoutRef.current);
        mouseUpTimeoutRef.current = null;
      }

      // Clean up all expansion timeouts on unmount
      expansionTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      expansionTimeoutsRef.current = [];

      // Reset drag state and notify if currently dragging
      if (isDragging.current) {
        isDragging.current = false;
        notifyDragEnd();
      }
    };
  }, [requestResize, viewMode, notifyDragEnd]); // Removed isCollapsed - using ref instead

  useEffect(() => {
    if (viewMode !== 'compact') return;
    // Only trigger resize when fully expanded - don't save dimensions here
    // Dimensions are saved only during collapse to prevent progressive shrinking
    if (!isCollapsed && expansionPhase === 'expanded' && config.apiKey && !isFirstLaunch) {
      requestResize();
    }
  }, [config.apiKey, isCollapsed, expansionPhase, isFirstLaunch, requestResize, viewMode]);

  // Resize window for setup screen
  useEffect(() => {
    if (viewMode !== 'compact') return;
    if (isFirstLaunch || !config.apiKey) {
      window.electronAPI.resizeWindow(400 + (GLOW_PADDING * 2), 500 + (GLOW_PADDING * 2));
    }
  }, [config.apiKey, isFirstLaunch, viewMode]);

  // Listen for hotkey trigger
  useEffect(() => {
    if (!config.apiKey) return;

    const unsubscribe = window.electronAPI.onHotkeyTriggered(() => {
      // Use ref to avoid stale closure - check current collapsed state
      if (isCollapsedRef.current) {
        // Clear all pending expansion timeouts to prevent race conditions
        expansionTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        expansionTimeoutsRef.current = [];

        // Clear any pending hover timer
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setIsChipHovering(false);

        // Validate dimensions before resizing
        if (expandedDimensionsRef.current.width > 0 && expandedDimensionsRef.current.height > 0) {
          // Phase 1: Start morphing - chip fades while window starts resizing
          setExpansionPhase('morphing');

          // Delay window resize slightly for smoother visual transition
          setTimeout(() => {
            void window.electronAPI.resizeWindow(expandedDimensionsRef.current.width, expandedDimensionsRef.current.height);
          }, 100);

          // Phase 2: Switch to compact bar content
          const timeout1 = setTimeout(() => {
            setIsCollapsed(false);
            setExpansionPhase('expanding');

            // Phase 3: Dispatch hotkey event to start recording after bar appears
            const timeout2 = setTimeout(() => {
              setExpansionPhase('expanded');
              requestResize();
              // Trigger recording after expansion is complete
              window.dispatchEvent(new CustomEvent('hotkey-triggered'));
            }, 600); // Wait for bar appearance animation
            expansionTimeoutsRef.current.push(timeout2);
          }, 500); // Wait for morphing phase
          expansionTimeoutsRef.current.push(timeout1);
        }
      } else {
        // Already expanded, trigger recording immediately
        window.dispatchEvent(new CustomEvent('hotkey-triggered'));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [config.apiKey, requestResize]); // Removed isCollapsed - using ref instead

  // Handle direct collapse (from minimize button)
  const handleCollapse = useCallback(async () => {
    // Check if recording is active and stop it first
    if (stopRecordingRef.current && status === 'recording') {
      console.log('[App] Stopping recording before collapse');
      await stopRecordingRef.current();
      // Wait a bit for transcription to start before collapsing
      // This ensures the audio is properly processed
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Clear any pending hover-to-expand timer to prevent unexpected expansion
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsChipHovering(false);

    // Save current window dimensions before collapsing
    try {
      const bounds = await window.electronAPI.getWindowBounds();
      if (bounds && bounds.width > CHIP_WIDTH && bounds.height > CHIP_HEIGHT) {
        setExpandedDimensions({ width: bounds.width, height: bounds.height });
      }
    } catch (error) {
      console.warn('Failed to get window bounds before collapse:', error);
    }

    // Phase 1: Start collapsing animation on the bar
    setExpansionPhase('collapsing');

    // Phase 2: After animation, switch to chip and resize window
    setTimeout(() => {
      setIsCollapsed(true);
      setExpansionPhase('collapsed');
      void window.electronAPI.resizeWindow(CHIP_WIDTH, CHIP_HEIGHT);
    }, 400);

    setLastInteraction(Date.now());
  }, [status]);

  const handleOpenPanel = useCallback((panel: 'settings' | 'history') => {
    setLastInteraction(Date.now());
    setIsCollapsed(false);
    setTimeout(() => requestResize(), 0);
    void window.electronAPI.openPanelWindow(panel);
  }, [requestResize]);

  const handleDragStart = useCallback(() => {
    window.electronAPI.setDragState(true);
    notifyDragStart();
  }, [notifyDragStart]);

  const handleDragEnd = useCallback(() => {
    notifyDragEnd();
    window.electronAPI.setDragState(false);
  }, [notifyDragEnd]);

  const handleSetStopRecordingRef = useCallback((handler: (() => Promise<void>) | null) => {
    stopRecordingRef.current = handler;
  }, []);

  const renderLoader = () => (
    <div className="flex items-center justify-center h-full bg-transparent">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    </div>
  );

  if (viewMode === 'panel') {
    if (isLoading) return renderLoader();
    return <PanelWindow initialTab={initialPanelTab} />;
  }

  if (viewMode === 'setup') {
    if (isLoading) return renderLoader();
    return <Setup />;
  }

  if (isLoading) {
    return renderLoader();
  }

  return (
    <div className="app-shell">
      <div
        ref={contentRef}
        className={`app-root flex flex-col bg-transparent relative transition-all duration-400 overflow-visible ${isCollapsed ? 'chip-state' : ''}`}
      >
        <CompactBar
          onNavigate={(page) => {
            if (page === 'settings' || page === 'history') {
              handleOpenPanel(page);
            }
          }}
          onExpand={handleCollapse}
          isCollapsed={isCollapsed}
          expansionPhase={expansionPhase}
          onInteraction={() => setLastInteraction(Date.now())}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          isHovering={isChipHovering}
          onSetStopRecordingRef={handleSetStopRecordingRef}
        />
      </div>
    </div>
  );
}

export default App;
