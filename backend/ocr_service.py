"""
Document & OCR Processing Module
--------------------------------
Handles text extracted from:
1. Printed Documents (PDFs, receipts, scanned text files)
2. Handwritten Notes (via browser OCR / handwritten canvas)
3. Raw uploaded document content

Performs:
- OCR noise cleanup (removes extra line breaks, stray artifacts)
- Document classification (Invoice/Receipt, Handwritten Note, Customer Review, Letter/Form)
- Key field extraction (emails, order IDs, prices/amounts, dates)
"""

import re


def clean_ocr_text(raw_text):
    """
    Cleans common OCR errors (hyphenated line wraps, stray noise characters,
    and excess spaces) while preserving original line breaks accurately.
    """
    if not raw_text:
        return ''

    # Normalize line endings
    text = raw_text.replace('\r\n', '\n').replace('\r', '\n')
    # Rejoin words split across lines with a trailing hyphen (e.g. "deliv-\nery" -> "delivery")
    text = re.sub(r'([A-Za-z])-\s*\n\s*([A-Za-z])', r'\1\2', text)
    # Remove isolated OCR border artifacts like repeated pipes or tildes
    text = re.sub(r'[|~`^]+', '', text)
    # Clean extra horizontal spaces per line while preserving line breaks
    cleaned_lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
    text = '\n'.join(cleaned_lines)
    # Collapse 3+ consecutive blank lines into a single blank line
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def extract_document_fields(text):
    """
    Extracts structured entities commonly found in scanned documents:
    - Prices / Amounts (e.g. $49.99, Rs. 500)
    - Dates
    - Emails
    - Order / Reference IDs
    """
    emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    amounts = re.findall(r'(?:\$|₹|€|£|Rs\.?\s?)\d+(?:,\d{3})*(?:\.\d{1,2})?', text)
    dates = re.findall(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', text)
    order_ids = re.findall(r'\b(?:ORD|INV|REF|ID)[-#:]?\s?[A-Z0-9]{4,12}\b', text, re.IGNORECASE)

    return {
        'emails': list(set(emails))[:5],
        'amounts': list(set(amounts))[:5],
        'dates': list(set(dates))[:5],
        'order_ids': list(set(order_ids))[:5]
    }


def detect_document_type(text, source_mode='document'):
    """Classifies what kind of document was scanned."""
    lower = text.lower()
    if source_mode == 'handwritten':
        return 'Handwritten Note / Feedback'
    if any(k in lower for k in ['invoice', 'receipt', 'total', 'subtotal', 'tax', 'paid', 'bill']):
        return 'Invoice / Purchase Receipt'
    if any(k in lower for k in ['refund', 'return', 'warranty', 'ticket', 'complaint']):
        return 'Support Claim / Return Form'
    if any(k in lower for k in ['stars', 'recommend', 'product', 'quality', 'bought', 'shipping']):
        return 'Product Review Document'
    return 'General Text Document'


def process_document(raw_text, source_mode='document', filename='Scanned Document'):
    """
    Main Document Processing function.

    Args:
        raw_text (str): Text extracted via OCR or file upload.
        source_mode (str): 'document', 'handwritten', or 'voice'.
        filename (str): Name of uploaded file or input source.

    Returns:
        dict: Cleaned text, document type, extracted fields, and statistics.
    """
    cleaned = clean_ocr_text(raw_text)
    if not cleaned:
        return {
            'cleaned_text': '',
            'document_type': 'Empty Document',
            'source_mode': source_mode,
            'filename': filename,
            'word_count': 0,
            'char_count': 0,
            'extracted_fields': {'emails': [], 'amounts': [], 'dates': [], 'order_ids': []},
            'status': 'No readable text detected'
        }

    fields = extract_document_fields(cleaned)
    doc_type = detect_document_type(cleaned, source_mode=source_mode)

    return {
        'cleaned_text': cleaned,
        'document_type': doc_type,
        'source_mode': source_mode,
        'filename': filename,
        'word_count': len(cleaned.split()),
        'char_count': len(cleaned),
        'extracted_fields': fields,
        'status': 'Processed Successfully'
    }
