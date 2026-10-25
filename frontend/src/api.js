/**
 * API Client for Review Analyzer Backend
 * Handles requests to the Flask server (http://127.0.0.1:5000).
 * Provides clear error handling and offline fallback capability.
 */

// In local Vite dev (port 3000), use localhost:5000; on Vercel deployment, use relative '' path
const isLocalDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  (window.location.port === '3000' || window.location.port === '5173');

const API_BASE_URL = isLocalDev ? 'http://127.0.0.1:5000' : '';

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}



export async function requestAnalysis(endpoint, text) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const json = await response.json();
    return { success: true, data: json.data, isLocalFallback: false };
  } catch (err) {
    console.warn(`Backend connection error on /api/${endpoint}, using client-side fallback:`, err.message);
    // Provide a smart client-side fallback so the dashboard works even before starting python app.py
    const localData = clientSideFallbackAnalysis(endpoint, text);
    return { success: true, data: localData, isLocalFallback: true, error: err.message };
  }
}

/**
 * Client-side fallback analyzer:
 * Allows the React UI to be tested immediately even if backend is offline.
 */
function clientSideFallbackAnalysis(endpoint, text) {
  const lower = (text || '').toLowerCase();

  if (endpoint === 'summarize') {
    const sentences = (text || '').split(/(?<=[.!?])\s+/).filter(Boolean);
    const summary = sentences.slice(0, 2).join(' ') || text;
    return {
      summary: summary,
      key_takeaways: sentences.slice(0, 2),
      original_word_count: text.split(/\s+/).filter(Boolean).length,
      summary_word_count: summary.split(/\s+/).filter(Boolean).length,
      compression_ratio: '55% reduction'
    };
  }

  if (endpoint === 'sentiment') {
    const isNeg = /terrible|worst|broken|waste|scam|ripoff|refund|bad|poor|hate|disappointed/.test(lower);
    const isPos = /fantastic|amazing|great|love|excellent|worth|sturdy|recommend|awesome|best/.test(lower);
    const sentiment = isNeg ? 'Negative' : (isPos ? 'Positive' : 'Neutral');
    return {
      sentiment,
      score: isNeg ? -0.85 : (isPos ? 0.88 : 0.05),
      confidence: isNeg || isPos ? 92 : 60,
      predicted_rating: isNeg ? 1 : (isPos ? 5 : 3),
      positive_words: isPos ? ['fantastic', 'recommend', 'great'] : [],
      negative_words: isNeg ? ['terrible', 'broken', 'waste'] : [],
      explanation: isNeg
        ? 'Customer is highly dissatisfied due to defects or failed expectations.'
        : (isPos ? 'Customer is satisfied with performance and quality.' : 'Customer expresses neutral/mixed sentiment.')
    };
  }

  if (endpoint === 'emotion') {
    const isAnger = /terrible|worst|waste|scam|ripoff|hate|angry/.test(lower);
    const isJoy = /amazing|fantastic|love|great|happy|superb/.test(lower);
    const isSad = /disappointed|regret|unfortunately|sorry/.test(lower);
    const isSurprise = /blown away|surprised|unexpected|actually/.test(lower);

    return {
      dominant_emotion: isAnger ? 'Anger' : (isJoy ? 'Joy' : (isSad ? 'Sadness' : (isSurprise ? 'Surprise' : 'Calm / Neutral'))),
      breakdown: [
        { emotion: '😊 Joy', percentage: isJoy ? 72 : 12, clues: ['love', 'fantastic'] },
        { emotion: '😠 Anger', percentage: isAnger ? 85 : 8, clues: ['waste', 'ripoff'] },
        { emotion: '😢 Sadness', percentage: isSad ? 68 : 10, clues: ['disappointed'] },
        { emotion: '😲 Surprise', percentage: isSurprise ? 65 : 15, clues: ['blown away'] },
        { emotion: '😨 Fear', percentage: 5, clues: [] },
        { emotion: '🤢 Disgust', percentage: 5, clues: [] }
      ].sort((a, b) => b.percentage - a.percentage),
      total_cues_found: 4
    };
  }

  if (endpoint === 'intent') {
    const isRefund = /refund|return|money back|replacement|exchange/.test(lower);
    const isDefect = /broken|crack|stopped working|defect|failed/.test(lower);
    const isQuestion = /\?|how do|support|compatible|is there/.test(lower);

    if (isRefund) {
      return {
        intent_code: 'refund_return',
        primary_intent: 'Return or Refund Request',
        icon: '🔄',
        urgency: 'High',
        description: 'Customer wants to return product or get their money back.',
        recommended_action: 'Direct to automated return portal or initiate refund processing immediately.',
        detected_triggers: ['refund', 'replacement'],
        secondary_intent: [['Product Defect / Quality Complaint', 2]]
      };
    } else if (isQuestion) {
      return {
        intent_code: 'inquiry_question',
        primary_intent: 'Product Inquiry / Question',
        icon: '❓',
        urgency: 'Medium',
        description: 'Customer is seeking clarification on features, compatibility, or instructions.',
        recommended_action: 'Provide direct product FAQ answer, link to user guide, or reply with compatibility info.',
        detected_triggers: ['how do i', '?'],
        secondary_intent: []
      };
    } else if (isDefect) {
      return {
        intent_code: 'defect_complaint',
        primary_intent: 'Product Defect / Quality Complaint',
        icon: '⚠️',
        urgency: 'High',
        description: 'Customer reports a hardware/software malfunction, damage, or defect.',
        recommended_action: 'Dispatch technical support or offer free warranty repair/replacement.',
        detected_triggers: ['broken', 'stopped working'],
        secondary_intent: []
      };
    } else {
      return {
        intent_code: 'praise_recommendation',
        primary_intent: 'Praise & Recommendation',
        icon: '🌟',
        urgency: 'Low',
        description: 'Customer is enthusiastic, giving high praise and endorsing the item.',
        recommended_action: 'Highlight in marketing testimonials and invite user to join brand advocate program.',
        detected_triggers: ['recommend', 'worth every penny'],
        secondary_intent: []
      };
    }
  }

  // analyze-all
  return {
    summarization: clientSideFallbackAnalysis('summarize', text),
    sentiment: clientSideFallbackAnalysis('sentiment', text),
    emotion: clientSideFallbackAnalysis('emotion', text),
    intent: clientSideFallbackAnalysis('intent', text)
  };
}
