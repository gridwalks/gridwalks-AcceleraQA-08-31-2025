// Smart resource generation based on topic detection
export const generateResources = (query, response) => {
  const lowerQuery = query.toLowerCase();
  const lowerResponse = response.toLowerCase();
  
  let resources = [];
  
  // GMP Resources
  if (lowerQuery.includes('gmp') || lowerQuery.includes('cgmp') || lowerResponse.includes('manufacturing') || lowerResponse.includes('gmp')) {
    resources.push(
      { title: "FDA Current Good Manufacturing Practice Regulations", type: "Regulation", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources/current-good-manufacturing-practice-cgmp-regulations" },
      { title: "ICH Q7 Good Manufacturing Practice Guide for APIs", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q7%20Guideline.pdf" },
      { title: "FDA GMP Training Resources", type: "Training", url: "https://www.fda.gov/drugs/guidance-compliance-regulatory-information/pharmaceutical-cgmps" },
      { title: "ISPE GMP Baseline Guide Series", type: "Reference", url: "https://www.ispe.org/pharmaceutical-engineering/baseline-guides" }
    );
  }
  
  // Validation Resources
  if (lowerQuery.includes('validation') || lowerQuery.includes('qualify') || lowerQuery.includes('iq') || lowerQuery.includes('oq') || lowerQuery.includes('pq') || lowerResponse.includes('validation')) {
    resources.push(
      { title: "FDA Process Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/process-validation-general-principles-and-practices" },
      { title: "ICH Q8-Q12 Quality by Design Implementation", type: "Guideline", url: "https://database.ich.org/sites/default/files/ICH_Q8-Q12_Guideline_Step4_2019_1119.pdf" },
      { title: "ISPE Validation Master Plan Template", type: "Template", url: "https://www.ispe.org/pharmaceutical-engineering/validation-master-plan" },
      { title: "FDA Computer System Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-principles-software-validation" }
    );
  }
  
  // CAPA Resources
  if (lowerQuery.includes('capa') || lowerQuery.includes('corrective') || lowerQuery.includes('preventive') || lowerResponse.includes('capa')) {
    resources.push(
      { title: "FDA Quality Systems Approach to Pharmaceutical cGMP Regulations", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/quality-systems-approach-pharmaceutical-cgmp-regulations" },
      { title: "ISPE Root Cause Analysis Methodology", type: "Training", url: "https://www.ispe.org/pharmaceutical-engineering/root-cause-analysis" },
      { title: "FDA Warning Letters Database - CAPA Examples", type: "Database", url: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters" },
      { title: "ICH Q10 Pharmaceutical Quality System", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q10%20Guideline.pdf" }
    );
  }
  
  // Risk Management Resources
  if (lowerQuery.includes('risk') || lowerQuery.includes('qrm') || lowerQuery.includes('fmea') || lowerResponse.includes('risk')) {
    resources.push(
      { title: "ICH Q9 Quality Risk Management", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q9%20Guideline.pdf" },
      { title: "FDA Risk-Based Approach to Pharmaceutical Quality", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/pharmaceutical-quality-manufacturing-information" },
      { title: "ISPE Risk Management Framework", type: "Framework", url: "https://www.ispe.org/pharmaceutical-engineering/risk-management" }
    );
  }
  
  // Regulatory/ICH Resources
  if (lowerQuery.includes('ich') || lowerQuery.includes('regulatory') || lowerQuery.includes('fda') || lowerQuery.includes('ema') || lowerResponse.includes('regulatory')) {
    resources.push(
      { title: "ICH Quality Guidelines (Q1-Q14)", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
      { title: "FDA Pharmaceutical Quality Resources", type: "Portal", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources" },
      { title: "EMA Quality Guidelines", type: "Guideline", url: "https://www.ema.europa.eu/en/human-regulatory/research-development/quality/quality-guidelines" }
    );
  }
  
  // Cleaning Validation
  if (lowerQuery.includes('cleaning') || lowerQuery.includes('contamination') || lowerResponse.includes('cleaning')) {
    resources.push(
      { title: "FDA Cleaning Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cleaning-validation" },
      { title: "ISPE Cleaning Validation Baseline Guide", type: "Guide", url: "https://www.ispe.org/pharmaceutical-engineering/cleaning-validation" }
    );
  }
  
  // Stability Testing
  if (lowerQuery.includes('stability') || lowerQuery.includes('shelf') || lowerResponse.includes('stability')) {
    resources.push(
      { title: "ICH Q1A-Q1F Stability Testing Guidelines", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
      { title: "FDA Stability Testing Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/stability-testing-drug-substances-and-drug-products" }
    );
  }
  
  // Default pharmaceutical resources if no specific match
  if (resources.length === 0) {
    resources.push(
      { title: "FDA Pharmaceutical Quality Resources Hub", type: "Portal", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources" },
      { title: "ICH Quality Guidelines Overview", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
      { title: "ISPE Pharmaceutical Engineering Resources", type: "Database", url: "https://www.ispe.org/pharmaceutical-engineering" },
      { title: "PDA Technical Resources", type: "Database", url: "https://www.pda.org/publications/technical-resources" }
    );
  }
  
  return resources.slice(0, 6); // Limit to 6 resources max
};
