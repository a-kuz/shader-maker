import React, { useState } from 'react';
import { ShaderProcess } from '@/lib/types';

interface ProcessControlsProps {
  process: ShaderProcess;
  onControl: (action: 'pause' | 'resume' | 'stop' | 'retry') => Promise<void>;
  onDelete: () => Promise<void>;
  onRefresh: () => void;
  onServerCapture?: () => Promise<void>;
  currentScore?: number | null;
}

export default function ProcessControls({ 
  process, 
  onControl, 
  onDelete, 
  onRefresh, 
  onServerCapture,
  currentScore 
}: ProcessControlsProps) {
  const [isControlling, setIsControlling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleControl = async (action: 'pause' | 'resume' | 'stop' | 'retry') => {
    setIsControlling(true);
    try {
      await onControl(action);
    } catch (error) {
      console.error(`Failed to ${action} process:`, error);
    } finally {
      setIsControlling(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      await onDelete();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete process:', error);
    }
  };

  const canPause = process.status === 'running';
  const canResume = process.status === 'paused';
  const canStop = ['running', 'paused'].includes(process.status);
  const canRetry = process.status === 'failed';
  const isActive = ['running', 'paused'].includes(process.status);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'paused': return 'text-yellow-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getProgressInfo = () => {
    const totalSteps = process.steps.length;
    const completedSteps = process.steps.filter(s => s.status === 'completed').length;
    const runningSteps = process.steps.filter(s => s.status === 'running').length;
    
    return { totalSteps, completedSteps, runningSteps };
  };

  const { totalSteps, completedSteps, runningSteps } = getProgressInfo();
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-white">Process Control</h3>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              process.status === 'running' ? 'bg-blue-600' :
              process.status === 'paused' ? 'bg-yellow-600' :
              process.status === 'completed' ? 'bg-green-600' :
              process.status === 'failed' ? 'bg-red-600' :
              'bg-gray-600'
            }`}>
              {process.status.toUpperCase()}
            </span>
            
            {currentScore !== null && currentScore !== undefined && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentScore >= 80 ? 'bg-green-600' :
                currentScore >= 60 ? 'bg-yellow-600' :
                'bg-red-600'
              }`}>
                Score: {currentScore}/100
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          title="Refresh process data"
        >
          🔄
        </button>
      </div>

      {/* Progress Bar */}
      {totalSteps > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
            <span>Progress: {completedSteps}/{totalSteps} steps completed</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {runningSteps > 0 && (
            <p className="text-xs text-blue-400 mt-1">
              {runningSteps} step{runningSteps !== 1 ? 's' : ''} currently running...
            </p>
          )}
        </div>
      )}

      {/* Process Configuration */}
      {process.config && (
        <div className="mb-4 p-3 bg-gray-900 rounded text-sm">
          <div className="flex flex-wrap gap-4 text-gray-400">
            <span>Max Iterations: <span className="text-white">{process.config.maxIterations}</span></span>
            <span>Target Score: <span className="text-white">{process.config.targetScore}</span></span>
            <span>Auto Mode: <span className="text-white">{process.config.autoMode ? 'On' : 'Off'}</span></span>
            {process.config.serverCapture && (
              <span>Server Capture: <span className="text-green-400">Enabled</span></span>
            )}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Primary Controls */}
        {canPause && (
          <button
            onClick={() => handleControl('pause')}
            disabled={isControlling}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isControlling ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              '⏸️'
            )}
            Pause
          </button>
        )}
        
        {canResume && (
          <button
            onClick={() => handleControl('resume')}
            disabled={isControlling}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isControlling ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              '▶️'
            )}
            Resume
          </button>
        )}
        
        {canStop && (
          <button
            onClick={() => handleControl('stop')}
            disabled={isControlling}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isControlling ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              '⏹️'
            )}
            Stop
          </button>
        )}
        
        {canRetry && (
          <button
            onClick={() => handleControl('retry')}
            disabled={isControlling}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isControlling ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              '🔄'
            )}
            Retry
          </button>
        )}

        {/* Server Capture Button */}
        {onServerCapture && (process.status === 'capturing' || process.config?.serverCapture) && (
          <button
            onClick={onServerCapture}
            disabled={isControlling}
            className={`px-4 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              process.status === 'capturing' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
            title={
              process.status === 'capturing' 
                ? 'Capture screenshots on server (preferred for this status)' 
                : 'Force server capture regardless of process status'
            }
          >
            {isControlling ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              '🖥️'
            )}
            Server Capture
          </button>
        )}

        {/* Secondary Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {process.startedAt && (
            <span className="text-xs text-gray-400">
              Started: {new Date(process.startedAt).toLocaleString()}
            </span>
          )}
          
          <button
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className={`px-3 py-2 rounded font-medium text-sm transition-colors ${
              showDeleteConfirm 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {showDeleteConfirm ? '⚠️ Confirm Delete' : '🗑️ Delete'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mt-4 p-3 bg-red-900 border border-red-700 rounded">
          <p className="text-red-200 text-sm mb-3">
            Are you sure you want to delete this process? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Process Summary */}
      {process.status === 'completed' && (
        <div className="mt-4 p-3 bg-green-900 border border-green-700 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">✅</span>
            <span className="text-green-200 font-medium">Process Completed Successfully</span>
          </div>
          <div className="text-sm text-green-300">
            {process.completedAt && process.startedAt && (
              <span>
                Total time: {Math.round((process.completedAt - process.startedAt) / 1000)}s
              </span>
            )}
            {currentScore !== null && currentScore !== undefined && (
              <span className="ml-4">Final score: {currentScore}/100</span>
            )}
          </div>
        </div>
      )}

      {process.status === 'failed' && (
        <div className="mt-4 p-3 bg-red-900 border border-red-700 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-400">❌</span>
            <span className="text-red-200 font-medium">Process Failed</span>
          </div>
          <p className="text-sm text-red-300">
            The process encountered an error and could not be completed. You can try to retry it or start a new process.
          </p>
        </div>
      )}
    </div>
  );
} 