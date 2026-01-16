import React, { useEffect, useState } from 'react';
import { useConfigStore } from './store/configStore';
import Setup from './pages/Setup';
import Home from './pages/Home';
import Settings from './pages/Settings';
import TranscriptionHistory from './components/TranscriptionHistory';

type Page = 'home' | 'settings' | 'history';

function App() {
  const { isFirstLaunch, loadConfig, config, history, clearHistory, exportHistory } = useConfigStore();
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('home');

  useEffect(() => {
    const init = async () => {
      await loadConfig();
      setIsLoading(false);
    };
    init();
  }, [loadConfig]);

  // Listen for hotkey trigger
  useEffect(() => {
    if (!config.apiKey) return;

    const unsubscribe = window.electronAPI.onHotkeyTriggered(() => {
      // Handled by Home component
      window.dispatchEvent(new CustomEvent('hotkey-triggered'));
    });

    return () => {
      unsubscribe();
    };
  }, [config.apiKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Show setup screen if first launch or no API key
  if (isFirstLaunch || !config.apiKey) {
    return <Setup />;
  }

  return (
    <div className="h-screen flex flex-col bg-surface-50">
      {currentPage === 'home' && <Home onNavigate={setCurrentPage} />}
      {currentPage === 'settings' && <Settings onNavigate={setCurrentPage} />}
      {currentPage === 'history' && (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-200 bg-white">
            <button
              onClick={() => setCurrentPage('home')}
              className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          <TranscriptionHistory
            history={history}
            onClear={clearHistory}
            onExport={exportHistory}
          />
        </div>
      )}
    </div>
  );
}

export default App;
