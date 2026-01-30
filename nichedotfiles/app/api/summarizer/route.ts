import { NextRequest, NextResponse } from 'next/server';
import { generateVideoScriptPrompt } from './prompt';
interface ScriptRequest {
  markdownContent: string;
  model?: string;
  openRouterApiKey?: string;
}

// Generate a 60-second video script from vulnerability markdown
async function generateVideoScript(
  markdownContent: string,
  model: string,
  apiKey: string
): Promise<string> {
const prompt = generateVideoScriptPrompt(markdownContent);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/your-repo',
        'X-Title': 'Vulnerability Video Script Generator',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500, // Roughly 150-200 words
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content;
    
    if (!script) {
      throw new Error('No script generated from LLM');
    }
    
    return script.trim();
  } catch (error) {
    console.error('Error generating script with LLM:', error);
    throw error;
  }
}

// Count approximate words in script
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

// Estimate speaking duration (assumes ~2.5 words per second average)
function estimateDuration(text: string): number {
  const words = countWords(text);
  return Math.round(words / 2.5);
}

export async function POST(request: NextRequest) {
  try {
    const body: ScriptRequest = await request.json();
    const { 
      markdownContent, 
      model = 'anthropic/claude-3.5-sonnet', 
      openRouterApiKey 
    } = body;

    if (!markdownContent) {
      return NextResponse.json(
        { error: 'Markdown content is required' },
        { status: 400 }
      );
    }

    // Check for API key in request or environment
    const apiKey = openRouterApiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'OpenRouter API key is required. Provide it in request body or set OPENROUTER_API_KEY environment variable.' 
        },
        { status: 400 }
      );
    }

    console.log('Generating video script with', model);

    // Generate the script
    const script = await generateVideoScript(markdownContent, model, apiKey);

    // Calculate metadata
    const wordCount = countWords(script);
    const estimatedDuration = estimateDuration(script);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `video-script-${timestamp}.txt`;

    return NextResponse.json({
      success: true,
      script,
      wordCount,
      estimatedDuration,
      filename,
      warning: estimatedDuration > 65 ? 'Script may exceed 60 seconds' : null,
    });

  } catch (error) {
    console.error('Error in script generator:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate script',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
