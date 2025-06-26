import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShaderProcess } from '@/lib/types';

interface ProcessHistoryProps {
  onLoadProcess: (id: string) => void;
  currentProcessId?: string | null;
}

export default function ProcessHistory({ 
  onLoadProcess, 
  currentProcessId 
}: ProcessHistoryProps) {
  const [processes, setProcesses] = useState<ShaderProcess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/processes');
      if (response.ok) {
        const data = await response.json();
        setProcesses(data.processes || []);
      }
    } catch (error) {
      console.error('Error fetching processes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProcess = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this process?')) return;
    
    try {
      const response = await fetch(`/api/processes/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setProcesses(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error deleting process:', error);
    }
  };

  const filteredProcesses = processes.filter(process =>
    process.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProcesses = filteredProcesses.reduce((groups, process) => {
    const date = new Date(process.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(process);
    return groups;
  }, {} as Record<string, ShaderProcess[]>);

  const getProcessStatusInfo = (process: ShaderProcess) => {
    switch (process.status) {
      case 'running':
        return { status: 'running', color: 'bg-blue-500', text: 'Running' };
      case 'paused':
        return { status: 'paused', color: 'bg-yellow-500', text: 'Paused' };
      case 'completed':
        return { status: 'completed', color: 'bg-green-500', text: 'Completed' };
      case 'failed':
        return { status: 'failed', color: 'bg-red-500', text: 'Failed' };
      default:
        return { status: 'pending', color: 'bg-gray-500', text: 'Pending' };
    }
  };

  const getLatestScore = (process: ShaderProcess) => {
    const evaluationSteps = process.steps.filter(step => 
      step.type === 'evaluation' && step.result?.score !== undefined
    );
    
    if (evaluationSteps.length === 0) return null;
    
    const latest = evaluationSteps[evaluationSteps.length - 1];
    return latest.result?.score;
  };

  const getGeneratedCode = (process: ShaderProcess) => {
    const codeSteps = process.steps.filter(step => 
      (step.type === 'generation' || step.type === 'improvement') && 
      step.result?.code
    );
    
    if (codeSteps.length === 0) return null;
    
    const latest = codeSteps[codeSteps.length - 1];
    return latest.result?.code;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const getProcessDuration = (process: ShaderProcess) => {
    if (!process.createdAt) return null;
    const end = process.completedAt ? new Date(process.completedAt).getTime() : Date.now();
    return end - new Date(process.createdAt).getTime();
  };

  if (!isExpanded) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>Process History ({processes.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Process History</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchProcesses}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
              >
                {isLoading ? '🔄 Loading...' : '🔄 Refresh'}
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
              >
                ✕ Close
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search processes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-400">Loading processes...</div>
            </div>
          ) : Object.keys(groupedProcesses).length === 0 ? (
            <div className="flex items-center justify-center h-32 text-center">
              <div className="text-gray-400">
                {searchQuery ? (
                  <div>
                    <div className="text-lg mb-2">🔍 No processes found</div>
                    <div>No processes match "{searchQuery}"</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-lg mb-2">📝 No processes yet</div>
                    <div>Start by creating your first shader process</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedProcesses)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, items]) => (
                <div key={date}>
                  <h3 className="text-lg font-semibold text-gray-300 mb-3 sticky top-0 bg-gray-900 py-2">
                    {date} ({items.length} processes)
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((process) => {
                      const statusInfo = getProcessStatusInfo(process);
                      const latestScore = getLatestScore(process);
                      const duration = getProcessDuration(process);
                      const isActive = currentProcessId === process.id;
                      
                      return (
                        <div
                          key={process.id}
                          className={`bg-gray-800 rounded-lg p-4 transition-all duration-200 hover:bg-gray-750 border-2 ${
                            isActive ? 'border-blue-500 bg-blue-900/20' : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium text-sm leading-tight mb-2 line-clamp-2">
                                {process.prompt || 'Untitled Process'}
                              </h4>
                              
                              <div className="flex items-center space-x-2 mb-1">
                                <div className={`w-2 h-2 rounded-full ${statusInfo.color} ${
                                  process.status === 'running' ? 'animate-pulse' : ''
                                }`}></div>
                                <span className="text-xs text-gray-400">{statusInfo.text}</span>
                                {latestScore !== null && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    latestScore >= 80 ? 'bg-green-600 text-white' :
                                    latestScore >= 60 ? 'bg-yellow-600 text-white' :
                                    'bg-red-600 text-white'
                                  }`}>
                                    {latestScore}/100
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-xs text-gray-500 space-y-1">
                                <div>Steps: {process.steps.length}</div>
                                <div>Created: {new Date(process.createdAt).toLocaleTimeString()}</div>
                                {duration && (
                                  <div>Duration: {formatDuration(duration)}</div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => handleDeleteProcess(process.id, e)}
                              className="text-gray-500 hover:text-red-400 p-1 transition-colors duration-200 ml-2"
                              title="Delete process"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          
                          {/* Process Configuration */}
                          {process.config && (
                            <div className="bg-gray-900 rounded p-2 mb-3 text-xs text-gray-400">
                              <div className="flex justify-between">
                                <span>Max: {process.config.maxIterations}</span>
                                <span>Target: {process.config.targetScore}</span>
                                <span>{process.config.autoMode ? 'Auto' : 'Manual'}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Steps Overview */}
                          <div className="flex space-x-1 mb-2">
                            {process.steps.slice(0, 8).map((step, index) => (
                              <div
                                key={step.id}
                                className={`w-2 h-2 rounded-full ${
                                  step.status === 'completed' ? 'bg-green-500' :
                                  step.status === 'running' ? 'bg-blue-500 animate-pulse' :
                                  step.status === 'failed' ? 'bg-red-500' :
                                  'bg-gray-600'
                                }`}
                                title={`${step.type} - ${step.status}`}
                              />
                            ))}
                            {process.steps.length > 8 && (
                              <div className="text-xs text-gray-500">+{process.steps.length - 8}</div>
                            )}
                          </div>
                          
                          {/* Process ID and Actions */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 font-mono">
                              ID: {process.id.substring(0, 8)}...
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => onLoadProcess(process.id)}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="Load in editor"
                              >
                                Load
                              </button>
                              <Link
                                href={`/processes/${process.id}`}
                                className="text-green-400 hover:text-green-300 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="View details"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 