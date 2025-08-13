import { v4 as uuidv4 } from 'uuid';
import { generateShader, evaluateShader, improveShader, fixShaderCompilationError } from './openai';
import { ServerShaderCapture } from './serverCapture';
import { 
  createProcess, 
  updateProcess, 
  createProcessStep, 
  updateProcessStep, 
  addProcessUpdate,
  getProcess 
} from './db';
import { 
  ShaderProcess, 
  ProcessStep, 
  ProcessUpdate, 
  ProcessStatus, 
  ProcessStepType,
  StartProcessRequest,
  ProcessConfig,
  ShaderCompilationError
} from './types';

// In-memory queue for running processes
const runningProcesses = new Map<string, NodeJS.Timeout>();

export class ProcessRunner {
  
  static async startProcess(request: StartProcessRequest): Promise<string> {
    const processId = uuidv4();
    
    const config = {
      maxIterations: request.config?.maxIterations || 3,
      targetScore: request.config?.targetScore || 80,
      autoMode: request.config?.autoMode !== false,
      serverCapture: true  // Always use server capture by default
    };
    
    // Create process in DB
    const process = createProcess({
      id: processId,
      prompt: request.prompt,
      status: 'created',
      config
    });
    
    // Start processing asynchronously
    if (config.autoMode) {
      ProcessRunner.executeProcess(processId);
    }
    
    return processId;
  }
  
  static async executeProcess(processId: string): Promise<void> {
    try {
      const process = getProcess(processId);
      if (!process) {
        throw new Error('Process not found');
      }
      
      console.log(`🚀 Starting process execution: ${processId}`);
      
      // Step 1: Generate initial shader
      await ProcessRunner.executeGenerationStep(processId, process.prompt);
      
      if (!process.config.autoMode) {
        // For manual mode, wait for user input but prefer server capture
        console.log('📝 Manual mode: waiting for user to trigger capture or use server capture');
        ProcessRunner.updateStatus(processId, 'capturing', 'capture');
        return;
      }
      
      // Step 2: Always use server-side capture for auto mode
      console.log('🖥️ Auto mode: using server-side capture');
      await ProcessRunner.executeServerCapture(processId);
      
    } catch (error) {
      console.error(`❌ Process execution failed: ${processId}`, error);
      ProcessRunner.updateStatus(processId, 'failed', undefined, undefined, error.message);
    }
  }
  
