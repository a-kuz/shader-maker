'use client';

import { useState } from 'react';
import { ShaderProcess, AIInteraction } from '@/lib/types';

interface AIInteractionsProps {
  process: ShaderProcess;
}

export default function AIInteractions({ process }: AIInteractionsProps) {
  const [expandedInteraction, setExpandedInteraction] = useState<string | null>(null);

  // Collect all AI interactions from process steps
  const aiInteractions = process.steps
    .filter(step => step.aiInteraction)
    .map(step => step.aiInteraction!)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (aiInteractions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">AI Interactions</h3>
        <p className="text-gray-400 text-sm">No AI interactions recorded yet.</p>
      </div>
    );
  }

  const toggleExpanded = (id: string) => {
    setExpandedInteraction(expandedInteraction === id ? null : id);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'generation': return '🤖';
      case 'evaluation': return '🔍';
      case 'improvement': return '⚡';
      case 'fix': return '🔧';
      default: return '💬';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'generation': return 'bg-blue-600';
      case 'evaluation': return 'bg-purple-600';
      case 'improvement': return 'bg-green-600';
      case 'fix': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">AI Interactions</h3>
        <span className="text-sm text-gray-400">{aiInteractions.length} interactions</span>
      </div>

      <div className="space-y-4">
        {aiInteractions.map((interaction, index) => {
          const isExpanded = expandedInteraction === interaction.id;
          
          return (
            <div key={interaction.id} className="border border-gray-700 rounded-lg overflow-hidden">
              {/* Header */}
              <button
                onClick={() => toggleExpanded(interaction.id)}
                className="w-full p-4 bg-gray-750 hover:bg-gray-700 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getTypeIcon(interaction.type)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getTypeColor(interaction.type)}`}>
                        {interaction.type.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400">#{index + 1}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(interaction.timestamp).toLocaleString()}
                      {interaction.duration && ` • ${formatDuration(interaction.duration)}`}
                      {interaction.tokenUsage && ` • ${interaction.tokenUsage.totalTokens} tokens`}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{interaction.model}</span>
                  <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-gray-700">
                  {/* Prompt */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-white">Prompt</h4>
                      <button
                        onClick={() => navigator.clipboard.writeText(interaction.prompt)}
                        className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <pre className="bg-gray-900 p-3 rounded text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
{interaction.prompt}
                    </pre>
                  </div>

                  {/* Response */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-white">Response</h4>
                      <button
                        onClick={() => navigator.clipboard.writeText(interaction.response)}
                        className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <pre className="bg-gray-900 p-3 rounded text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
{interaction.response}
                    </pre>
                  </div>

                  {/* Token Usage */}
                  {interaction.tokenUsage && (
                    <div className="p-4 pt-0">
                      <div className="bg-gray-750 p-3 rounded text-xs">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-gray-400">Prompt Tokens</div>
                            <div className="text-white font-medium">{interaction.tokenUsage.promptTokens}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Completion Tokens</div>
                            <div className="text-white font-medium">{interaction.tokenUsage.completionTokens}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Total Tokens</div>
                            <div className="text-white font-medium">{interaction.tokenUsage.totalTokens}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 