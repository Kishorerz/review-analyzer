"""
Emotional Analysis Module
-------------------------
Multi-emotion classifier detecting 6 human emotional states in reviews:
1. Joy / Satisfaction (delight, impressed, loved, happy)
2. Anger / Frustration (furious, ripoff, waste, hate, garbage)
3. Sadness / Disappointment (disappointed, regret, letdown)
4. Surprise / Amazement (stunned, unexpected, shocked, blew away)
5. Fear / Anxiety / Safety Concern (worried, dangerous, overheat, spark)
6. Disgust (nasty, foul, stink, disgusting, tacky)
"""

from text_utils import clean_words

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

EMOTION_ICONS = {
    'joy': '😊 Joy',
    'anger': '😠 Anger',
    'sadness': '😢 Sadness',
    'surprise': '😲 Surprise',
    'fear': '😨 Fear',
    'disgust': '🤢 Disgust'
}


def analyze_emotion(text):
    """
    Analyzes emotional composition of review text.
    
    Args:
        text (str): Input review text.
        
    Returns:
        dict: Dominant emotion, percentage breakdown per emotion, and keyword triggers.
    """
    if not text or not text.strip():
        return {
            'dominant_emotion': 'Neutral / Calm',
            'breakdown': [
                {'emotion': EMOTION_ICONS[k], 'key': k, 'percentage': 16, 'clues': []}
                for k in EMOTION_KEYWORDS
            ],
            'total_cues_found': 0
        }

    words = clean_words(text)
    text_lower = text.lower()

    emotion_scores = {e: 0 for e in EMOTION_KEYWORDS}
    detected_clues = {e: [] for e in EMOTION_KEYWORDS}

    for emotion, keywords in EMOTION_KEYWORDS.items():
        for kw in keywords:
            if kw in words or (len(kw) > 4 and kw in text_lower):
                emotion_scores[emotion] += 1
                if kw not in detected_clues[emotion]:
                    detected_clues[emotion].append(kw)

    # Exclamations amplify Joy or Anger
    exclamations = text.count('!')
    if exclamations > 0:
        if emotion_scores['anger'] > emotion_scores['joy']:
            emotion_scores['anger'] += exclamations * 0.5
        elif emotion_scores['joy'] > 0:
            emotion_scores['joy'] += exclamations * 0.5

    total_hits = sum(emotion_scores.values())

    if total_hits == 0:
        percentages = {'joy': 20, 'sadness': 15, 'surprise': 20, 'anger': 15, 'fear': 15, 'disgust': 15}
        dominant = 'Neutral / Calm'
    else:
        percentages = {k: round((v / total_hits) * 100) for k, v in emotion_scores.items()}
        dominant = max(emotion_scores.items(), key=lambda x: x[1])[0].capitalize()

    breakdown = [
        {
            'emotion': EMOTION_ICONS[k],
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


