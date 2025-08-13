import React from 'react';
import { DetailedShaderEvaluation } from '@/lib/shaderEvaluation';

interface ShaderEvaluationDetailsProps {
  evaluation: DetailedShaderEvaluation;
  className?: string;
}

export default function ShaderEvaluationDetails({ 
  evaluation, 
  className = '' 
}: ShaderEvaluationDetailsProps) {
  const criteriaColors = {
    visualAppeal: 'bg-purple-500',
    technicalQuality: 'bg-blue-500', 
    promptAlignment: 'bg-green-500',
    creativity: 'bg-orange-500'
  };

  const criteriaLabels = {
    visualAppeal: 'Visual Appeal',
    technicalQuality: 'Technical Quality',
    promptAlignment: 'Prompt Alignment', 
    creativity: 'Creativity'
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getOverallScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Shader Evaluation</h3>
          <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getOverallScoreColor(evaluation.overallScore)}`}>
            {evaluation.overallScore}/100
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="capitalize bg-gray-100 px-2 py-1 rounded">{evaluation.category}</span>
          <span className="capitalize bg-gray-100 px-2 py-1 rounded">{evaluation.style}</span>
        </div>
      </div>

      {/* Criteria Breakdown */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-3">Evaluation Breakdown</h4>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(evaluation.criteria).map(([criterion, score]) => (
            <div key={criterion} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className={`w-3 h-3 rounded-full ${criteriaColors[criterion as keyof typeof criteriaColors]}`}
                />
                <span className="text-sm text-gray-700">
                  {criteriaLabels[criterion as keyof typeof criteriaLabels]}
                </span>
              </div>
              <span className={`text-sm font-medium ${getScoreColor(score, 25)}`}>
                {score}/25
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Progress Bars */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-3">Score Visualization</h4>
        <div className="space-y-3">
          {Object.entries(evaluation.criteria).map(([criterion, score]) => (
            <div key={criterion}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">
                  {criteriaLabels[criterion as keyof typeof criteriaLabels]}
                </span>
                <span className="text-sm font-medium text-gray-900">{score}/25</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${criteriaColors[criterion as keyof typeof criteriaColors]}`}
                  style={{ width: `${(score / 25) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Feedback */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-2">Detailed Feedback</h4>
        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded">
          {evaluation.feedback}
        </p>
      </div>

      {/* Improvement Suggestions */}
      {evaluation.suggestions && evaluation.suggestions.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-2">Improvement Suggestions</h4>
          <ul className="space-y-2">
            {evaluation.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Evaluation Meta */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Evaluated on {evaluation.evaluatedAt.toLocaleDateString()} at {evaluation.evaluatedAt.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
} 