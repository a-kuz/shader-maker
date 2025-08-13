export interface ShaderPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prompt: string;
  tags: string[];
  code?: string; // Optional pre-written code
}

export const SHADER_PRESETS: ShaderPreset[] = [
  // Abstract Category
  {
    id: 'colorful-spiral',
    name: 'Colorful Spiral',
    description: 'A mesmerizing spiral with shifting colors',
    category: 'abstract',
    difficulty: 'beginner',
    prompt: 'Create a colorful spiral that rotates and shifts through different colors over time',
    tags: ['spiral', 'colorful', 'rotation', 'simple']
  },
  {
    id: 'geometric-kaleidoscope',
    name: 'Geometric Kaleidoscope',
    description: 'Symmetrical geometric patterns that morph and change',
    category: 'abstract',
    difficulty: 'intermediate',
    prompt: 'Create a kaleidoscope effect with geometric patterns that morph and change symmetrically',
    tags: ['kaleidoscope', 'geometric', 'symmetry', 'morphing']
  },
  {
    id: 'flowing-liquid',
    name: 'Flowing Liquid',
    description: 'Smooth flowing liquid-like patterns',
    category: 'abstract',
    difficulty: 'intermediate',
    prompt: 'Create smooth flowing liquid patterns with metallic colors that move organically',
    tags: ['liquid', 'flow', 'organic', 'metallic']
  },

  // Nature Category
  {
    id: 'ocean-waves',
    name: 'Ocean Waves',
    description: 'Realistic ocean waves with foam and depth',
    category: 'nature',
    difficulty: 'advanced',
    prompt: 'Create realistic ocean waves with foam, depth, and natural wave movement',
    tags: ['ocean', 'waves', 'water', 'realistic', 'foam']
  },
  {
    id: 'campfire-flames',
    name: 'Campfire Flames',
    description: 'Flickering fire with realistic flame behavior',
    category: 'nature',
    difficulty: 'advanced',
    prompt: 'Create flickering campfire flames with realistic fire behavior and heat distortion',
    tags: ['fire', 'flames', 'heat', 'flickering', 'realistic']
  },
  {
    id: 'forest-sunlight',
    name: 'Forest Sunlight',
    description: 'Sunlight filtering through forest leaves',
    category: 'nature',
    difficulty: 'intermediate',
    prompt: 'Create dappled sunlight filtering through moving forest leaves with light rays',
    tags: ['forest', 'sunlight', 'leaves', 'rays', 'nature']
  },

  // Space Category
  {
    id: 'spiral-galaxy',
    name: 'Spiral Galaxy',
    description: 'A rotating spiral galaxy with stars and cosmic dust',
    category: 'space',
    difficulty: 'intermediate',
    prompt: 'Create a spiral galaxy with rotating arms, bright stars, and cosmic dust clouds',
    tags: ['galaxy', 'stars', 'cosmic', 'spiral', 'space']
  },
  {
    id: 'nebula-clouds',
    name: 'Nebula Clouds',
    description: 'Colorful cosmic nebula with gas clouds',
    category: 'space',
    difficulty: 'intermediate',
    prompt: 'Create a colorful nebula with swirling gas clouds and scattered stars',
    tags: ['nebula', 'clouds', 'cosmic', 'colorful', 'gas']
  },
  {
    id: 'wormhole-portal',
    name: 'Wormhole Portal',
    description: 'A swirling spacetime portal with distortion effects',
    category: 'space',
    difficulty: 'advanced',
    prompt: 'Create a wormhole portal with spacetime distortion and energy fields',
    tags: ['wormhole', 'portal', 'distortion', 'energy', 'spacetime']
  },

  // Mathematical Category
  {
    id: 'mandelbrot-zoom',
    name: 'Mandelbrot Set',
    description: 'Classic fractal with zoom animation',
    category: 'mathematical',
    difficulty: 'advanced',
    prompt: 'Create a Mandelbrot set fractal with smooth zooming animation and color gradients',
    tags: ['mandelbrot', 'fractal', 'zoom', 'mathematical', 'complex']
  },
  {
    id: 'julia-set',
    name: 'Julia Set',
    description: 'Dynamic Julia set fractal variations',
    category: 'mathematical',
    difficulty: 'advanced',
    prompt: 'Create a Julia set fractal that morphs through different parameter values over time',
    tags: ['julia', 'fractal', 'morphing', 'mathematical', 'dynamic']
  },
  {
    id: 'sine-wave-interference',
    name: 'Wave Interference',
    description: 'Multiple sine waves creating interference patterns',
    category: 'mathematical',
    difficulty: 'intermediate',
    prompt: 'Create multiple sine waves that interfere with each other creating complex patterns',
    tags: ['sine', 'waves', 'interference', 'mathematical', 'patterns']
  },

  // Artistic Category
  {
    id: 'impressionist-painting',
    name: 'Impressionist Style',
    description: 'Painterly effects reminiscent of impressionist art',
    category: 'artistic',
    difficulty: 'intermediate',
    prompt: 'Create impressionist-style color blending with painterly brush stroke effects',
    tags: ['impressionist', 'painterly', 'artistic', 'blending', 'strokes']
  },
  {
    id: 'minimalist-geometry',
    name: 'Minimalist Geometry',
    description: 'Clean geometric shapes with minimal color palette',
    category: 'artistic',
    difficulty: 'beginner',
    prompt: 'Create minimalist geometric art with clean shapes and a limited color palette',
    tags: ['minimalist', 'geometric', 'clean', 'simple', 'artistic']
  },
  {
    id: 'surreal-dreamscape',
    name: 'Surreal Dreamscape',
    description: 'Abstract surreal imagery with dream-like qualities',
    category: 'artistic',
    difficulty: 'advanced',
    prompt: 'Create a surreal dreamscape with floating elements and impossible geometries',
    tags: ['surreal', 'dreamscape', 'floating', 'impossible', 'abstract']
  }
];

// Quick starter prompts for immediate inspiration
export const QUICK_PROMPTS = [
  'A pulsing heart made of light',
  'Ripples in a cosmic pond',
  'Dancing northern lights',
  'Flowing lava patterns',
  'Electric storm clouds',
  'Crystalline ice formations',
  'Swirling paint colors',
  'Geometric light tunnels',
  'Floating soap bubbles',
  'Morphing DNA helixes'
];

export function getPresetsByCategory(category: string): ShaderPreset[] {
  return SHADER_PRESETS.filter(preset => preset.category === category);
}

export function getPresetsByDifficulty(difficulty: string): ShaderPreset[] {
  return SHADER_PRESETS.filter(preset => preset.difficulty === difficulty);
}

export function searchPresets(query: string): ShaderPreset[] {
  const searchTerm = query.toLowerCase();
  return SHADER_PRESETS.filter(preset => 
    preset.name.toLowerCase().includes(searchTerm) ||
    preset.description.toLowerCase().includes(searchTerm) ||
    preset.prompt.toLowerCase().includes(searchTerm) ||
    preset.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
}

export function getRandomPreset(): ShaderPreset {
  return SHADER_PRESETS[Math.floor(Math.random() * SHADER_PRESETS.length)];
}

export function getPresetById(id: string): ShaderPreset | undefined {
  return SHADER_PRESETS.find(preset => preset.id === id);
} 