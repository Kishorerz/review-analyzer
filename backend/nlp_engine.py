"""
NLP Engine for Product & Review Analysis
-----------------------------------------
A clean, transparent, and dependency-free Natural Language Processing engine.
Provides:
1. Text Summarization (Extractive frequency scoring)
2. Sentiment Analysis (Valence lexicon with negation and intensifier handling)
3. Emotion Analysis (Multi-emotion classification: Joy, Anger, Sadness, Surprise, Fear, Disgust)
4. Intent Analysis (Intent categorization: Refund, Defect, Praise, Inquiry, Improvement)

Written in standard, normal Python code - no bulky dependencies or external API keys required.
"""

import re
import math
from collections import Counter

# Standard English stopwords to filter out for frequency analysis
STOPWORDS = {
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've",
    "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
    'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 'its', 'itself', 'they', 'them',
    'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', "that'll",
    'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or',
    'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against',
    'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from',
    'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', "should've", 'now'
}

# Negation words that flip polarity
NEGATIONS = {'not', "n't", 'never', 'no', 'hardly', 'barely', 'scarcely', 'neither', 'nor', 'without'}

# Intensifiers that amplify sentiment
INTENSIFIERS = {
    'very': 1.5, 'extremely': 2.0, 'super': 1.8, 'absolutely': 2.0,
    'totally': 1.6, 'incredibly': 2.0, 'highly': 1.7, 'really': 1.5,
    'exceptionally': 2.0, 'completely': 1.7, 'quite': 1.3
}

# Sentiment Lexicon with weights (-2.0 to +2.0)
SENTIMENT_LEXICON = {
    # High Positive (+2.0)
    'excellent': 2.0, 'amazing': 2.0, 'wonderful': 2.0, 'fantastic': 2.0, 'perfect': 2.0,
    'flawless': 2.0, 'outstanding': 2.0, 'exceptional': 2.0, 'superb': 2.0, 'love': 1.8,
    'loved': 1.8, 'loves': 1.8, 'brilliant': 1.8, 'phenomenal': 2.0, 'masterpiece': 2.0,
    # Moderate Positive (+1.0 to +1.5)
    'good': 1.0, 'great': 1.4, 'nice': 1.0, 'solid': 1.1, 'durable': 1.4, 'reliable': 1.4,
    'recommend': 1.5, 'recommended': 1.5, 'recommending': 1.5, 'fast': 1.1, 'smooth': 1.2,
    'happy': 1.3, 'satisfied': 1.3, 'pleased': 1.2, 'impressed': 1.5, 'valuable': 1.2,
    'worth': 1.2, 'quality': 1.0, 'effective': 1.2, 'clean': 1.0, 'easy': 1.1, 'convenient': 1.2,
    'comfortable': 1.3, 'pretty': 0.8, 'helpful': 1.1, 'sturdy': 1.3, 'favorite': 1.5,
    # High Negative (-2.0)
    'terrible': -2.0, 'horrible': -2.0, 'awful': -2.0, 'garbage': -2.0, 'trash': -2.0,
    'waste': -1.9, 'useless': -1.9, 'scam': -2.0, 'fraud': -2.0, 'ripoff': -2.0,
    'worst': -2.0, 'disaster': -2.0, 'hate': -1.8, 'hated': -1.8, 'unusable': -1.9,
    # Moderate Negative (-1.0 to -1.5)
    'bad': -1.0, 'poor': -1.3, 'slow': -1.0, 'broken': -1.6, 'broke': -1.5,
    'disappointed': -1.5, 'disappointing': -1.5, 'disappointment': -1.5, 'flimsy': -1.4,
    'cheap': -1.1, 'defect': -1.5, 'defective': -1.6, 'damaged': -1.5, 'failed': -1.5,
    'fails': -1.4, 'failure': -1.5, 'annoying': -1.2, 'annoyed': -1.2, 'regret': -1.4,
    'difficult': -1.0, 'overpriced': -1.3, 'scratch': -1.0, 'scratched': -1.1, 'stuck': -1.1,
    'noisy': -1.1, 'loud': -0.9, 'uncomfortable': -1.3, 'pain': -1.2, 'leak': -1.4, 'leaking': -1.4
}

