import React, { useState, useMemo } from 'react';
import { SHADER_PRESETS, QUICK_PROMPTS, ShaderPreset, getPresetsByCategory, searchPresets, getRandomPreset } from '@/lib/shaderPresets';

interface ShaderPresetBrowserProps {
  onSelectPreset: (prompt: string) => void;
  className?: string;
}

export default function ShaderPresetBrowser({ onSelectPreset, className = '' }: ShaderPresetBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const categories = [
    { id: 'all', name: 'All', count: SHADER_PRESETS.length },
    { id: 'abstract', name: 'Abstract', count: getPresetsByCategory('abstract').length },
    { id: 'nature', name: 'Nature', count: getPresetsByCategory('nature').length },
    { id: 'space', name: 'Space', count: getPresetsByCategory('space').length },
    { id: 'mathematical', name: 'Mathematical', count: getPresetsByCategory('mathematical').length },
    { id: 'artistic', name: 'Artistic', count: getPresetsByCategory('artistic').length },
  ];

  const filteredPresets = useMemo(() => {
    let presets = searchQuery 
      ? searchPresets(searchQuery) 
      : selectedCategory === 'all' 
        ? SHADER_PRESETS 
        : getPresetsByCategory(selectedCategory);
    
    return presets;
  }, [selectedCategory, searchQuery]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRandomPreset = () => {
    const randomPreset = getRandomPreset();
    onSelectPreset(randomPreset.prompt);
  };

  const handleQuickPrompt = (prompt: string) => {
    onSelectPreset(prompt);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Shader Presets</h3>
          <button
            onClick={handleRandomPreset}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 transition-colors"
          >
            🎲 Random
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Quick Start</h4>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.slice(0, 6).map((prompt, index) => (
            <button
              key={index}
              onClick={() => handleQuickPrompt(prompt)}
              className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs hover:bg-gray-100 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Preset List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredPresets.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No presets found matching your criteria
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPresets.map(preset => (
              <div key={preset.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">{preset.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(preset.difficulty)}`}>
                        {preset.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{preset.description}</p>
                    
                    {showDetails === preset.id && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded italic">
                          "{preset.prompt}"
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {preset.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectPreset(preset.prompt)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        Use This
                      </button>
                      <button
                        onClick={() => setShowDetails(showDetails === preset.id ? null : preset.id)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        {showDetails === preset.id ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 