  static async executeGenerationStep(processId: string, prompt: string): Promise<string> {
    console.log('🤖 Starting generation step for process:', processId);
    
    const stepId = uuidv4();
    const step = createProcessStep({
      id: stepId,
      processId,
      type: 'generation',
      status: 'running',
      input: { prompt }
    });
    
    ProcessRunner.addUpdate(processId, {
      status: 'generating',
      currentStep: 'generation',
      stepProgress: { message: 'Generating shader code...', progress: 30 }
    });
    
    try {
      const { code, aiInteraction } = await generateShader(prompt);
      
      const completedAt = new Date();
      const duration = completedAt.getTime() - step.startedAt.getTime();
      
      updateProcessStep(stepId, {
        status: 'completed',
        output: { code },
        aiInteraction,
        completedAt,
        duration
      });
      
      // For auto mode, generation is complete and we'll proceed to server capture
      // For manual mode, user can trigger server capture or wait for client capture
      ProcessRunner.addUpdate(processId, {
        status: 'capturing',
        currentStep: 'capture',
        stepProgress: { message: 'Shader generated successfully. Ready for capture...', progress: 100 }
      });
      
      return code;
      
    } catch (error) {
      updateProcessStep(stepId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
      
      throw error;
    }
  }

  static createCaptureStep(processId: string): string {
    // Check if there's already a running capture step
    const process = getProcess(processId);
    if (process) {
      const existingCaptureStep = process.steps.find(s => 
        s.type === 'capture' && s.status === 'running'
      );
      
      if (existingCaptureStep) {
        console.log(`📸 Capture step already exists: ${existingCaptureStep.id} for process ${processId}`);
        return existingCaptureStep.id;
      }
    }
    
    const stepId = uuidv4();
    createProcessStep({
      id: stepId,
      processId,
      type: 'capture',
      status: 'running',
      input: {}
    });
    
    console.log(`📸 Created capture step ${stepId} for process ${processId}`);
    return stepId;
  }

  static async executeServerCapture(processId: string): Promise<string[]> {
    console.log(`🖥️ Starting server-side capture for process ${processId}`);
    
    const process = getProcess(processId);
    if (!process) {
      throw new Error('Process not found');
    }

    // Get the latest shader code
    const codeSteps = process.steps.filter(s => s.type === 'generation' || s.type === 'improvement' || s.type === 'fix');
    const latestCodeStep = codeSteps[codeSteps.length - 1];
    
    if (!latestCodeStep?.output?.code) {
      throw new Error('No shader code found for capture');
    }

    const stepId = uuidv4();
    const step = createProcessStep({
      id: stepId,
      processId,
      type: 'capture',
      status: 'running',
      input: { code: latestCodeStep.output.code }
    });

    ProcessRunner.addUpdate(processId, {
      status: 'capturing',
      currentStep: 'capture',
      stepProgress: { message: 'Capturing screenshots on server...', progress: 20 }
    });

    try {
      const result = await ServerShaderCapture.captureShaderWithCompilationCheck(
        latestCodeStep.output.code,
        processId
      );

      if (result.compilationError) {
        // Update step with compilation error and transition to fix
        updateProcessStep(stepId, {
          status: 'completed',
          output: { screenshots: [], compilationError: result.compilationError },
          completedAt: new Date()
        });

        console.log('⚠️ Server capture detected compilation error, starting fix process');
        
        const fixedCode = await ProcessRunner.executeFixStep(
          processId,
          process.prompt,
          latestCodeStep.output.code,
          result.compilationError.message,
          result.compilationError.infoLog
        );
        
        ProcessRunner.updateStatus(processId, 'capturing', 'capture');
        return [];
      }

      // Successful capture
      const completedAt = new Date();
      const duration = completedAt.getTime() - step.startedAt.getTime();

      updateProcessStep(stepId, {
        status: 'completed',
        output: { screenshots: result.screenshots },
        completedAt,
        duration
      });

      ProcessRunner.addUpdate(processId, {
        status: 'evaluating',
        currentStep: 'evaluation',
        stepProgress: { message: `Captured ${result.screenshots.length} screenshots successfully`, progress: 100 }
      });

      // Continue with evaluation
      const evaluation = await ProcessRunner.executeEvaluationStep(
        processId, 
        process.prompt, 
        latestCodeStep.output.code, 
        result.screenshots
      );

      // Check if we should continue improving
      if (process.config.autoMode) {
        await ProcessRunner.checkContinueImprovement(processId, evaluation, latestCodeStep.output.code);
      }

      return result.screenshots;

    } catch (error) {
      updateProcessStep(stepId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });

      ProcessRunner.updateStatus(processId, 'failed', undefined, undefined, error.message);
      throw error;
    }
  }
  
