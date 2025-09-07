// src/services/learningSuggestionsService.js
import neonService from './neonService';
import openaiService from './openaiService';
import { getToken } from './authService';

class LearningSuggestionsService {
  constructor() {
    this.apiUrl = '/.netlify/functions/neon-db';
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Gets learning suggestions based on user's recent conversations
   * @param {string} userId - User identifier
   * @returns {Promise<Object[]>} - Array of learning suggestions
   */
  async getLearningSuggestions(userId) {
    try {
      console.log('Getting learning suggestions for user:', userId);

      // Check cache first
      const cacheKey = `suggestions_${userId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        console.log('Returning cached learning suggestions');
        return cached.suggestions;
      }

      // Get user's recent conversations from Neon database
      const recentConversations = await this.getRecentConversations(userId);
      
      if (!recentConversations || recentConversations.length === 0) {
        console.log('No recent conversations found, returning default suggestions');
        return this.getDefaultSuggestions();
      }

      // Analyze conversations and generate suggestions
      const suggestions = await this.generateSuggestionsFromConversations(
        recentConversations.slice(0, 5) // Use last 5 as specified
      );

      // Cache the results
      this.cache.set(cacheKey, {
        suggestions,
        timestamp: Date.now()
      });

      return suggestions;

    } catch (error) {
      console.error('Error getting learning suggestions:', error);
      return this.getDefaultSuggestions();
    }
  }

  /**
   * Fetches last 10 conversations from Neon database
   * @param {string} userId - User identifier
   * @returns {Promise<Object[]>} - Recent conversations
   */
  async getRecentConversations(userId) {
    try {
      const token = await getToken();
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId
        },
        body: JSON.stringify({
          action: 'get_recent_conversations',
          data: { limit: 10 }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const result = await response.json();
      return result.conversations || [];

    } catch (error) {
      console.error('Error fetching recent conversations:', error);
      throw error;
    }
  }

  /**
   * Generates learning suggestions using ChatGPT based on conversation analysis
   * @param {Object[]} conversations - Recent conversations
   * @returns {Promise<Object[]>} - Generated suggestions
   */
  async generateSuggestionsFromConversations(conversations) {
    try {
      // Extract and analyze conversation topics
      const conversationSummary = this.analyzeConversationTopics(conversations);
      
      // Create prompt for ChatGPT to generate learning suggestions
      const prompt = this.createLearningPrompt(conversationSummary);
      
      // Get suggestions from ChatGPT
      const response = await openaiService.getChatResponse(prompt);
      
      // Parse and format the suggestions
      const suggestions = this.parseSuggestions(response.answer);
      
      return suggestions;

    } catch (error) {
      console.error('Error generating suggestions from conversations:', error);
      return this.getDefaultSuggestions();
    }
  }

  /**
   * Analyzes conversation topics and patterns
   * @param {Object[]} conversations - Conversations to analyze
   * @returns {Object} - Analysis summary
   */
  analyzeConversationTopics(conversations) {
    const analysis = {
      topics: new Set(),
      questionTypes: new Set(),
      complexity: 'basic',
      industries: new Set(),
      totalMessages: 0,
      timeframe: null
    };

    conversations.forEach(conv => {
      if (conv.messages && Array.isArray(conv.messages)) {
        analysis.totalMessages += conv.messages.length;
        
        conv.messages.forEach(msg => {
          if (msg.type === 'user' && msg.content) {
            // Extract pharmaceutical topics
            this.extractPharmaceuticalTopics(msg.content, analysis.topics);
            
            // Determine question complexity
            this.analyzeQuestionComplexity(msg.content, analysis);
            
            // Extract industry context
            this.extractIndustryContext(msg.content, analysis.industries);
          }
        });
      }
    });

    // Determine overall complexity level
    if (analysis.totalMessages > 20) {
      analysis.complexity = 'advanced';
    } else if (analysis.totalMessages > 10) {
      analysis.complexity = 'intermediate';
    }

    return {
      ...analysis,
      topics: Array.from(analysis.topics),
      questionTypes: Array.from(analysis.questionTypes),
      industries: Array.from(analysis.industries)
    };
  }

  /**
   * Extracts pharmaceutical topics from conversation content
   * @param {string} content - Message content
   * @param {Set} topics - Topics set to update
   */
  extractPharmaceuticalTopics(content, topics) {
    const lowerContent = content.toLowerCase();
    
    const topicMap = {
      'gmp': ['gmp', 'cgmp', 'good manufacturing practice'],
      'validation': ['validation', 'qualify', 'qualification', 'iq', 'oq', 'pq'],
      'capa': ['capa', 'corrective', 'preventive', 'root cause'],
      'regulatory': ['fda', 'ema', 'ich', 'regulatory', 'compliance'],
      'quality_control': ['qc', 'quality control', 'testing', 'analytical'],
      'sterile_processing': ['sterile', 'aseptic', 'contamination'],
      'supply_chain': ['supply chain', 'vendor', 'supplier', 'logistics'],
      'risk_management': ['risk', 'qrm', 'fmea', 'risk assessment'],
      'documentation': ['documentation', 'sop', 'procedure', 'protocol'],
      'training': ['training', 'competency', 'qualification']
    };

    Object.entries(topicMap).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        topics.add(topic);
      }
    });
  }

  /**
   * Analyzes question complexity
   * @param {string} content - Message content
   * @param {Object} analysis - Analysis object to update
   */
  analyzeQuestionComplexity(content, analysis) {
    const lowerContent = content.toLowerCase();
    
    // Complexity indicators
    const complexityIndicators = {
      basic: ['what is', 'how to', 'explain', 'define'],
      intermediate: ['why does', 'how would', 'compare', 'analyze'],
      advanced: ['optimize', 'implement', 'strategy', 'framework', 'methodology']
    };

    Object.entries(complexityIndicators).forEach(([level, indicators]) => {
      if (indicators.some(indicator => lowerContent.includes(indicator))) {
        analysis.questionTypes.add(level);
      }
    });
  }

  /**
   * Extracts industry context
   * @param {string} content - Message content
   * @param {Set} industries - Industries set to update
   */
  extractIndustryContext(content, industries) {
    const lowerContent = content.toLowerCase();
    
    const industryKeywords = {
      'biologics': ['biologics', 'biosimilar', 'monoclonal', 'antibody'],
      'small_molecule': ['tablet', 'capsule', 'api', 'synthesis'],
      'medical_device': ['device', 'diagnostic', 'medical device'],
      'vaccines': ['vaccine', 'immunization', 'adjuvant'],
      'gene_therapy': ['gene therapy', 'cell therapy', 'car-t']
    };

    Object.entries(industryKeywords).forEach(([industry, keywords]) => {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        industries.add(industry);
      }
    });
  }

  /**
   * Creates a detailed prompt for ChatGPT to generate learning suggestions
   * @param {Object} analysis - Conversation analysis
   * @returns {string} - ChatGPT prompt
   */
  createLearningPrompt(analysis) {
    return `Based on a pharmaceutical professional's recent conversation history, generate 4-6 personalized learning suggestions. 

CONVERSATION ANALYSIS:
- Topics discussed: ${analysis.topics.join(', ') || 'General pharmaceutical topics'}
- Question complexity: ${analysis.complexity}
- Industry focus: ${analysis.industries.join(', ') || 'General pharmaceutical'}
- Total interactions: ${analysis.totalMessages}

Generate learning suggestions that:
1. Build on topics already discussed
2. Address knowledge gaps revealed in questions
3. Provide next-level learning opportunities
4. Include mix of theoretical and practical resources
5. Are specific to pharmaceutical quality and compliance

For each suggestion, provide:
- Title (concise, specific)
- Type (Training, Guideline, Reference, Portal, etc.)
- Description (1-2 sentences explaining relevance)
- Learning objective (what they'll gain)
- Difficulty level (Beginner/Intermediate/Advanced)

Format as JSON array with objects containing: title, type, description, objective, difficulty, relevance_score (1-10).

Focus on actionable learning that will help them advance their pharmaceutical quality expertise.`;
  }

  /**
   * Parses ChatGPT response into structured suggestions
   * @param {string} response - ChatGPT response
   * @returns {Object[]} - Parsed suggestions
   */
  parseSuggestions(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return suggestions.map(suggestion => ({
          id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: suggestion.title || 'Learning Resource',
          type: suggestion.type || 'Reference',
          description: suggestion.description || '',
          objective: suggestion.objective || '',
          difficulty: suggestion.difficulty || 'Intermediate',
          relevanceScore: suggestion.relevance_score || 5,
          source: 'ai_generated',
          isPersonalized: true,
          generatedAt: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error parsing ChatGPT suggestions:', error);
    }

    // Fallback: parse text-based response
    return this.parseTextSuggestions(response);
  }

  /**
   * Parses text-based suggestions as fallback
   * @param {string} response - Text response
   * @returns {Object[]} - Parsed suggestions
   */
  parseTextSuggestions(response) {
    const suggestions = [];
    const lines = response.split('\n').filter(line => line.trim());
    
    let currentSuggestion = null;
    
    lines.forEach(line => {
      // Look for numbered items or bullet points
      if (/^\d+\.|\*|\-/.test(line.trim())) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion);
        }
        
        currentSuggestion = {
          id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: line.replace(/^\d+\.|\*|\-/, '').trim(),
          type: 'Training',
          description: '',
          objective: 'Enhance pharmaceutical quality knowledge',
          difficulty: 'Intermediate',
          relevanceScore: 7,
          source: 'ai_generated',
          isPersonalized: true,
          generatedAt: new Date().toISOString()
        };
      } else if (currentSuggestion && line.trim()) {
        // Add description
        currentSuggestion.description += (currentSuggestion.description ? ' ' : '') + line.trim();
      }
    });
    
    if (currentSuggestion) {
      suggestions.push(currentSuggestion);
    }
    
    return suggestions.slice(0, 6); // Limit to 6 suggestions
  }

  /**
   * Returns default learning suggestions when no conversations available
   * @returns {Object[]} - Default suggestions
   */
  getDefaultSuggestions() {
    return [
      {
        id: 'default_gmp_fundamentals',
        title: 'GMP Fundamentals for New Professionals',
        type: 'Training',
        description: 'Essential Good Manufacturing Practice principles every pharmaceutical professional should master.',
        objective: 'Build foundational knowledge of GMP requirements and implementation',
        difficulty: 'Beginner',
        relevanceScore: 9,
        source: 'default',
        isPersonalized: false
      },
      {
        id: 'default_validation_lifecycle',
        title: 'Process Validation Lifecycle Approach',
        type: 'Guideline',
        description: 'FDA guidance on modern process validation methodology and continuous verification.',
        objective: 'Understand the three-stage validation approach and implementation strategies',
        difficulty: 'Intermediate',
        relevanceScore: 8,
        source: 'default',
        isPersonalized: false
      },
      {
        id: 'default_capa_effectiveness',
        title: 'CAPA System Effectiveness Metrics',
        type: 'Reference',
        description: 'Key performance indicators and best practices for measuring CAPA system success.',
        objective: 'Learn to evaluate and improve CAPA system performance',
        difficulty: 'Intermediate',
        relevanceScore: 7,
        source: 'default',
        isPersonalized: false
      },
      {
        id: 'default_risk_management',
        title: 'ICH Q9 Quality Risk Management Implementation',
        type: 'Guideline',
        description: 'Practical application of risk management principles in pharmaceutical operations.',
        objective: 'Apply systematic risk assessment and control strategies',
        difficulty: 'Advanced',
        relevanceScore: 8,
        source: 'default',
        isPersonalized: false
      }
    ];
  }

  /**
   * Clears the suggestion cache for a user
   * @param {string} userId - User identifier
   */
  clearCache(userId) {
    const cacheKey = `suggestions_${userId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Forces refresh of suggestions by clearing cache
   * @param {string} userId - User identifier
   * @returns {Promise<Object[]>} - Fresh suggestions
   */
  async refreshSuggestions(userId) {
    this.clearCache(userId);
    return await this.getLearningSuggestions(userId);
  }
}

// Create singleton instance
const learningSuggestionsService = new LearningSuggestionsService();

export default learningSuggestionsService;

// Export convenience functions
export const getLearningSuggestions = (userId) => 
  learningSuggestionsService.getLearningSuggestions(userId);

export const refreshSuggestions = (userId) => 
  learningSuggestionsService.refreshSuggestions(userId);

export const clearSuggestionCache = (userId) => 
  learningSuggestionsService.clearCache(userId);