# Emotion Lexicons
EMOTION_KEYWORDS = {
    'joy': [
        'happy', 'glad', 'love', 'loved', 'joy', 'excited', 'delight', 'delighted', 'pleased',
        'great', 'amazing', 'wonderful', 'perfect', 'enjoy', 'enjoyed', 'awesome', 'satisfied',
        'thrilled', 'impressed', 'charming', 'favorite', 'blessing', 'flawless', 'superb'
    ],
    'anger': [
        'angry', 'furious', 'mad', 'rage', 'annoyed', 'frustrated', 'frustrating', 'irritated',
        'terrible', 'horrible', 'awful', 'scam', 'ripoff', 'cheat', 'garbage', 'trash',
        'ridiculous', 'waste', 'hate', 'hated', 'pathetic', 'disgrace', 'insult'
    ],
    'sadness': [
        'sad', 'disappointed', 'disappointing', 'disappointment', 'regret', 'unfortunate',
        'unfortunately', 'letdown', 'crying', 'depressed', 'grief', 'hoped', 'wished',
        'sorry', 'heartbroken', 'loss', 'poor'
    ],
    'surprise': [
        'surprised', 'surprising', 'astonished', 'stunned', 'unexpected', 'unexpectedly',
        'shocked', 'shocking', 'blew', 'unbelievable', 'amazed', 'wow', 'never', 'actually'
    ],
    'fear': [
        'scared', 'afraid', 'fear', 'worried', 'worrying', 'concern', 'concerned', 'anxious',
        'danger', 'dangerous', 'hazard', 'overheat', 'overheating', 'smoke', 'spark', 'burn',
        'fire', 'shock', 'warning', 'risk', 'risky'
    ],
    'disgust': [
        'disgusting', 'gross', 'nasty', 'foul', 'stink', 'smelly', 'dirty', 'filthy',
        'horrendous', 'repulsive', 'sick', 'vomit', 'tacky', 'cheap', 'slimy'
    ]
}

# Intent Rules & Keyword Patterns
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


def clean_words(text):
    """Convert text to list of lowercase alphanumeric words."""
    return re.findall(r"\b[a-zA-Z']+\b", text.lower())


