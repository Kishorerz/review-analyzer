"""
Vercel Serverless Function Entry Point for Review Analyzer
-----------------------------------------------------------
Exposes the Flask WSGI app for Vercel's Python runtime.
Routes all /api/* requests to modular NLP processors:
- /api/summarize   -> text_summarization.py
- /api/sentiment   -> sentiment_analysis.py
- /api/emotion     -> emotion_analysis.py
- /api/intent      -> intent_analysis.py
- /api/analyze-all -> runs all 4
- /api/samples
- /api/health
"""

import sys
import os

# Ensure local api folder is in sys.path for serverless execution
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from flask import Flask, request, jsonify
from text_summarization import summarize_text
from sentiment_analysis import analyze_sentiment
from emotion_analysis import analyze_emotion
from intent_analysis import analyze_intent

app = Flask(__name__)

# Enable CORS for all routes
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return response

@app.route('/', methods=['GET'])
@app.route('/api', methods=['GET'])
def home():
    return jsonify({
        'status': 'online',
        'platform': 'Vercel Serverless',
        'message': 'Review Analyzer API is active.',
        'endpoints': [
            '/api/summarize',
            '/api/sentiment',
            '/api/emotion',
            '/api/intent',
            '/api/analyze-all',
            '/api/samples'
        ]
    })

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'deployment': 'vercel'})

@app.route('/api/summarize', methods=['POST', 'OPTIONS'])
def summarize():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    max_sentences = data.get('max_sentences', 2)
    result = summarize_text(text, max_sentences=max_sentences)
    return jsonify({'success': True, 'data': result})

@app.route('/api/sentiment', methods=['POST', 'OPTIONS'])
def sentiment():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    result = analyze_sentiment(text)
    return jsonify({'success': True, 'data': result})

@app.route('/api/emotion', methods=['POST', 'OPTIONS'])
def emotion():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    result = analyze_emotion(text)
    return jsonify({'success': True, 'data': result})

@app.route('/api/intent', methods=['POST', 'OPTIONS'])
def intent():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    result = analyze_intent(text)
    return jsonify({'success': True, 'data': result})

@app.route('/api/analyze-all', methods=['POST', 'OPTIONS'])
def full_analysis():
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    result = {
        'summarization': summarize_text(text),
        'sentiment': analyze_sentiment(text),
        'emotion': analyze_emotion(text),
        'intent': analyze_intent(text)
    }
    return jsonify({'success': True, 'data': result})

@app.route('/api/samples', methods=['GET'])
def sample_reviews():
    samples = [
        {
            'id': 1,
            'title': '🌟 5-Star Rave Product Review (Wireless Earbuds)',
            'product': 'SoundPro Ultra Wireless Earbuds',
            'text': (
                "I bought these earbuds two weeks ago and I am absolutely blown away! "
                "The active noise cancellation is fantastic, and the battery easily lasts 8 hours on a single charge. "
                "Sound quality is crisp with deep bass. The build quality feels sturdy and premium in the hands. "
                "Worth every penny, highly recommend to anyone looking for high quality audio!"
            )
        },
        {
            'id': 2,
            'title': '😡 1-Star Defect & Refund Request (Smart Watch)',
            'product': 'FitPulse Smartwatch Pro',
            'text': (
                "Terrible experience! The watch screen cracked on day 3 while charging on my nightstand. "
                "Now it completely stopped working and will not turn on. Customer support refused to help me. "
                "This is a total ripoff and waste of money. I want an immediate replacement or full refund to my card!"
            )
        },
        {
            'id': 3,
            'title': '⚖️ 3-Star Mixed Review (Coffee Maker)',
            'product': 'AromaMaster 12-Cup Brewer',
            'text': (
                "The coffee maker brews hot and delicious coffee in under 5 minutes. The stainless steel carafe looks sleek on the counter. "
                "However, the water reservoir is difficult to fill without spilling, and the digital clock loses 10 minutes every day. "
                "It gets the job done, but there is definitely room for improvement in the next version."
            )
        },
        {
            'id': 4,
            'title': '❓ Customer Inquiry & Setup Question (Mechanical Keyboard)',
            'product': 'RGB Mechanical Gaming Keyboard',
            'text': (
                "I just received this keyboard in the mail. Does it support Mac OS shortcut keys out of the box? "
                "Also, how do I configure the custom RGB backlighting profiles? Is there a software download link available somewhere? "
                "Looking forward to hearing back from the seller."
            )
        }
    ]
    return jsonify({'success': True, 'samples': samples})


# Required for local testing or direct execution
if __name__ == '__main__':
    app.run(port=5000)
