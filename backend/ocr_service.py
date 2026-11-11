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
    Cleans common OCR errors such as broken line wraps, extra spaces,
    and stray punctuation artifacts while preserving readable sentences.
    """
    if not raw_text:
        return ''

    # Replace multiple newlines with a clean space or period break
    text = re.sub(r'\r\n|\r|\n', ' ', raw_text)
    # Collapse multiple spaces into one
    text = re.sub(r'\s+', ' ', text)
    # Remove isolated stray symbols commonly produced by OCR (like | or ~)
    text = re.sub(r'[|~`^_]+', '', text)
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
