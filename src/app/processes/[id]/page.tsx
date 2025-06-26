'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShaderProcess, ProcessStep } from '@/lib/types';
import ShaderCanvas from '@/components/ShaderCanvas';

// Time values used for shader capture (matching serverCapture.ts and openai.ts)
const TIME_VALUES = [0.1, 0.2, 0.5, 0.8, 1.2, 1.5, 3, 5, 10];

export default function ProcessPage() {
  const params = useParams();
  const processId = params.id as string;
  
  const [process, setProcess] = useState<ShaderProcess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (processId) {
      fetchProcess();
    }
  }, [processId]); // fetchProcess is defined in useEffect, so no need to add it as dependency

  const fetchProcess = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/processes/${processId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Процесс не найден');
        }
        throw new Error('Не удалось загрузить процесс');
      }
      const data = await response.json();
      setProcess(data.process);
      
      // Автоматически выбрать последний шаг с результатом
      const stepsWithOutput = data.process.steps.filter((step: ProcessStep) => 
        step.output && (step.type === 'generation' || step.type === 'improvement' || step.type === 'fix')
      );
      if (stepsWithOutput.length > 0) {
        setSelectedStep(stepsWithOutput[stepsWithOutput.length - 1]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      completed: 'text-green-600 bg-green-100',
      failed: 'text-red-600 bg-red-100',
      running: 'text-blue-600 bg-blue-100',
      paused: 'text-yellow-600 bg-yellow-100',
      created: 'text-gray-600 bg-gray-100'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getStepTypeIcon = (type: string) => {
    const icons = {
      generation: '🎨',
      capture: '📸',
      evaluation: '📊',
      improvement: '⬆️',
      fix: '🔧',
      completion: '✅'
    };
    return icons[type as keyof typeof icons] || '📄';
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCurrentCode = () => {
    if (!selectedStep?.output) return '';
    
    try {
      const output = typeof selectedStep.output === 'string' 
        ? JSON.parse(selectedStep.output) 
        : selectedStep.output;
      return output.code || output.finalCode || '';
    } catch {
      return selectedStep.output;
    }
  };

  const getAIInteraction = (step: ProcessStep) => {
    if (!step.aiInteraction) return null;
    
    try {
      return typeof step.aiInteraction === 'string'
        ? JSON.parse(step.aiInteraction)
        : step.aiInteraction;
    } catch {
      return null;
    }
  };

  const getStepScreenshots = (step: ProcessStep): string[] => {
    if (step.type !== 'capture' || !step.output) return [];
    
    try {
      const output = typeof step.output === 'string' 
        ? JSON.parse(step.output) 
        : step.output;
      
      // Screenshots can be in output.screenshots or directly in output (if it's an array)
      const screenshots = output.screenshots || (Array.isArray(output) ? output : []);
      return Array.isArray(screenshots) ? screenshots : [];
    } catch (error) {
      console.error('Error parsing step screenshots:', error);
      return [];
    }
  };

  const getAllScreenshots = () => {
    if (!process) return [];
    
    return process.steps
      .filter(step => step.type === 'capture')
      .flatMap(step => getStepScreenshots(step))
      .filter(Boolean);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка процесса...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Ошибка: {error}</p>
          <Link
            href="/processes"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Вернуться к списку процессов
          </Link>
        </div>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Процесс не найден</p>
          <Link
            href="/processes"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Вернуться к списку процессов
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link
              href="/processes"
              className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
            >
              ← Все процессы
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {process.prompt}
            </h1>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(process.status)}`}>
                {process.status}
              </span>
              <span className="text-gray-500">ID: {process.id}</span>
              <span className="text-gray-500">
                Создан: {formatDate(process.createdAt)}
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Создать новый процесс
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline and Steps */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Шаги процесса</h2>
            <div className="space-y-3">
                                    {process.steps.map((step) => (
                <div
                  key={step.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedStep?.id === step.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedStep(step)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStepTypeIcon(step.type)}</span>
                      <span className="font-medium capitalize">{step.type}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(step.status)}`}>
                      {step.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDate(step.startedAt)}
                  </div>
                  {step.type === 'capture' && (
                    <div className="text-sm text-gray-500 mt-1">
                      Скриншотов: {getStepScreenshots(step).length}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Process Summary */}
            {process.result && (
              <div className="mt-6 p-4 bg-white rounded-lg border">
                <h3 className="font-semibold mb-2">Результат</h3>
                <div className="space-y-1 text-sm">
                  <div>Итерации: {process.result.totalIterations}</div>
                  <div>Финальный счет: {process.result.finalScore}</div>
                  <div>
                    Общее время: {Math.round(process.result.totalDuration / 1000)}с
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {selectedStep && (
              <div className="space-y-6">
                {/* Shader Canvas */}
                {(selectedStep.type === 'generation' || selectedStep.type === 'improvement' || selectedStep.type === 'fix') && selectedStep.output && (
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Предварительный просмотр шейдера</h3>
                                         <div className="w-full h-96 border rounded">
                       <ShaderCanvas 
                         shaderCode={getCurrentCode()}
                         onCompilationSuccess={() => {}}
                         onCompilationError={() => {}}
                         onScreenshotCapture={() => {}}
                         captureScreenshots={false}
                       />
                     </div>
                  </div>
                )}

                {/* Screenshots */}
                {selectedStep.type === 'capture' && (
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Скриншоты ({getStepScreenshots(selectedStep).length})
                    </h3>
                    
                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
                        <strong>Debug info:</strong>
                        <pre>{JSON.stringify(selectedStep.output, null, 2)}</pre>
                      </div>
                    )}
                    
                    {getStepScreenshots(selectedStep).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {getStepScreenshots(selectedStep).map((screenshot, index) => (
                          <div
                            key={index}
                            className="relative cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setFullscreenImage(screenshot)}
                          >
                            <img
                              src={screenshot}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-32 object-cover rounded border"
                            />
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                              iTime: {TIME_VALUES[index] || 'unknown'}s
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-8">
                        Нет доступных скриншотов для этого шага
                      </div>
                    )}
                  </div>
                )}

                {/* Code */}
                {(selectedStep.type === 'generation' || selectedStep.type === 'improvement' || selectedStep.type === 'fix') && selectedStep.output && (
                  <div className="bg-white rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Код шейдера</h3>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm">
                      <code>{getCurrentCode()}</code>
                    </pre>
                  </div>
                )}

                {/* AI Interaction */}
                {(() => {
                  const aiInteraction = getAIInteraction(selectedStep);
                  return aiInteraction && (
                    <div className="bg-white rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">AI Взаимодействие</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Промпт:</h4>
                          <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                            {aiInteraction.prompt}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Ответ:</h4>
                          <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                            {aiInteraction.response}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Error */}
                {selectedStep.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-800 mb-4">Ошибка</h3>
                    <pre className="text-red-700 text-sm whitespace-pre-wrap">
                      {selectedStep.error}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {!selectedStep && (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-500">Выберите шаг для просмотра деталей</p>
              </div>
            )}
          </div>
        </div>

        {/* All Screenshots Gallery */}
        {getAllScreenshots().length > 0 && (
          <div className="mt-8 bg-white rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Все скриншоты процесса</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {getAllScreenshots().map((screenshot, index) => (
                <div
                  key={index}
                  className="relative cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setFullscreenImage(screenshot)}
                >
                  <img
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-24 object-cover rounded border"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="max-w-4xl max-h-full">
            <img
              src={fullscreenImage}
              alt="Fullscreen screenshot"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
} 