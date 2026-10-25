"""
Sentiment Analysis Module
-------------------------
Implements rule & lexicon-based sentiment analysis.
Features:
- Valence scoring (-2.0 to +2.0)
- Negation handling (e.g. 'not good' flips to negative)
- Intensifier scaling (e.g. 'extremely good' amplifies score)
- Predicted 1-5 Amazon star rating
- Extraction of positive and negative keyword signals
"""

import math
from text_utils import clean_words

# Negation words that invert polarity
NEGATIONS = {'not', "n't", 'never', 'no', 'hardly', 'barely', 'scarcely', 'neither', 'nor', 'without'}

# Intensifiers that amplify sentiment
INTENSIFIERS = {
    'very': 1.5, 'extremely': 2.0, 'super': 1.8, 'absolutely': 2.0,
    'totally': 1.6, 'incredibly': 2.0, 'highly': 1.7, 'really': 1.5,
    'exceptionally': 2.0, 'completely': 1.7, 'quite': 1.3
}

# Calibrated Sentiment Lexicon
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


def analyze_sentiment(text):
    """
    Analyzes sentiment polarity of review text.
    
    Args:
        text (str): Input review text.
        
    Returns:
        dict: Sentiment label, polarity score, confidence, predicted star rating, and keywords.
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

            # Look back 2 tokens for negation or intensifiers
            prev_1 = words[i - 1] if i > 0 else ''
            prev_2 = words[i - 2] if i > 1 else ''

            is_negated = (prev_1 in NEGATIONS) or (prev_2 in NEGATIONS)
            intensifier_mult = INTENSIFIERS.get(prev_1, 1.0)
            if intensifier_mult == 1.0 and prev_2 in INTENSIFIERS:
                intensifier_mult = INTENSIFIERS[prev_2]

            word_score = base_score * intensifier_mult
            if is_negated:
                word_score = -word_score * 0.8  # Invert polarity

            total_score += word_score

            if word_score > 0:
                matched_positives.append(f"{prev_1 + ' ' if is_negated else ''}{word}")
            elif word_score < 0:
                matched_negatives.append(f"{prev_1 + ' ' if is_negated else ''}{word}")

    # Normalize total score into [-1.0, 1.0] range
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


if __name__ == '__main__':
    sample = "The screen quality is amazing and super clear, but the battery is not good."
    result = analyze_sentiment(sample)
    print("--- Sentiment Analysis Test ---")
    print("Sentiment:", result['sentiment'])
    print("Score:", result['score'])
    print("Stars:", result['predicted_rating'])
    print("Positive:", result['positive_words'])
    print("Negative:", result['negative_words'])
