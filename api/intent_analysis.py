"""
Intent Analysis Module
----------------------
Detects customer intent from review text.
Categories:
1. Return / Refund Request (Urgency: High)
2. Product Defect / Quality Complaint (Urgency: High)
3. Praise & Recommendation (Urgency: Low)
4. Product Inquiry / Question (Urgency: Medium)
5. Improvement / Feature Suggestion (Urgency: Medium)
"""

from text_utils import clean_words
from sentiment_analysis import analyze_sentiment

INTENT_PATTERNS = {
    'refund_return': {
        'label': 'Return or Refund Request',
        'icon': '🔄',
        'urgency': 'High',
        'description': 'Customer wants to return product or get their money back.',
        'action': 'Direct to automated return portal or initiate refund processing immediately.',
        'keywords': [
            'refund', 'return', 'returning', 'returned', 'money back', 'charge back',
            'chargeback', 'replacement', 'replace', 'exchange', 'send back', 'give back my money'
        ]
    },
    'defect_complaint': {
        'label': 'Product Defect / Quality Complaint',
        'icon': '⚠️',
        'urgency': 'High',
        'description': 'Customer reports a hardware/software malfunction, damage, or defect.',
        'action': 'Dispatch technical support or offer free warranty repair/replacement.',
        'keywords': [
            'broken', 'broke', 'defect', 'defective', 'stopped working', 'not working',
            'crack', 'cracked', 'dead on arrival', 'doa', 'fail', 'failed', 'malfunction',
            'shattered', 'glitch', 'melted', 'leaking', 'scratch', 'faulty'
        ]
    },
    'praise_recommendation': {
        'label': 'Praise & Recommendation',
        'icon': '🌟',
        'urgency': 'Low',
        'description': 'Customer is enthusiastic, giving high praise and endorsing the item.',
        'action': 'Highlight in marketing testimonials and invite user to join brand advocate program.',
        'keywords': [
            'recommend', 'recommended', 'must buy', 'best purchase', 'worth every penny',
            'exceeded expectations', 'highly recommend', 'love this', 'five stars', '5 stars',
            'cannot live without', 'fantastic', 'phenomenal', 'holy grail'
        ]
    },
    'inquiry_question': {
        'label': 'Product Inquiry / Question',
        'icon': '❓',
        'urgency': 'Medium',
        'description': 'Customer is seeking clarification on features, compatibility, or instructions.',
        'action': 'Provide direct product FAQ answer, link to user guide, or reply with compatibility info.',
        'keywords': [
            'how do i', 'how to', 'does it', 'can it', 'is there', 'support', 'compatible with',
            'question', 'anyone know', 'where can i', 'warranty period', 'manual', 'help me'
        ]
    },
    'feature_suggestion': {
        'label': 'Improvement / Feature Suggestion',
        'icon': '💡',
        'urgency': 'Medium',
        'description': 'Customer provides constructive feedback for future product iterations.',
        'action': 'Log feature request into Product/Engineering roadmap backlog.',
        'keywords': [
            'wish it had', 'would be better if', 'could improve', 'suggestion', 'next version',
            'needs a', 'should add', 'if only', 'would be nice', 'please add', 'room for improvement'
        ]
    }
}


def analyze_intent(text):
    """
    Classifies customer intent from review text.
    
    Args:
        text (str): Input review text.
        
    Returns:
        dict: Primary intent label, icon, urgency, recommended action, and triggers.
    """
    if not text or not text.strip():
        info = INTENT_PATTERNS['praise_recommendation']
        return {
            'intent_code': 'praise_recommendation',
            'primary_intent': info['label'],
            'icon': info['icon'],
            'urgency': info['urgency'],
            'description': info['description'],
            'recommended_action': info['action'],
            'detected_triggers': [],
            'secondary_intent': []
        }

    text_lower = text.lower()
    intent_scores = {}
    matched_cues = {}

    for intent_key, data in INTENT_PATTERNS.items():
        score = 0
        cues = []
        for kw in data['keywords']:
            if kw in text_lower:
                score += 2 if ' ' in kw else 1
                cues.append(kw)
        intent_scores[intent_key] = score
        matched_cues[intent_key] = list(set(cues))

    # Questions signal inquiry
    if '?' in text:
        intent_scores['inquiry_question'] += text.count('?') * 2
        matched_cues['inquiry_question'].append('?')

    best_intent_key = max(intent_scores.items(), key=lambda x: x[1])[0]
    best_score = intent_scores[best_intent_key]

    # If no explicit intent keywords matched, infer intent from sentiment
    if best_score == 0:
        sentiment_res = analyze_sentiment(text)
        if sentiment_res['sentiment'] == 'Positive':
            best_intent_key = 'praise_recommendation'
        elif sentiment_res['sentiment'] == 'Negative':
            best_intent_key = 'defect_complaint'
        else:
            best_intent_key = 'praise_recommendation'

    intent_info = INTENT_PATTERNS[best_intent_key]

    return {
        'intent_code': best_intent_key,
        'primary_intent': intent_info['label'],
        'icon': intent_info['icon'],
        'urgency': intent_info['urgency'],
        'description': intent_info['description'],
        'recommended_action': intent_info['action'],
        'detected_triggers': matched_cues.get(best_intent_key, [])[:5],
        'secondary_intent': sorted(
            [(INTENT_PATTERNS[k]['label'], score) for k, score in intent_scores.items() if k != best_intent_key and score > 0],
            key=lambda x: x[1],
            reverse=True
        )[:2]
    }


if __name__ == '__main__':
    sample = "The screen stopped working on day 2. Can I get a replacement or refund?"
    result = analyze_intent(sample)
    print("--- Intent Analysis Test ---")
    print("Primary Intent:", result['primary_intent'])
    print("Urgency:", result['urgency'])
    print("Action:", result['recommended_action'])
    print("Triggers:", result['detected_triggers'])
