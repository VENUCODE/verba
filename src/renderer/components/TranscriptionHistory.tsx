import React, { useState, useMemo } from 'react';
import { TranscriptionHistory as HistoryItem } from '../../shared/types';

interface TranscriptionHistoryProps {
  history: HistoryItem[];
  onClear: () => void;
  onExport: (format: 'txt' | 'json' | 'srt') => void;
}

function TranscriptionHistory({ history, onClear, onExport }: TranscriptionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'duration'>('recent');

  const filteredAndSorted = useMemo(() => {
    let filtered = history;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.text.toLowerCase().includes(query) ||
          item.model.toLowerCase().includes(query)
      );
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        sorted.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'duration':
        sorted.sort((a, b) => b.duration - a.duration);
        break;
    }

    return sorted;
  }, [history, searchQuery, sortBy]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-200 bg-white">
        <h2 className="text-lg font-semibold text-surface-800 mb-3">
          Transcription History
        </h2>

        {/* Search and filters */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Search transcriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="duration">Longest</option>
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onExport('txt')}
            className="flex-1 px-3 py-2 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            disabled={history.length === 0}
          >
            Export TXT
          </button>
          <button
            onClick={() => onExport('json')}
            className="flex-1 px-3 py-2 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            disabled={history.length === 0}
          >
            Export JSON
          </button>
          <button
            onClick={() => onExport('srt')}
            className="flex-1 px-3 py-2 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            disabled={history.length === 0}
          >
            Export SRT
          </button>
          <button
            onClick={onClear}
            className="px-3 py-2 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            disabled={history.length === 0}
          >
            Clear All
          </button>
        </div>

        {/* Stats */}
        <div className="mt-3 text-xs text-surface-500">
          {filteredAndSorted.length} of {history.length} transcriptions
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filteredAndSorted.length === 0 ? (
          <div className="flex items-center justify-center h-full text-surface-400 text-sm">
            {searchQuery ? 'No matching transcriptions' : 'No transcriptions yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSorted.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-surface-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary-600">
                        {item.model}
                      </span>
                      <span className="text-xs text-surface-400">•</span>
                      <span className="text-xs text-surface-500">
                        {formatDuration(item.duration)}
                      </span>
                    </div>
                    <div className="text-xs text-surface-400">
                      {formatDate(item.timestamp)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.text);
                    }}
                    className="p-1 hover:bg-surface-100 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg
                      className="w-4 h-4 text-surface-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-surface-700 line-clamp-3">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TranscriptionHistory;
