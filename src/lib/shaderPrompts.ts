export interface ShaderCategory {
  name: string;
  description: string;
  systemPrompt: string;
  examples: string[];
}

export interface ShaderStyle {
  name: string;
  description: string;
  modifiers: string;
}

export const SHADER_CATEGORIES: Record<string, ShaderCategory> = {
  abstract: {
    name: "Abstract",
    description: "Non-representational visual patterns and effects",
    systemPrompt: `You are a master of abstract shader art. Create visually striking GLSL shaders that focus on:
    - Geometric patterns and mathematical beauty
    - Color harmonies and gradients
    - Flow and movement
    - Symmetry and fractals
    The shader should be mesmerizing and aesthetically pleasing with smooth animations.
    Return ONLY the complete shader code with no explanations or markdown formatting.
    Use mainImage(out vec4 fragColor, in vec2 fragCoord) function compatible with ShaderToy.
    Do not declare uniform variables - they are already available.
    ShaderToy GLSL does not support recursion or nested functions; avoid these patterns.`,
    examples: [
      "swirling colorful vortex",
      "geometric mandala pattern",
      "flowing liquid metal",
      "pulsing fractal waves"
    ]
  },
  
  nature: {
    name: "Nature",
    description: "Natural phenomena and organic effects",
    systemPrompt: `You are a specialist in realistic natural phenomena shaders. Create GLSL shaders that simulate:
    - Realistic physics and natural behavior
    - Organic textures and movements
    - Environmental effects
    - Procedural natural patterns
    Focus on realism and natural beauty with convincing physics simulation.
    Return ONLY the complete shader code with no explanations or markdown formatting.
    Use mainImage(out vec4 fragColor, in vec2 fragCoord) function compatible with ShaderToy.
    Do not declare uniform variables - they are already available.
    ShaderToy GLSL does not support recursion or nested functions; avoid these patterns.`,
    examples: [
      "ocean waves with foam",
      "flickering campfire flames",
      "swaying grass in wind",
      "rain drops on window"
    ]
  },
  
  space: {
    name: "Space & Sci-Fi",
    description: "Cosmic and futuristic effects",
    systemPrompt: `You are an expert in cosmic and sci-fi shader effects. Create GLSL shaders featuring:
    - Stellar phenomena and space environments
    - Futuristic UI and holographic effects
    - Energy fields and plasma
    - Cosmic scales and deep space beauty
    Emphasize the vastness and mystery of space with dramatic lighting and effects.
    Return ONLY the complete shader code with no explanations or markdown formatting.
    Use mainImage(out vec4 fragColor, in vec2 fragCoord) function compatible with ShaderToy.
    Do not declare uniform variables - they are already available.
    ShaderToy GLSL does not support recursion or nested functions; avoid these patterns.`,
    examples: [
      "spiral galaxy with stars",
      "nebula with cosmic dust",
      "pulsing energy shield",
      "wormhole portal effect"
    ]
  },
  
  mathematical: {
    name: "Mathematical",
    description: "Mathematical visualizations and fractals",
    systemPrompt: `You are a mathematical visualization expert. Create GLSL shaders that showcase:
    - Complex mathematical functions and equations
    - Fractal geometry and self-similarity
    - Mathematical beauty and precision
    - Educational mathematical concepts
    Focus on mathematical accuracy while maintaining visual appeal.
    Return ONLY the complete shader code with no explanations or markdown formatting.
    Use mainImage(out vec4 fragColor, in vec2 fragCoord) function compatible with ShaderToy.
    Do not declare uniform variables - they are already available.
    ShaderToy GLSL does not support recursion or nested functions; avoid these patterns.`,
    examples: [
      "mandelbrot set zoom",
      "julia set variations",
      "sine wave interference",
      "complex function visualization"
    ]
  },
  
  artistic: {
    name: "Artistic",
    description: "Creative and expressive visual art",
    systemPrompt: `You are a digital artist specializing in shader art. Create GLSL shaders with:
    - Strong artistic vision and emotion
    - Creative use of color and composition
    - Unique visual style and character
    - Expressive and evocative imagery
    Prioritize artistic impact and emotional resonance over technical complexity.
    Return ONLY the complete shader code with no explanations or markdown formatting.
    Use mainImage(out vec4 fragColor, in vec2 fragCoord) function compatible with ShaderToy.
    Do not declare uniform variables - they are already available.
    ShaderToy GLSL does not support recursion or nested functions; avoid these patterns.`,
    examples: [
      "impressionist color blending",
      "abstract expressionist paint",
      "minimalist geometric art",
      "surreal dreamscape"
    ]
  }
};

