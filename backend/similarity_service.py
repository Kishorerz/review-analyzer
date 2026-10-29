"""
Similarity Index Module
-----------------------
Calculates the semantic and lexical similarity between two texts (e.g., comparing
two reviews to detect duplicate reviews, template spam, or comparing a review
against a product description).

Uses simple, transparent mathematics:
1. Jaccard Index (Word overlap ratio)
2. Cosine Similarity (Word frequency vectors)
3. Combined Similarity Percentage (0% to 100%)
"""

import math
from collections import Counter
from text_utils import clean_words, STOPWORDS


def compute_similarity(text1, text2):
    """
    Computes similarity percentage and matching keywords between two texts.
    
    Args:
        text1 (str): First review or reference text.
        text2 (str): Second review text to compare.
        
    Returns:
        dict: similarity_score, percentage, common_keywords, unique_to_1, unique_to_2, verdict
    """
    if not text1 or not text2 or not text1.strip() or not text2.strip():
        return {
            'similarity_score': 0.0,
            'percentage': 0,
            'common_keywords': [],
            'unique_words_1': [],
            'unique_words_2': [],
            'verdict': 'Please provide both texts to calculate similarity.',
            'badge': 'Insufficient Data'
        }

    # Extract meaningful non-stopword tokens
    words1 = [w for w in clean_words(text1) if w not in STOPWORDS and len(w) > 2]
    words2 = [w for w in clean_words(text2) if w not in STOPWORDS and len(w) > 2]

    if not words1 or not words2:
        return {
            'similarity_score': 0.0,
            'percentage': 0,
            'common_keywords': [],
            'unique_words_1': [],
            'unique_words_2': [],
            'verdict': 'Texts do not contain enough meaningful words to compare.',
            'badge': 'No Overlap'
        }

    set1 = set(words1)
    set2 = set(words2)

    # 1. Jaccard Similarity: |Intersection| / |Union|
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    jaccard = len(intersection) / len(union) if union else 0.0

    # 2. Cosine Similarity on Term Frequency Vectors
    vec1 = Counter(words1)
    vec2 = Counter(words2)
    all_keys = union

    dot_product = sum(vec1.get(k, 0) * vec2.get(k, 0) for k in all_keys)
    magnitude1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
    magnitude2 = math.sqrt(sum(v ** 2 for v in vec2.values()))

    if magnitude1 * magnitude2 > 0:
        cosine = dot_product / (magnitude1 * magnitude2)
    else:
        cosine = 0.0

    # Combined weighted score (60% Cosine for frequency, 40% Jaccard for vocabulary overlap)
    combined = (cosine * 0.60) + (jaccard * 0.40)
    percentage = min(100, max(0, round(combined * 100)))

    # Determine qualitative verdict
    if percentage >= 75:
        verdict = "High Similarity — These texts share identical phrasing and vocabulary. Likely duplicate feedback or template spam."
        badge = "High (Duplicate / Template)"
    elif percentage >= 45:
        verdict = "Moderate Similarity — Texts discuss common topics and feature overlapping opinions or product attributes."
        badge = "Moderate Overlap"
    else:
        verdict = "Low Similarity — Distinct reviews with unique vocabulary and individual perspectives."
        badge = "Low / Distinct"

    return {
        'similarity_score': round(combined, 2),
        'percentage': percentage,
        'common_keywords': sorted(list(intersection))[:10],
        'unique_words_1': sorted(list(set1 - set2))[:8],
        'unique_words_2': sorted(list(set2 - set1))[:8],
        'verdict': verdict,
        'badge': badge
    }
