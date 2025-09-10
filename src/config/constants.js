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

You are AcceleraQA, an AI assistant specialized in pharmaceutical quality, compliance, and clinical trial integrity, you provide guidance across regulated environments by combining deep domain expertise with current global standards.

1. Quality & Manufacturing
- Good Manufacturing Practice (GMP / cGMP): Compliance with FDA, EMA, and ICH standards for safe, consistent drug manufacturing.
- Process Validation & Qualification (IQ, OQ, PQ): Lifecycle-based validation and qualification approaches for equipment, utilities, and processes.
- Corrective and Preventive Actions (CAPA): Root cause analysis, remediation, and preventive strategies to avoid recurrence.
- Pharmaceutical Quality Systems (ICH Q10): Design, implementation, and continuous improvement of robust PQS.
- Change Control & Configuration Management: Structured risk-based change management to maintain compliance.
- Supplier & Vendor Quality Management: Qualification, audits, and oversight of third-party manufacturing and service providers.
- Cleaning Validation & Contamination Control: Best practices for preventing cross-contamination and ensuring sterile assurance.
- Stability Testing & Shelf-Life Determination: Guidance on designing stability programs, interpreting data, and supporting regulatory submissions.

 2. Clinical Trials & GCP
- Good Clinical Practice (ICH E6 R2/R3): Ensuring subject protection, informed consent, and reliable trial data.
- Regulatory Compliance: Alignment with FDA, EMA, and ICH expectations for investigational drug development.
- Documentation & Records (eTMF, SOPs, batch records): Lifecycle management of critical clinical and manufacturing documentation.
- Patient-Centric Trial Design: Emphasis on safety, rights, and well-being of subjects.
- Data Integrity (ALCOA+): Assuring accurate, complete, and reliable data throughout clinical development.

 3. Digital Systems & Emerging Technologies
- Computerized System Validation (CSV, 21 CFR Part 11, Annex 11): Validation of digital systems, audit trails, and electronic signatures.
- Digital Health Technologies (DHTs): Regulatory guidance on wearables, sensors, ePRO/eCOA, mobile apps, and decentralized trial tools.
- Technology-Enabled Risk Management: Leveraging automation and digital tools to support risk-based monitoring and trial efficiency.

4. Privacy, Security & Data Protection
- HIPAA (U.S.): Application of privacy and security rules for protected health information in clinical research and healthcare.
- GDPR (EU): Data minimization, lawful processing, cross-border data transfer compliance, and patient consent requirements.
- Global Privacy Frameworks: Familiarity with international data protection requirements and their impact on clinical trials.
- Data Integrity & Cybersecurity: Safeguards for patient data confidentiality, accuracy, and resilience against breaches.

 Guiding Principles
- Patient Safety First: Every recommendation prioritizes subject protection and product quality.
- Regulatory Alignment: All insights are anchored in global standards (FDA, EMA, ICH, HIPAA, GDPR).
- Adaptability: Support for both traditional pharma operations and modern digital health-enabled trials.
- Continuous Improvement: Commitment to evolving best practices in compliance, technology, and patient engagement.

Always provide accurate, professional responses with relevant regulatory references when possible. 
Keep responses concise but comprehensive (aim for 150-300 words unless more detail is specifically requested). 
Focus on practical implementation and current best practices.
When appropriate, mention specific FDA, EMA, MHRA, PDMA, NMPA guidance documents, ICH guidelines, or industry standards.
Prioritize patient safety and product quality in all recommendations.`
};

// Auth0 Configuration with enhanced validation
export const AUTH0_CONFIG = {
  DOMAIN: process.env.REACT_APP_AUTH0_DOMAIN,
  CLIENT_ID: process.env.REACT_APP_AUTH0_CLIENT_ID,
  AUDIENCE: process.env.REACT_APP_AUTH0_AUDIENCE,
  ROLES_CLAIM: process.env.REACT_APP_AUTH0_ROLES_CLAIM,
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

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_AI_SUGGESTIONS: process.env.REACT_APP_ENABLE_AI_SUGGESTIONS !== 'false'
};

// Enhanced Error Messages with troubleshooting
export const ERROR_MESSAGES = {
  API_KEY_NOT_CONFIGURED: `⚠️ OpenAI API key not configured.

TROUBLESHOOTING STEPS:
1. Check that REACT_APP_OPENAI_API_KEY is set in your environment
2. If deploying to Netlify, add the variable in Site Settings > Environment Variables
3. Get your API key from: https://platform.openai.com/account/api-keys
4. Contact your administrator if you need access`,

  INVALID_API_KEY: `🔑 Invalid OpenAI API key. 

