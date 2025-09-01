import { UI_CONFIG, DEFAULT_RESOURCES } from '../config/constants';

// Resource database organized by topic
const RESOURCE_DATABASE = {
  gmp: [
    { title: "FDA Current Good Manufacturing Practice Regulations", type: "Regulation", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources/current-good-manufacturing-practice-cgmp-regulations" },
    { title: "ICH Q7 Good Manufacturing Practice Guide for APIs", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q7%20Guideline.pdf" },
    { title: "FDA GMP Training Resources", type: "Training", url: "https://www.fda.gov/drugs/guidance-compliance-regulatory-information/pharmaceutical-cgmps" },
    { title: "ISPE GMP Baseline Guide Series", type: "Reference", url: "https://www.ispe.org/pharmaceutical-engineering/baseline-guides" },
    { title: "WHO GMP Guidelines for Pharmaceutical Products", type: "Guideline", url: "https://www.who.int/medicines/areas/quality_safety/quality_assurance/GMPGuidelines.pdf" }
  ],
  validation: [
    { title: "FDA Process Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/process-validation-general-principles-and-practices" },
    { title: "ICH Q8-Q12 Quality by Design Implementation", type: "Guideline", url: "https://database.ich.org/sites/default/files/ICH_Q8-Q12_Guideline_Step4_2019_1119.pdf" },
    { title: "ISPE Validation Master Plan Template", type: "Template", url: "https://www.ispe.org/pharmaceutical-engineering/validation-master-plan" },
    { title: "FDA Computer System Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-principles-software-validation" },
    { title: "EU GMP Annex 15 Qualification and Validation", type: "Regulation", url: "https://www.ema.europa.eu/en/documents/scientific-guideline/annex-15-qualification-validation_en.pdf" }
  ],
  capa: [
    { title: "FDA Quality Systems Approach to Pharmaceutical cGMP Regulations", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/quality-systems-approach-pharmaceutical-cgmp-regulations" },
    { title: "ISPE Root Cause Analysis Methodology", type: "Training", url: "https://www.ispe.org/pharmaceutical-engineering/root-cause-analysis" },
    { title: "FDA Warning Letters Database - CAPA Examples", type: "Database", url: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters" },
    { title: "ICH Q10 Pharmaceutical Quality System", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q10%20Guideline.pdf" },
    { title: "PDA Technical Report 53 CAPA Systems", type: "Report", url: "https://www.pda.org/publications/technical-reports/tr-53-capa-systems" }
  ],
  risk: [
    { title: "ICH Q9 Quality Risk Management", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q9%20Guideline.pdf" },
    { title: "FDA Risk-Based Approach to Pharmaceutical Quality", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/pharmaceutical-quality-manufacturing-information" },
    { title: "ISPE Risk Management Framework", type: "Framework", url: "https://www.ispe.org/pharmaceutical-engineering/risk-management" },
    { title: "ICH Q9(R1) Quality Risk Management Revision", type: "Guideline", url: "https://database.ich.org/sites/default/files/ICH_Q9-R1_Step4_Guideline_2023.pdf" }
  ],
  regulatory: [
    { title: "ICH Quality Guidelines (Q1-Q14)", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
    { title: "FDA Pharmaceutical Quality Resources", type: "Portal", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources" },
    { title: "EMA Quality Guidelines", type: "Guideline", url: "https://www.ema.europa.eu/en/human-regulatory/research-development/quality/quality-guidelines" },
    { title: "FDA Quality Metrics Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/quality-metrics-guidance" }
  ],
  cleaning: [
    { title: "FDA Cleaning Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cleaning-validation" },
    { title: "ISPE Cleaning Validation Baseline Guide", type: "Guide", url: "https://www.ispe.org/pharmaceutical-engineering/cleaning-validation" },
    { title: "PDA Technical Report 29 Cleaning Validation", type: "Report", url: "https://www.pda.org/publications/technical-reports/tr-29-cleaning-validation" }
  ],
  stability: [
    { title: "ICH Q1A-Q1F Stability Testing Guidelines", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
    { title: "FDA Stability Testing Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/stability-testing-drug-substances-and-drug-products" },
    { title: "WHO Stability Testing Guidelines", type: "Guideline", url: "https://www.who.int/medicines/areas/quality_safety/quality_assurance/StabilityTestingGuidelines.pdf" }
  ],
  serialization: [
    { title: "FDA Drug Supply Chain Security Act", type: "Regulation", url: "https://www.fda.gov/drugs/drug-supply-chain-integrity/drug-supply-chain-security-act-dscsa" },
    { title: "EU Falsified Medicines Directive", type: "Regulation", url: "https://www.ema.europa.eu/en/human-regulatory/overview/public-health-threats/falsified-medicines" }
  ]
};

// Topic detection keywords
const TOPIC_KEYWORDS = {
  gmp: ['gmp', 'cgmp', 'manufacturing', 'good manufacturing practice'],
  validation: ['validation', 'qualify', 'qualification', 'iq', 'oq', 'pq', 'csv', 'computer system'],
  capa: ['capa', 'corrective', 'preventive', 'corrective action', 'preventive action', 'root cause'],
  risk: ['risk', 'qrm', 'fmea', 'risk management', 'risk assessment', 'hazard'],
  regulatory: ['ich', 'regulatory', 'fda', 'ema', 'compliance', 'guideline'],
  cleaning: ['cleaning', 'contamination', 'cross contamination', 'cleaning validation'],
  stability: ['stability', 'shelf', 'shelf life', 'degradation', 'storage'],
  serialization: ['serialization', 'track', 'trace', 'supply chain', 'falsified']
};

/**
 * Detects topics from query and response text
 * @param {string} text - Text to analyze
 * @returns {string[]} - Array of detected topics
 */
function detectTopics(text) {
  const lowerText = text.toLowerCase();
  const detectedTopics = [];

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const hasKeyword = keywords.some(keyword => lowerText.includes(keyword));
    if (hasKeyword) {
      detectedTopics.push(topic);
    }
  }

  return detectedTopics;
}

/**
 * Scores resources based on relevance to detected topics
 * @param {Object} resource - Resource object
 * @param {string[]} topics - Detected topics
 * @returns {number} - Relevance score
 */
function scoreResource(resource, topics) {
  let score = 0;
  
  // Base score for resource type priority
  const typeScores = {
    'Regulation': 10,
    'Guideline': 9,
    'Guidance': 8,
    'Report': 7,
    'Framework': 6,
    'Training': 5,
    'Template': 4,
    'Portal': 3,
    'Database': 2,
    'Reference': 1
  };
  
  score += typeScores[resource.type] || 0;
  
  // Boost score if resource title contains topic keywords
  topics.forEach(topic => {
    const keywords = TOPIC_KEYWORDS[topic] || [];
    keywords.forEach(keyword => {
      if (resource.title.toLowerCase().includes(keyword)) {
        score += 5;
      }
    });
  });
  
  return score;
}

/**
 * Generates relevant learning resources based on query and response content
 * @param {string} query - User's original query
 * @param {string} response - AI's response
 * @returns {Object[]} - Array of relevant resources
 */
export function generateResources(query, response) {
  try {
    // Detect topics from both query and response
    const queryTopics = detectTopics(query);
    const responseTopics = detectTopics(response);
    const allTopics = [...new Set([...queryTopics, ...responseTopics])];
    
    if (allTopics.length === 0) {
      return DEFAULT_RESOURCES;
    }
    
    // Collect resources for detected topics
    let candidateResources = [];
    
    allTopics.forEach(topic => {
      if (RESOURCE_DATABASE[topic]) {
        candidateResources = candidateResources.concat(
          RESOURCE_DATABASE[topic].map(resource => ({
            ...resource,
            topic,
            relevanceScore: scoreResource(resource, allTopics)
          }))
        );
      }
    });
    
    // Remove duplicates based on URL
    const uniqueResources = candidateResources.reduce((acc, resource) => {
      if (!acc.find(r => r.url === resource.url)) {
        acc.push(resource);
      }
      return acc;
    }, []);
    
    // Sort by relevance score and limit results
    const sortedResources = uniqueResources
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, UI_CONFIG.MAX_RESOURCES_PER_RESPONSE);
    
    // Return resources without internal scoring data
    return sortedResources.map(({ topic, relevanceScore, ...resource }) => resource);
    
  } catch (error) {
    console.error('Error generating resources:', error);
    return DEFAULT_RESOURCES;
  }
}

/**
 * Gets resources for a specific topic
 * @param {string} topic - Topic name
 * @returns {Object[]} - Array of resources for the topic
 */
export function getResourcesByTopic(topic) {
  return RESOURCE_DATABASE[topic] || [];
}

/**
 * Gets all available topics
 * @returns {string[]} - Array of available topic names
 */
export function getAvailableTopics() {
  return Object.keys(TOPIC_KEYWORDS);
}

/**
 * Searches resources by title or type
 * @param {string} searchTerm - Search term
 * @returns {Object[]} - Array of matching resources
 */
export function searchResources(searchTerm) {
  const lowerSearchTerm = searchTerm.toLowerCase();
  const allResources = Object.values(RESOURCE_DATABASE).flat();
  
  return allResources.filter(resource => 
    resource.title.toLowerCase().includes(lowerSearchTerm) ||
    resource.type.toLowerCase().includes(lowerSearchTerm)
  );
}
