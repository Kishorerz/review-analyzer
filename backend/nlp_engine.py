"""
NLP Engine Aggregator & Pipeline
--------------------------------
Orchestrates and re-exports the individual analysis modules:
- text_summarization.py -> summarize_text
- sentiment_analysis.py -> analyze_sentiment
- emotion_analysis.py   -> analyze_emotion
- intent_analysis.py    -> analyze_intent

Provides the unified `analyze_all()` function.
"""

from text_summarization import summarize_text
from sentiment_analysis import analyze_sentiment
from emotion_analysis import analyze_emotion
from intent_analysis import analyze_intent


def analyze_all(text):
    """
    Runs all 4 modular analyses simultaneously.
    
    Args:
        text (str): Input review text.
        
    Returns:
        dict: Results from summarization, sentiment, emotion, and intent modules.
    """
    return {
        'summarization': summarize_text(text),
        'sentiment': analyze_sentiment(text),
        'emotion': analyze_emotion(text),
        'intent': analyze_intent(text)
    }


if __name__ == '__main__':
    sample = "I love this headphone! Superb sound and clear treble, but cord is too short."
    res = analyze_all(sample)
    print("Summarization:", res['summarization']['summary'])
    print("Sentiment:", res['sentiment']['sentiment'])
    print("Emotion:", res['emotion']['dominant_emotion'])
    print("Intent:", res['intent']['primary_intent'])
