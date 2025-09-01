import { OPENAI_CONFIG, ERROR_MESSAGES } from '../config/constants';
import { generateResources } from '../utils/resourceGenerator';

class OpenAIService {
  constructor() {
    this.apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  validateApiKey() {
    if (!this.apiKey) {
      throw new Error(ERROR_MESSAGES.API_KEY_NOT_CONFIGURED);
    }
  }

  async makeRequest(endpoint, options = {}) {
    this.validateApiKey();

    const defaultOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      ...options
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, defaultOptions);
      
      if (!response.ok) {
        await this.handleApiError(response);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }
      throw error;
    }
  }

  async handleApiError(response) {
    let errorData = {};
    
    try {
      errorData = await response.json();
    } catch {
      // If we can't parse the error response, use default messages
    }

    const errorMessage = errorData.error?.message || 'Unknown error';

    switch (response.status) {
      case 401:
        throw new Error(ERROR_MESSAGES.INVALID_API_KEY);
      case 402:
        throw new Error(ERROR_MESSAGES.QUOTA_EXCEEDED);
      case 429:
        throw new Error(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
      default:
        throw new Error(`OpenAI API error: ${response.status} ${errorMessage}`);
    }
  }

  createChatPayload(message) {
    return {
      model: OPENAI_CONFIG.MODEL,
      messages: [
        {
          role: "system",
          content: OPENAI_CONFIG.SYSTEM_PROMPT
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: OPENAI_CONFIG.MAX_TOKENS,
      temperature: OPENAI_CONFIG.TEMPERATURE
    };
  }

  async getChatResponse(message) {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Invalid message provided');
    }

    const payload = this.createChatPayload(message);
    
    try {
      const data = await this.makeRequest('/chat/completions', {
        body: JSON.stringify(payload)
      });

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated');
      }

      const aiResponse = data.choices[0].message.content;
      
      if (!aiResponse) {
        throw new Error('Empty response generated');
      }

      // Generate relevant resources based on the response content
      const resources = generateResources(message, aiResponse);

      return {
        answer: aiResponse,
        resources: resources,
        usage: data.usage || null
      };

    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  async generateStudyNotes(selectedMessages) {
    if (!selectedMessages || selectedMessages.length === 0) {
      throw new Error('No messages selected for study notes generation');
    }

    const studyContent = selectedMessages.map(msg => {
      if (msg.type === 'user') {
        return `Question: ${msg.content}`;
      } else {
        const resourceLinks = msg.resources ? 
          msg.resources.map(r => `- ${r.title} (${r.type}): ${r.url}`).join('\n') : '';
        return `Answer: ${msg.content}\n\nRelated Resources:\n${resourceLinks}`;
      }
    }).join('\n\n');

    const studyPrompt = `Create comprehensive study notes for pharmaceutical quality and compliance based on the following conversation topics. 

Format as organized study material with:
1. Executive Summary
2. Key Concepts and Definitions
3. Regulatory Requirements
4. Implementation Best Practices
5. Common Pitfalls to Avoid
6. Study Questions for Review

Include specific references to FDA, ICH, and other regulatory guidelines where applicable.

Conversation content:
${studyContent}`;

    return await this.getChatResponse(studyPrompt);
  }
}

// Create singleton instance
const openaiService = new OpenAIService();

export default openaiService;

// Export convenience function for backward compatibility
export const getChatGPTResponse = async (message) => {
  return await openaiService.getChatResponse(message);
};
