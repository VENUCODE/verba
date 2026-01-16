import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useConfigStore } from './store/configStore';
import Setup from './pages/Setup';
import CompactBar from './components/CompactBar';
import { useWindowAutoSize } from './hooks/useWindowAutoSize';
import PanelWindow from './pages/PanelWindow';

type Page = 'home' | 'settings' | 'history';

function App() {
  // Always call hooks in the same order
  const { isFirstLaunch, loadConfig, config } = useConfigStore();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const viewMode = searchParams.get('view') === 'panel' ? 'panel' : 'compact';
  const initialPanelTab = (searchParams.get('tab') as 'settings' | 'history') || 'settings';
  
  const [isLoading, setIsLoading] = useState(true);
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
    enabled: viewMode === 'compact' && !isCollapsed && !(isFirstLaunch || !config.apiKey),
  });

  const requestResize = useCallback(() => {
    requestAnimationFrame(() => {
      forceResize();
    });
  }, [forceResize]);

  const resizeToContent = useCallback(() => {
    if (!contentRef.current) return;
    const width = Math.round(contentRef.current.offsetWidth);
    const height = Math.round(contentRef.current.offsetHeight);
    if (width && height) {
      window.electronAPI.resizeWindow(width, height);
    }
  }, []);

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
        // Collapse to chip (120px width, 10px height)
        setIsCollapsed(true);
        window.electronAPI.resizeWindow(120, 10);
      }
    };

    const interval = setInterval(checkCollapse, 1000);
    return () => clearInterval(interval);
  }, [config.apiKey, isCollapsed, isFirstLaunch, lastInteraction, viewMode]);

  // Track interactions
  useEffect(() => {
    if (viewMode !== 'compact') return;
    const handleInteraction = () => {
      setLastInteraction(Date.now());
      if (isCollapsed) {
        setIsCollapsed(false);
        requestAnimationFrame(() => {
          resizeToContent();
        });
      }
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('click', handleInteraction);
    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [isCollapsed, resizeToContent, viewMode]);

  useEffect(() => {
    if (viewMode !== 'compact') return;
    if (!isCollapsed && config.apiKey && !isFirstLaunch) {
      requestResize();
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
  const handleCollapse = useCallback(() => {
    setIsCollapsed(true);
    setLastInteraction(Date.now());
    window.electronAPI.resizeWindow(120, 10);
  }, []);

  const handleOpenPanel = useCallback((panel: 'settings' | 'history') => {
    setLastInteraction(Date.now());
    setIsCollapsed(false);
    resizeToContent();
    window.electronAPI.openPanelWindow(panel);
  }, [resizeToContent]);

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
          onInteraction={() => setLastInteraction(Date.now())}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      </div>
    </div>
  );
}

export default App;
