import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import fs from 'fs';
import { ShaderProcess, ProcessStep, ProcessUpdate, ProcessStatus, ProcessStepType } from './types';

// Store data in user's home directory to prevent dev server restarts
const DATA_DIR = join(homedir(), '.shader-maker');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = join(DATA_DIR, 'shader-history.db');

// Initialize database
let db: Database.Database;

export function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    try { (db as any).pragma('journal_mode = WAL'); } catch {}
    initDB();
  }
  return db;
}

function initDB() {
  // Legacy table for backward compatibility
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_history (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      code TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      screenshots TEXT,
      evaluation_score INTEGER,
      evaluation_feedback TEXT,
      evaluated_at TIMESTAMP
    );
  `);

  // New process-based tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS shader_processes (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      current_step TEXT,
      config TEXT NOT NULL,
      result TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS process_steps (
      id TEXT PRIMARY KEY,
      process_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      input TEXT,
      output TEXT,
      error TEXT,
      ai_interaction TEXT,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP,
      duration INTEGER,
      FOREIGN KEY (process_id) REFERENCES shader_processes (id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS process_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      process_id TEXT NOT NULL,
      status TEXT NOT NULL,
      current_step TEXT,
      step_progress TEXT,
      new_step_id TEXT,
      result TEXT,
      error TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (process_id) REFERENCES shader_processes (id)
    );
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shader_processes_created_at
    ON shader_processes (created_at)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_process_steps_process_id
    ON process_steps (process_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_process_steps_pid_type_status_started
    ON process_steps (process_id, type, status, started_at)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_process_updates_pid_created
    ON process_updates (process_id, created_at)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_process_steps_type_status
    ON process_steps (type, status)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_process_steps_pid_type_status
    ON process_steps (process_id, type, status)
  `);
  
  // Add migration for evaluation columns if they don't exist (legacy)
  try {
    db.exec(`ALTER TABLE prompt_history ADD COLUMN evaluation_score INTEGER;`);
  } catch (error) {
    // Column already exists or other error, continue
  }
  
  try {
    db.exec(`ALTER TABLE prompt_history ADD COLUMN evaluation_feedback TEXT;`);
  } catch (error) {
    // Column already exists or other error, continue
  }
  
  try {
    db.exec(`ALTER TABLE prompt_history ADD COLUMN evaluated_at TIMESTAMP;`);
  } catch (error) {
    // Column already exists or other error, continue
  }
  
  // Add migration for ai_interaction column in process_steps
  try {
    db.exec(`ALTER TABLE process_steps ADD COLUMN ai_interaction TEXT;`);
  } catch (error) {
    // Column already exists or other error, continue
  }
}

export interface PromptHistoryEntry {
  id: string;
  prompt: string;
  code: string;
  createdAt: Date;
  screenshots: string[];
  evaluation?: {
    score: number;
    feedback: string;
    evaluatedAt: Date;
  };
}

export function savePrompt(entry: Omit<PromptHistoryEntry, 'createdAt'>) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO prompt_history (id, prompt, code, screenshots)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run(
    entry.id, 
    entry.prompt, 
    entry.code, 
    JSON.stringify(entry.screenshots || [])
  );
}

export function getPromptHistory(limit = 10): PromptHistoryEntry[] {
  const db = getDB();
  const stmt = db.prepare(`
    SELECT id, prompt, code, created_at, screenshots, evaluation_score, evaluation_feedback, evaluated_at
    FROM prompt_history
    ORDER BY created_at DESC
    LIMIT ?
  `);
  
  const rows = stmt.all(limit);
  
  return rows.map(row => ({
    id: row.id,
    prompt: row.prompt,
    code: row.code,
    createdAt: new Date(row.created_at),
    screenshots: JSON.parse(row.screenshots || '[]'),
    evaluation: row.evaluation_score !== null ? {
      score: row.evaluation_score,
      feedback: row.evaluation_feedback,
      evaluatedAt: new Date(row.evaluated_at)
    } : undefined
  }));
}

