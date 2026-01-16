import React, { useState, useEffect } from 'react';
import { useConfigStore } from '../store/configStore';
import { HOTKEY_OPTIONS, MODEL_OPTIONS, DURATION_OPTIONS } from '../constants';
import { WhisperModel } from '../../shared/types';

interface ExpandablePanelProps {
  type: 'settings' | 'history';
  onClose: () => void;
}

function ExpandablePanel({ type, onClose }: ExpandablePanelProps) {
  const { config, history, clearHistory, exportHistory, saveConfig } = useConfigStore();
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (type === 'settings') {
      const loadDevices = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(d => d.kind === 'audioinput');
          setAudioDevices(audioInputs);
        } catch (error) {
          console.error('Failed to enumerate devices:', error);
        }
      };
      loadDevices();
    }
  }, [type]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveConfig(localConfig);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (error: any) {
      console.error('Failed to save:', error);
      setIsSaving(false);
    }
  };

  const handleChange = <K extends keyof typeof localConfig>(
    key: K,
    value: typeof localConfig[K]
  ) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  if (type === 'history') {
    return (
      <div className="flex flex-col h-full bg-white border-t border-gray-200">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">History</h3>
          <div className="flex gap-1">
            <button
              onClick={() => exportHistory('txt')}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              disabled={history.length === 0}
            >
              Export
            </button>
            <button
              onClick={clearHistory}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              disabled={history.length === 0}
            >
              Clear
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2" style={{ maxHeight: '148px' }}>
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
              No transcriptions yet
            </div>
          ) : (
            <div className="space-y-1">
              {history.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 border border-gray-200 rounded p-2 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-1">
                        {new Date(item.timestamp).toLocaleTimeString()} • {item.model}
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">
                        {item.text}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.text);
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                      title="Copy"
                    >
                      <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Settings panel
  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-200 overflow-y-auto" style={{ maxHeight: '148px' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h3 className="text-sm font-semibold text-gray-800">Settings</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3 py-2 space-y-3">
        {/* API Key */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">API Key</label>
          <input
            type="password"
            value={localConfig.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="sk-..."
          />
        </div>

        {/* Model */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Model</label>
          <select
            value={localConfig.model}
            onChange={(e) => handleChange('model', e.target.value as WhisperModel)}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Hotkey */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Hotkey</label>
          <select
            value={localConfig.hotkey}
            onChange={(e) => handleChange('hotkey', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {HOTKEY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Max Duration */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Max Duration</label>
          <select
            value={localConfig.maxDuration}
            onChange={(e) => handleChange('maxDuration', parseInt(e.target.value))}
            className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-1.5 px-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-medium rounded transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default ExpandablePanel;
