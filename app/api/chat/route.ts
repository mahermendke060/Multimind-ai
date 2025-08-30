import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Model mapping for OpenRouter
const MODEL_MAPPING: { [key: string]: string } = {
  'gpt-5': 'openai/gpt-5',
  'claude-4-sonnet': 'anthropic/claude-3.5-sonnet',
  'gemini-2.5': 'google/gemini-2.5-flash-image-preview:free',
  'deepseek': 'deepseek/deepseek-chat-v3.1:free',
  'mistral-small': 'mistralai/mistral-small-3.2-24b-instruct:free',
  'gemma-3n': 'google/gemma-3n-e2b-it:free',
  'llama-3.3': 'meta-llama/llama-3.3-8b-instruct:free'
};

export async function POST(request: NextRequest) {
  try {
    const { message, models } = await request.json();

    if (!message || !models || !Array.isArray(models)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Make parallel requests to all selected models
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
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
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
            max_tokens: 1000,
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
    
    return NextResponse.json({ responses: results });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
