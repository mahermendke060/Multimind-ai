import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MODEL_MAPPING: { [key: string]: string } = {
  'gpt-5': 'openai/gpt-5',
  'claude-4-sonnet': 'anthropic/claude-3.5-sonnet',
  'gemini-2.5': 'google/gemini-2.5-flash-image-preview:free',
  'deepseek': 'deepseek/deepseek-chat-v3.1:free'
};

// Helper function for CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // Adjust origin as needed for security
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  // Handle preflight request
  return new NextResponse(null, {
    status: 204, // No Content
    headers: corsHeaders(),
  });
}

export async function POST(request: NextRequest) {
  try {
    // CORS headers for actual POST response
    const headers = corsHeaders();

    const { message, models } = await request.json();

    if (!message || !models || !Array.isArray(models)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return new NextResponse(
        JSON.stringify({ error: 'OpenRouter API key not configured' }),
        { status: 500, headers }
      );
    }

    const responsePromises = models.map(async (modelId: string) => {
      const openRouterModel = MODEL_MAPPING[modelId];
      if (!openRouterModel) {
        return {
          modelId,
          error: `Model ${modelId} not supported`
        };
      }

      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://multimind-ai.vercel.app/',
            'X-Title': 'AI Model Comparison App'
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: [
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 600,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          return {
            modelId,
            error: `API Error: ${errorData.error?.message || response.statusText}`
          };
        }

        const data = await response.json();
        return {
          modelId,
          content: data.choices[0]?.message?.content || 'No response content',
          usage: data.usage
        };
      } catch (error) {
        return {
          modelId,
          error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    });

    const results = await Promise.all(responsePromises);

    return new NextResponse(
      JSON.stringify({ responses: results }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Chat API error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders() }
    );
  }
}
