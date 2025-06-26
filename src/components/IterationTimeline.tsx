import React from 'react';
import { ShaderData, ShaderIteration } from '@/lib/types';

interface IterationTimelineProps {
  shaderData: ShaderData;
  currentIteration: number;
  onSelectIteration: (index: number) => void;
}

export default function IterationTimeline({ 
  shaderData, 
  currentIteration, 
  onSelectIteration 
}: IterationTimelineProps) {
  const allIterations = [
    {
      id: shaderData.id,
      code: shaderData.code,
      screenshots: shaderData.screenshots,
      evaluation: shaderData.evaluation,
      createdAt: shaderData.createdAt,
      isOriginal: true
    },
    ...shaderData.iterations.map(iter => ({ ...iter, isOriginal: false }))
  ];

  return (
    <div className="w-full p-4 bg-gray-900 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Development Timeline</h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-600"></div>
        
        {allIterations.map((iteration, index) => (
          <div 
            key={iteration.id}
            className={`relative mb-6 pl-14 cursor-pointer transition-all duration-200 ${
              index === currentIteration 
                ? 'bg-blue-900/30 rounded-lg p-3 -ml-3' 
                : 'hover:bg-gray-800/50 rounded-lg p-3 -ml-3'
            }`}
            onClick={() => onSelectIteration(index)}
          >
            {/* Timeline dot */}
            <div className={`absolute left-5 w-3 h-3 rounded-full border-2 ${
              index === currentIteration
                ? 'bg-blue-500 border-blue-400'
                : iteration.evaluation?.score && iteration.evaluation.score >= 80
                ? 'bg-green-500 border-green-400'
                : iteration.evaluation?.score && iteration.evaluation.score >= 60
                ? 'bg-yellow-500 border-yellow-400'
                : 'bg-gray-500 border-gray-400'
            }`}></div>
            
            <div className="min-h-[80px]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium">
                  {iteration.isOriginal ? 'Original' : `Iteration ${index}`}
                </h4>
                <div className="flex items-center space-x-2">
                  {iteration.evaluation && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      iteration.evaluation.score >= 80 
                        ? 'bg-green-900 text-green-200'
                        : iteration.evaluation.score >= 60
                        ? 'bg-yellow-900 text-yellow-200'
                        : 'bg-red-900 text-red-200'
                    }`}>
                      {iteration.evaluation.score}/100
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {new Date(iteration.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              {/* Screenshots preview */}
              {iteration.screenshots && iteration.screenshots.length > 0 && (
                <div className="flex space-x-2 mb-2">
                  {iteration.screenshots.slice(0, 3).map((screenshot, screenshotIndex) => (
                    <img
                      key={screenshotIndex}
                      src={screenshot}
                      alt={`Screenshot ${screenshotIndex + 1}`}
                      className="w-12 h-12 object-cover rounded border border-gray-600"
                    />
                  ))}
                  {iteration.screenshots.length > 3 && (
                    <div className="w-12 h-12 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                      <span className="text-xs text-gray-300">+{iteration.screenshots.length - 3}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Evaluation feedback preview */}
              {iteration.evaluation && (
                <p className="text-sm text-gray-300"
                   style={{
                     display: '-webkit-box',
                     WebkitLineClamp: 2,
                     WebkitBoxOrient: 'vertical',
                     overflow: 'hidden'
                   }}>
                  {iteration.evaluation.feedback}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 