'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShaderProcess } from '@/lib/types';

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<ShaderProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/processes');
      if (!response.ok) {
        throw new Error('Failed to fetch processes');
      }
      const data = await response.json();
      setProcesses(data.processes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScreenshotsCount = (process: ShaderProcess) => {
    return process.steps
      .filter(step => step.type === 'capture' && step.output)
      .reduce((total, step) => {
        try {
          const output = typeof step.output === 'string' 
            ? JSON.parse(step.output) 
            : step.output;
          
          // Screenshots can be in output.screenshots or directly in output (if it's an array)
          const screenshots = output.screenshots || (Array.isArray(output) ? output : []);
          return total + (Array.isArray(screenshots) ? screenshots.length : 0);
        } catch {
          return total;
        }
      }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка процессов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Ошибка: {error}</p>
          <button
            onClick={fetchProcesses}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Все процессы</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Создать новый процесс
          </Link>
        </div>

        {processes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Нет созданных процессов</p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Создать первый процесс
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {processes.map((process) => (
              <Link
                key={process.id}
                href={`/processes/${process.id}`}
                className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(process.status)}`}>
                    {process.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(process.createdAt)}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {process.prompt}
                </h3>

                <div className="flex justify-between text-sm text-gray-600 mb-4">
                  <span>Шагов: {process.steps.length}</span>
                  <span>Скриншотов: {getScreenshotsCount(process)}</span>
                </div>

                {process.result && (
                  <div className="text-sm text-gray-600 mb-2">
                    <div>Итераций: {process.result.totalIterations}</div>
                    <div>Финальный счет: {process.result.finalScore}</div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  ID: {process.id.substring(0, 8)}...
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 