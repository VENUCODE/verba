import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useConfigStore, HISTORY_STORAGE_KEY } from '../store/configStore';
import { HOTKEY_OPTIONS, MODEL_OPTIONS, DURATION_OPTIONS } from '../constants';
import type { WhisperModel } from '../../shared/types';
import { Check, Copy, Eye, EyeOff, History, Keyboard, KeyRound, Mic, Settings as SettingsIcon, Share, Trash2, X, Calendar, Clock } from 'lucide-react';

const verbaIcon = new URL('../../../assets/icon.png', import.meta.url).href;
type IconTone = 'iris' | 'aqua' | 'rose' | 'amber';

const iconToneClasses: Record<IconTone, string> = {
  iris: 'bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-indigo-100',
  aqua: 'bg-gradient-to-br from-sky-500/30 to-cyan-500/30 text-sky-100',
  rose: 'bg-gradient-to-br from-rose-500/30 to-pink-500/30 text-rose-100',
  amber: 'bg-gradient-to-br from-amber-500/30 to-orange-500/30 text-amber-100',
};

interface PanelWindowProps {
  initialTab: 'settings' | 'history';
}

type DateRangeFilter = 'all' | '10min' | '1hour' | '24hours' | 'today' | 'week' | 'month' | 'customTime' | 'custom';

