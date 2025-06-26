import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useProcess } from '@/hooks/useProcess';
import ShaderCanvas from '@/components/ShaderCanvas';
import ProcessTimeline from '@/components/ProcessTimeline';
import ProcessControls from '@/components/ProcessControls';
import ProcessHistory from '@/components/ProcessHistory';
import AIInteractions from './AIInteractions';
import { ShaderCompilationError } from '@/lib/types';

export default function ProcessBasedShaderMaker() {
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [captureMode, setCaptureMode] = useState(false);
  const [compilationError, setCompilationError] = useState<ShaderCompilationError | null>(null);
  const [lastHandledCode, setLastHandledCode] = useState<string>('');
  const [config, setConfig] = useState({
    maxIterations: 3,
    targetScore: 80,
    autoMode: true,
    serverCapture: true  // Включаем по умолчанию для тестирования
  });

  const {
    process,
    updates,
    isLoading,
    error,
    startProcess,
    controlProcess,
    createCaptureStep,
    submitScreenshots,
    refreshProcess,
    deleteProcess,
    getCurrentCode,
    getCurrentStep,
    getLatestScore,
    isWaitingForScreenshots
  } = useProcess({
    processId: currentProcessId || undefined,
    autoRefresh: true,
    refreshInterval: 2000
  });

  // Handle screenshot capture
  const handleScreenshotCapture = async (screenshots: string[]) => {
    if (!process || !isWaitingForScreenshots()) {
      console.log('Not waiting for screenshots, ignoring capture');
      return;
    }

    console.log(`📸 Captured ${screenshots.length} screenshots for process ${process.id}`);
    setCaptureMode(false);

    // Find the current capture step
    const captureStep = process.steps.find(step => 
      step.type === 'capture' && step.status === 'running'
    );

    if (!captureStep) {
      console.error('No active capture step found');
      return;
    }

    try {
      await submitScreenshots(captureStep.id, screenshots, compilationError);
      console.log('✅ Screenshots submitted successfully');
      
      // Clear compilation error after submitting
      if (compilationError) {
        console.log('📝 Compilation error sent for fixing');
        setCompilationError(null);
      }
    } catch (err) {
      console.error('❌ Failed to submit screenshots:', err);
    }
  };

  // Handle compilation errors
  const handleCompilationError = async (error: ShaderCompilationError) => {
    console.log('Compilation error received:', error);
    setCompilationError(error);
    
    // If we're waiting for screenshots, immediately submit the compilation error
    if (process && isWaitingForScreenshots()) {
      console.log('🚨 Compilation error during capture - submitting immediately');
      setCaptureMode(false);
      
      // Find the current capture step
      const captureStep = process.steps.find(step => 
        step.type === 'capture' && step.status === 'running'
      );

      if (captureStep) {
        try {
          // Submit empty screenshots array with compilation error
          await submitScreenshots(captureStep.id, [], error);
          console.log('✅ Compilation error submitted for fixing');
          setCompilationError(null);
        } catch (err) {
          console.error('❌ Failed to submit compilation error:', err);
        }
      }
    }
  };

  // Start new process
  const handleStartProcess = async () => {
    if (!prompt.trim()) {
      return;
    }

    try {
      const processId = await startProcess({
        prompt: prompt.trim(),
        config
      });
      
      setCurrentProcessId(processId);
      setCompilationError(null);
      console.log(`🚀 Started new process: ${processId}`);
    } catch (err) {
      console.error('Failed to start process:', err);
    }
  };

  // Load existing process
  const handleLoadProcess = (processId: string) => {
    setCurrentProcessId(processId);
    setCompilationError(null);
  };

  // Handle server capture
  const handleServerCapture = async () => {
    if (!process) return;
    
    try {
      console.log(`🖥️ Starting server capture for process ${process.id}`);
      const url = `/api/processes/${process.id}/server-capture`;
      console.log(`📡 Fetching URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server capture failed');
      }

      const result = await response.json();
      console.log('✅ Server capture completed:', result.message);
      
      // Refresh process to get updated data
      await refreshProcess();
      
    } catch (error) {
      console.error('❌ Server capture failed:', error);
    }
  };

  // Handle successful shader compilation - create capture step
  const handleCompilationSuccess = async () => {
    const currentCode = getCurrentCode();
    
    console.log('🔧 handleCompilationSuccess called', {
      hasProcess: !!process,
      isWaiting: isWaitingForScreenshots(),
      processStatus: process?.status,
      currentStep: process?.currentStep,
      codeLength: currentCode?.length || 0,
      lastHandledLength: lastHandledCode?.length || 0,
      codeChanged: currentCode !== lastHandledCode
    });
    
    // Skip if this is the same code we already handled
    if (currentCode === lastHandledCode) {
      console.log('⚠️ Skipping compilation success - same code already handled');
      return;
    }
    
    if (process && isWaitingForScreenshots()) {
      // Check if capture step already exists to avoid creating multiple
      const existingCaptureStep = process.steps.find(step => 
        step.type === 'capture' && step.status === 'running'
      );
      
      if (existingCaptureStep) {
        console.log('📸 Capture step already exists, starting capture mode...');
        setLastHandledCode(currentCode); // Mark this code as handled
        setCaptureMode(true);
        return;
      }
      
      console.log('✅ Shader compiled successfully, creating capture step...');
      try {
        const captureStepId = await createCaptureStep();
        if (captureStepId) {
          console.log('📸 Capture step created:', captureStepId);
          setLastHandledCode(currentCode); // Mark this code as handled
          setCaptureMode(true);
        }
      } catch (err) {
        console.error('❌ Failed to create capture step:', err);
      }
    } else {
      console.log('❌ Not creating capture step:', {
        hasProcess: !!process,
        isWaiting: isWaitingForScreenshots()
      });
    }
  };

  // Auto-trigger screenshot capture when process is waiting and capture step exists
  useEffect(() => {
    if (isWaitingForScreenshots() && !captureMode) {
      // Check if capture step already exists
      const captureStep = process?.steps.find(step => 
        step.type === 'capture' && step.status === 'running'
      );
      
      if (captureStep) {
        console.log('🎬 Process is waiting for screenshots, starting capture...');
        setCaptureMode(true);
      } else {
        console.log('⏳ Waiting for capture step to be created after compilation...');
      }
    }
  }, [process?.status, process?.currentStep, process?.steps, captureMode, isWaitingForScreenshots]);

  const currentCode = useMemo(() => getCurrentCode(), [getCurrentCode]);
  const currentStep = getCurrentStep();
  const latestScore = getLatestScore();
  const isProcessRunning = process && !['completed', 'failed', 'paused'].includes(process.status);

  return (
    <>
      <ProcessHistory 
        onLoadProcess={handleLoadProcess}
        currentProcessId={currentProcessId}
      />
      
      <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-900 text-white">
        {/* Header Navigation */}
        <div className="w-full max-w-6xl flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">AI Shader Generator</h1>
          <Link
            href="/processes"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Все процессы
          </Link>
        </div>
        
        {/* Configuration */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="maxIterations" className="text-gray-300">
              Max Iterations:
            </label>
            <select
              id="maxIterations"
              value={config.maxIterations}
              onChange={(e) => setConfig(prev => ({ ...prev, maxIterations: Number(e.target.value) }))}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
              disabled={isProcessRunning}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="targetScore" className="text-gray-300">
              Target Score:
            </label>
            <select
              id="targetScore"
              value={config.targetScore}
              onChange={(e) => setConfig(prev => ({ ...prev, targetScore: Number(e.target.value) }))}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
              disabled={isProcessRunning}
            >
              <option value={60}>60</option>
              <option value={70}>70</option>
              <option value={80}>80</option>
              <option value={90}>90</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-300">
              <input
                type="checkbox"
                checked={config.autoMode}
                onChange={(e) => setConfig(prev => ({ ...prev, autoMode: e.target.checked }))}
                className="mr-1"
                disabled={isProcessRunning}
              />
              Auto Mode
            </label>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <label className="text-gray-300">
              <input
                type="checkbox"
                checked={config.serverCapture}
                onChange={(e) => setConfig(prev => ({ ...prev, serverCapture: e.target.checked }))}
                className="mr-1"
                disabled={isProcessRunning}
              />
              Server Capture
            </label>
          </div>
        </div>
        
        <div className="w-full max-w-6xl">
          {/* Input Section */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the shader you want to create..."
                className="flex-1 p-3 rounded bg-gray-800 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                disabled={isProcessRunning}
                onKeyPress={(e) => e.key === 'Enter' && !isProcessRunning && handleStartProcess()}
              />
              <button
                onClick={handleStartProcess}
                disabled={isProcessRunning || !prompt.trim() || isLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded font-medium disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Starting...
                  </>
                ) : (
                  '🚀 Start Process'
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-400 mt-2 text-sm">
                ❌ {error}
              </p>
            )}
          </div>

          {/* Process Content */}
          {process && (
            <div className="space-y-6">
              {/* Process Timeline */}
              <ProcessTimeline 
                process={process}
                updates={updates}
                onRefresh={refreshProcess}
              />

              {/* Process Controls */}
              <ProcessControls
                process={process}
                onControl={controlProcess}
                onDelete={deleteProcess}
                onRefresh={refreshProcess}
                onServerCapture={handleServerCapture}
                currentScore={latestScore}
              />

              {/* Shader Preview */}
              {currentCode && (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Shader Preview</h3>
                      <div className="flex items-center gap-4 text-sm">
                        {currentStep && (
                          <span className="text-gray-400">
                            Current: <span className="text-blue-400 capitalize">{currentStep}</span>
                          </span>
                        )}
                        {latestScore !== null && (
                          <span className={`font-medium ${
                            latestScore >= 80 ? 'text-green-400' :
                            latestScore >= 60 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            Score: {latestScore}/100
                          </span>
                        )}
                        {isWaitingForScreenshots() && (
                          <span className="text-orange-400 animate-pulse">
                            📸 Waiting for screenshots...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative bg-black h-[400px]">
                    <ShaderCanvas
                      shaderCode={currentCode}
                      captureScreenshots={captureMode}
                      onScreenshotCapture={handleScreenshotCapture}
                      onCompilationError={handleCompilationError}
                      onCompilationSuccess={handleCompilationSuccess}
                    />
                    
                    {/* Status Overlays */}
                    {captureMode && (
                      <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        Recording...
                      </div>
                    )}
                    
                    {isProcessRunning && (
                      <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                        Process Running
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Compilation Error Alert */}
              {compilationError && (
                <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-200 mb-2">⚠️ Shader Compilation Error</h3>
                      <p className="text-red-300 text-sm mb-3">{compilationError.message}</p>
                      
                      {compilationError.infoLog && (
                        <div className="bg-red-800 p-3 rounded mb-3">
                          <h4 className="text-sm font-medium text-red-200 mb-1">Error Details:</h4>
                          <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">
                            {compilationError.infoLog}
                          </pre>
                        </div>
                      )}
                      
                      <p className="text-red-400 text-xs">
                        Detected at: {compilationError.timestamp.toLocaleString()}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setCompilationError(null)}
                      className="ml-4 text-red-400 hover:text-red-300 text-xl"
                      title="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(compilationError.infoLog || compilationError.message)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium"
                    >
                      📋 Copy Error
                    </button>
                  </div>
                </div>
              )}

              {/* Shader Code */}
              {currentCode && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Generated Code</h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(currentCode)}
                      className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-200"
                    >
                      📋 Copy Code
                    </button>
                  </div>
                  <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto">
                    <code className="text-gray-300">{currentCode}</code>
                  </pre>
                </div>
              )}

              {/* AI Interactions */}
              <AIInteractions process={process} />
            </div>
          )}

          {/* Empty State */}
          {!process && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-xl font-medium text-gray-300 mb-2">No Active Process</h3>
                <p className="text-gray-500">Enter a prompt above to start creating a shader, or load an existing process from history.</p>
              </div>
              
              <button
                onClick={() => setCurrentProcessId(null)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View Process History →
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
} 