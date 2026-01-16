import React, { useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { MODEL_OPTIONS } from '../constants';
import { WhisperModel } from '../../shared/types';

function Setup() {
  const { saveConfig, setIsFirstLaunch } = useConfigStore();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<WhisperModel>('whisper-1');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. It should start with "sk-"');
      return;
    }

    setIsValidating(true);

    try {
      // Save config
      await saveConfig({ apiKey: apiKey.trim(), model });

      // Mark setup as complete
      await window.electronAPI.completeSetup();
      setIsFirstLaunch(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-surface-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-surface-800">Voice Transcriber</h1>
          <p className="text-surface-500 mt-2">
            Set up your OpenAI API key to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-surface-700 mb-2"
            >
              OpenAI API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              autoFocus
            />
            <p className="text-xs text-surface-400 mt-2">
              Get your API key from{' '}
              <span className="text-primary-600">platform.openai.com</span>
            </p>
          </div>

          <div>
            <label
              htmlFor="model"
              className="block text-sm font-medium text-surface-700 mb-2"
            >
              Transcription Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value as WhisperModel)}
              className="w-full px-4 py-3 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-white"
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isValidating}
            className="w-full py-3 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Validating...
              </>
            ) : (
              'Get Started'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-surface-400 mt-6">
          Your API key is stored securely on your device
        </p>
      </div>
    </div>
  );
}

export default Setup;