  static async executeEvaluationStep(processId: string, prompt: string, code: string, screenshots: string[]): Promise<{ score: number; feedback: string }> {
    console.log('🔍 Starting evaluation step for process:', processId);
    
    const stepId = uuidv4();
    const step = createProcessStep({
      id: stepId,
      processId,
      type: 'evaluation',
      status: 'running',
      input: { prompt, code, screenshots }
    });
    
    ProcessRunner.addUpdate(processId, {
      status: 'evaluating',
      currentStep: 'evaluation',
      stepProgress: { message: 'Evaluating shader quality...', progress: 50 }
    });
    
    try {
      const { score, feedback, aiInteraction } = await evaluateShader(prompt, code, screenshots);
      
      const completedAt = new Date();
      const duration = completedAt.getTime() - step.startedAt.getTime();
      
      updateProcessStep(stepId, {
        status: 'completed',
        output: { score, feedback },
        aiInteraction,
        completedAt,
        duration
      });
      
      ProcessRunner.addUpdate(processId, {
        status: 'evaluating',
        currentStep: 'evaluation',
        stepProgress: { message: `Evaluation completed - Score: ${score}/100`, progress: 100 }
      });
      
      return { score, feedback };
      
    } catch (error) {
      updateProcessStep(stepId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
      
      throw error;
    }
  }
  
  static async executeImprovementStep(processId: string, prompt: string, code: string, feedback: string, screenshots: string[]): Promise<string> {
    console.log('⚡ Starting improvement step for process:', processId);
    
    const stepId = uuidv4();
    const step = createProcessStep({
      id: stepId,
      processId,
      type: 'improvement',
      status: 'running',
      input: { prompt, code, feedback, screenshots }
    });
    
    ProcessRunner.addUpdate(processId, {
      status: 'improving',
      currentStep: 'improvement',
      stepProgress: { message: 'Analyzing feedback and improving shader...', progress: 20 }
    });
    
    try {
      const { code: improvedCode, aiInteraction } = await improveShader(prompt, code, feedback, screenshots);
      
      const completedAt = new Date();
      const duration = completedAt.getTime() - step.startedAt.getTime();
      
      updateProcessStep(stepId, {
        status: 'completed',
        output: { code: improvedCode },
        aiInteraction,
        completedAt,
        duration
      });
      
      ProcessRunner.addUpdate(processId, {
        status: 'capturing',
        currentStep: 'capture',
        stepProgress: { message: 'Shader improved successfully', progress: 100 }
      });
      
      return improvedCode;
      
    } catch (error) {
      updateProcessStep(stepId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
      
      throw error;
    }
  }
  
  static async executeFixStep(processId: string, prompt: string, code: string, errorMessage: string, infoLog?: string): Promise<string> {
    console.log('🔧 Starting fix step for process:', processId);
    
    const stepId = uuidv4();
    const step = createProcessStep({
      id: stepId,
      processId,
      type: 'fix',
      status: 'running',
      input: { prompt, code, errorMessage, infoLog }
    });
    
    ProcessRunner.addUpdate(processId, {
      status: 'fixing',
      currentStep: 'fix',
      stepProgress: { message: 'Analyzing compilation error...', progress: 20 }
    });
    
    try {
      ProcessRunner.addUpdate(processId, {
        status: 'fixing',
        currentStep: 'fix',
        stepProgress: { message: 'Fixing shader compilation error...', progress: 50 }
      });
      
      const { code: fixedCode, aiInteraction } = await fixShaderCompilationError(prompt, code, errorMessage, infoLog);
      
      const completedAt = new Date();
      const duration = completedAt.getTime() - step.startedAt.getTime();
      
      updateProcessStep(stepId, {
        status: 'completed',
        output: { code: fixedCode },
        aiInteraction,
        completedAt,
        duration
      });
      
      ProcessRunner.addUpdate(processId, {
        status: 'capturing',
        currentStep: 'capture',
        stepProgress: { message: 'Compilation error fixed successfully', progress: 100 }
      });
      
      return fixedCode;
      
    } catch (error) {
      updateProcessStep(stepId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
      
      ProcessRunner.addUpdate(processId, {
        status: 'failed',
        currentStep: 'fix',
        stepProgress: { message: 'Failed to fix compilation error', progress: 0 }
      });
      
      throw error;
    }
  }
  
  static async submitScreenshots(processId: string, stepId: string, screenshots: string[], compilationError?: ShaderCompilationError): Promise<void> {
    let process = getProcess(processId);
    if (!process) {
      throw new Error('Process not found');
    }
    
    // Update the capture step with screenshots
    updateProcessStep(stepId, {
      status: 'completed',
      output: { screenshots, compilationError },
      completedAt: new Date()
    });
    
    // Wait for generation/improvement step to complete if it's still running
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      process = getProcess(processId)!; // Refresh process data
      const runningCodeStep = process.steps.find(s => 
        (s.type === 'generation' || s.type === 'improvement') && s.status === 'running'
      );
      
      if (!runningCodeStep) break;
      
      console.log(`⏳ Waiting for code step to complete (attempt ${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    // Get the latest code from generation or improvement steps
    const codeSteps = process.steps.filter(s => s.type === 'generation' || s.type === 'improvement');
    const latestCodeStep = codeSteps[codeSteps.length - 1];
    

    
    if (!latestCodeStep?.output?.code) {
      console.error('❌ No code found for evaluation');
      console.error('- Process steps:', process.steps.map(s => ({ 
        id: s.id, 
        type: s.type, 
        status: s.status, 
        hasOutput: !!s.output,
        outputKeys: s.output ? Object.keys(s.output) : []
      })));
      throw new Error(`No code found for evaluation. Found ${codeSteps.length} code steps, latest: ${latestCodeStep ? `${latestCodeStep.type}/${latestCodeStep.status}` : 'none'}`);
    }
    
    // If there's a compilation error, skip evaluation and go directly to fix
    if (compilationError) {
      console.log('⚠️ Compilation error detected, starting fix process');
      
      ProcessRunner.addUpdate(processId, {
        status: 'fixing',
        currentStep: 'fix',
        stepProgress: { message: 'Fixing compilation error...', progress: 0 }
      });
      
      try {
        const fixedCode = await ProcessRunner.executeFixStep(
          processId,
          process.prompt,
          latestCodeStep.output.code,
          compilationError.message,
          compilationError.infoLog
        );
        
        // After fixing, continue with server capture for auto mode
        if (process.config.autoMode) {
          console.log('🖥️ Auto mode: continuing with server capture after fix');
          await ProcessRunner.executeServerCapture(processId);
        } else {
          // For manual mode, wait for user to trigger capture
          ProcessRunner.updateStatus(processId, 'capturing', 'capture');
        }
        
      } catch (error) {
        ProcessRunner.updateStatus(processId, 'failed', undefined, undefined, error.message);
        throw error;
      }
      
      return;
    }
    
    // Ensure we have screenshots for evaluation
    if (!screenshots || screenshots.length === 0) {
      throw new Error('Screenshots are required for evaluation when there is no compilation error');
    }
    
    // Start evaluation for successful compilation
    const evaluation = await ProcessRunner.executeEvaluationStep(
      processId, 
      process.prompt, 
      latestCodeStep.output.code, 
      screenshots
    );
    
    // Check if we should continue improving
    if (process.config.autoMode) {
      await ProcessRunner.checkContinueImprovement(processId, evaluation, latestCodeStep.output.code);
    }
  }
  
  static async checkContinueImprovement(processId: string, evaluation: { score: number; feedback: string }, currentCode: string): Promise<void> {
    const process = getProcess(processId);
    if (!process) return;
    
    const iterationCount = process.steps.filter(s => s.type === 'improvement').length;
    
    // Check completion conditions
    if (evaluation.score >= process.config.targetScore) {
      ProcessRunner.completeProcess(processId, currentCode, evaluation.score, iterationCount);
      return;
    }
    
    if (iterationCount >= process.config.maxIterations) {
      ProcessRunner.completeProcess(processId, currentCode, evaluation.score, iterationCount);
      return;
    }
    
    // Continue with improvement
    const screenshots = process.steps
      .filter(s => s.type === 'capture' && s.output?.screenshots)
      .slice(-1)[0]?.output?.screenshots || [];
      
    if (screenshots.length === 0) {
      throw new Error('No screenshots available for improvement');
    }
    
    const improvedCode = await ProcessRunner.executeImprovementStep(
      processId,
      process.prompt,
      currentCode,
      evaluation.feedback,
      screenshots
    );
    
    // Continue with server capture for the improved code
    if (process.config.autoMode) {
      console.log('🖥️ Auto mode: continuing with server capture after improvement');
      await ProcessRunner.executeServerCapture(processId);
    } else {
      // For manual mode, wait for user to trigger capture
      ProcessRunner.updateStatus(processId, 'capturing', 'capture');
    }
  }
  
  static completeProcess(processId: string, finalCode: string, finalScore: number, totalIterations: number): void {
    const process = getProcess(processId);
    if (!process) return;
    
    const totalDuration = new Date().getTime() - process.createdAt.getTime();
    
    const result = {
      finalCode,
      finalScore,
      totalIterations,
      totalDuration
    };
    
    updateProcess(processId, {
      status: 'completed',
      result,
      completedAt: new Date()
    });
    
    ProcessRunner.addUpdate(processId, {
      status: 'completed',
      stepProgress: { message: `Process completed with score ${finalScore}/100`, progress: 100 },
      result
    });
    
    console.log(`✅ Process completed: ${processId} - Score: ${finalScore}/100`);
  }
  
  static pauseProcess(processId: string): boolean {
    const timeout = runningProcesses.get(processId);
    if (timeout) {
      clearTimeout(timeout);
      runningProcesses.delete(processId);
    }
    
    return updateProcess(processId, { status: 'paused' });
  }
  
  static resumeProcess(processId: string): boolean {
    const process = getProcess(processId);
    if (!process || process.status !== 'paused') {
      return false;
    }
    
    updateProcess(processId, { status: 'capturing' });
    
    // Resume from where it left off
    ProcessRunner.executeProcess(processId);
    
    return true;
  }
  
  static stopProcess(processId: string): boolean {
    const timeout = runningProcesses.get(processId);
    if (timeout) {
      clearTimeout(timeout);
      runningProcesses.delete(processId);
    }
    
    return updateProcess(processId, { 
      status: 'completed',
      completedAt: new Date()
    });
  }
  
  // Helper methods
  private static updateStatus(processId: string, status: ProcessStatus, currentStep?: ProcessStepType, result?: any, error?: string): void {
    updateProcess(processId, { status, currentStep });
  }
  
  private static addUpdate(processId: string, update: Omit<ProcessUpdate, 'processId'>): void {
    addProcessUpdate({ ...update, processId });
  }
  

}

export default ProcessRunner; 