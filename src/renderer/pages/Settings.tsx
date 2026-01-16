import React, { useState, useEffect } from 'react';
import { useConfigStore } from '../store/configStore';
import { HOTKEY_OPTIONS, MODEL_OPTIONS, DURATION_OPTIONS, RESPONSE_FORMAT_OPTIONS } from '../constants';
import { WhisperModel, ResponseFormat } from '../../shared/types';
import ModelSelector from '../components/ModelSelector';

interface SettingsProps {
  onNavigate: (page: 'home' | 'settings' | 'history') => void;
}

function Settings({ onNavigate }: SettingsProps) {
  const { config, saveConfig } = useConfigStore();
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    // Load audio devices
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
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      await saveConfig(localConfig);
      setSaveMessage('Settings saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      setSaveMessage(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = <K extends keyof typeof localConfig>(
    key: K,
    value: typeof localConfig[K]
  ) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-50">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-200 bg-white">
        <button
          onClick={() => onNavigate('home')}
          className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-surface-800">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* API Configuration */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-800 mb-4">API Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-600 mb-2">OpenAI API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={localConfig.apiKey}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-surface-50 rounded-r-lg transition-colors z-10 cursor-pointer"
                  title={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? (
                    <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <ModelSelector
              value={localConfig.model}
              onChange={(model) => handleChange('model', model)}
              showDetails={true}
            />
          </div>
        </section>

        {/* Advanced Transcription Settings */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-800 mb-4">Advanced Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-600 mb-2">Response Format</label>
              <select
                value={localConfig.responseFormat || 'text'}
                onChange={(e) => handleChange('responseFormat', e.target.value as ResponseFormat)}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
              >
                {RESPONSE_FORMAT_OPTIONS.map((option) => {
                  const isWhisperOnly = option.value === 'verbose_json' || option.value === 'srt' || option.value === 'vtt';
                  const disabled = isWhisperOnly && localConfig.model !== 'whisper-1';
                  return (
                    <option key={option.value} value={option.value} disabled={disabled}>
                      {option.label} {disabled ? '(whisper-1 only)' : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-surface-400 mt-1">
                {RESPONSE_FORMAT_OPTIONS.find((o) => o.value === (localConfig.responseFormat || 'text'))?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm text-surface-600 mb-2">
                Language (optional)
              </label>
              <input
                type="text"
                value={localConfig.language || ''}
                onChange={(e) => handleChange('language', e.target.value || undefined)}
                placeholder="e.g., en, es, fr (leave empty for auto-detect)"
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-surface-400 mt-1">
                ISO-639-1 language code. Leave empty for automatic detection.
              </p>
            </div>

            <div>
              <label className="block text-sm text-surface-600 mb-2">
                Temperature: {localConfig.temperature ?? 0}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={localConfig.temperature ?? 0}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-surface-400 mt-1">
                Higher values make output more random. 0 = most deterministic.
              </p>
            </div>
          </div>
        </section>

        {/* Recording Settings */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-800 mb-4">Recording Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-surface-600 mb-2">Maximum Duration</label>
              <select
                value={localConfig.maxDuration}
                onChange={(e) => handleChange('maxDuration', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-surface-600 mb-2">Input Device</label>
              <select
                value={localConfig.selectedInputDevice || ''}
                onChange={(e) => handleChange('selectedInputDevice', e.target.value || null)}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
              >
                <option value="">Default</option>
                {audioDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Keyboard Shortcut */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-800 mb-4">Keyboard Shortcut</h2>

          <div>
            <label className="block text-sm text-surface-600 mb-2">Recording Hotkey</label>
            <select
              value={localConfig.hotkey}
              onChange={(e) => handleChange('hotkey', e.target.value)}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
            >
              {HOTKEY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Behavior */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-800 mb-4">Behavior</h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.launchAtStartup}
                onChange={(e) => handleChange('launchAtStartup', e.target.checked)}
                className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-surface-700">Launch at system startup</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.startMinimized}
                onChange={(e) => handleChange('startMinimized', e.target.checked)}
                className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-surface-700">Start minimized to tray</span>
            </label>
          </div>
        </section>

        {/* About */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-surface-800 mb-4">About</h2>
          <p className="text-sm text-surface-500">Voice Transcriber v1.0.0</p>
          <p className="text-xs text-surface-400 mt-1">
            Uses OpenAI Whisper API for transcription
          </p>
        </section>
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-surface-200 bg-white">
        {saveMessage && (
          <div
            className={`mb-3 px-3 py-2 rounded-lg text-sm ${
              saveMessage.startsWith('Error')
                ? 'bg-red-50 text-red-600'
                : 'bg-green-50 text-green-600'
            }`}
          >
            {saveMessage}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
}

export default Settings;
