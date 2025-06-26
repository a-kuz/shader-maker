import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { AIInteraction } from './types';

// Initialize the OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Time values used for shader capture (matching serverCapture.ts)
const TIME_VALUES = [0.1, 0.2, 0.5, 0.8, 1.2, 1.5, 3, 5, 10];

// Helper function to clean shader code by removing markdown code block markers
function cleanShaderCode(code: string): string {
  return code
    .replaceAll('```glsl', '')
    .replaceAll('```', '')
    .trim();
}

// Helper function to create AI interaction log
function createAIInteraction(
  type: AIInteraction['type'],
  prompt: string,
  response: string,
  startTime: number,
  model: string = 'gpt-4.1',
  tokenUsage?: AIInteraction['tokenUsage']
): AIInteraction {
  return {
    id: uuidv4(),
    type,
    model,
    prompt,
    response,
    timestamp: new Date(),
    duration: Date.now() - startTime,
    tokenUsage
  };
}

// Generate a shader based on a prompt
export async function generateShader(prompt: string): Promise<{ code: string; aiInteraction: AIInteraction }> {
  const startTime = Date.now();
  
  try {
    const systemPrompt = `You are a brain of the best shader programming tool in the world. 
    Create a GLSL shader in the style of ShaderToy. 
          The shader should be visually interesting and match user prompt.
          Return ONLY the complete shader code with no explanations or markdown formatting.
          The shader should be compatible with ShaderToy, using mainImage(out vec4 fragColor, in vec2 fragCoord) function.
          Please, do not declare any uniform variables (like iTime, iResolution, etc.) - they are already available in ShaderToy.`;
    
    const fullPrompt = `System: ${systemPrompt}\n\nUser: ${prompt}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.0 + Math.round(Math.random()/2*10) / 10,
    });

    const rawCode = response.choices[0]?.message?.content || "";
    const code = cleanShaderCode(rawCode);
    
    // Validate that we actually got code
    if (!code.trim()) {
      throw new Error('OpenAI returned empty shader code');
    }
    
    const aiInteraction = createAIInteraction(
      'generation',
      fullPrompt,
      rawCode,
      startTime,
      'gpt-4.1',
      response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined
    );

    return { code, aiInteraction };
  } catch (error) {
    console.error("Error generating shader:", error);
    
    const aiInteraction = createAIInteraction(
      'generation',
      `System: Generate shader for prompt: "${prompt}"\n\nUser: ${prompt}`,
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
    
    // Don't return empty code - throw error so the step fails properly
    throw new Error(`Failed to generate shader: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Evaluate a shader based on screenshots and the original prompt
export async function evaluateShader(
  prompt: string, 
  shaderCode: string, 
  screenshots: string[]
): Promise<{ score: number; feedback: string; aiInteraction: AIInteraction }> {
  const startTime = Date.now();
  
  try {
    const screenshotsBase64 = screenshots.slice(0, 5); // Limit to first 5 screenshots to keep request size manageable
    
    const systemPrompt = `You are a shader evaluation expert. Evaluate how well the provided shader matches the user's prompt.
          Analyze the screenshots of the shader in action and the shader code itself.
          Provide a score from 0-100 and detailed feedback on how the shader could be improved to better match the prompt.
          Что могло бы помочь лучше понять проблемы шейдера на ваш взгляд?`;
    
    // Create timestamped description of screenshots
    const timestampInfo = screenshotsBase64.map((_, index) => 
      `Screenshot ${index + 1}: iTime = ${TIME_VALUES[index] || 'unknown'}s`
    ).join('\n');
    
    const userPrompt = `Prompt: ${prompt}\n\nShader Code:\n\`\`\`glsl\n${shaderCode}\n\`\`\`\n\nScreenshots with timestamps:\n${timestampInfo}\n\nPlease evaluate how well this shader matches my prompt. Consider the animation progression across the different time values.`;
    
    const fullPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}\n\nScreenshots: ${screenshotsBase64.length} images provided with timestamps`;
    
    // Prepare content array with text and images
    const contentArray: any[] = [
      {
        type: "text",
        text: userPrompt
      }
    ];

    // Add images in the correct format with timestamp context
    screenshotsBase64.forEach((screenshot, index) => {
      // Check if screenshot already has data: prefix, if not add it
      const imageUrl = screenshot.startsWith('data:') 
        ? screenshot 
        : `data:image/png;base64,${screenshot}`;
        
      contentArray.push({
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      });
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: contentArray
        }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "";
    
    // Extract score and feedback
    const scoreMatch = content.match(/(\d+)\/100|score:?\s*(\d+)/i);
    const score = scoreMatch 
      ? parseInt(scoreMatch[1] || scoreMatch[2]) 
      : 50;
    
    const aiInteraction = createAIInteraction(
      'evaluation',
      fullPrompt,
      content,
      startTime,
      'gpt-4.1',
      response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined
    );
    
    return {
      score,
      feedback: content,
      aiInteraction
    };
  } catch (error) {
    console.error("Error evaluating shader:", error);
    
    const aiInteraction = createAIInteraction(
      'evaluation',
      `Evaluate shader for prompt: "${prompt}"`,
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
    
    return {
      score: 0,
      feedback: "Error evaluating shader: " + (error as Error).message,
      aiInteraction
    };
  }
}

// Improve a shader based on evaluation feedback
export async function improveShader(
  prompt: string, 
  originalShader: string, 
  feedback: string, 
  screenshots: string[]
): Promise<{ code: string; aiInteraction: AIInteraction }> {
  const startTime = Date.now();
  
  try {
    const screenshotsBase64 = screenshots.slice(0, 3);
    
    const systemPrompt = `You are a shader programming expert. Improve the provided GLSL shader based on the feedback and screenshots.
          Return ONLY the complete improved shader code with no explanations or markdown formatting.
          The shader should be compatible with ShaderToy, using mainImage(out vec4 fragColor, in vec2 fragCoord) function.
          DO NOT declare any uniform variables (like iTime, iResolution, etc.) - they are already available in ShaderToy.`;
    
    // Create timestamped description of screenshots
    const timestampInfo = screenshotsBase64.map((_, index) => 
      `Screenshot ${index + 1}: iTime = ${TIME_VALUES[index] || 'unknown'}s`
    ).join('\n');
    
    const userPrompt = `Original prompt: ${prompt}\n\nOriginal shader code:\n\`\`\`glsl\n${originalShader}\n\`\`\`\n\nFeedback: ${feedback}\n\nScreenshots with timestamps:\n${timestampInfo}\n\nPlease improve this shader to better match the prompt. Consider how the animation should progress across the different time values.`;
    
    const fullPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}\n\nScreenshots: ${screenshotsBase64.length} images provided with timestamps`;
    
    // Prepare content array with text and images
    const contentArray: any[] = [
      {
        type: "text",
        text: userPrompt
      }
    ];

    // Add images in the correct format with timestamp context
    screenshotsBase64.forEach((screenshot, index) => {
      // Check if screenshot already has data: prefix, if not add it
      const imageUrl = screenshot.startsWith('data:') 
        ? screenshot 
        : `data:image/jpeg;base64,${screenshot}`;
        
      contentArray.push({
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      });
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: contentArray
        }
      ],
      temperature: 0.7,
    });

    const rawCode = response.choices[0]?.message?.content || "";
    const code = cleanShaderCode(rawCode);
    
    // Validate that we actually got code
    if (!code.trim()) {
      throw new Error('OpenAI returned empty improved shader code');
    }
    
    const aiInteraction = createAIInteraction(
      'improvement',
      fullPrompt,
      rawCode,
      startTime,
      'gpt-4.1',
      response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined
    );

    return { code, aiInteraction };
  } catch (error) {
    console.error("Error improving shader:", error);
    
    createAIInteraction(
      'improvement',
      `Improve shader for prompt: "${prompt}" based on feedback: "${feedback}"`,
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
    
    // Don't return empty code - throw error so the step fails properly
    throw new Error(`Failed to improve shader: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function fixShaderCompilationError(
  prompt: string,
  shaderCode: string,
  errorMessage: string,
  infoLog?: string
): Promise<{ code: string; aiInteraction: AIInteraction }> {
  const startTime = Date.now();
  
  try {
    const systemPrompt = `You are a GLSL shader debugging expert. Fix compilation errors in the provided shader.
          Return ONLY the complete corrected shader code with no explanations or markdown formatting.
          The shader should be compatible with ShaderToy, using mainImage(out vec4 fragColor, in vec2 fragCoord) function.
          DO NOT declare any uniform variables (like iTime, iResolution, etc.) - they are already available in ShaderToy.
          Pay special attention to:
          - Duplicate uniform declarations
          - Syntax errors  
          - GLSL version compatibility
          - ShaderToy-specific conventions`;
    
    const userPrompt = `Original prompt: ${prompt}

Shader code with compilation error:
\`\`\`glsl
${shaderCode}
\`\`\`

Compilation Error: ${errorMessage}

${infoLog ? `Detailed Info Log: ${infoLog}` : ''}

Please fix the compilation errors while maintaining the shader's intended functionality.`;

    const fullPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.1,
    });

    const rawCode = response.choices[0]?.message?.content || "";
    const code = cleanShaderCode(rawCode);
    
    // Validate that we actually got code
    if (!code.trim()) {
      throw new Error('OpenAI returned empty fixed shader code');
    }
    
    const aiInteraction = createAIInteraction(
      'fix',
      fullPrompt,
      rawCode,
      startTime,
      'gpt-4.1',
      response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined
    );

    return { code, aiInteraction };
  } catch (error) {
    console.error("Error fixing shader compilation:", error);
    
    const aiInteraction = createAIInteraction(
      'fix',
      `Fix shader compilation error: "${errorMessage}" for prompt: "${prompt}"`,
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      startTime
    );
    
    // Don't return empty code - throw error so the step fails properly
    throw new Error(`Failed to fix shader: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 