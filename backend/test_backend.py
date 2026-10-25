"""
Automated Backend Unit Tests for Review Analyzer
Verifies all endpoints:
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

class ReviewAnalyzerBackendTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.sample_review = (
            "I bought this wireless speaker last week. The sound quality is fantastic and crystal clear, "
            "but the battery life is disappointing and lasts only 2 hours. Can I return this for a refund?"
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
        self.assertGreaterEqual(len(data.get('samples', [])), 1)

    def test_summarize(self):
        response = self.client.post(
            '/api/summarize',
            data=json.dumps({'text': self.sample_review}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)['data']
        self.assertIn('summary', data)
        self.assertIn('key_takeaways', data)
        self.assertGreater(data['original_word_count'], 0)

    def test_sentiment(self):
        response = self.client.post(
            '/api/sentiment',
            data=json.dumps({'text': self.sample_review}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)['data']
        self.assertIn('sentiment', data)
        self.assertIn('confidence', data)
        self.assertIn('predicted_rating', data)

    def test_emotion(self):
        response = self.client.post(
            '/api/emotion',
            data=json.dumps({'text': self.sample_review}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)['data']
        self.assertIn('dominant_emotion', data)
        self.assertIn('breakdown', data)

    def test_intent(self):
        response = self.client.post(
            '/api/intent',
            data=json.dumps({'text': self.sample_review}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)['data']
        self.assertIn('primary_intent', data)
        self.assertIn('recommended_action', data)
        # Should detect refund request
        self.assertEqual(data['intent_code'], 'refund_return')

    def test_analyze_all(self):
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
