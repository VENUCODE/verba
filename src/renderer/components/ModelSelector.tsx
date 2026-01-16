import React from 'react';
import { MODEL_OPTIONS } from '../constants';
import { WhisperModel } from '../../shared/types';

interface ModelSelectorProps {
  value: WhisperModel;
  onChange: (model: WhisperModel) => void;
  className?: string;
  showDetails?: boolean;
}

function ModelSelector({ value, onChange, className = '', showDetails = false }: ModelSelectorProps) {
  const selectedModel = MODEL_OPTIONS.find((o) => o.value === value);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-surface-700 mb-2">
        Transcription Model
      </label>
      
      {showDetails ? (
        // Detailed card-based selector
        <div className="space-y-3">
          {MODEL_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                onClick={() => onChange(option.value as WhisperModel)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-surface-200 bg-white hover:border-surface-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-surface-800">{option.label}</h4>
                      {isSelected && (
                        <svg className="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 mb-2">{option.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {option.features?.map((feature, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-100 text-surface-700"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="ml-2">
                    {option.costLevel === 'high' && (
                      <span className="text-xs text-orange-600 font-medium">$$$</span>
                    )}
                    {option.costLevel === 'medium' && (
                      <span className="text-xs text-blue-600 font-medium">$$</span>
                    )}
                    {option.costLevel === 'low' && (
                      <span className="text-xs text-green-600 font-medium">$</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // Simple dropdown selector
        <>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value as WhisperModel)}
            className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedModel && (
            <div className="mt-2">
              <p className="text-xs text-surface-500">{selectedModel.description}</p>
              {selectedModel.features && selectedModel.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedModel.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-100 text-surface-600"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ModelSelector;
