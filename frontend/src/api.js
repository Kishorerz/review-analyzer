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



export async function requestTranslation(text, targetLang = 'es') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target_lang: targetLang })
    });
    if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
    const json = await response.json();
    return { success: true, data: json.data, isLocalFallback: false };
  } catch (err) {
    console.warn('Translate error, using local fallback:', err.message);
    const langNames = { es: 'Spanish', fr: 'French', de: 'German', hi: 'Hindi', zh: 'Chinese', ja: 'Japanese', ar: 'Arabic', ta: 'Tamil' };
    return {
      success: true,
      data: {
        translated_text: `[${langNames[targetLang] || targetLang} Translation]: ${text}`,
        source_lang: 'auto',
        target_lang: targetLang,
        target_lang_name: langNames[targetLang] || targetLang,
        success: true
      },
      isLocalFallback: true
    };
  }
}

export async function requestSimilarity(text1, text2) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/similarity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text1, text2 })
    });
    if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
    const json = await response.json();
    return { success: true, data: json.data, isLocalFallback: false };
  } catch (err) {
    console.warn('Similarity error, using local fallback:', err.message);
    // Simple client-side fallback word overlap
    const words1 = (text1 || '').toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const words2 = (text2 || '').toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const common = [...set1].filter(w => set2.has(w));
    const union = new Set([...set1, ...set2]);
    const pct = union.size ? Math.round((common.length / union.size) * 100) : 0;
    return {
      success: true,
      data: {
        similarity_score: (pct / 100).toFixed(2),
        percentage: pct,
        common_keywords: common.slice(0, 8),
        unique_words_1: [...set1].filter(w => !set2.has(w)).slice(0, 6),
        unique_words_2: [...set2].filter(w => !set1.has(w)).slice(0, 6),
        verdict: pct > 70 ? 'High similarity (Likely duplicate/template)' : (pct > 40 ? 'Moderate overlap in vocabulary' : 'Distinct reviews with low overlap'),
        badge: pct > 70 ? 'High (Duplicate)' : (pct > 40 ? 'Moderate' : 'Distinct')
      },
      isLocalFallback: true
    };
  }
}

export async function requestOcrProcess(text, sourceMode = 'document', filename = 'Scanned Document') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ocr-process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source_mode: sourceMode, filename })
    });
    if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
    const json = await response.json();
    return { success: true, data: json.data, isLocalFallback: false };
  } catch (err) {
    console.warn('OCR process fallback:', err.message);
    const cleaned = (text || '').replace(/\s+/g, ' ').trim();
    const emails = cleaned.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const amounts = cleaned.match(/(?:\$|₹|€|£|Rs\.?\s?)\d+(?:,\d{3})*(?:\.\d{1,2})?/g) || [];
    const dates = cleaned.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g) || [];
    const orderIds = cleaned.match(/\b(?:ORD|INV|REF|ID)[-#:]?\s?[A-Z0-9]{4,12}\b/gi) || [];
    return {
      success: true,
      data: {
        cleaned_text: cleaned,
        document_type: sourceMode === 'handwritten' ? 'Handwritten Note / Feedback' : 'Scanned Document',
        source_mode: sourceMode,
        filename,
        word_count: cleaned ? cleaned.split(/\s+/).length : 0,
        char_count: cleaned.length,
        extracted_fields: {
          emails: [...new Set(emails)].slice(0, 5),
          amounts: [...new Set(amounts)].slice(0, 5),
          dates: [...new Set(dates)].slice(0, 5),
          order_ids: [...new Set(orderIds)].slice(0, 5)
        },
        status: 'Processed Successfully'
      },
      isLocalFallback: true
    };
  }
}

export async function requestRpaWorkflow(text, sourceMode = 'document', filename = 'Input Text') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rpa-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source_mode: sourceMode, filename })
    });
    if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
    const json = await response.json();
    return { success: true, data: json.data, isLocalFallback: false };
  } catch (err) {
    console.warn('RPA workflow fallback:', err.message);
    const docRes = await requestOcrProcess(text, sourceMode, filename);
    const allRes = clientSideFallbackAnalysis('analyze-all', docRes.data.cleaned_text);
    const intentCode = allRes.intent.intent_code;
    const isRefund = intentCode === 'refund_return';
    const isDefect = intentCode === 'defect_complaint';
    const dept = isRefund
      ? 'Refunds & Billing Automation Desk'
      : isDefect
      ? 'Hardware / QA Warranty Support'
      : intentCode === 'inquiry_question'
      ? 'Customer Care & FAQ Bot'
      : 'Marketing & Testimonials Hub';
    const priority = isRefund || isDefect ? 'P1 - Urgent' : 'P3 - Low';
    const ticketId = 'RPA-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    return {
      success: true,
      data: {
        ticket_id: ticketId,
        timestamp: new Date().toLocaleString(),
        status: 'Completed Successfully',
        source_mode: sourceMode,
        document_info: docRes.data,
        routing: {
          department: dept,
          queue: isRefund ? 'RMA-Returns' : 'Auto-Queue',
          sla_hours: isRefund || isDefect ? 4 : 24,
          priority
        },
        auto_reply: isRefund
          ? 'Hello,\n\nYour return/refund request has been automatically logged with High Priority. Our team is processing your authorization.\n\nBest regards,\nAutomated Support'
          : 'Hello,\n\nThank you for your feedback! Our automated system has logged your message and routed it to the right team.\n\nBest regards,\nCustomer Support',
        steps: [
          { step: 1, name: 'Document / OCR / Voice Ingestion', status: 'completed', detail: `Captured ${docRes.data.word_count} words from ${sourceMode.toUpperCase()} input.` },
          { step: 2, name: 'Cognitive AI Analysis', status: 'completed', detail: `Sentiment: ${allRes.sentiment.sentiment} | Intent: ${allRes.intent.primary_intent}.` },
          { step: 3, name: 'Automated Ticket & Routing Rule', status: 'completed', detail: `Created Ticket ${ticketId} (${priority}) -> ${dept}.` },
          { step: 4, name: 'Response Draft & Structured Export', status: 'completed', detail: 'Generated auto-reply template & exportable CSV/JSON record.' }
        ],
        analysis: allRes
      },
      isLocalFallback: true
    };
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
