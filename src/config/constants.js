// Application Constants
export const APP_CONFIG = {
  NAME: 'AcceleraQA',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-powered learning assistant for pharmaceutical quality and compliance professionals'
};

// OpenAI Configuration
export const OPENAI_CONFIG = {
  MODEL: 'gpt-4',
  MAX_TOKENS: 1200,
  TEMPERATURE: 0.7,
  SYSTEM_PROMPT: `You are AcceleraQA, an AI assistant specialized in pharmaceutical quality and compliance.

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
};

// Timeout for OpenAI requests (in milliseconds)
export const OPENAI_TIMEOUT_MS = 30000;

// Auth0 Configuration
export const AUTH0_CONFIG = {
  DOMAIN: process.env.REACT_APP_AUTH0_DOMAIN,
  CLIENT_ID: process.env.REACT_APP_AUTH0_CLIENT_ID,
  AUDIENCE: process.env.REACT_APP_AUTH0_AUDIENCE,
  REDIRECT_URI: window.location.origin,
  LOGOUT_URI: window.location.origin,
  SCOPE: 'openid profile email'
};

// UI Constants
export const UI_CONFIG = {
  MESSAGE_HISTORY_DAYS: 30,
  MAX_DISPLAYED_CONVERSATIONS: 10,
  MAX_RESOURCES_PER_RESPONSE: 6,
  PAGINATION_SIZE: 20
};

// Error Messages
export const ERROR_MESSAGES = {
  API_KEY_NOT_CONFIGURED: '⚠️ OpenAI API key not configured. Please contact your administrator to set up the REACT_APP_OPENAI_API_KEY environment variable.',
  INVALID_API_KEY: '🔑 Invalid API key. Please check your OpenAI API key configuration.',
  RATE_LIMIT_EXCEEDED: '⏱️ API rate limit exceeded. Please wait a moment and try again.',
  QUOTA_EXCEEDED: '💳 API quota exceeded. Please check your OpenAI account billing and usage limits.',
  NETWORK_ERROR: '🌐 Network error. Please check your internet connection and try again.',
  REQUEST_TIMEOUT: '⏳ Request timed out. Please try again.',
  GENERIC_ERROR: 'Sorry, I encountered an error. Please try again.',
  AUTH_ERROR: 'Authentication error occurred. Please try signing in again.',
  STUDY_NOTES_GENERATION_FAILED: '❌ Failed to generate study notes. Please check your API configuration and try again.'
};

// Default Resources
export const DEFAULT_RESOURCES = [
  { title: "FDA Pharmaceutical Quality Resources Hub", type: "Portal", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources" },
  { title: "ICH Quality Guidelines Overview", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
  { title: "ISPE Pharmaceutical Engineering Resources", type: "Database", url: "https://www.ispe.org/pharmaceutical-engineering" }
];

// Validate environment variables
export const validateEnvironment = () => {
  const requiredVars = [
    'REACT_APP_AUTH0_DOMAIN',
    'REACT_APP_AUTH0_CLIENT_ID',
    'REACT_APP_OPENAI_API_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }
  
  return true;
};
