import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useConfigStore } from './store/configStore';
import Setup from './pages/Setup';
import CompactBar from './components/CompactBar';
import { useWindowAutoSize } from './hooks/useWindowAutoSize';
import PanelWindow from './pages/PanelWindow';

const CHIP_WIDTH = 160;
const CHIP_HEIGHT = 44;
const EXPANDED_BASE_WIDTH = 216;
const EXPANDED_BASE_HEIGHT = 56;

function App() {
  const { isFirstLaunch, loadConfig, config } = useConfigStore();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const viewMode = searchParams.get('view') === 'panel' ? 'panel' : 'compact';
  const initialPanelTab = (searchParams.get('tab') as 'settings' | 'history') || 'settings';
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expansionPhase, setExpansionPhase] = useState<'collapsed' | 'expanding' | 'expanded'>('expanded');
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [expandedDimensions, setExpandedDimensions] = useState({ width: EXPANDED_BASE_WIDTH, height: EXPANDED_BASE_HEIGHT });
  const contentRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { forceResize, notifyDragStart, notifyDragEnd } = useWindowAutoSize(contentRef, {
    minWidth: EXPANDED_BASE_WIDTH,
    maxWidth: 420,
    minHeight: EXPANDED_BASE_HEIGHT,
    maxHeight: 220,
    debounceMs: 80,
    changeThreshold: 3,
    padding: 0,
    enabled: viewMode === 'compact' && !isCollapsed && !(isFirstLaunch || !config.apiKey),
  });

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
      if (timeSinceInteraction > 60000 && !isCollapsed) {
        setIsCollapsed(true);
        void window.electronAPI.resizeWindow(CHIP_WIDTH, CHIP_HEIGHT);
      }
    };

    const interval = setInterval(checkCollapse, 1000);
    return () => clearInterval(interval);
  }, [config.apiKey, isCollapsed, isFirstLaunch, lastInteraction, viewMode]);

  // Track interactions
  useEffect(() => {
    if (viewMode !== 'compact') return;

    const handleExpansion = () => {
      // Phase 1 (0ms): Set expansion phase and resize window to stored dimensions
      setExpansionPhase('expanding');
      void window.electronAPI.resizeWindow(expandedDimensions.width, expandedDimensions.height);

      // Phase 2 (100ms): Trigger content expansion
      setTimeout(() => {
        setIsCollapsed(false);
      }, 100);

      // Phase 3 (300ms): Enable icon animations and resize to content
      setTimeout(() => {
        setExpansionPhase('expanded');
        requestResize();
      }, 300);

      hoverTimeoutRef.current = null;
    };

    const handleInteraction = () => {
      setLastInteraction(Date.now());
      if (isCollapsed) {
        // Start hover timer if not already started
        if (!hoverTimeoutRef.current) {
          hoverTimeoutRef.current = setTimeout(handleExpansion, 1000); // 1 second delay
        }
      }
    };

    const handleClick = () => {
      setLastInteraction(Date.now());
      if (isCollapsed) {
        // Cancel any pending hover timer and expand immediately on click
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        handleExpansion();
      }
    };

    const handleMouseLeave = () => {
      // Cancel hover timer if user moves mouse away
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('click', handleClick);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('mouseleave', handleMouseLeave);
      // Clean up timeout on unmount
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, [isCollapsed, requestResize, viewMode, expandedDimensions]);

  useEffect(() => {
    if (viewMode !== 'compact') return;
    if (!isCollapsed && config.apiKey && !isFirstLaunch) {
      // Save dimensions after resize completes
      const saveCurrentDimensions = async () => {
        try {
          const bounds = await window.electronAPI.getWindowBounds();
          if (bounds && bounds.width > CHIP_WIDTH && bounds.height > CHIP_HEIGHT) {
            setExpandedDimensions({ width: bounds.width, height: bounds.height });
          }
        } catch (error) {
          console.warn('Failed to save window dimensions:', error);
        }
      };

      requestResize();
      setTimeout(saveCurrentDimensions, 200);
    }
  }, [config.apiKey, isCollapsed, isFirstLaunch, requestResize, viewMode]);

  // Resize window for setup screen
  useEffect(() => {
    if (viewMode !== 'compact') return;
    if (isFirstLaunch || !config.apiKey) {
      window.electronAPI.resizeWindow(400, 500);
    }
  }, [config.apiKey, isFirstLaunch, viewMode]);

  // Listen for hotkey trigger
  useEffect(() => {
    if (!config.apiKey) return;

    const unsubscribe = window.electronAPI.onHotkeyTriggered(() => {
      window.dispatchEvent(new CustomEvent('hotkey-triggered'));
    });

    return () => {
      unsubscribe();
    };
  }, [config.apiKey]);

  // Handle direct collapse (from minimize button)
  const handleCollapse = useCallback(async () => {
    // Save current window dimensions before collapsing
    try {
      const bounds = await window.electronAPI.getWindowBounds();
      if (bounds && bounds.width > CHIP_WIDTH && bounds.height > CHIP_HEIGHT) {
        setExpandedDimensions({ width: bounds.width, height: bounds.height });
      }
    } catch (error) {
      console.warn('Failed to get window bounds before collapse:', error);
    }

    setIsCollapsed(true);
    setExpansionPhase('collapsed');
    setLastInteraction(Date.now());
    void window.electronAPI.resizeWindow(CHIP_WIDTH, CHIP_HEIGHT);
  }, []);

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

  const renderLoader = () => (
    <div className="flex items-center justify-center h-full bg-transparent">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    </div>
  );

  if (viewMode === 'panel') {
    if (isLoading) return renderLoader();
    return <PanelWindow initialTab={initialPanelTab} />;
  }

  if (isLoading) {
    return renderLoader();
  }

  // Show setup screen if first launch or no API key
  if (isFirstLaunch || !config.apiKey) {
    return <Setup />;
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
        />
      </div>
    </div>
  );
}

export default App;
