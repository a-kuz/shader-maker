import React from 'react';
import { ShaderProcess, ProcessUpdate } from '@/lib/types';

interface ProcessTimelineProps {
  process: ShaderProcess;
  updates: ProcessUpdate[];
  onRefresh?: () => void;
}

export default function ProcessTimeline({ process, updates, onRefresh }: ProcessTimelineProps) {
  const getStepIcon = (type: string, status: string) => {
    const iconMap = {
      'generation': '🤖',
      'capture': '📸',
      'evaluation': '🔍',
      'improvement': '⚡',
      'fix': '🔧'
    };
    
    const baseIcon = iconMap[type as keyof typeof iconMap] || '📝';
    
    if (status === 'running') return `${baseIcon} ⏳`;
    if (status === 'completed') return `${baseIcon} ✅`;
    if (status === 'failed') return `${baseIcon} ❌`;
    return `${baseIcon} ⏸️`;
  };

  const getStepStatus = (status: string) => {
    switch (status) {
      case 'running': return 'animate-pulse bg-blue-600';
      case 'completed': return 'bg-green-600';
      case 'failed': return 'bg-red-600';
      case 'paused': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getProcessDuration = () => {
    if (!process.startedAt) return null;
    const end = process.completedAt || Date.now();
    return end - process.startedAt;
  };

  const sortedSteps = [...process.steps].sort((a, b) => a.startedAt - b.startedAt);
  const duration = getProcessDuration();

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Process Timeline</h3>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>ID: <code className="text-blue-400">{process.id}</code></span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              process.status === 'running' ? 'bg-blue-600 text-white' :
              process.status === 'completed' ? 'bg-green-600 text-white' :
              process.status === 'failed' ? 'bg-red-600 text-white' :
              'bg-gray-600 text-white'
            }`}>
              {process.status.toUpperCase()}
            </span>
            {duration && (
              <span>Duration: {formatDuration(duration)}</span>
            )}
          </div>
        </div>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      {/* Steps Timeline */}
      <div className="space-y-4">
        {sortedSteps.map((step, index) => {
          const stepDuration = step.completedAt ? step.completedAt - step.startedAt : null;
          const isActive = step.status === 'running';
          
          return (
            <div key={step.id} className="flex items-start space-x-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${getStepStatus(step.status)}`}>
                  {index + 1}
                </div>
                {index < sortedSteps.length - 1 && (
                  <div className="w-0.5 h-8 bg-gray-600 mt-2"></div>
                )}
              </div>
              
              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStepIcon(step.type, step.status)}</span>
                    <span className="font-medium text-white capitalize">{step.type}</span>
                    {isActive && (
                      <span className="text-blue-400 text-xs animate-pulse">Running...</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {stepDuration && (
                      <span>{formatDuration(stepDuration)}</span>
                    )}
                    <span>{new Date(step.startedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                
                {/* Step details */}
                <div className="text-sm text-gray-300 space-y-1">
                  {step.result && (
                    <div className="space-y-1">
                      {step.type === 'generation' && step.result.code && (
                        <div className="bg-gray-900 p-2 rounded text-xs">
                          <span className="text-gray-400">Generated:</span> {step.result.code.length} characters
                        </div>
                      )}
                      
                      {step.type === 'capture' && step.result.screenshots && (
                        <div className="bg-gray-900 p-2 rounded text-xs">
                          <span className="text-gray-400">Captured:</span> {step.result.screenshots.length} screenshots
                        </div>
                      )}
                      
                      {step.type === 'evaluation' && step.result.score !== undefined && (
                        <div className="bg-gray-900 p-2 rounded text-xs flex items-center justify-between">
                          <span className="text-gray-400">Score:</span>
                          <span className={`font-medium ${
                            step.result.score >= 80 ? 'text-green-400' :
                            step.result.score >= 60 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {step.result.score}/100
                          </span>
                        </div>
                      )}
                      
                      {step.type === 'improvement' && step.result.code && (
                        <div className="bg-gray-900 p-2 rounded text-xs">
                          <span className="text-gray-400">Improved:</span> {step.result.code.length} characters
                        </div>
                      )}
                      
                      {step.type === 'fix' && step.result.code && (
                        <div className="bg-gray-900 p-2 rounded text-xs">
                          <span className="text-gray-400">Fixed:</span> {step.result.code.length} characters
                        </div>
                      )}
                      
                      {step.result.reasoning && (
                        <div className="bg-gray-900 p-2 rounded text-xs">
                          <span className="text-gray-400">Reasoning:</span>
                          <p className="text-gray-300 mt-1">{step.result.reasoning}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {step.error && (
                    <div className="bg-red-900 p-2 rounded text-xs">
                      <span className="text-red-400">Error:</span> {step.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Process prompt */}
      {process.prompt && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Original Prompt:</h4>
          <p className="text-gray-300 text-sm bg-gray-900 p-3 rounded">{process.prompt}</p>
        </div>
      )}

      {/* Recent updates */}
      {updates.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Updates:</h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {updates.slice(-5).map((update, index) => (
              <div key={index} className="text-xs text-gray-400 flex items-center justify-between">
                <span>{update.message}</span>
                <span>{new Date(update.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 