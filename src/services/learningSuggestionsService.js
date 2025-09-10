// src/services/learningSuggestionsService.js - ENHANCED VERSION WITH CONFIGURABLE MODELS
// Token acquisition is handled via a provider function that the application
// must set at runtime. This avoids direct coupling with any particular Auth0
// implementation and ensures the service only requests a token when one has
// been properly initialized by the host application.

import { AUTH0_CONFIG } from '../config/constants';
import { getUserId } from './authService';

class LearningSuggestionsService {
  constructor() {
    this.apiUrl = '/.netlify/functions/neon-db';
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
    this.defaultChatCount = 5; // Default number of conversations to analyze
    // Function that returns a Promise resolving to an auth token. Should be
    // provided by the application (e.g., Auth0's getAccessTokenSilently).
    this.tokenProvider = null;
  }

  // Allow the host application to supply a token provider function
  setTokenProvider(provider) {
    this.tokenProvider = provider;
  }

  // Helper to obtain a token using the configured provider
  async getAuthToken() {
    if (typeof this.tokenProvider !== 'function') {
      throw new Error('Auth token provider not set');
    }
    return await this.tokenProvider({
      authorizationParams: {
        audience: AUTH0_CONFIG.AUDIENCE
      }
    });
  }

  /**
   * Gets learning suggestions based on user's recent conversations
   * @param {string} userId - User identifier
   * @param {number} chatCount - Number of recent chats to analyze (configurable from admin)
   * @returns {Promise<Object[]>} - Array of learning suggestions
   */
  async getLearningSuggestions(userId, chatCount = null) {
    try {
      console.log('🎓 Getting learning suggestions for user:', userId);

      // Get admin configuration for chat count
      const adminConfig = await this.getAdminConfig();
      const analysisCount = chatCount || adminConfig.learningChatCount || this.defaultChatCount;
      
      console.log(`📊 Analyzing last ${analysisCount} conversations for learning suggestions`);

      // Check cache first
      const cacheKey = `suggestions_${userId}_${analysisCount}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          console.log('📋 Returning cached learning suggestions');
          return cached.data;
        }
      }

      // Fetch recent conversations from database
      const conversations = await this.fetchRecentConversations(userId, analysisCount * 2); // Fetch double to ensure we have enough

      if (!conversations || conversations.length === 0) {
        console.log('⚠️ No conversation history found for learning suggestions');
        return this.getDefaultSuggestions();
      }

      // Filter for conversations with meaningful content (at least 2 messages)
      const meaningfulConversations = conversations
        .filter(conv => conv.messageCount >= 2)
        .slice(0, analysisCount);

      if (meaningfulConversations.length === 0) {
        console.log('⚠️ No meaningful conversations found for learning suggestions');
        return this.getDefaultSuggestions();
      }

      // Generate suggestions using ChatGPT-4o-mini
      const suggestions = await this.generateAISuggestions(meaningfulConversations, userId);

      // Cache the results
      this.cache.set(cacheKey, {
        data: suggestions,
        timestamp: Date.now()
      });

      console.log(`✅ Generated ${suggestions.length} learning suggestions`);
      return suggestions;

    } catch (error) {
      console.error('❌ Error generating learning suggestions:', error);
      return this.getDefaultSuggestions();
    }
  }

  /**
   * Fetch recent conversations from Neon database
   */
  async fetchRecentConversations(userId, limit) {
    try {
      let token = null;
      try {
        token = await this.getAuthToken();
      } catch (err) {
        console.warn('Token retrieval failed for fetchRecentConversations:', err.message);
      }

      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'get_recent_conversations',
          userId: userId,
          data: { limit }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch conversations');
      }

      return result.conversations;
    } catch (error) {
      console.error('Error fetching recent conversations:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered learning suggestions using ChatGPT-4o-mini
   */
  async generateAISuggestions(conversations, userId) {
    try {
      // Analyze conversation content to extract learning context
      const conversationAnalysis = this.analyzeConversations(conversations);
      
      // Create prompt for ChatGPT-4o-mini
      const prompt = this.createLearningPrompt(conversationAnalysis);

      // Call ChatGPT API using 4o-mini model (configured for learning suggestions)
      let token = null;
      try {
        token = await this.getAuthToken();
      } catch (err) {
        console.warn('Token retrieval failed for generateAISuggestions:', err.message);
      }

      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch('/.netlify/functions/chatgpt-learning', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Use 4o-mini for cost-effective learning suggestions
          messages: [
            {
              role: 'system',
              content: `You are an expert pharmaceutical quality and compliance learning advisor. 
                       Generate personalized learning suggestions based on conversation history.
                       Focus on practical, actionable learning resources for pharmaceutical professionals.
                       Return suggestions in JSON format with title, description, difficulty, relevance, and category.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate AI suggestions');
      }

      // Parse and format the suggestions
      return this.formatAISuggestions(result.choices[0].message.content);

    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return this.getDefaultSuggestions();
    }
  }

  /**
   * Analyze conversations to extract learning themes and topics
   */
  analyzeConversations(conversations) {
    const topics = new Set();
    const questionTypes = new Set();
    const complexityLevels = [];
    const industryContext = new Set();

    conversations.forEach(conv => {
      if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach(msg => {
          if (msg.role === 'user' && msg.content) {
            // Extract pharmaceutical topics
            const pharmaTopics = this.extractPharmaTopics(msg.content);
            pharmaTopics.forEach(topic => topics.add(topic));

            // Determine question complexity
            const complexity = this.assessComplexity(msg.content);
            complexityLevels.push(complexity);

            // Extract question type
            const qType = this.classifyQuestionType(msg.content);
            questionTypes.add(qType);

            // Extract industry context
            const context = this.extractIndustryContext(msg.content);
            context.forEach(ctx => industryContext.add(ctx));
          }
        });
      }
    });

    return {
      topics: Array.from(topics),
      questionTypes: Array.from(questionTypes),
      averageComplexity: complexityLevels.reduce((a, b) => a + b, 0) / complexityLevels.length || 1,
      industryContext: Array.from(industryContext),
      conversationCount: conversations.length
    };
  }

  /**
   * Extract pharmaceutical topics from conversation content
   */
  extractPharmaTopics(content) {
    const topics = [];
    const contentLower = content.toLowerCase();

    const topicKeywords = {
      'GMP': ['gmp', 'good manufacturing practice', 'current good manufacturing'],
      'Validation': ['validation', 'qualify', 'protocol', 'IQ', 'OQ', 'PQ'],
      'CAPA': ['capa', 'corrective action', 'preventive action', 'root cause'],
      'Quality Control': ['qc', 'quality control', 'testing', 'analytical', 'laboratory'],
      'Quality Assurance': ['qa', 'quality assurance', 'audit', 'inspection'],
      'Regulatory Affairs': ['fda', 'ema', 'ich', 'regulatory', 'submission', 'guidance'],
      'Manufacturing': ['manufacturing', 'production', 'batch', 'lot', 'process'],
      'Documentation': ['sop', 'procedure', 'record', 'documentation', 'batch record'],
      'Change Control': ['change control', 'change management', 'deviation', 'impact assessment'],
      'Risk Management': ['risk', 'risk management', 'hazard', 'risk assessment', 'FMEA']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Assess the complexity level of a question
   */
  assessComplexity(content) {
    const complexityIndicators = {
      beginner: ['what is', 'define', 'explain', 'basic', 'introduction'],
      intermediate: ['how to', 'process', 'implement', 'procedure', 'best practice'],
      advanced: ['optimize', 'troubleshoot', 'complex', 'integrate', 'strategic', 'regulatory impact']
    };

    const contentLower = content.toLowerCase();
    let score = 1; // Default to beginner

    if (complexityIndicators.intermediate.some(indicator => contentLower.includes(indicator))) {
      score = 2;
    }
    if (complexityIndicators.advanced.some(indicator => contentLower.includes(indicator))) {
      score = 3;
    }

    // Adjust based on question length and technical terms
    if (content.length > 200) score += 0.5;
    if (content.split(' ').length > 30) score += 0.5;

    return Math.min(3, score);
  }

  /**
   * Classify the type of question being asked
   */
  classifyQuestionType(content) {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('what') || contentLower.includes('define')) return 'Definition';
    if (contentLower.includes('how') || contentLower.includes('procedure')) return 'Procedure';
    if (contentLower.includes('why') || contentLower.includes('reason')) return 'Explanation';
    if (contentLower.includes('when') || contentLower.includes('timeline')) return 'Timeline';
    if (contentLower.includes('best practice') || contentLower.includes('recommend')) return 'Best Practice';
    if (contentLower.includes('compliance') || contentLower.includes('requirement')) return 'Compliance';
    
    return 'General';
  }

  /**
   * Extract industry context from content
   */
  extractIndustryContext(content) {
    const contexts = [];
    const contentLower = content.toLowerCase();

    const contextKeywords = {
      'Pharmaceutical Manufacturing': ['tablet', 'capsule', 'injection', 'API', 'excipient'],
      'Biotechnology': ['biologic', 'vaccine', 'protein', 'cell culture', 'fermentation'],
      'Medical Device': ['device', 'instrument', 'diagnostic', 'implant'],
      'Clinical Trials': ['clinical', 'trial', 'study', 'patient', 'protocol'],
      'Regulatory Submission': ['submission', 'filing', 'application', 'dossier', 'CTD']
    };

    for (const [context, keywords] of Object.entries(contextKeywords)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        contexts.push(context);
      }
    }

    return contexts;
  }

  /**
   * Create a focused prompt for ChatGPT learning suggestions
   */
  createLearningPrompt(analysis) {
    return `Based on the following conversation analysis, generate 4-6 personalized learning suggestions for a pharmaceutical professional:

CONVERSATION ANALYSIS:
- Topics discussed: ${analysis.topics.join(', ') || 'General pharmaceutical topics'}
- Question types: ${analysis.questionTypes.join(', ')}
- Average complexity level: ${analysis.averageComplexity.toFixed(1)}/3.0
- Industry context: ${analysis.industryContext.join(', ') || 'General pharmaceutical'}
- Number of conversations analyzed: ${analysis.conversationCount}

Please generate learning suggestions that:
1. Build upon the topics they've already shown interest in
2. Fill knowledge gaps indicated by their question patterns
3. Progress appropriately from their current complexity level
4. Are relevant to their industry context
5. Include a mix of theoretical knowledge and practical application

For each suggestion, provide:
- title: Brief, engaging title
- description: 2-3 sentence description of what they'll learn
- difficulty: "Beginner", "Intermediate", or "Advanced"
- relevance: Score from 1-5 based on their conversation history
- category: Primary topic category
- estimatedTime: Learning time estimate
- actionable: Specific next step they can take

Return the response in valid JSON format as an array of suggestion objects.`;
  }

  /**
   * Format AI-generated suggestions into consistent structure
   */
  formatAISuggestions(aiResponse) {
    try {
      // Try to parse JSON response
      let suggestions = JSON.parse(aiResponse);
      
      // Ensure it's an array
      if (!Array.isArray(suggestions)) {
        suggestions = [suggestions];
      }

      // Format and validate each suggestion
      return suggestions.map((suggestion, index) => ({
        id: `ai-suggestion-${Date.now()}-${index}`,
        title: suggestion.title || `Learning Suggestion ${index + 1}`,
        description: suggestion.description || 'AI-generated learning recommendation',
        difficulty: suggestion.difficulty || 'Intermediate',
        relevance: Math.min(5, Math.max(1, suggestion.relevance || 4)),
        category: suggestion.category || 'General',
        estimatedTime: suggestion.estimatedTime || '30-45 minutes',
        actionable: suggestion.actionable || 'Start learning about this topic',
        source: 'AI-Generated',
        type: 'suggestion',
        generatedAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
      return this.getDefaultSuggestions();
    }
  }

  /**
   * Get admin configuration including chat count for learning suggestions
   */
  async getAdminConfig() {
    try {
      let token = null;
      try {
        token = await this.getAuthToken();
      } catch (err) {
        console.warn('Token retrieval failed for getAdminConfig:', err.message);
      }
      const userId = await getUserId();

      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'get_admin_config',
          configKey: 'learning_suggestions'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.config || {};
      }
    } catch (error) {
      console.error('Error fetching admin config:', error);
    }

    return {
      learningChatCount: this.defaultChatCount,
      enableAISuggestions: true
    };
  }

  /**
   * Update admin configuration for learning suggestions
   */
  async updateAdminConfig(config) {
    try {
      let token = null;
      try {
        token = await this.getAuthToken();
      } catch (err) {
        console.warn('Token retrieval failed for updateAdminConfig:', err.message);
      }
      const userId = await getUserId();

      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'update_admin_config',
          configKey: 'learning_suggestions',
          config: config
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating admin config:', error);
      return false;
    }
  }

  /**
   * Get default learning suggestions when AI generation fails
   */
  getDefaultSuggestions() {
    return [
      {
        id: 'default-1',
        title: 'GMP Fundamentals Review',
        description: 'Strengthen your foundation in Good Manufacturing Practices with current FDA and ICH guidelines.',
        difficulty: 'Beginner',
        relevance: 4,
        category: 'GMP',
        estimatedTime: '45 minutes',
        actionable: 'Review FDA CFR Part 211 requirements',
        source: 'Default',
        type: 'suggestion'
      },
      {
        id: 'default-2',
        title: 'Validation Protocol Best Practices',
        description: 'Learn to write effective IQ, OQ, and PQ protocols that meet regulatory expectations.',
        difficulty: 'Intermediate',
        relevance: 4,
        category: 'Validation',
        estimatedTime: '60 minutes',
        actionable: 'Practice writing a simple equipment validation protocol',
        source: 'Default',
        type: 'suggestion'
      },
      {
        id: 'default-3',
        title: 'CAPA Investigation Techniques',
        description: 'Master root cause analysis and develop effective corrective and preventive actions.',
        difficulty: 'Intermediate',
        relevance: 3,
        category: 'CAPA',
        estimatedTime: '50 minutes',
        actionable: 'Apply the 5 Whys technique to a recent quality issue',
        source: 'Default',
        type: 'suggestion'
      }
    ];
  }

  /**
   * Clear cache for a specific user or all users
   */
  clearCache(userId = null) {
    if (userId) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(userId));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Refresh suggestions for a user (clears cache and regenerates)
   */
  async refreshSuggestions(userId, chatCount = null) {
    this.clearCache(userId);
    return await this.getLearningSuggestions(userId, chatCount);
  }
}

export default new LearningSuggestionsService();
