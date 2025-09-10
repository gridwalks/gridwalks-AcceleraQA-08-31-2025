// src/services/learningSuggestionsService.js - ENHANCED VERSION WITH CONFIGURABLE MODELS

import { AUTH0_CONFIG } from '../config/constants';
import { getUserId } from './authService';

class LearningSuggestionsService {
  constructor() {
    this.apiUrl = '/.netlify/functions/neon-db';
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    this.defaultChatCount = 5; // Default number of conversations to analyze
    this.tokenProvider = null; // Function that returns a Promise<string>
  }

  setTokenProvider(provider) {
    this.tokenProvider = provider;
  }

  async getAuthToken() {
    if (typeof this.tokenProvider !== 'function') {
      throw new Error('Auth token provider not set');
    }
    return this.tokenProvider({
      authorizationParams: { audience: AUTH0_CONFIG.AUDIENCE },
    });
  }

  // Helper: build headers consistently
  async buildHeaders(passedUserId = null) {
    let token = null;
    try {
      token = await this.getAuthToken();
    } catch {
      // no token available; proceed unauthenticated
    }

    // prefer caller-supplied userId, otherwise try authService
    let effectiveUserId = passedUserId;
    if (!effectiveUserId) {
      try {
        effectiveUserId = await getUserId();
      } catch {
        // ignore if not available
      }
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (effectiveUserId) headers['x-user-id'] = effectiveUserId;
    return headers;
  }

  /**
   * Gets learning suggestions based on user's recent conversations
   */
  async getLearningSuggestions(userId, chatCount = null) {
    try {
      console.log('🎓 Getting learning suggestions for user:', userId);

      const adminConfig = await this.getAdminConfig(userId);
      const analysisCount =
        chatCount ?? adminConfig.learningChatCount ?? this.defaultChatCount;

      console.log(`📊 Analyzing last ${analysisCount} conversations for learning suggestions`);

      // cache
      const cacheKey = `suggestions_${userId}_${analysisCount}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        console.log('📋 Returning cached learning suggestions');
        return cached.data;
      }

      // get recent conversations (fetch more to filter meaningful)
      const conversations = await this.fetchRecentConversations(userId, analysisCount * 2);

      if (!conversations?.length) {
        console.log('⚠️ No conversation history found for learning suggestions');
        return this.getDefaultSuggestions();
      }

      const meaningfulConversations = conversations
        .filter((c) => c.messageCount >= 2)
        .slice(0, analysisCount);

      if (!meaningfulConversations.length) {
        console.log('⚠️ No meaningful conversations found for learning suggestions');
        return this.getDefaultSuggestions();
      }

      const suggestions = await this.generateAISuggestions(meaningfulConversations, userId);

      this.cache.set(cacheKey, { data: suggestions, timestamp: Date.now() });
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
      const headers = await this.buildHeaders(userId);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'get_recent_conversations',
          userId,
          data: { limit },
        }),
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
      const conversationAnalysis = this.analyzeConversations(conversations);
      const prompt = this.createLearningPrompt(conversationAnalysis);
      const headers = await this.buildHeaders(userId);

      const response = await fetch('/.netlify/functions/chatgpt-learning', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                `You are an expert pharmaceutical quality and compliance learning advisor.
                 Generate personalized learning suggestions based on conversation history.
                 Focus on practical, actionable learning resources for pharmaceutical professionals.
                 Return suggestions in JSON format with title, description, difficulty, relevance, category, estimatedTime, actionable.`,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate AI suggestions');
      }

      return this.formatAISuggestions(result.choices?.[0]?.message?.content ?? '[]');
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return this.getDefaultSuggestions();
    }
  }

  analyzeConversations(conversations) {
    const topics = new Set();
    const questionTypes = new Set();
    const complexityLevels = [];
    const industryContext = new Set();

    conversations.forEach((conv) => {
      if (conv.messages?.length) {
        conv.messages.forEach((msg) => {
          if (msg.role === 'user' && msg.content) {
            this.extractPharmaTopics(msg.content).forEach((t) => topics.add(t));
            complexityLevels.push(this.assessComplexity(msg.content));
            questionTypes.add(this.classifyQuestionType(msg.content));
            this.extractIndustryContext(msg.content).forEach((c) => industryContext.add(c));
          }
        });
      }
    });

    return {
      topics: [...topics],
      questionTypes: [...questionTypes],
      averageComplexity:
        complexityLevels.length
          ? complexityLevels.reduce((a, b) => a + b, 0) / complexityLevels.length
          : 1,
      industryContext: [...industryContext],
      conversationCount: conversations.length,
    };
  }

  extractPharmaTopics(content) {
    const topics = [];
    const contentLower = content.toLowerCase();
    const topicKeywords = {
      GMP: ['gmp', 'good manufacturing practice', 'current good manufacturing'],
      Validation: ['validation', 'qualify', 'protocol', 'iq', 'oq', 'pq'],
      CAPA: ['capa', 'corrective action', 'preventive action', 'root cause'],
      'Quality Control': ['qc', 'quality control', 'testing', 'analytical', 'laboratory'],
      'Quality Assurance': ['qa', 'quality assurance', 'audit', 'inspection'],
      'Regulatory Affairs': ['fda', 'ema', 'ich', 'regulatory', 'submission', 'guidance'],
      Manufacturing: ['manufacturing', 'production', 'batch', 'lot', 'process'],
      Documentation: ['sop', 'procedure', 'record', 'documentation', 'batch record'],
      'Change Control': ['change control', 'change management', 'deviation', 'impact assessment'],
      'Risk Management': ['risk', 'risk management', 'hazard', 'risk assessment', 'fmea'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some((k) => contentLower.includes(k))) topics.push(topic);
    }
    return topics;
  }

  assessComplexity(content) {
    const indicators = {
      beginner: ['what is', 'define', 'explain', 'basic', 'introduction'],
      intermediate: ['how to', 'process', 'implement', 'procedure', 'best practice'],
      advanced: ['optimize', 'troubleshoot', 'complex', 'integrate', 'strategic', 'regulatory impact'],
    };

    const c = content.toLowerCase();
    let score = 1;
    if (indicators.intermediate.some((i) => c.includes(i))) score = 2;
    if (indicators.advanced.some((i) => c.includes(i))) score = 3;
    if (content.length > 200) score += 0.5;
    if (content.split(' ').length > 30) score += 0.5;
    return Math.min(3, score);
  }

  classifyQuestionType(content) {
    const c = content.toLowerCase();
    if (c.includes('what') || c.includes('define')) return 'Definition';
    if (c.includes('how') || c.includes('procedure')) return 'Procedure';
    if (c.includes('why') || c.includes('reason')) return 'Explanation';
    if (c.includes('when') || c.includes('timeline')) return 'Timeline';
    if (c.includes('best practice') || c.includes('recommend')) return 'Best Practice';
    if (c.includes('compliance') || c.includes('requirement')) return 'Compliance';
    return 'General';
  }

  extractIndustryContext(content) {
    const contexts = [];
    const c = content.toLowerCase();
    const contextKeywords = {
      'Pharmaceutical Manufacturing': ['tablet', 'capsule', 'injection', 'api', 'excipient'],
      Biotechnology: ['biologic', 'vaccine', 'protein', 'cell culture', 'fermentation'],
      'Medical Device': ['device', 'instrument', 'diagnostic', 'implant'],
      'Clinical Trials': ['clinical', 'trial', 'study', 'patient', 'protocol'],
      'Regulatory Submission': ['submission', 'filing', 'application', 'dossier', 'ctd'],
    };

    for (const [context, keywords] of Object.entries(contextKeywords)) {
      if (keywords.some((k) => c.includes(k))) contexts.push(context);
    }
    return contexts;
  }

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
- title
- description (2-3 sentences)
- difficulty ("Beginner"|"Intermediate"|"Advanced")
- relevance (1-5)
- category
- estimatedTime
- actionable

Return valid JSON: an array of suggestion objects.`;
  }

  formatAISuggestions(aiResponse) {
    try {
      let suggestions = JSON.parse(aiResponse || '[]');
      if (!Array.isArray(suggestions)) suggestions = [suggestions];

      return suggestions.map((s, index) => ({
        id: `ai-suggestion-${Date.now()}-${index}`,
        title: s.title || `Learning Suggestion ${index + 1}`,
        description: s.description || 'AI-generated learning recommendation',
        difficulty: s.difficulty || 'Intermediate',
        relevance: Math.min(5, Math.max(1, s.relevance ?? 4)),
        category: s.category || 'General',
        estimatedTime: s.estimatedTime || '30-45 minutes',
        actionable: s.actionable || 'Start learning about this topic',
        source: 'AI-Generated',
        type: 'suggestion',
        generatedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('Error parsing AI suggestions:', err);
      return this.getDefaultSuggestions();
    }
  }

  async getAdminConfig(userId) {
    try {
      const headers = await this.buildHeaders(userId);
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'get_admin_config',
          configKey: 'learning_suggestions',
        }),
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
      enableAISuggestions: true,
    };
  }

  async updateAdminConfig(config, userId) {
    try {
      const headers = await this.buildHeaders(userId);
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'update_admin_config',
          configKey: 'learning_suggestions',
          config,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating admin config:', error);
      return false;
    }
  }

  getDefaultSuggestions() {
    return [
      {
        id: 'default-1',
        title: 'GMP Fundamentals Review',
        description:
          'Strengthen your foundation in Good Manufacturing Practices with current FDA and ICH guidelines.',
        difficulty: 'Beginner',
        relevance: 4,
        category: 'GMP',
        estimatedTime: '45 minutes',
        actionable: 'Review FDA CFR Part 211 requirements',
        source: 'Default',
        type: 'suggestion',
      },
      {
        id: 'default-2',
        title: 'Validation Protocol Best Practices',
        description:
          'Learn to write effective IQ, OQ, and PQ protocols that meet regulatory expectations.',
        difficulty: 'Intermediate',
        relevance: 4,
        category: 'Validation',
        estimatedTime: '60 minutes',
        actionable: 'Practice writing a simple equipment validation protocol',
        source: 'Default',
        type: 'suggestion',
      },
      {
        id: 'default-3',
        title: 'CAPA Investigation Techniques',
        description:
          'Master root cause analysis and develop effective corrective and preventive actions.',
        difficulty: 'Intermediate',
        relevance: 3,
        category: 'CAPA',
        estimatedTime: '50 minutes',
        actionable: 'Apply the 5 Whys technique to a recent quality issue',
        source: 'Default',
        type: 'suggestion',
      },
    ];
  }

  clearCache(userId = null) {
    if (userId) {
      const keysToDelete = [...this.cache.keys()].filter((k) => k.includes(userId));
      keysToDelete.forEach((k) => this.cache.delete(k));
    } else {
      this.cache.clear();
    }
  }

  async refreshSuggestions(userId, chatCount = null) {
    this.clearCache(userId);
    return this.getLearningSuggestions(userId, chatCount);
  }
}

export default new LearningSuggestionsService();
