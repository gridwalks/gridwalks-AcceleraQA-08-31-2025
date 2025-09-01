import { generateResources } from '../utils/resourceGenerator';

// Real ChatGPT integration
export const getChatGPTResponse = async (message) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
  
  if (!API_KEY) {
    throw new Error('OpenAI API key not configured. Please add REACT_APP_OPENAI_API_KEY to your environment variables.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4", // or "gpt-3.5-turbo" for lower cost
        messages: [
          {
            role: "system",
            content: `You are AcceleraQA, an AI assistant specialized in pharmaceutical quality and compliance. 

Your expertise includes:
- Good Manufacturing Practice (GMP) and cGMP regulations
- Process Validation & Qualification (PQ, IQ, OQ)
- Corrective and Preventive Actions (CAPA) systems
- Regulatory Compliance (FDA, EMA, ICH guidelines)
- Quality Risk Management (ICH Q9, QRM principles)
- Documentation & Records Management (batch records, SOPs)
- Pharmaceutical Quality Systems (ICH Q10)
- Change Control and Configuration Management
- Supplier Quality Management
- Validation of computerized systems (CSV)
- Cleaning validation and contamination control
- Stability testing and shelf-life determination

Always provide accurate, professional responses with relevant regulatory references when possible. 
Keep responses concise but comprehensive (aim for 150-300 words unless more detail is specifically requested). 
Focus on practical implementation and current best practices.
When appropriate, mention specific FDA guidance documents, ICH guidelines, or industry standards.
Prioritize patient safety and product quality in all recommendations.`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 1200,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a moment.');
      } else if (response.status === 402) {
        throw new Error('API quota exceeded. Please check your OpenAI account billing.');
      } else {
        throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || 'Unknown error'}`);
      }
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Generate relevant resources based on the response content
    const resources = generateResources(message, aiResponse);

    return {
      answer: aiResponse,
      resources: resources
    };

  } catch (error) {
    console.error('ChatGPT API Error:', error);
    throw error;
  }
};
