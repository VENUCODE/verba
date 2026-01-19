import React, { useState } from 'react';
import { useConfigStore } from '../store/configStore';
import { MODEL_OPTIONS } from '../constants';
import { WhisperModel } from '../../shared/types';
import { Eye, EyeOff, KeyRound, Mic, Sparkles, X } from 'lucide-react';

const verbaIcon = new URL('../../../assets/icon.png', import.meta.url).href;

function Setup() {
  const { saveConfig, setIsFirstLaunch } = useConfigStore();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState<WhisperModel>('gpt-4o-mini-transcribe');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

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

      // Close setup window and show compact bar
      setTimeout(() => {
        window.electronAPI.closeSetupWindow();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    window.electronAPI.quitApp();
  };

  return (
    <div
      className="h-full w-full bg-[#040713] flex flex-col text-white overflow-hidden"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 z-50 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <X className="h-4 w-4" />
      </button>

      {/* Hero section with logo as background */}
      <div className="relative h-48 flex-shrink-0 overflow-hidden">
        {/* Large blurred logo background */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={verbaIcon}
            alt=""
            className="w-80 h-80 opacity-50 blur-sm scale-150"
            style={{ filter: 'blur(8px) saturate(1.5)' }}
          />
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#040713]/30 via-transparent to-[#040713]" />
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-transparent to-violet-500/10" />

        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-sky-500/30 to-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 rounded-full blur-3xl" />

        {/* Centered logo and title */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center py-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400/40 to-violet-500/40 rounded-3xl blur-xl scale-125" />
            <img
              src={verbaIcon}
              alt="Verba logo"
              className="relative h-20 w-20 rounded-2xl border border-white/20 bg-black/40 p-2.5 shadow-2xl shadow-sky-900/50"
            />
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-fuchsia-400 to-violet-500">
            Verba
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 mt-0.5">
            Voice Transcription
          </p>
        </div>
      </div>

      {/* Main content - scrollable form area */}
      <div
        className="flex-1 overflow-y-auto px-6 pb-6 pt-4 panel-scrollbar"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <div className="max-w-sm mx-auto space-y-5">
          {/* Intro text */}
          <p className="text-center text-sm text-white/60">
            Connect your OpenAI account to start transcribing voice to text instantly
          </p>

          {/* Setup form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* API Key Section */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#050812] to-[#0b1127] p-4 shadow-[0_20px_40px_rgba(5,8,20,0.4)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/30 to-cyan-500/30 text-sky-100">
                  <KeyRound size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">API Key</p>
                  <p className="text-xs text-white/40">Required for transcription</p>
                </div>
              </div>

              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-xl border border-white/15 bg-[#0b1224] px-3.5 py-2.5 pr-10 text-sm text-white placeholder-white/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-white/40 mt-2">
                Get your key from{' '}
                <span className="text-sky-400">platform.openai.com</span>
              </p>
            </div>

            {/* Model Selection Section */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#050812] to-[#0b1127] p-4 shadow-[0_20px_40px_rgba(5,8,20,0.4)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 text-violet-100">
                  <Mic size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">Model</p>
                  <p className="text-xs text-white/40">Select transcription engine</p>
                </div>
              </div>

              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value as WhisperModel)}
                className="w-full rounded-xl border border-white/15 bg-[#0b1224] px-3.5 py-2.5 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all cursor-pointer"
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#0b1224] ">
                    {option.label} 
                  </option>
                ))}
              </select>
            </div>

            {/* Error display */}
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                  {error}
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isValidating}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/40 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-sky-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isValidating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Get Started</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-primary-500 pb-2">
            Your API key is encrypted & stored locally
          </p>
        </div>
      </div>
    </div>
  );
}

export default Setup;
