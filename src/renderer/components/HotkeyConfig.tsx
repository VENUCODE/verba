import React from 'react';
import { HOTKEY_OPTIONS } from '../constants';

interface HotkeyConfigProps {
  value: string;
  onChange: (hotkey: string) => void;
  className?: string;
}

function HotkeyConfig({ value, onChange, className = '' }: HotkeyConfigProps) {
  const formatHotkeyDisplay = (hotkey: string): string => {
    return hotkey
      .replace('CommandOrControl', 'Ctrl/Cmd')
      .replace(/\+/g, ' + ');
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-surface-700 mb-2">
        Recording Hotkey
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
      >
        {HOTKEY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-surface-400 mt-1">
        Current: {formatHotkeyDisplay(value)}
      </p>
    </div>
  );
}

export default HotkeyConfig;
