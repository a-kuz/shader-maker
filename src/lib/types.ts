export interface ShaderData {
  id: string;
  prompt: string;
  code: string;
  createdAt: Date;
  screenshots: string[];
  evaluation?: ShaderEvaluation;
  iterations: ShaderIteration[];
  compilationError?: ShaderCompilationError;
}

export interface ShaderEvaluation {
  score: number;
  feedback: string;
  evaluatedAt: Date;
}

export interface ShaderIteration {
  id: string;
  code: string;
  evaluation?: ShaderEvaluation;
  screenshots: string[];
  createdAt: Date;
  compilationError?: ShaderCompilationError;
}

export interface ShaderCompilationError {
  message: string;
  infoLog?: string;
  fragmentShaderLog?: string;
  vertexShaderLog?: string;
  timestamp: Date;
}

// New Process Types
export type ProcessStatus = 
  | 'created'
  | 'generating'
  | 'capturing'
  | 'evaluating'
  | 'improving'
  | 'fixing'
  | 'completed'
  | 'failed'
  | 'paused';

export type ProcessStepType = 
  | 'generation'
  | 'capture'
  | 'evaluation'
  | 'improvement'
  | 'fix'
  | 'completion';

export interface ProcessStep {
  id: string;
  processId: string;
  type: ProcessStepType;
  status: ProcessStatus;
  input?: any;
  output?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  aiInteraction?: AIInteraction;
}

export interface ShaderProcess {
  id: string;
  prompt: string;
  status: ProcessStatus;
  currentStep?: ProcessStepType;
  config: {
    maxIterations: number;
    targetScore: number;
    autoMode: boolean;
    serverCapture?: boolean;
  };
  result?: {
    finalCode: string;
    finalScore: number;
    totalIterations: number;
    totalDuration: number;
  };
  steps: ProcessStep[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  previewScreenshots?: string[];
  stepsCount?: number;
  capturesCount?: number;
}

export interface ProcessUpdate {
  processId: string;
  status: ProcessStatus;
  currentStep?: ProcessStepType;
  stepProgress?: {
    message: string;
    progress: number; // 0-100
  };
  newStep?: ProcessStep;
  result?: ShaderProcess['result'];
  error?: string;
  timestamp: Date;
}

// API Request/Response Types
export interface GenerateShaderRequest {
  prompt: string;
}

export interface GenerateShaderResponse {
  id: string;
  code: string;
}

export interface EvaluateShaderRequest {
  id: string;
  screenshots: string[];
}

export interface EvaluateShaderResponse {
  score: number;
  feedback: string;
}

export interface ImproveShaderRequest {
  id: string;
  feedback: string;
  screenshots: string[];
}

export interface ImproveShaderResponse {
  id: string;
  code: string;
}

export interface FixShaderRequest {
  id: string;
  compilationError: ShaderCompilationError;
}

export interface FixShaderResponse {
  id: string;
  code: string;
}

// New Process API Types
export interface StartProcessRequest {
  prompt: string;
  config?: {
    maxIterations?: number;
    targetScore?: number;
    autoMode?: boolean;
    serverCapture?: boolean;
  };
}

export interface StartProcessResponse {
  processId: string;
  status: ProcessStatus;
}

export interface ProcessStatusResponse {
  process: ShaderProcess;
  updates: ProcessUpdate[];
}

export interface ProcessControlRequest {
  action: 'pause' | 'resume' | 'stop' | 'retry';
}

export interface SubmitScreenshotsRequest {
  stepId: string;
  screenshots: string[];
  compilationError?: ShaderCompilationError;
}

// AI Interaction Logging
export interface AIInteraction {
  id: string;
  type: 'generation' | 'evaluation' | 'improvement' | 'fix';
  model: string;
  prompt: string;
  response: string;
  timestamp: Date;
  duration?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
} 