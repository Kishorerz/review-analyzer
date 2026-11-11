"""
RPA (Robotic Process Automation) Workflow Engine
------------------------------------------------
Automates the end-to-end processing of incoming customer inputs
(Printed Documents, Handwritten Notes, Voice Transcripts, or Typed Reviews).

Executes a 4-step automated bot pipeline:
1. Ingest & Clean (Document / OCR normalization & field extraction)
2. Cognitive Analysis (Summarization, Sentiment, Emotion, Intent)
3. Business Rule Routing (Auto-assign Department, Ticket ID, SLA Priority)
4. Automated Response & Record Generation (Auto-drafted reply + structured export)
"""

from datetime import datetime
import hashlib
from ocr_service import process_document
from text_summarization import summarize_text
from sentiment_analysis import analyze_sentiment
from emotion_analysis import analyze_emotion
from intent_analysis import analyze_intent


def route_to_department(intent_code, urgency, sentiment_label):
    """Rule-based RPA routing logic to assign the right team and SLA."""
    if intent_code == 'refund_return':
        return {
            'department': 'Refunds & Billing Automation Desk',
            'queue': 'RMA-Returns',
            'sla_hours': 4,
            'priority': 'P1 - Urgent'
        }
    if intent_code == 'defect_complaint':
        return {
            'department': 'Hardware / QA Warranty Support',
            'queue': 'Tech-Escalations',
            'sla_hours': 6,
            'priority': 'P1 - Urgent'
        }
    if intent_code == 'inquiry_question':
        return {
            'department': 'Customer Care & FAQ Bot',
            'queue': 'General-Inquiries',
            'sla_hours': 12,
            'priority': 'P2 - Standard'
        }
    if intent_code == 'feature_suggestion':
        return {
            'department': 'Product Engineering Backlog',
            'queue': 'Roadmap-Feedback',
            'sla_hours': 48,
            'priority': 'P3 - Low'
        }
    # Default: Praise / Recommendation
    if sentiment_label == 'Negative' or urgency == 'High':
        return {
            'department': 'Customer Retention Team',
            'queue': 'Priority-Care',
            'sla_hours': 8,
            'priority': 'P2 - Standard'
        }
    return {
        'department': 'Marketing & Testimonials Hub',
        'queue': 'Brand-Advocates',
        'sla_hours': 72,
        'priority': 'P3 - Low'
    }


def generate_auto_reply(intent_code, sentiment_label, summary_text):
    """Generates a polite, ready-to-send customer response based on intent & sentiment."""
    if intent_code == 'refund_return':
        return (
            "Hello,\n\n"
            "Thank you for reaching out. Our automated system has logged your return/refund request with High Priority. "
            "Your return label and refund authorization are being processed immediately.\n\n"
            "Best regards,\nAutomated Customer Support"
        )
    if intent_code == 'defect_complaint':
        return (
            "Hello,\n\n"
            "We sincerely apologize for the product issue you experienced. "
            "Your case has been escalated to our Warranty & Quality Support team for a fast replacement.\n\n"
            "Best regards,\nAutomated Quality Assurance"
        )
    if intent_code == 'inquiry_question':
        return (
            "Hello,\n\n"
            "Thank you for your question! A product specialist has been assigned to send you the setup guide "
            "and compatibility details shortly.\n\n"
            "Best regards,\nCustomer Care Team"
        )
    if intent_code == 'feature_suggestion':
        return (
            "Hello,\n\n"
            "Thank you for sharing your valuable suggestion! Our RPA bot has logged your feedback directly "
            "into our Product Engineering roadmap for future improvements.\n\n"
            "Best regards,\nProduct Team"
        )
    if sentiment_label == 'Positive':
        return (
            "Hello,\n\n"
            "Thank you so much for your wonderful feedback! We are thrilled you enjoyed the product "
            "and have shared your review with our team.\n\n"
            "Warm regards,\nCustomer Experience Team"
        )
    return (
        "Hello,\n\n"
        "Thank you for your feedback. Our team has reviewed your message and logged it for follow-up.\n\n"
        "Best regards,\nCustomer Support"
    )


def run_rpa_workflow(raw_text, source_mode='document', filename='Input Text'):
    """
    Executes the full 4-step RPA automation bot workflow.
    """
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Step 1: Ingest & Clean Document/OCR/Voice Text
    doc_info = process_document(raw_text, source_mode=source_mode, filename=filename)
    cleaned_text = doc_info['cleaned_text']

    if not cleaned_text:
        return {
            'ticket_id': 'N/A',
            'timestamp': timestamp,
            'status': 'Halted - Empty Input',
            'steps': [
                {'step': 1, 'name': 'Ingest & OCR Cleanup', 'status': 'failed', 'detail': 'No text found to process.'}
            ]
        }

    # Generate deterministic Ticket ID from text hash
    short_hash = hashlib.md5(f"{cleaned_text}{timestamp}".encode('utf-8')).hexdigest()[:5].upper()
    ticket_id = f"RPA-{short_hash}"

    # Step 2: Cognitive NLP Pipeline
    summary_res = summarize_text(cleaned_text)
    sentiment_res = analyze_sentiment(cleaned_text)
    emotion_res = analyze_emotion(cleaned_text)
    intent_res = analyze_intent(cleaned_text)

    # Step 3: Rule-Based Routing
    routing = route_to_department(
        intent_res['intent_code'],
        intent_res['urgency'],
        sentiment_res['sentiment']
    )

    # Step 4: Auto-Drafted Customer Reply
    auto_reply = generate_auto_reply(
        intent_res['intent_code'],
        sentiment_res['sentiment'],
        summary_res['summary']
    )

    # Build transparent Bot Execution Log
    steps = [
        {
            'step': 1,
            'name': 'Document / OCR / Voice Ingestion',
            'status': 'completed',
            'detail': f"Captured {doc_info['word_count']} words as '{doc_info['document_type']}' from {source_mode.upper()} input."
        },
        {
            'step': 2,
            'name': 'Cognitive AI Analysis',
            'status': 'completed',
            'detail': f"Sentiment: {sentiment_res['sentiment']} ({sentiment_res['predicted_rating']}★) | Emotion: {emotion_res['dominant_emotion']} | Intent: {intent_res['primary_intent']}."
        },
        {
            'step': 3,
            'name': 'Automated Ticket & Routing Rule',
            'status': 'completed',
            'detail': f"Created Ticket {ticket_id} ({routing['priority']}) -> Routed to {routing['department']}."
        },
        {
            'step': 4,
            'name': 'Response Draft & Structured Export',
            'status': 'completed',
            'detail': f"Generated auto-reply template & exportable CSV/JSON record (SLA: {routing['sla_hours']} hrs)."
        }
    ]

    return {
        'ticket_id': ticket_id,
        'timestamp': timestamp,
        'status': 'Completed Successfully',
        'source_mode': source_mode,
        'document_info': doc_info,
        'routing': routing,
        'auto_reply': auto_reply,
        'steps': steps,
        'analysis': {
            'summarization': summary_res,
            'sentiment': sentiment_res,
            'emotion': emotion_res,
            'intent': intent_res
        }
    }