export const SHADER_STYLES: Record<string, ShaderStyle> = {
  minimalist: {
    name: "Minimalist",
    description: "Clean, simple, and elegant",
    modifiers: "Keep the design clean and minimal with simple shapes and limited colors. Focus on elegance through simplicity."
  },
  
  complex: {
    name: "Complex",
    description: "Rich detail and intricate patterns",
    modifiers: "Create intricate details with complex patterns and rich visual information. Use layered effects and sophisticated techniques."
  },
  
  vibrant: {
    name: "Vibrant",
    description: "Bold, saturated colors",
    modifiers: "Use bold, saturated colors with high contrast and vibrant hues. Make it visually striking and energetic."
  },
  
  monochrome: {
    name: "Monochrome",
    description: "Single color or grayscale",
    modifiers: "Use only grayscale or a single color with variations in brightness and saturation. Focus on form and contrast."
  },
  
  retro: {
    name: "Retro",
    description: "Vintage computer graphics style",
    modifiers: "Create a retro aesthetic reminiscent of 80s computer graphics with pixel-perfect edges and vintage color palettes."
  },
  
  organic: {
    name: "Organic",
    description: "Natural, flowing, curved forms",
    modifiers: "Use organic, flowing shapes with smooth curves and natural patterns. Avoid harsh geometric edges."
  }
};

export function categorizePrompt(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // Keywords for each category
  const categoryKeywords = {
    nature: ['water', 'fire', 'ocean', 'wave', 'flame', 'tree', 'forest', 'rain', 'cloud', 'wind', 'earth', 'mountain', 'river', 'flower', 'grass'],
    space: ['space', 'galaxy', 'star', 'nebula', 'planet', 'cosmic', 'universe', 'asteroid', 'comet', 'solar', 'black hole', 'wormhole', 'sci-fi', 'futuristic'],
    mathematical: ['fractal', 'mandelbrot', 'julia', 'fibonacci', 'golden ratio', 'equation', 'function', 'mathematical', 'geometry', 'pattern', 'spiral'],
    artistic: ['paint', 'brush', 'canvas', 'artistic', 'impressionist', 'abstract art', 'surreal', 'expressionist', 'minimalist art'],
    abstract: ['abstract', 'geometric', 'pattern', 'swirl', 'vortex', 'kaleidoscope', 'morphing', 'flowing', 'pulsing']
  };
  
  // Count keyword matches for each category
  const scores = Object.entries(categoryKeywords).map(([category, keywords]) => {
    const matches = keywords.filter(keyword => lowerPrompt.includes(keyword)).length;
    return { category, matches };
  });
  
  // Find category with most matches
  const bestMatch = scores.reduce((best, current) => 
    current.matches > best.matches ? current : best
  );
  
  // Default to abstract if no clear category
  return bestMatch.matches > 0 ? bestMatch.category : 'abstract';
}

export function detectStyle(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  const styleKeywords = {
    minimalist: ['minimal', 'simple', 'clean', 'elegant', 'basic'],
    complex: ['complex', 'detailed', 'intricate', 'elaborate', 'sophisticated'],
    vibrant: ['vibrant', 'colorful', 'bright', 'bold', 'saturated', 'neon'],
    monochrome: ['black and white', 'grayscale', 'monochrome', 'single color'],
    retro: ['retro', '80s', 'vintage', 'old school', 'pixel', 'classic'],
    organic: ['organic', 'flowing', 'smooth', 'curved', 'natural', 'soft']
  };
  
  // Find the first matching style
  for (const [style, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
      return style;
    }
  }
  
  return 'vibrant'; // Default style
}

export function buildEnhancedPrompt(userPrompt: string): {
  systemPrompt: string;
  enhancedUserPrompt: string;
  category: string;
  style: string;
} {
  const category = categorizePrompt(userPrompt);
  const style = detectStyle(userPrompt);
  
  const categoryConfig = SHADER_CATEGORIES[category];
  const styleConfig = SHADER_STYLES[style];
  
  const enhancedUserPrompt = `${userPrompt}

Style: ${styleConfig.modifiers}`;
  
  return {
    systemPrompt: categoryConfig.systemPrompt,
    enhancedUserPrompt,
    category,
    style
  };
} 