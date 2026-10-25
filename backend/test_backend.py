"""
Automated Backend Unit & Integration Tests
------------------------------------------
Tests both:
1. Individual module functions (direct unit tests):
   - text_summarization.py -> summarize_text()
   - sentiment_analysis.py -> analyze_sentiment()
   - emotion_analysis.py   -> analyze_emotion()
   - intent_analysis.py    -> analyze_intent()
   - nlp_engine.py         -> analyze_all()

2. Flask HTTP REST API endpoints (integration tests):
   - GET /api/health
   - GET /api/samples
   - POST /api/summarize
   - POST /api/sentiment
   - POST /api/emotion
   - POST /api/intent
   - POST /api/analyze-all
"""

import unittest
import json
from app import app
from text_summarization import summarize_text
from sentiment_analysis import analyze_sentiment
from emotion_analysis import analyze_emotion
from intent_analysis import analyze_intent
from nlp_engine import analyze_all


class ModularUnitTests(unittest.TestCase):
    def setUp(self):
        self.sample = (
            "I bought this wireless speaker last week. The sound quality is fantastic and crystal clear, "
            "but the battery life is disappointing and lasts only 2 hours. Can I return this for a refund?"
        )

    def test_text_summarization_module(self):
        result = summarize_text(self.sample)
        self.assertIn('summary', result)
        self.assertIn('key_takeaways', result)
        self.assertGreater(len(result['key_takeaways']), 0)

    def test_sentiment_analysis_module(self):
        result = analyze_sentiment(self.sample)
        self.assertIn('sentiment', result)
        self.assertIn('score', result)
        self.assertIn('confidence', result)
        self.assertIn('predicted_rating', result)

    def test_emotion_analysis_module(self):
        result = analyze_emotion(self.sample)
        self.assertIn('dominant_emotion', result)
        self.assertIn('breakdown', result)
        self.assertEqual(len(result['breakdown']), 6)

    def test_intent_analysis_module(self):
        result = analyze_intent(self.sample)
        self.assertEqual(result['intent_code'], 'refund_return')
        self.assertIn('recommended_action', result)

    def test_nlp_engine_aggregator(self):
        result = analyze_all(self.sample)
        self.assertIn('summarization', result)
        self.assertIn('sentiment', result)
        self.assertIn('emotion', result)
        self.assertIn('intent', result)


class FlaskEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.sample_review = (
            "Great watch and durable design! However the strap cracked after a week. "
            "I want to request a replacement."
        )

    def test_health(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data.get('status'), 'ok')

    def test_samples(self):
        response = self.client.get('/api/samples')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data.get('success'))

    def test_endpoint_summarize(self):
        response = self.client.post(
            '/api/summarize',
            data=json.dumps({'text': self.sample_review}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)['data']
        self.assertIn('summary', data)

    def test_endpoint_sentiment(self):
        response = self.client.post(
            '/api/sentiment',
            data=json.dumps({'text': self.sample_review}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)['data']
        self.assertIn('sentiment', data)

    def test_endpoint_emotion(self):
        response = self.client.post(
            '/api/emotion',
            data=json.dumps({'text': self.sample_review}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)['data']
        self.assertIn('dominant_emotion', data)

    def test_endpoint_intent(self):
        response = self.client.post(
            '/api/intent',
            data=json.dumps({'text': self.sample_review}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)['data']
        self.assertEqual(data['intent_code'], 'refund_return')

    def test_endpoint_analyze_all(self):
        response = self.client.post(
            '/api/analyze-all',
            data=json.dumps({'text': self.sample_review}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)['data']
        self.assertIn('summarization', data)
        self.assertIn('sentiment', data)
        self.assertIn('emotion', data)
        self.assertIn('intent', data)


if __name__ == '__main__':
    unittest.main()