export function getPromptById(id: string): PromptHistoryEntry | null {
  const db = getDB();
  const stmt = db.prepare(`
    SELECT id, prompt, code, created_at, screenshots, evaluation_score, evaluation_feedback, evaluated_at
    FROM prompt_history
    WHERE id = ?
  `);
  
  const row = stmt.get(id);
  
  if (!row) return null;
  
  return {
    id: row.id,
    prompt: row.prompt,
    code: row.code,
    createdAt: new Date(row.created_at),
    screenshots: JSON.parse(row.screenshots || '[]'),
    evaluation: row.evaluation_score !== null ? {
      score: row.evaluation_score,
      feedback: row.evaluation_feedback,
      evaluatedAt: new Date(row.evaluated_at)
    } : undefined
  };
}

export function saveEvaluation(id: string, score: number, feedback: string) {
  const db = getDB();
  const stmt = db.prepare(`
    UPDATE prompt_history
    SET evaluation_score = ?, evaluation_feedback = ?, evaluated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(score, feedback, id);
}

export function deletePrompt(id: string): boolean {
  const db = getDB();
  const stmt = db.prepare(`DELETE FROM prompt_history WHERE id = ?`);
  const result = stmt.run(id);
  return result.changes > 0;
}

// Import types needed for new process functions

export function createProcess(process: Omit<ShaderProcess, 'steps' | 'createdAt' | 'updatedAt'>): ShaderProcess {
  const db = getDB();
  const now = new Date();
  
  const stmt = db.prepare(`
    INSERT INTO shader_processes (id, prompt, status, current_step, config, result)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    process.id,
    process.prompt,
    process.status,
    process.currentStep || null,
    JSON.stringify(process.config),
    process.result ? JSON.stringify(process.result) : null
  );
  
  return {
    ...process,
    steps: [],
    createdAt: now,
    updatedAt: now
  };
}