TROUBLESHOOTING STEPS:
1. Verify your API key is correct and active
2. Check your OpenAI account billing status
3. Generate a new API key if needed: https://platform.openai.com/account/api-keys`,

  RATE_LIMIT_EXCEEDED: '⏱️ API rate limit exceeded. Please wait a moment and try again.',
  
  QUOTA_EXCEEDED: `💳 OpenAI API quota exceeded. 

TROUBLESHOOTING STEPS:
1. Check your usage: https://platform.openai.com/account/usage
2. Review your billing: https://platform.openai.com/account/billing
3. Upgrade your plan if needed`,

  NETWORK_ERROR: '🌐 Network error. Please check your internet connection and try again.',
  GENERIC_ERROR: 'Sorry, I encountered an error. Please try again.',
  
  AUTH_ERROR: `🔐 Authentication error occurred. 

TROUBLESHOOTING STEPS:
1. Check that all Auth0 environment variables are set correctly
2. Verify your Auth0 application configuration
3. Try signing out and signing in again
4. Contact support if the problem persists`,

  STUDY_NOTES_GENERATION_FAILED: '❌ Failed to generate study notes. Please check your API configuration and try again.'
};

// Enhanced environment variable validation with detailed feedback
export const validateEnvironment = () => {
  const requiredVars = [
    'REACT_APP_AUTH0_DOMAIN',
    'REACT_APP_AUTH0_CLIENT_ID', 
    'REACT_APP_OPENAI_API_KEY'
  ];
  
  const missing = requiredVars.filter(varName => {
    const value = process.env[varName];
    return !value || value.trim() === '' || value === 'your_value_here';
  });

  if (missing.length > 0) {
    console.error('❌ CONFIGURATION ERROR: Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   • ${varName}`);
    });
    
    console.error('\n📋 SETUP INSTRUCTIONS:');
    console.error('1. Copy .env.example to .env');
    console.error('2. Replace placeholder values with real credentials');
    console.error('3. For Netlify: Add variables in Site Settings > Environment Variables');
    console.error('4. Ensure variable names start with REACT_APP_');
    console.error('\n🔗 HELPFUL LINKS:');
    console.error('• OpenAI API Keys: https://platform.openai.com/account/api-keys');
    console.error('• Auth0 Dashboard: https://manage.auth0.com/');
    console.error('• Netlify Environment Variables: https://docs.netlify.com/configure-builds/environment-variables/');

    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate Auth0 domain format
  if (AUTH0_CONFIG.DOMAIN && !AUTH0_CONFIG.DOMAIN.includes('.auth0.com')) {
    console.error('❌ CONFIGURATION ERROR: Invalid Auth0 domain format');
    console.error('   Expected format: your-tenant.auth0.com or your-tenant.us.auth0.com');
    throw new Error('Invalid Auth0 domain format');
  }
  
  // Validate OpenAI API key format
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
  if (apiKey && !apiKey.startsWith('sk-')) {
    console.error('❌ CONFIGURATION ERROR: Invalid OpenAI API key format');
    console.error('   Expected format: sk-proj-... or sk-...');
    throw new Error('Invalid OpenAI API key format');
  }

  console.log('✅ Environment validation passed');
  return true;
};

// Additional validation helper for deployment
export const validateDeploymentEnvironment = () => {
  const issues = [];
  
  // Check if we're in a build environment
  const isBuild = process.env.NODE_ENV === 'production' || process.env.CI;
  
  if (isBuild) {
    // Additional production checks
    if (!process.env.REACT_APP_OPENAI_API_KEY) {
      issues.push('OpenAI API key not set for production build');
    }
    
    if (!process.env.REACT_APP_AUTH0_DOMAIN) {
      issues.push('Auth0 domain not set for production build');
    }
    
    if (!process.env.REACT_APP_AUTH0_CLIENT_ID) {
      issues.push('Auth0 client ID not set for production build');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

// Default Resources
export const DEFAULT_RESOURCES = [
  { title: "FDA Pharmaceutical Quality Resources Hub", type: "Portal", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources" },
  { title: "ICH Quality Guidelines Overview", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
  { title: "ISPE Pharmaceutical Engineering Resources", type: "Database", url: "https://www.ispe.org/pharmaceutical-engineering" }
];
