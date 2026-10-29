"""
Flask Web Server for Review Analyzer
-------------------------------------
Provides a clean RESTful API for:
- /api/summarize    (calls text_summarization.py)
- /api/sentiment    (calls sentiment_analysis.py)
- /api/emotion      (calls emotion_analysis.py)
- /api/intent       (calls intent_analysis.py)
- /api/analyze-all  (calls nlp_engine.py)
- /api/samples
- /api/health

Includes automatic CORS handling for easy React frontend connection.
"""

from flask import Flask, request, jsonify

# Import each analysis directly from its own separate module file
from text_summarization import summarize_text
from sentiment_analysis import analyze_sentiment
from emotion_analysis import analyze_emotion
from intent_analysis import analyze_intent
from similarity_service import compute_similarity
from translation_service import translate_text
from nlp_engine import analyze_all

app = Flask(__name__)

# Enable CORS for all routes (Allow React frontend on any local port)
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return response

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'status': 'online',
        'message': 'Review Analyzer Modular Backend API is running.',
        'modules': {
            'summarize': 'text_summarization.py',
            'sentiment': 'sentiment_analysis.py',
            'emotion': 'emotion_analysis.py',
            'intent': 'intent_analysis.py'
        },
        'endpoints': [
            '/api/summarize',
            '/api/sentiment',
            '/api/emotion',
            '/api/intent',
            '/api/analyze-all'
        ]
    })

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/summarize', methods=['POST', 'OPTIONS'])
@app.route('/api/summarize', methods=['POST', 'OPTIONS'])
def summarize():
    """Text Summarization Endpoint -> text_summarization.py"""
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    max_sentences = data.get('max_sentences', 2)
    result = summarize_text(text, max_sentences=max_sentences)
    return jsonify({'success': True, 'data': result})

@app.route('/sentiment', methods=['POST', 'OPTIONS'])
@app.route('/api/sentiment', methods=['POST', 'OPTIONS'])
def sentiment():
    """Sentiment Analysis Endpoint -> sentiment_analysis.py"""
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    result = analyze_sentiment(text)
    return jsonify({'success': True, 'data': result})

@app.route('/emotion', methods=['POST', 'OPTIONS'])
@app.route('/api/emotion', methods=['POST', 'OPTIONS'])
def emotion():
    """Emotion Analysis Endpoint -> emotion_analysis.py"""
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    result = analyze_emotion(text)
    return jsonify({'success': True, 'data': result})

@app.route('/intent', methods=['POST', 'OPTIONS'])
@app.route('/api/intent', methods=['POST', 'OPTIONS'])
def intent():
    """Intent Analysis Endpoint -> intent_analysis.py"""
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    result = analyze_intent(text)
    return jsonify({'success': True, 'data': result})

@app.route('/translate', methods=['POST', 'OPTIONS'])
@app.route('/api/translate', methods=['POST', 'OPTIONS'])
def translate():
    """Translation Endpoint -> translation_service.py"""
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    target_lang = data.get('target_lang', 'es')
    source_lang = data.get('source_lang', 'auto')
    result = translate_text(text, target_lang=target_lang, source_lang=source_lang)
    return jsonify({'success': True, 'data': result})

@app.route('/similarity', methods=['POST', 'OPTIONS'])
@app.route('/api/similarity', methods=['POST', 'OPTIONS'])
def similarity():
    """Similarity Index Endpoint -> similarity_service.py"""
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text1 = data.get('text1', '')
    text2 = data.get('text2', '')
    result = compute_similarity(text1, text2)
    return jsonify({'success': True, 'data': result})

@app.route('/analyze-all', methods=['POST', 'OPTIONS'])
@app.route('/api/analyze-all', methods=['POST', 'OPTIONS'])
def full_analysis():
    """Unified Pipeline Endpoint -> runs all 4 modular analyses"""
    if request.method == 'OPTIONS':
        return '', 200
    data = request.get_json(silent=True) or {}
    text = data.get('text', '')
    result = analyze_all(text)
    return jsonify({'success': True, 'data': result})




if __name__ == '__main__':
    print("Starting Modular Review Analyzer Server on http://127.0.0.1:5000 ...")
    app.run(host='127.0.0.1', port=5000, debug=True)