export function updateProcess(
  id: string, 
  updates: Partial<Pick<ShaderProcess, 'status' | 'currentStep' | 'result' | 'completedAt'>>
): boolean {
  const db = getDB();
  const now = new Date();
  
  const setParts: string[] = ['updated_at = ?'];
  const values: any[] = [now.toISOString()];
  
  if (updates.status !== undefined) {
    setParts.push('status = ?');
    values.push(updates.status);
  }
  
  if (updates.currentStep !== undefined) {
    setParts.push('current_step = ?');
    values.push(updates.currentStep);
  }
  
  if (updates.result !== undefined) {
    setParts.push('result = ?');
    values.push(JSON.stringify(updates.result));
  }
  
  if (updates.completedAt !== undefined) {
    setParts.push('completed_at = ?');
    values.push(updates.completedAt.toISOString());
  }
  
  values.push(id);
  
  const stmt = db.prepare(`
    UPDATE shader_processes 
    SET ${setParts.join(', ')}
    WHERE id = ?
  `);
  
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function getProcess(id: string): ShaderProcess | null {
  const db = getDB();
  
  const processStmt = db.prepare(`
    SELECT * FROM shader_processes WHERE id = ?
  `);
  
  const stepsStmt = db.prepare(`
    SELECT * FROM process_steps WHERE process_id = ? ORDER BY started_at
  `);
  
  const processRow = processStmt.get(id);
  if (!processRow) return null;
  
  const stepRows = stepsStmt.all(id);
  
  return {
    id: processRow.id,
    prompt: processRow.prompt,
    status: processRow.status as ProcessStatus,
    currentStep: processRow.current_step as ProcessStepType,
    config: processRow.config ? JSON.parse(processRow.config) : {},
    result: processRow.result ? JSON.parse(processRow.result) : undefined,
    steps: stepRows.map(row => ({
      id: row.id,
      processId: row.process_id,
      type: row.type as ProcessStepType,
      status: row.status as ProcessStatus,
      input: row.input ? JSON.parse(row.input) : undefined,
      output: row.output ? JSON.parse(row.output) : undefined,
      error: row.error,
      aiInteraction: row.ai_interaction ? JSON.parse(row.ai_interaction) : undefined,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      duration: row.duration
    })),
    createdAt: new Date(processRow.created_at),
    updatedAt: new Date(processRow.updated_at),
    completedAt: processRow.completed_at ? new Date(processRow.completed_at) : undefined
  };
}

export function getAllProcesses(options?: {
  page?: number;
  limit?: number;
  includeSteps?: boolean;
}): { processes: ShaderProcess[], total: number } {
  const db = getDB();
  
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM shader_processes`);
  const countResult = countStmt.get();
  const total = countResult?.count || 0;
  
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;
  const includeSteps = options?.includeSteps ?? false;
  
  if (!includeSteps) {
    const stmt = db.prepare(`
      SELECT * FROM shader_processes 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(limit, offset);
    
    const processes = rows.map(row => ({
      id: row.id,
      prompt: row.prompt,
      status: row.status as ProcessStatus,
      currentStep: row.current_step as ProcessStepType,
      config: row.config ? JSON.parse(row.config) : {},
      result: row.result ? JSON.parse(row.result) : undefined,
      steps: [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    }));
    
    return { processes, total };
  }

  const stmt = db.prepare(`
    SELECT 
      p.*,
      COALESCE(stats.steps_count, 0) as steps_count,
      COALESCE(stats.captures_count, 0) as captures_count,
      latest_captures.latest_capture
    FROM shader_processes p
    LEFT JOIN (
      SELECT 
        ps.process_id,
        COUNT(*) as steps_count,
        COUNT(CASE WHEN ps.type = 'capture' AND ps.status = 'completed' THEN 1 END) as captures_count
      FROM process_steps ps
      GROUP BY ps.process_id
    ) stats ON p.id = stats.process_id
    LEFT JOIN (
      SELECT DISTINCT
        ps1.process_id,
        ps1.output as latest_capture
      FROM process_steps ps1
      WHERE ps1.type = 'capture' 
        AND ps1.status = 'completed' 
        AND ps1.output IS NOT NULL
        AND ps1.started_at = (
          SELECT MAX(ps2.started_at) 
          FROM process_steps ps2 
          WHERE ps2.process_id = ps1.process_id 
            AND ps2.type = 'capture' 
            AND ps2.status = 'completed'
            AND ps2.output IS NOT NULL
        )
    ) latest_captures ON p.id = latest_captures.process_id
    ORDER BY p.created_at DESC 
    LIMIT ? OFFSET ?
  `);
  
  const rows = stmt.all(limit, offset);
  
  const processIds = rows.map(r => r.id);
  let screenshotsByProcessId: Map<string, string[]> = new Map();
  
  if (processIds.length > 0) {
    const placeholders = processIds.map(() => '?').join(',');
    const screenshotsQuery = `
      SELECT 
        process_id, 
        output,
        started_at
      FROM process_steps 
      WHERE process_id IN (${placeholders}) 
        AND type = 'capture' 
        AND status = 'completed' 
        AND output IS NOT NULL
      ORDER BY process_id, started_at DESC
    `;
    
    const screenshotRows = db.prepare(screenshotsQuery).all(...processIds);
    
    for (const row of screenshotRows) {
      if (!screenshotsByProcessId.has(row.process_id)) {
        screenshotsByProcessId.set(row.process_id, []);
      }
      
      const existing = screenshotsByProcessId.get(row.process_id)!;
      if (existing.length < 2 && row.output) {
        try {
          const parsed = JSON.parse(row.output);
          const shots = Array.isArray(parsed) ? parsed : parsed?.screenshots || [];
          if (Array.isArray(shots) && shots.length > 0) {
            for (const shot of shots) {
              if (existing.length >= 2) break;
              if (shot && shot.startsWith('data:image/')) {
                existing.push(shot);
              }
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }

  const processes = rows.map(row => {
    const previewScreenshots = screenshotsByProcessId.get(row.id) || undefined;
    
    const mockSteps = Array.from({ length: row.steps_count }, (_, i) => ({
      id: `step-${i}`,
      processId: row.id,
      type: 'generation' as ProcessStepType,
      status: 'completed' as ProcessStatus,
      startedAt: new Date(row.created_at),
      completedAt: new Date(row.updated_at),
      duration: 1000
    }));
    
    return {
      id: row.id,
      prompt: row.prompt,
      status: row.status as ProcessStatus,
      currentStep: row.current_step as ProcessStepType,
      config: row.config ? JSON.parse(row.config) : {},
      result: row.result ? JSON.parse(row.result) : undefined,
      steps: mockSteps,
      previewScreenshots,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      stepsCount: row.steps_count,
      capturesCount: row.captures_count
    };
  });
  
  return { processes, total };
}

export function createProcessStep(step: Omit<ProcessStep, 'startedAt'>): ProcessStep {
  const db = getDB();
  const now = new Date();
  
  const stmt = db.prepare(`
    INSERT INTO process_steps (id, process_id, type, status, input, output, error, ai_interaction)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    step.id,
    step.processId,
    step.type,
    step.status,
    step.input ? JSON.stringify(step.input) : null,
    step.output ? JSON.stringify(step.output) : null,
    step.error || null,
    step.aiInteraction ? JSON.stringify(step.aiInteraction) : null
  );
  
  return {
    ...step,
    startedAt: now
  };
}

export function updateProcessStep(
  id: string, 
  updates: Partial<Pick<ProcessStep, 'status' | 'output' | 'error' | 'completedAt' | 'duration' | 'aiInteraction'>>
): boolean {
  const db = getDB();
  
  const setParts: string[] = [];
  const values: any[] = [];
  
  if (updates.status !== undefined) {
    setParts.push('status = ?');
    values.push(updates.status);
  }
  
  if (updates.output !== undefined) {
    setParts.push('output = ?');
    values.push(JSON.stringify(updates.output));
  }
  
  if (updates.error !== undefined) {
    setParts.push('error = ?');
    values.push(updates.error);
  }
  
  if (updates.aiInteraction !== undefined) {
    setParts.push('ai_interaction = ?');
    values.push(JSON.stringify(updates.aiInteraction));
  }
  
  if (updates.completedAt !== undefined) {
    setParts.push('completed_at = ?');
    values.push(updates.completedAt.toISOString());
  }
  
  if (updates.duration !== undefined) {
    setParts.push('duration = ?');
    values.push(updates.duration);
  }
  
  if (setParts.length === 0) return false;
  
  values.push(id);
  
  const stmt = db.prepare(`
    UPDATE process_steps 
    SET ${setParts.join(', ')}
    WHERE id = ?
  `);
  
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function addProcessUpdate(update: Omit<ProcessUpdate, 'processId' | 'timestamp'> & { processId: string }): void {
  const db = getDB();
  
  const stmt = db.prepare(`
    INSERT INTO process_updates (process_id, status, current_step, step_progress, new_step_id, result, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    update.processId,
    update.status,
    update.currentStep || null,
    update.stepProgress ? JSON.stringify(update.stepProgress) : null,
    update.newStep?.id || null,
    update.result ? JSON.stringify(update.result) : null,
    update.error || null
  );
}

export function getProcessUpdates(processId: string, since?: Date): ProcessUpdate[] {
  const db = getDB();
  
  let query = `
    SELECT * FROM process_updates 
    WHERE process_id = ?
  `;
  
  const params: any[] = [processId];
  
  if (since) {
    query += ` AND created_at > ?`;
    params.push(since.toISOString());
  }
  
  query += ` ORDER BY created_at`;
  
  const stmt = db.prepare(query);
  const rows = stmt.all(...params);
  
  return rows.map(row => ({
    processId: row.process_id,
    status: row.status as ProcessStatus,
    currentStep: row.current_step as ProcessStepType,
    stepProgress: row.step_progress ? JSON.parse(row.step_progress) : undefined,
    newStep: row.new_step_id ? { id: row.new_step_id } as ProcessStep : undefined,
    result: row.result ? JSON.parse(row.result) : undefined,
    error: row.error,
    timestamp: new Date(row.created_at)
  }));
}

export function deleteProcess(id: string): boolean {
  const db = getDB();
  
  // Delete in order due to foreign key constraints
  db.prepare(`DELETE FROM process_updates WHERE process_id = ?`).run(id);
  db.prepare(`DELETE FROM process_steps WHERE process_id = ?`).run(id);
  const result = db.prepare(`DELETE FROM shader_processes WHERE id = ?`).run(id);
  
  return result.changes > 0;
} 