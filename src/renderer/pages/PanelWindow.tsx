import React, { useEffect, useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { HOTKEY_OPTIONS, MODEL_OPTIONS, DURATION_OPTIONS } from '../constants';
import { WhisperModel } from '../../shared/types';

interface PanelWindowProps {
  initialTab: 'settings' | 'history';
}

const PanelWindow: React.FC<PanelWindowProps> = ({ initialTab }) => {
  const { config, saveConfig, history, clearHistory, exportHistory } = useConfigStore();
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>(initialTab);
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const fieldStyles: React.CSSProperties = { colorScheme: 'dark' };
  const baseFieldClasses =
    'dark-field w-full px-3 py-2 text-sm text-white placeholder-white/60 bg-white/10 border border-white/15 rounded appearance-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400';
  const selectFieldClasses = `${baseFieldClasses} pr-8`;

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    if (activeTab !== 'settings') return;
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };
    loadDevices();
  }, [activeTab]);

  useEffect(() => {
    const unsubscribe = window.electronAPI?.onPanelTabChange?.((tab) => {
      setActiveTab(tab);
    });

    if (!unsubscribe) {
      const syncFromSearch = () => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'settings' || tabParam === 'history') {
          setActiveTab(tabParam);
        }
      };
      window.addEventListener('popstate', syncFromSearch);
      syncFromSearch();
      return () => {
        window.removeEventListener('popstate', syncFromSearch);
      };
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveConfig(localConfig);
      setTimeout(() => {
        setIsSaving(false);
      }, 400);
    } catch (error) {
      console.error('Failed to save config:', error);
      setIsSaving(false);
    }
  };

  const handleChange = <K extends keyof typeof localConfig>(key: K, value: typeof localConfig[K]) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const renderSettings = () => (
    <div className="flex flex-col gap-4 overflow-y-auto pr-1">
      <section className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 text-white font-poppins">API & Model</h3>
        <label className="block text-xs text-white/60 mb-1">API Key</label>
        <input
          type="text"
          value={localConfig.apiKey}
          onChange={(e) => handleChange('apiKey', e.target.value)}
          className={baseFieldClasses}
          style={fieldStyles}
          placeholder="sk-..."
        />

        <label className="block text-xs text-white/60 mt-3 mb-1">Model</label>
        <select
          value={localConfig.model}
          onChange={(e) => handleChange('model', e.target.value as WhisperModel)}
          className={selectFieldClasses}
          style={fieldStyles}
        >
          {MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <section className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 text-white font-poppins">Recording</h3>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs text-white/60 mb-1">Max Duration</label>
            <select
              value={localConfig.maxDuration}
              onChange={(e) => handleChange('maxDuration', parseInt(e.target.value, 10))}
              className={selectFieldClasses}
              style={fieldStyles}
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Input Device</label>
            <select
              value={localConfig.selectedInputDevice || ''}
              onChange={(e) => handleChange('selectedInputDevice', e.target.value || null)}
              className={selectFieldClasses}
              style={fieldStyles}
            >
              <option value="">System Default</option>
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 text-white font-poppins">Hotkey</h3>
        <select
          value={localConfig.hotkey}
          onChange={(e) => handleChange('hotkey', e.target.value)}
          className={selectFieldClasses}
          style={fieldStyles}
        >
          {HOTKEY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-white/50 mt-2">Use this shortcut anywhere to start recording instantly.</p>
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={handleClose}
          className="px-3 py-2 rounded-lg border border-white/20 text-sm text-white/80 hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg bg-blue-500 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="flex flex-col h-full">
        <div className="flex items-center justify-between pb-4">
          <div className="text-sm text-white/70">{history.length} transcriptions</div>
          <div className="flex gap-2">
            <button
              onClick={() => exportHistory('txt')}
              disabled={history.length === 0}
              className="p-2 rounded-full border border-white/20 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Export history (.txt)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l4-4m-4 4l-4-4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12a7 7 0 0114 0" />
              </svg>
            </button>
            <button
              onClick={clearHistory}
              disabled={history.length === 0}
              className="p-2 rounded-full border border-red-400/40 text-red-200 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Clear history"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      {history.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
          No transcriptions yet. Start recording to build history.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {history.map((item) => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                <span>{new Date(item.timestamp).toLocaleString()}</span>
                <span>{item.model}</span>
              </div>
              <p className="text-sm text-white/90 whitespace-pre-wrap">{item.text}</p>
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(item.text)}
                  className="text-xs text-blue-300 hover:text-blue-200"
                >
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const updateBrowserTabParam = (tab: 'settings' | 'history') => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
  };

  useEffect(() => {
    if (!window.electronAPI?.onPanelTabChange) {
      updateBrowserTabParam(activeTab);
    }
  }, [activeTab]);

  function handleClose() {
    if (window.electronAPI?.closePanelWindow) {
      window.electronAPI.closePanelWindow();
      return;
    }

    // Browser fallback: return to compact view
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.delete('tab');
    window.location.href = `${url.pathname}?${url.searchParams.toString()}`;
  }

  return (
    <div className="w-full h-full bg-[#05070d] text-white flex flex-col select-none">
      <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide font-poppins">Verba</p>
          <p className="text-xs text-white/50">Settings & History</p>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          title="Close"
        >
          <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex gap-2 px-4 pt-3 border-b border-white/10">
        {(['settings', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === tab ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {tab === 'settings' ? 'Settings' : 'History'}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 py-4 overflow-y-auto min-h-0">
        {activeTab === 'settings' ? renderSettings() : renderHistory()}
      </main>
    </div>
  );
};

export default PanelWindow;
