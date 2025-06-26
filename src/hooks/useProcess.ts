import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShaderProcess, 
  ProcessUpdate, 
  StartProcessRequest, 
  ProcessControlRequest,
  SubmitScreenshotsRequest,
  ShaderCompilationError
} from '@/lib/types';

export interface UseProcessOptions {
  processId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseProcessReturn {
  // Process state
  process: ShaderProcess | null;
  updates: ProcessUpdate[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startProcess: (request: StartProcessRequest) => Promise<string>;
  controlProcess: (action: 'pause' | 'resume' | 'stop' | 'retry') => Promise<boolean>;
  createCaptureStep: () => Promise<string | null>;
  submitScreenshots: (stepId: string, screenshots: string[], compilationError?: ShaderCompilationError) => Promise<boolean>;
  refreshProcess: () => Promise<void>;
  deleteProcess: () => Promise<boolean>;
  
  // Current state helpers
  getCurrentCode: () => string;
  getCurrentStep: () => string | null;
  getLatestScore: () => number | null;
  isWaitingForScreenshots: () => boolean;
}

export function useProcess(options: UseProcessOptions = {}): UseProcessReturn {
  const { processId, autoRefresh = false, refreshInterval = 2000 } = options;
  
  const [process, setProcess] = useState<ShaderProcess | null>(null);
  const [updates, setUpdates] = useState<ProcessUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date | null>(null);
  
  // Fetch process data
  const fetchProcess = useCallback(async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const since = lastUpdateRef.current?.toISOString();
      const url = `/api/processes/${id}${since ? `?since=${since}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch process: ${response.statusText}`);
      }
      
      const data = await response.json();
      setProcess(data.process);
      
      if (data.updates && data.updates.length > 0) {
        setUpdates(prev => [...prev, ...data.updates]);
        lastUpdateRef.current = new Date();
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Start new process
  const startProcess = useCallback(async (request: StartProcessRequest): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/processes/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start process');
      }
      
      const data = await response.json();
      
      // Clear previous state
      setProcess(null);
      setUpdates([]);
      lastUpdateRef.current = null;
      
      // Start fetching the new process
      setTimeout(() => fetchProcess(data.processId), 500);
      
      return data.processId;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchProcess]);
  
  // Control process (pause, resume, stop, retry)
  const controlProcess = useCallback(async (action: 'pause' | 'resume' | 'stop' | 'retry'): Promise<boolean> => {
    if (!processId) return false;
    
    try {
      setError(null);
      
      const request: ProcessControlRequest = { action };
      const response = await fetch(`/api/processes/${processId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} process`);
      }
      
      const data = await response.json();
      if (data.process) {
        setProcess(data.process);
      }
      
      // Refresh after action
      setTimeout(() => processId && fetchProcess(processId), 500);
      
      return true;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [processId, fetchProcess]);
  
  // Create capture step (after successful compilation)
  const createCaptureStep = useCallback(async (): Promise<string | null> => {
    if (!processId) return null;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/processes/${processId}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create capture step');
      }
      
      const data = await response.json();
      
      // Refresh to see the new step
      setTimeout(() => processId && fetchProcess(processId), 100);
      
      return data.captureStepId;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [processId, fetchProcess]);

  // Submit screenshots
  const submitScreenshots = useCallback(async (stepId: string, screenshots: string[], compilationError?: ShaderCompilationError): Promise<boolean> => {
    if (!processId) return false;
    
    try {
      setError(null);
      
      const request: SubmitScreenshotsRequest = {
        processId,
        stepId,
        screenshots,
        compilationError
      };
      
      const response = await fetch(`/api/processes/${processId}/screenshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit screenshots');
      }
      
      // Process will continue automatically, refresh to see updates
      setTimeout(() => processId && fetchProcess(processId), 1000);
      
      return true;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [processId, fetchProcess]);
  
  // Delete process
  const deleteProcess = useCallback(async (): Promise<boolean> => {
    if (!processId) return false;
    
    try {
      setError(null);
      
      const response = await fetch(`/api/processes/${processId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete process');
      }
      
      // Clear state
      setProcess(null);
      setUpdates([]);
      lastUpdateRef.current = null;
      
      return true;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [processId]);
  
  // Refresh process data
  const refreshProcess = useCallback(async (): Promise<void> => {
    if (processId) {
      await fetchProcess(processId);
    }
  }, [processId, fetchProcess]);
  
  // Helper functions
  const getCurrentCode = useCallback((): string => {
    if (!process) return '';
    
    // Get the latest code from the most recent generation or improvement step
    const codeSteps = process.steps.filter(s => 
      (s.type === 'generation' || s.type === 'improvement') && 
      s.status === 'completed' && 
      s.output?.code
    );
    
    if (codeSteps.length === 0) return '';
    
    return codeSteps[codeSteps.length - 1].output.code;
  }, [process?.steps?.filter(s => (s.type === 'generation' || s.type === 'improvement') && s.status === 'completed' && s.output?.code).map(s => s.id + s.output.code).join('|')]);
  
  const getCurrentStep = useCallback((): string | null => {
    return process?.currentStep || null;
  }, [process]);
  
  const getLatestScore = useCallback((): number | null => {
    if (!process) return null;
    
    // Get the latest evaluation score
    const evaluationSteps = process.steps.filter(s => 
      s.type === 'evaluation' && 
      s.status === 'completed' && 
      s.output?.score !== undefined
    );
    
    if (evaluationSteps.length === 0) return null;
    
    return evaluationSteps[evaluationSteps.length - 1].output.score;
  }, [process]);
  
  const isWaitingForScreenshots = useCallback((): boolean => {
    return process?.status === 'capturing' && process?.currentStep === 'capture';
  }, [process]);
  
  // Auto refresh effect
  useEffect(() => {
    if (!processId || !autoRefresh) return;
    
    // Initial fetch
    fetchProcess(processId);
    
    // Set up interval for auto refresh
    refreshIntervalRef.current = setInterval(() => {
      if (process?.status && !['completed', 'failed'].includes(process.status)) {
        fetchProcess(processId);
      }
    }, refreshInterval);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [processId, autoRefresh, refreshInterval, fetchProcess, process?.status]);
  
  // Manual fetch effect
  useEffect(() => {
    if (processId && !autoRefresh) {
      fetchProcess(processId);
    }
  }, [processId, autoRefresh, fetchProcess]);
  
  return {
    // State
    process,
    updates,
    isLoading,
    error,
    
    // Actions
    startProcess,
    controlProcess,
    createCaptureStep,
    submitScreenshots,
    refreshProcess,
    deleteProcess,
    
    // Helpers
    getCurrentCode,
    getCurrentStep,
    getLatestScore,
    isWaitingForScreenshots
  };
} 