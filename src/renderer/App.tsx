import React, { useEffect, useState, useCallback } from 'react';
import { useConfigStore } from './store/configStore';
import Setup from './pages/Setup';
import CompactBar from './components/CompactBar';
import ExpandablePanel from './components/ExpandablePanel';

type Page = 'home' | 'settings' | 'history';

function App() {
  // Always call hooks in the same order
  const { isFirstLaunch, loadConfig, config } = useConfigStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPanel, setExpandedPanel] = useState<'settings' | 'history' | null>(null);

  useEffect(() => {
    const init = async () => {
      await loadConfig();
      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Resize window for setup screen
  useEffect(() => {
    if (isFirstLaunch || !config.apiKey) {
      window.electronAPI.resizeWindow(400, 500);
    } else {
      window.electronAPI.resizeWindow(300, 48);
    }
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

  // Handle panel expansion/collapse - use useCallback to ensure consistent hook order
  const handleExpand = useCallback(() => {
    if (expandedPanel) {
      setExpandedPanel(null);
      window.electronAPI.resizeWindow(300, 48);
    }
  }, [expandedPanel]);

  const handlePanelToggle = useCallback((panel: 'settings' | 'history') => {
    if (expandedPanel === panel) {
      setExpandedPanel(null);
      window.electronAPI.resizeWindow(300, 48);
    } else {
      setExpandedPanel(panel);
      window.electronAPI.resizeWindow(300, 200);
    }
  }, [expandedPanel]);

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
    <div className="h-full flex flex-col bg-transparent">
      <CompactBar
        onNavigate={(page) => {
          if (page === 'settings') handlePanelToggle('settings');
          else if (page === 'history') handlePanelToggle('history');
        }}
        onExpand={handleExpand}
      />
      {expandedPanel && (
        <ExpandablePanel
          type={expandedPanel}
          onClose={() => {
            setExpandedPanel(null);
            window.electronAPI.resizeWindow(300, 48);
          }}
        />
      )}
    </div>
  );
}

export default App;
