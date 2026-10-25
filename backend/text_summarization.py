"""
Text Summarization Module
-------------------------
Implements extractive frequency-based sentence scoring.
Scores sentences based on word frequency, sentence length, and position.
Produces:
- Concise executive summary
- Key takeaway bullet points
- Compression statistics & reduction percentage
"""

from collections import Counter
from text_utils import clean_words, split_sentences, STOPWORDS


def summarize_text(text, max_sentences=2):
    """
    Extractive Text Summarization.
    
    Args:
        text (str): Input review or product feedback text.
        max_sentences (int): Number of top sentences to extract.
        
    Returns:
        dict: Summary text, takeaways, word counts, and compression percentage.
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
        words = text.split()
        return {
            'summary': text.strip(),
            'key_takeaways': [text.strip()],
            'original_word_count': len(words),
            'summary_word_count': len(words),
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

    # Calculate word frequency weights
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
    top_sentences = sorted(top_sentences, key=lambda x: x[0])  # Restore original reading order

    summary = " ".join([s[1] for s in top_sentences])
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


if __name__ == '__main__':
    sample = (
        "I purchased this laptop backpack for college last month. "
        "The water-resistant fabric is durable and the laptop compartment is well padded. "
        "However, the side bottle pocket is too tight for large bottles. "
        "Overall, it is a great backpack and worth the purchase."
    )
    result = summarize_text(sample)
    print("--- Text Summarization Test ---")
    print("Summary:", result['summary'])
    print("Takeaways:", result['key_takeaways'])
    print("Compression:", result['compression_ratio'])