def split_sentences(text):
    """Split text into sentences cleanly."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]


# -------------------------------------------------------------
# 1. TEXT SUMMARIZATION
# -------------------------------------------------------------
def summarize_text(text, max_sentences=2):
    """
    Extractive Text Summarization.
    Scores sentences based on word frequency, sentence length, and position.
    """
    if not text or not text.strip():
        return {
            'summary': 'No text provided to summarize.',
            'key_takeaways': [],
            'original_word_count': 0,
            'summary_word_count': 0,
            'compression_ratio': '0%'
        }

    sentences = split_sentences(text)
    if len(sentences) <= 1:
        return {
            'summary': text.strip(),
            'key_takeaways': [text.strip()],
            'original_word_count': len(text.split()),
            'summary_word_count': len(text.split()),
            'compression_ratio': '0%'
        }

    words = clean_words(text)
    meaningful_words = [w for w in words if w not in STOPWORDS and len(w) > 2]

    if not meaningful_words:
        summary = " ".join(sentences[:max_sentences])
        return {
            'summary': summary,
            'key_takeaways': sentences[:max_sentences],
            'original_word_count': len(words),
            'summary_word_count': len(summary.split()),
            'compression_ratio': '0%'
        }

    word_freq = Counter(meaningful_words)
    max_freq = max(word_freq.values())
    normalized_weights = {word: freq / max_freq for word, freq in word_freq.items()}

    # Score each sentence
    sentence_scores = []
    for idx, sentence in enumerate(sentences):
        sent_words = clean_words(sentence)
        if not sent_words:
            continue
        score = sum(normalized_weights.get(w, 0) for w in sent_words)
        # Normalize by length to prevent bias towards unnecessarily long sentences
        length_penalty = 1.0 / (1.0 + abs(len(sent_words) - 15) * 0.05)
        # First sentence in reviews often carries key product sentiment
        position_bonus = 1.25 if idx == 0 else (1.15 if idx == len(sentences) - 1 else 1.0)
        final_score = (score / len(sent_words)) * length_penalty * position_bonus
        sentence_scores.append((idx, sentence, final_score))

    # Pick top N sentences maintaining chronological order
    top_sentences = sorted(sentence_scores, key=lambda x: x[2], reverse=True)[:max_sentences]
    top_sentences = sorted(top_sentences, key=lambda x: x[0])  # Restore original order

    summary = " ".join([s[1] for s in top_sentences])

    # Key takeaways (bullet points from top sentences + key features)
    takeaways = [s[1] for s in top_sentences]

    orig_count = len(text.split())
    summ_count = len(summary.split())
    reduction = max(0, round((1 - (summ_count / orig_count)) * 100)) if orig_count > 0 else 0

    return {
        'summary': summary,
        'key_takeaways': takeaways,
        'original_word_count': orig_count,
        'summary_word_count': summ_count,
        'compression_ratio': f"{reduction}% reduction"
    }


# -------------------------------------------------------------
# 2. SENTIMENT ANALYSIS
# -------------------------------------------------------------
def analyze_sentiment(text):
    """
    Rule & Lexicon-based Sentiment Analysis.
    Handles negation words (e.g. 'not good') and intensifiers (e.g. 'very good').
    """
    if not text or not text.strip():
        return {
            'sentiment': 'Neutral',
            'score': 0.0,
            'confidence': 50,
            'predicted_rating': 3,
            'positive_words': [],
            'negative_words': [],
            'explanation': 'No text provided.'
        }

    words = clean_words(text)
    total_score = 0.0
    matched_positives = []
    matched_negatives = []

    for i, word in enumerate(words):
        if word in SENTIMENT_LEXICON:
            base_score = SENTIMENT_LEXICON[word]

            # Check previous 2 words for negation or intensifiers
            prev_1 = words[i - 1] if i > 0 else ''
            prev_2 = words[i - 2] if i > 1 else ''

            is_negated = (prev_1 in NEGATIONS) or (prev_2 in NEGATIONS)
            intensifier_mult = INTENSIFIERS.get(prev_1, 1.0)
            if intensifier_mult == 1.0 and prev_2 in INTENSIFIERS:
                intensifier_mult = INTENSIFIERS[prev_2]

            word_score = base_score * intensifier_mult
            if is_negated:
                word_score = -word_score * 0.8  # Invert sentiment

            total_score += word_score

            if word_score > 0:
                matched_positives.append(f"{prev_1 + ' ' if is_negated else ''}{word}")
            elif word_score < 0:
                matched_negatives.append(f"{prev_1 + ' ' if is_negated else ''}{word}")

    # Normalize total score into range [-1.0, 1.0]
    word_count = max(len(words), 1)
    normalized = max(-1.0, min(1.0, total_score / (math.sqrt(word_count) * 0.8 + 1.0)))

    if normalized > 0.15:
        sentiment = 'Positive'
        confidence = min(99, int(50 + (normalized * 50)))
        predicted_rating = 5 if normalized > 0.55 else 4
        explanation = f"Review expresses customer satisfaction with {len(matched_positives)} positive signal(s)."
    elif normalized < -0.15:
        sentiment = 'Negative'
        confidence = min(99, int(50 + (abs(normalized) * 50)))
        predicted_rating = 1 if normalized < -0.55 else 2
        explanation = f"Review indicates frustration or product defects with {len(matched_negatives)} negative signal(s)."
    else:
        sentiment = 'Neutral'
        confidence = int(max(40, 70 - abs(normalized) * 50))
        predicted_rating = 3
        explanation = "Review conveys mixed impressions or matter-of-fact observations."

    return {
        'sentiment': sentiment,
        'score': round(normalized, 2),
        'confidence': confidence,
        'predicted_rating': predicted_rating,
        'positive_words': list(set(matched_positives))[:8],
        'negative_words': list(set(matched_negatives))[:8],
        'explanation': explanation
    }


# -------------------------------------------------------------
# 3. EMOTION ANALYSIS
# -------------------------------------------------------------
def analyze_emotion(text):
    """
    Multi-Emotion Classifier:
    Detects Joy, Anger, Sadness, Surprise, Fear, and Disgust with percentage weights.
    """
    words = clean_words(text)
    text_lower = text.lower()

    emotion_scores = {
        'joy': 0,
        'anger': 0,
        'sadness': 0,
        'surprise': 0,
        'fear': 0,
        'disgust': 0
    }

    detected_clues = {e: [] for e in emotion_scores}

    for emotion, keywords in EMOTION_KEYWORDS.items():
        for kw in keywords:
            if kw in words or (len(kw) > 4 and kw in text_lower):
                emotion_scores[emotion] += 1
                if kw not in detected_clues[emotion]:
                    detected_clues[emotion].append(kw)

    # Exclamation marks amplify Joy or Anger
    exclamations = text.count('!')
    if exclamations > 0:
        if emotion_scores['anger'] > emotion_scores['joy']:
            emotion_scores['anger'] += exclamations * 0.5
        elif emotion_scores['joy'] > 0:
            emotion_scores['joy'] += exclamations * 0.5

    total_hits = sum(emotion_scores.values())

    if total_hits == 0:
        # Default baseline if no strong emotional cues
        percentages = {
            'joy': 20,
            'sadness': 15,
            'surprise': 20,
            'anger': 15,
            'fear': 15,
            'disgust': 15
        }
        dominant = 'Neutral / Calm'
    else:
        percentages = {
            k: round((v / total_hits) * 100) for k, v in emotion_scores.items()
        }
        dominant = max(emotion_scores.items(), key=lambda x: x[1])[0].capitalize()

    emotion_icons = {
        'joy': '😊 Joy',
        'anger': '😠 Anger',
        'sadness': '😢 Sadness',
        'surprise': '😲 Surprise',
        'fear': '😨 Fear',
        'disgust': '🤢 Disgust'
    }

    breakdown = [
        {
            'emotion': emotion_icons[k],
            'key': k,
            'percentage': percentages.get(k, 0),
            'clues': detected_clues.get(k, [])[:4]
        }
        for k in sorted(percentages, key=percentages.get, reverse=True)
    ]

    return {
        'dominant_emotion': dominant,
        'breakdown': breakdown,
        'total_cues_found': total_hits
    }


# -------------------------------------------------------------
# 4. INTENT ANALYSIS
# -------------------------------------------------------------
def analyze_intent(text):
    """
    Customer Intent Classifier:
    Detects whether the reviewer intends to return, complain about defects,
    recommend the item, ask a question, or suggest an enhancement.
    """
    text_lower = text.lower()
    words = clean_words(text)

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

    # Check for question marks -> signals inquiry
    if '?' in text:
        intent_scores['inquiry_question'] += text.count('?') * 2
        matched_cues['inquiry_question'].append('?')

    # Find highest scoring intent
    best_intent_key = max(intent_scores.items(), key=lambda x: x[1])[0]
    best_score = intent_scores[best_intent_key]

    # If no intent keywords matched, infer based on general tone
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


# -------------------------------------------------------------
# COMPREHENSIVE PIPELINE (Analyze All)
# -------------------------------------------------------------
def analyze_all(text):
    """Runs all 4 analyses at once for maximum speed and convenience."""
    return {
        'summarization': summarize_text(text),
        'sentiment': analyze_sentiment(text),
        'emotion': analyze_emotion(text),
        'intent': analyze_intent(text)
    }
