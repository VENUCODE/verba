import React, { useEffect, useMemo, useState } from 'react';
import { useConfigStore, HISTORY_STORAGE_KEY } from '../store/configStore';
import { HOTKEY_OPTIONS, MODEL_OPTIONS, DURATION_OPTIONS } from '../constants';
import { WhisperModel } from '../../shared/types';

interface PanelWindowProps {
  initialTab: 'settings' | 'history';
}

const PanelWindow: React.FC<PanelWindowProps> = ({ initialTab }) => {
  const { config, saveConfig, history, clearHistory, exportHistory, loadConfig, hydrateHistory } = useConfigStore();
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>(initialTab);
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    loadConfig();
    hydrateHistory();
  }, [hydrateHistory, loadConfig]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === HISTORY_STORAGE_KEY) {
        hydrateHistory();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [hydrateHistory]);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onPanelTabChange((tab) => {
      setActiveTab(tab);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'settings') return;
    const fetchDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };
    fetchDevices();
  }, [activeTab]);

  const handleChange = <K extends keyof typeof localConfig>(key: K, value: typeof localConfig[K]) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveConfig(localConfig);
      setTimeout(() => {
        setIsSaving(false);
      }, 250);
    } catch (error) {
      console.error('Failed to save config:', error);
      setIsSaving(false);
    }
  };

  const renderSettings = () => (
    <div className="space-y-5 pr-1">
      <section className="bg-white/5 border border-white/15 rounded-2xl p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70 mb-3">API & Model</h3>
        <label className="block text-xs text-white/60 mb-1">API Key</label>
        <input
          type="text"
          value={localConfig.apiKey}
          onChange={(e) => handleChange('apiKey', e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          placeholder="sk-..."
        />
        <label className="block text-xs text-white/60 mt-3 mb-1">Model</label>
        <select
          value={localConfig.model}
          onChange={(e) => handleChange('model', e.target.value as WhisperModel)}
          className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg"
        >
          {MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <section className="bg-white/5 border border-white/15 rounded-2xl p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70 mb-3">Recording</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs text-white/60 mb-1">Max Duration</label>
            <select
              value={localConfig.maxDuration}
              onChange={(e) => handleChange('maxDuration', parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg"
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
              className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg"
            >
              <option value="">System Default</option>
              {audioDevices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white/5 border border-white/15 rounded-2xl p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70 mb-3">Hotkey</h3>
        <select
          value={localConfig.hotkey}
          onChange={(e) => handleChange('hotkey', e.target.value)}
          className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg"
        >
          {HOTKEY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-white/50 mt-2">Use this shortcut anywhere to toggle recording instantly.</p>
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => window.electronAPI.closePanelWindow()}
          className="px-3 py-2 rounded-lg border border-white/20 text-sm text-white/80 hover:bg-white/10 transition-colors"
        >
          Close
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg bg-sky-500 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
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
            className="px-3 py-1.5 rounded-lg border border-white/20 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
          >
            Export
          </button>
          <button
            onClick={clearHistory}
            disabled={history.length === 0}
            className="px-3 py-1.5 rounded-lg border border-red-400/40 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>
      {history.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
          No transcriptions yet.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {history.map((item) => (
            <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                <span>{new Date(item.timestamp).toLocaleString()}</span>
                <span>{item.model}</span>
              </div>
              <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{item.text}</p>
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(item.text)}
                  className="text-xs text-sky-300 hover:text-sky-100"
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

  return (
    <div className="w-full h-full bg-[#040713] text-white flex flex-col">
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl">
        <div>
          <p className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-fuchsia-400 to-violet-500">
            Voxify Console
          </p>
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Control Center</p>
        </div>
        <button
          onClick={() => window.electronAPI.closePanelWindow()}
          className="p-2 rounded-full hover:bg-white/10 transition border border-white/10"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      <div className="flex gap-3 px-6 pt-4 border-b border-white/10">
        {(['settings', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white text-[#040713] shadow-lg shadow-white/20'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab === 'settings' ? 'Settings' : 'History'}
          </button>
        ))}
      </div>

      <main className="flex-1 px-6 py-5 overflow-hidden">
        {activeTab === 'settings' ? renderSettings() : renderHistory()}
      </main>
    </div>
  );
};

export default PanelWindow;
