import React, { useState } from 'react';
import { ShaderData } from '@/lib/types';

interface CodeComparisonProps {
  shaderData: ShaderData;
  currentIteration: number;
}

export default function CodeComparison({ shaderData, currentIteration }: CodeComparisonProps) {
  const [showComparison, setShowComparison] = useState(false);
  const [compareWith, setCompareWith] = useState(0);

  const allVersions = [
    { code: shaderData.code, label: 'Original', index: 0 },
    ...shaderData.iterations.map((iter, index) => ({
      code: iter.code,
      label: `Iteration ${index + 1}`,
      index: index + 1
    }))
  ];

  const currentCode = currentIteration === 0 
    ? shaderData.code 
    : shaderData.iterations[currentIteration - 1]?.code || '';

  const compareCode = compareWith === 0 
    ? shaderData.code 
    : shaderData.iterations[compareWith - 1]?.code || '';

  const calculateChanges = (oldCode: string, newCode: string) => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    
    let added = 0;
    let removed = 0;
    let modified = 0;
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      
      if (oldLine === undefined) {
        added++;
      } else if (newLine === undefined) {
        removed++;
      } else if (oldLine.trim() !== newLine.trim()) {
        modified++;
      }
    }
    
    return { added, removed, modified, total: maxLines };
  };

  const changes = calculateChanges(compareCode, currentCode);
  const changePercentage = Math.round((changes.added + changes.removed + changes.modified) / changes.total * 100);

  if (!showComparison) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setShowComparison(true)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200 flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>Compare Code Versions</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Code Comparison</h3>
        <button
          onClick={() => setShowComparison(false)}
          className="text-gray-400 hover:text-white transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Compare:</label>
            <select
              value={compareWith}
              onChange={(e) => setCompareWith(Number(e.target.value))}
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 text-sm"
            >
              {allVersions.map((version) => (
                <option key={version.index} value={version.index}>
                  {version.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="text-gray-400 text-sm">
            vs
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Current:</label>
            <div className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 text-sm">
              {currentIteration === 0 ? 'Original' : `Iteration ${currentIteration}`}
            </div>
          </div>
        </div>
        
        {/* Change statistics */}
        <div className="mt-3 flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">+{changes.added} lines</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-400">-{changes.removed} lines</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-400">~{changes.modified} modified</span>
          </div>
          <div className="text-gray-500">
            ({changePercentage}% changed)
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Left side - Compare version */}
        <div>
          <div className="text-sm font-medium text-gray-300 mb-2">
            {compareWith === 0 ? 'Original' : `Iteration ${compareWith}`}
          </div>
          <pre className="bg-gray-900 p-3 rounded text-xs overflow-auto max-h-96 border border-gray-700">
            <code className="text-gray-300">{compareCode}</code>
          </pre>
        </div>
        
        {/* Right side - Current version */}
        <div>
          <div className="text-sm font-medium text-gray-300 mb-2">
            {currentIteration === 0 ? 'Original' : `Iteration ${currentIteration}`}
            <span className="ml-2 text-xs text-blue-400">(Current)</span>
          </div>
          <pre className="bg-gray-900 p-3 rounded text-xs overflow-auto max-h-96 border border-blue-600">
            <code className="text-gray-300">{currentCode}</code>
          </pre>
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="mt-4 flex justify-center space-x-2">
        <button
          onClick={() => navigator.clipboard.writeText(compareCode)}
          className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-200"
        >
          Copy {compareWith === 0 ? 'Original' : `v${compareWith}`}
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(currentCode)}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200"
        >
          Copy Current
        </button>
      </div>
    </div>
  );
} 