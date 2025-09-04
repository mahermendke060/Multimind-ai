const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model mapping for OpenRouter
const MODEL_MAPPING = {
  'gpt-5': 'openai/gpt-5',
  'claude-4-sonnet': 'anthropic/claude-3.5-sonnet',
  'gemini-2.5': 'google/gemini-2.5-flash-image-preview:free',
  'deepseek': 'deepseek/deepseek-chat-v3.1:free'
};

app.post('/chat', async (req, res) => {
  try {
    const { message, models } = req.body;
    
    if (!message || !models || !Array.isArray(models)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    const OPENROUTER_API_KEY = functions.config().openrouter.api_key;
    
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    const responsePromises = models.map(async (modelId) => {
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
            'HTTP-Referer': 'https://your-project.web.app',
            'X-Title': 'AI Model Comparison App'
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: [{ role: 'user', content: message }],
            max_tokens: 800,
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
          error: `Request failed: ${error.message || 'Unknown error'}`
        };
      }
    });

    const results = await Promise.all(responsePromises);
    res.json({ responses: results });
    
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exports.api = functions.https.onRequest(app);