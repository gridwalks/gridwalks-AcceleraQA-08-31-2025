// netlify/functions/chatgpt-learning.js - DEDICATED FUNCTION FOR LEARNING SUGGESTIONS
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify authorization
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body);
    const { model = 'gpt-4o-mini', messages, temperature = 0.7, max_tokens = 1500 } = body;

    console.log(`🧠 Processing learning suggestion request with model: ${model}`);

    // Validate required fields
    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Messages array is required' })
      };
    }

    // Ensure we're using cost-effective models for learning suggestions
    const allowedModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    const selectedModel = allowedModels.includes(model) ? model : 'gpt-4o-mini';

    console.log(`📚 Generating learning suggestions using ${selectedModel}`);

    // Call OpenAI API with the specified model
    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: messages,
      temperature: temperature,
      max_tokens: max_tokens,
      response_format: { type: "json_object" }, // Ensure JSON response for parsing
      functions: null, // Not using function calling for learning suggestions
      stream: false
    });

    console.log(`✅ Learning suggestions generated successfully`);
    console.log(`📊 Token usage - Prompt: ${completion.usage.prompt_tokens}, Completion: ${completion.usage.completion_tokens}, Total: ${completion.usage.total_tokens}`);

    // Calculate approximate cost based on model
    const costs = {
      'gpt-4o-mini': { input: 0.15, output: 0.60 }, // per 1M tokens
      'gpt-4o': { input: 2.50, output: 10.00 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 }
    };

    const modelCosts = costs[selectedModel] || costs['gpt-4o-mini'];
    const estimatedCost = (
      (completion.usage.prompt_tokens * modelCosts.input / 1000000) +
      (completion.usage.completion_tokens * modelCosts.output / 1000000)
    ).toFixed(6);

    // Return the completion with metadata
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        choices: completion.choices,
        usage: completion.usage,
        model: selectedModel,
        estimatedCost: `$${estimatedCost}`,
        purpose: 'learning-suggestions',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Error in ChatGPT Learning function:', error);

    // Handle different types of errors
    if (error.code === 'insufficient_quota') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'OpenAI quota exceeded',
          message: 'Please check your OpenAI billing and usage limits'
        })
      };
    }

    if (error.code === 'rate_limit_exceeded') {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        })
      };
    }

    if (error.code === 'invalid_api_key') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Invalid API key',
          message: 'Please check your OpenAI API key configuration'
        })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate learning suggestions',
        message: error.message || 'Unknown error occurred',
        code: error.code || 'unknown_error'
      })
    };
  }
};
