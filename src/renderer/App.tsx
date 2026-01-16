import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useConfigStore } from './store/configStore';
import Setup from './pages/Setup';
import CompactBar from './components/CompactBar';
import ExpandablePanel from './components/ExpandablePanel';
import { useWindowAutoSize } from './hooks/useWindowAutoSize';

type Page = 'home' | 'settings' | 'history';

function App() {
  // Always call hooks in the same order
  const { isFirstLaunch, loadConfig, config } = useConfigStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPanel, setExpandedPanel] = useState<'settings' | 'history' | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const contentRef = useRef<HTMLDivElement>(null);

  const { forceResize, notifyDragStart, notifyDragEnd } = useWindowAutoSize(contentRef, {
    minWidth: 160,
    maxWidth: 420,
    minHeight: 44,
    maxHeight: 160,
    debounceMs: 100,
    changeThreshold: 6,
    enabled: !isCollapsed && !(isFirstLaunch || !config.apiKey),
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
    if (isFirstLaunch || !config.apiKey || expandedPanel) return;

    const checkCollapse = () => {
      const timeSinceInteraction = Date.now() - lastInteraction;
      if (timeSinceInteraction > 60000 && !isCollapsed) {
        // Collapse to chip (120px width, 10px height)
        setIsCollapsed(true);
        window.electronAPI.resizeWindow(120, 10);
      }
    };

    const interval = setInterval(checkCollapse, 1000);
    return () => clearInterval(interval);
  }, [lastInteraction, isCollapsed, isFirstLaunch, config.apiKey, expandedPanel]);

  // Track interactions
  useEffect(() => {
    const handleInteraction = () => {
      setLastInteraction(Date.now());
      if (isCollapsed) {
        setIsCollapsed(false);
        requestResize();
      }
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('click', handleInteraction);
    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [isCollapsed, requestResize]);

  useEffect(() => {
    if (!isCollapsed && config.apiKey && !isFirstLaunch) {
      requestResize();
    }
  }, [expandedPanel, isCollapsed, config.apiKey, isFirstLaunch, requestResize]);

  // Resize window for setup screen
  useEffect(() => {
    if (isFirstLaunch || !config.apiKey) {
      window.electronAPI.resizeWindow(400, 500);
    }
    // Note: CompactBar now handles its own dynamic sizing
  }, [isFirstLaunch, config.apiKey]);

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
  const handleCollapse = useCallback(() => {
    setExpandedPanel(null);
    setIsCollapsed(true);
    setLastInteraction(Date.now());
    window.electronAPI.resizeWindow(120, 10);
  }, []);

  const handlePanelToggle = useCallback((panel: 'settings' | 'history') => {
    setLastInteraction(Date.now());
    if (expandedPanel === panel) {
      setExpandedPanel(null);
      requestResize();
    } else {
      setIsCollapsed(false);
      setExpandedPanel(panel);
      requestResize();
    }
  }, [expandedPanel, requestResize]);

  const handleDragStart = useCallback(() => {
    window.electronAPI.setDragState(true);
    notifyDragStart();
  }, [notifyDragStart]);

  const handleDragEnd = useCallback(() => {
    notifyDragEnd();
    window.electronAPI.setDragState(false);
  }, [notifyDragEnd]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-transparent">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
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
            if (page === 'settings') handlePanelToggle('settings');
            else if (page === 'history') handlePanelToggle('history');
          }}
          onExpand={handleCollapse}
          isCollapsed={isCollapsed}
          onInteraction={() => setLastInteraction(Date.now())}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
        {expandedPanel && (
          <>
            {/* Overlay to allow clicking outside */}
            <div 
              className="absolute inset-0 pointer-events-auto -z-10"
              onClick={() => {
                setExpandedPanel(null);
                setLastInteraction(Date.now());
                if (isCollapsed) {
                  window.electronAPI.resizeWindow(120, 10);
                } else {
                  requestResize();
                }
              }}
            />
            <ExpandablePanel
              type={expandedPanel}
              onClose={() => {
                setExpandedPanel(null);
                setLastInteraction(Date.now());
                if (isCollapsed) {
                  window.electronAPI.resizeWindow(120, 10);
                } else {
                  requestResize();
                }
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
