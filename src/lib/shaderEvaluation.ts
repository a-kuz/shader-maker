export interface ShaderEvaluationCriteria {
  visualAppeal: number;      // 0-25 points
  technicalQuality: number;  // 0-25 points
  promptAlignment: number;   // 0-25 points
  creativity: number;        // 0-25 points
}

export interface DetailedShaderEvaluation {
  overallScore: number;  // 0-100 total
  criteria: ShaderEvaluationCriteria;
  feedback: string;
  suggestions: string[];
  category: string;
  style: string;
  evaluatedAt: Date;
}

export function buildEvaluationPrompt(
  originalPrompt: string, 
  shaderCode: string, 
  screenshots: string[],
  category: string = 'abstract',
  style: string = 'vibrant'
): string {
  return `You are a professional shader art critic and technical evaluator. Analyze this GLSL shader based on multiple criteria.

Original Request: "${originalPrompt}"
Category: ${category}
Style: ${style}

EVALUATION CRITERIA (Score each 0-25 points):

1. VISUAL APPEAL (0-25):
   - Aesthetic beauty and visual impact
   - Color harmony and composition
   - Overall artistic quality

2. TECHNICAL QUALITY (0-25):
   - Code efficiency and performance
   - Mathematical accuracy
   - Proper GLSL techniques

3. PROMPT ALIGNMENT (0-25):
   - How well it matches the original request
   - Accuracy of interpretation
   - Completeness of requirements

4. CREATIVITY (0-25):
   - Originality and innovation
   - Unique visual approach
   - Artistic expression

Analyze the ${screenshots.length} screenshots showing the shader at different time values.

RESPONSE FORMAT (JSON):
{
  "overallScore": <total_0_to_100>,
  "criteria": {
    "visualAppeal": <0_to_25>,
    "technicalQuality": <0_to_25>, 
    "promptAlignment": <0_to_25>,
    "creativity": <0_to_25>
  },
  "feedback": "<detailed_analysis_paragraph>",
  "suggestions": [
    "<specific_improvement_1>",
    "<specific_improvement_2>",
    "<specific_improvement_3>"
  ]
}

Focus on constructive feedback that will help improve the shader while maintaining its core aesthetic vision.`;
}

export function buildImprovementPrompt(
  originalPrompt: string,
  currentCode: string,
  evaluation: DetailedShaderEvaluation,
  category: string,
  style: string
): string {
  const weakestCriteria = Object.entries(evaluation.criteria)
    .sort(([,a], [,b]) => a - b)
    .slice(0, 2)
    .map(([criterion, score]) => `${criterion} (${score}/25)`);

  return `You are a master shader programmer specializing in ${category} ${style} shaders. Improve the existing shader based on the evaluation feedback.

Original Request: "${originalPrompt}"
Current Overall Score: ${evaluation.overallScore}/100

AREAS NEEDING IMPROVEMENT:
${weakestCriteria.join(', ')}

SPECIFIC FEEDBACK:
${evaluation.feedback}

KEY IMPROVEMENT SUGGESTIONS:
${evaluation.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

IMPROVEMENT GUIDELINES:
- Focus on the lowest-scoring criteria first
- Maintain the core visual identity and aesthetic
- Preserve any successful elements from the current version
- Make targeted improvements rather than complete rewrites
- Ensure compatibility with ShaderToy format
 - Avoid recursion and nested functions; ShaderToy GLSL does not support them

Current Shader Code:
\`\`\`glsl
${currentCode}
\`\`\`

Return ONLY the improved shader code with no explanations or markdown formatting.
Use mainImage(out vec4 fragColor, in vec2 fragCoord) function compatible with ShaderToy.
Do not declare uniform variables - they are already available.
Avoid recursion and nested functions; ShaderToy GLSL does not support them.`;
}

export function parseEvaluationResponse(response: string): DetailedShaderEvaluation {
  try {
    // Extract JSON from response if it's wrapped in text
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      overallScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
      criteria: {
        visualAppeal: Math.max(0, Math.min(25, parsed.criteria?.visualAppeal || 0)),
        technicalQuality: Math.max(0, Math.min(25, parsed.criteria?.technicalQuality || 0)),
        promptAlignment: Math.max(0, Math.min(25, parsed.criteria?.promptAlignment || 0)),
        creativity: Math.max(0, Math.min(25, parsed.criteria?.creativity || 0))
      },
      feedback: parsed.feedback || 'No detailed feedback provided.',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      category: parsed.category || 'abstract',
      style: parsed.style || 'vibrant',
      evaluatedAt: new Date()
    };
  } catch (error) {
    console.error('Failed to parse evaluation response:', error);
    
    // Fallback to simple scoring
    const scoreMatch = response.match(/(\d+)\/100|(\d+) out of 100|score.*?(\d+)/i);
    const fallbackScore = scoreMatch ? parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3]) : 50;
    
    return {
      overallScore: Math.max(0, Math.min(100, fallbackScore)),
      criteria: {
        visualAppeal: Math.floor(fallbackScore * 0.25),
        technicalQuality: Math.floor(fallbackScore * 0.25),
        promptAlignment: Math.floor(fallbackScore * 0.25),
        creativity: Math.floor(fallbackScore * 0.25)
      },
      feedback: response || 'Evaluation parsing failed.',
      suggestions: ['Unable to parse specific suggestions'],
      category: 'abstract',
      style: 'vibrant',
      evaluatedAt: new Date()
    };
  }
}

export function generateImprovementGoals(evaluation: DetailedShaderEvaluation): string[] {
  const goals: string[] = [];
  const { criteria } = evaluation;
  
  // Generate specific improvement goals based on low scores
  if (criteria.visualAppeal < 18) {
    goals.push('Enhance visual appeal with better colors and composition');
  }
  
  if (criteria.technicalQuality < 18) {
    goals.push('Optimize code performance and improve technical implementation');
  }
  
  if (criteria.promptAlignment < 18) {
    goals.push('Better align the visual result with the original prompt requirements');
  }
  
  if (criteria.creativity < 18) {
    goals.push('Add more creative and original visual elements');
  }
  
  // Add general improvement if overall score is low
  if (evaluation.overallScore < 70) {
    goals.push('Overall enhancement of shader quality and visual impact');
  }
  
  return goals.length > 0 ? goals : ['Refine and polish the shader for better overall quality'];
} 