const PanelWindow: React.FC<PanelWindowProps> = ({ initialTab }) => {
  const { config, saveConfig, history, clearHistory, exportHistory, loadConfig, hydrateHistory } = useConfigStore();
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>(initialTab);
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customTimeHours, setCustomTimeHours] = useState(1);
  const [customTimeMinutes, setCustomTimeMinutes] = useState(0);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

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
    return () => window.removeEventListener('storage', handleStorage);
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

  const handleChange = useCallback(<K extends keyof typeof localConfig>(key: K, value: typeof localConfig[K]) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveConfig(localConfig);
      setTimeout(() => setIsSaving(false), 250);
    } catch (error) {
      console.error('Failed to save config:', error);
      setIsSaving(false);
    }
  }, [localConfig, saveConfig]);

  const formattedModelLabel = useMemo(() => {
    const option = MODEL_OPTIONS.find((opt) => opt.value === localConfig.model);
    return option?.label || localConfig.model;
  }, [localConfig.model]);

  const filteredHistory = useMemo(() => {
    const now = new Date();
    const nowTime = now.getTime();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = new Date(nowTime - 7 * 24 * 60 * 60 * 1000).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // Time-based filters (hourly)
    const tenMinutesAgo = nowTime - 10 * 60 * 1000;
    const oneHourAgo = nowTime - 60 * 60 * 1000;
    const twentyFourHoursAgo = nowTime - 24 * 60 * 60 * 1000;

    // Custom time range calculation
    const customTimeMs = (customTimeHours * 60 + customTimeMinutes) * 60 * 1000;
    const customTimeAgo = nowTime - customTimeMs;

    switch (dateFilter) {
      case '10min':
        return history.filter((item) => item.timestamp >= tenMinutesAgo);
      case '1hour':
        return history.filter((item) => item.timestamp >= oneHourAgo);
      case '24hours':
        return history.filter((item) => item.timestamp >= twentyFourHoursAgo);
      case 'customTime':
        if (customTimeMs > 0) {
          return history.filter((item) => item.timestamp >= customTimeAgo);
        }
        return history;
      case 'today':
        return history.filter((item) => item.timestamp >= todayStart);
      case 'week':
        return history.filter((item) => item.timestamp >= weekStart);
      case 'month':
        return history.filter((item) => item.timestamp >= monthStart);
      case 'custom':
        if (customStartDate && customEndDate) {
          const startTime = new Date(customStartDate).getTime();
          const endTime = new Date(customEndDate).setHours(23, 59, 59, 999);
          return history.filter((item) => item.timestamp >= startTime && item.timestamp <= endTime);
        }
        return history;
      case 'all':
      default:
        return history;
    }
  }, [history, dateFilter, customStartDate, customEndDate, customTimeHours, customTimeMinutes]);

  const recordingStats = useMemo(() => {
    const seconds = filteredHistory.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const minutes = Math.floor(seconds / 60);
    return minutes ? `${minutes} min recorded` : `${seconds || 0}s recorded`;
  }, [filteredHistory]);

  const statCards = useMemo(
    () => [
      {
        title: 'Active Model',
        value: formattedModelLabel,
        caption: 'Optimized for accuracy and latency',
        tone: 'iris',
        icon: <Mic size={18} />,
      },
      {
        title: 'History',
        value: filteredHistory.length ? `${filteredHistory.length} entries` : 'No transcripts',
        caption: recordingStats,
        tone: 'amber',
        icon: <History size={18} />,
      },
    ],
    [formattedModelLabel, filteredHistory.length, recordingStats]
  );

  const renderSettings = () => (
    <div className="flex-1 overflow-y-auto space-y-6 pr-2 panel-scrollbar">
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(5,8,20,0.35)] backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">{card.title}</p>
                <p className="text-lg font-semibold text-white mt-1">{card.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconToneClasses[card.tone as IconTone]}`}>
                {card.icon}
              </div>
            </div>
            <p className="mt-2 text-xs text-white/60">{card.caption}</p>
          </div>
        ))}
      </section>

      <PanelSection
        tone="iris"
        title="API & Model"
        subtitle="Connect Verba to your preferred OpenAI deployment"
        icon={<KeyRound size={18} />}
      >
        <Field label="API Key">
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={localConfig.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-2xl border border-white/15 bg-[#0b1224] px-3 py-2 pr-10 text-sm text-white placeholder-white/40 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <button
              type="button"
              onClick={() => setShowApiKey((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="Speech Model">
          <select
            value={localConfig.model}
            onChange={(e) => handleChange('model', e.target.value as WhisperModel)}
            className="w-full rounded-2xl border border-white/15 bg-[#0b1224] px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </PanelSection>

      <PanelSection
        tone="aqua"
        title="Recording"
        subtitle="Control capture duration and preferred device"
        icon={<Mic size={18} />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Maximum Duration">
            <select
              value={localConfig.maxDuration}
              onChange={(e) => handleChange('maxDuration', parseInt(e.target.value, 10))}
              className="w-full rounded-2xl border border-white/15 bg-[#0b1224] px-3 py-2 text-sm text-white focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Input Device">
            <select
              value={localConfig.selectedInputDevice || ''}
              onChange={(e) => handleChange('selectedInputDevice', e.target.value || null)}
              className="w-full rounded-2xl border border-white/15 bg-[#0b1224] px-3 py-2 text-sm text-white focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="">System Default</option>
              {audioDevices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${idx + 1}`}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </PanelSection>

      <PanelSection
        tone="rose"
        title="Global Hotkey"
        subtitle="Summon Verba from any app with a single chord"
        icon={<Keyboard size={18} />}
      >
        <select
          value={localConfig.hotkey}
          onChange={(e) => handleChange('hotkey', e.target.value)}
          className="w-full rounded-2xl border border-white/15 bg-[#0b1224] px-3 py-2 text-sm text-white focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        >
          {HOTKEY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-white/60">
          Use this shortcut anywhere to toggle recording instantly.
        </p>
      </PanelSection>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => window.electronAPI.closePanelWindow()}
          className="rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/80 transition-all hover:bg-white/10"
        >
          Close
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition hover:brightness-110 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <section className="flex justify-between rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_30px_60px_rgba(5,8,20,0.4)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">Activity log</p>
            <p className="text-xl font-semibold text-white">{filteredHistory.length ? `${filteredHistory.length} transcripts` : 'No transcripts yet'}</p>
            <p className="text-xs text-white/60">{recordingStats}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => exportHistory('txt')}
            disabled={history.length === 0}
            className="flex items-center gap-2 rounded-full border border-white/50 px-3 py-1.5 text-sm text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            <Share className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={clearHistory}
            disabled={history.length === 0}
            className="flex items-center gap-2 rounded-full border border-rose-400/50 px-3 py-1.5 text-sm text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-md backdrop-blur-sm space-y-4">
        {/* Time-based filters */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-sky-400" />
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">Time Range</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', '10min', '1hour', '24hours', 'customTime'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  dateFilter === filter
                    ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-900/30'
                    : 'border border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {filter === 'all' && 'All Time'}
                {filter === '10min' && 'Last 10 Min'}
                {filter === '1hour' && 'Last 1 Hour'}
                {filter === '24hours' && 'Last 24 Hours'}
                {filter === 'customTime' && 'Custom Time'}
              </button>
            ))}
          </div>
          {dateFilter === 'customTime' && (
            <div className="mt-3 flex items-center gap-3 pl-6">
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase tracking-[0.25em] text-white/50">Last</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={customTimeHours}
                  onChange={(e) => setCustomTimeHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  className="w-16 rounded-xl border border-white/15 bg-[#0b1224] px-3 py-2 text-sm text-white text-center focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <span className="text-xs text-white/60">hrs</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={customTimeMinutes}
                  onChange={(e) => setCustomTimeMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-16 rounded-xl border border-white/15 bg-[#0b1224] px-3 py-2 text-sm text-white text-center focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <span className="text-xs text-white/60">min</span>
              </div>
            </div>
          )}
        </div>

        {/* Date-based filters */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-violet-400" />
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/60">Date Range</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['today', 'week', 'month', 'custom'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  dateFilter === filter
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-900/30'
                    : 'border border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {filter === 'today' && 'Today'}
                {filter === 'week' && 'This Week'}
                {filter === 'month' && 'This Month'}
                {filter === 'custom' && 'Custom Date'}
              </button>
            ))}
          </div>
        </div>
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-3 pl-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0b1224] px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#0b1224] px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex-1 overflow-y-auto pr-2 panel-scrollbar">
        {filteredHistory.length === 0 ? (
          dateFilter !== 'all' ? (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/5 text-center py-16">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconToneClasses.aqua}`}>
                <Calendar className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-medium text-white/80">No transcripts in this range</p>
              <p className="text-xs text-white/50">Try selecting a different date range.</p>
            </div>
          ) : (
            <EmptyHistory />
          )
        ) : (
          <div className="relative pl-6">
            <span className="absolute left-3 top-4 bottom-4 w-px bg-white/10" />
            {filteredHistory.map((item) => (
              <article
                key={item.id}
                className="relative mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/40 backdrop-blur"
              >
                <span className="absolute left-[-6px] top-6 h-3 w-3 rounded-full border border-[#040713] bg-white shadow" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{formatTimestamp(item.timestamp)}</p>
                    <p className="text-xs text-white/60">{formatDurationLabel(item.duration)}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70">
                    {item.model}
                  </span>
                </div>
                <p className="mt-3 text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{item.text}</p>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleCopy(item.id, item.text)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${
                      copiedId === item.id
                        ? 'border-green-400/50 text-green-400 bg-green-500/10'
                        : 'border-white/20 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {copiedId === item.id ? (
                      <><Check className="h-3.5 w-3.5" /> Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy</>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col bg-[#040713] text-white">
      <header className="relative flex justify-center border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl">
        {/* Dedicated drag region - covers header area but sits behind content */}
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
        <div className="relative z-10 flex items-center justify-between w-full max-w-3xl" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="flex items-center gap-3 select-none pointer-events-none">
            <img src={verbaIcon} alt="Verba logo" className="h-12 w-12 rounded-3xl border border-white/15 bg-black/50 p-2 shadow-lg" />
            <div>
              <p className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-fuchsia-400 to-violet-500">
                Verba Console
              </p>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Control Center</p>
            </div>
          </div>
          <button
            onClick={() => window.electronAPI.closePanelWindow()}
            className="rounded-full border border-white/15 p-2 text-white/80 transition hover:bg-white/10"
            title="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex justify-center border-b border-white/10 px-6 pt-4" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex gap-3 w-full max-w-3xl">
          {(['settings', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                activeTab === tab ? 'bg-white text-[#040713] shadow-lg shadow-white/20' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab === 'settings' ? <SettingsIcon className="h-4 w-4" /> : <History size={18} />}
              {tab === 'settings' ? 'Settings' : 'History'}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-6 py-5 overflow-hidden flex flex-col items-center">
        <div className="w-full max-w-3xl flex flex-col flex-1 overflow-hidden">
          {activeTab === 'settings' ? renderSettings() : renderHistory()}
        </div>
      </main>
    </div>
  );
};

export default PanelWindow;

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-2">
    <span className="text-xs uppercase tracking-[0.3em] text-white/50">{label}</span>
    {children}
  </label>
);

const PanelSection: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; tone: IconTone; children: React.ReactNode }> = ({
  title,
  subtitle,
  icon,
  tone,
  children,
}) => (
  <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#050812] to-[#0b1127] p-5 shadow-[0_30px_60px_rgba(5,8,20,0.45)]">
    <div className="mb-4 flex items-start gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconToneClasses[tone]}`}>{icon}</div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-white/60">{title}</p>
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const EmptyHistory = () => (
  <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/5 text-center py-16">
    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconToneClasses.aqua}`}>
      <History className="h-5 w-5" />
    </div>
    <p className="mt-4 text-sm font-medium text-white/80">No transcripts yet</p>
    <p className="text-xs text-white/50">Your recordings will appear here once you transcribe.</p>
  </div>
);

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDurationLabel(seconds?: number): string {
  if (seconds === undefined) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return mins ? `${mins}m ${secs}s` : `${secs}s`;
}




