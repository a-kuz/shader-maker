import React from 'react';
import { ShaderData } from '@/lib/types';

interface ProcessStatsProps {
  shaderData: ShaderData;
  isAutoImproving: boolean;
  autoImprovementCycle: number;
  maxAutoImprovements: number;
}

export default function ProcessStats({ 
  shaderData, 
  isAutoImproving, 
  autoImprovementCycle, 
  maxAutoImprovements 
}: ProcessStatsProps) {
  const totalIterations = shaderData.iterations.length;
  const evaluatedIterations = [shaderData, ...shaderData.iterations].filter(item => item.evaluation).length;
  const averageScore = evaluatedIterations > 0 
    ? Math.round([shaderData, ...shaderData.iterations]
        .filter(item => item.evaluation)
        .reduce((sum, item) => sum + (item.evaluation?.score || 0), 0) / evaluatedIterations)
    : 0;
  
  const bestScore = Math.max(
    shaderData.evaluation?.score || 0,
    ...shaderData.iterations.map(iter => iter.evaluation?.score || 0)
  );
  
  const timeSpent = shaderData.iterations.length > 0 
    ? new Date(shaderData.iterations[shaderData.iterations.length - 1].createdAt).getTime() - 
      new Date(shaderData.createdAt).getTime()
    : 0;
    
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        📊 Process Statistics
        {isAutoImproving && (
          <span className="ml-3 text-sm bg-orange-600 px-2 py-1 rounded animate-pulse">
            Auto-improving {autoImprovementCycle}/{maxAutoImprovements}
          </span>
        )}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{totalIterations + 1}</div>
          <div className="text-xs text-gray-400">Total Versions</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${getScoreColor(bestScore)}`}>
            {bestScore > 0 ? `${bestScore}/100` : 'N/A'}
          </div>
          <div className="text-xs text-gray-400">Best Score</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
            {averageScore > 0 ? `${averageScore}/100` : 'N/A'}
          </div>
          <div className="text-xs text-gray-400">Average Score</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {timeSpent > 0 ? formatDuration(timeSpent) : '0s'}
          </div>
          <div className="text-xs text-gray-400">Time Spent</div>
        </div>
      </div>
      
      {bestScore > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
            <span>Quality Progress</span>
            <span>{bestScore}/100</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(bestScore)}`}
              style={{ width: `${Math.min(bestScore, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span className="text-gray-500">Target: 80</span>
            <span>100</span>
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <div className="text-sm text-gray-300 mb-2">Process Flow</div>
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-400">Generated</span>
          </div>
          
          {shaderData.screenshots && shaderData.screenshots.length > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-gray-400">Captured</span>
            </div>
          )}
          
          {shaderData.evaluation && (
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-400">Evaluated</span>
            </div>
          )}
          
          {totalIterations > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-400">Improved ({totalIterations}x)</span>
            </div>
          )}
          
          {bestScore >= 80 && (
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span className="text-yellow-400">🎉 Complete!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 