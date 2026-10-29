"""
Translation Service Module
--------------------------
Translates review text into any requested language (e.g. Spanish, French,
German, Hindi, Chinese, Japanese, etc.) or back into English for analysis.

Uses lightweight, zero-key public translation service via standard library urllib,
with offline fallback capability.
"""

import urllib.request
import urllib.parse
import json

SUPPORTED_LANGUAGES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'hi': 'Hindi',
    'zh': 'Chinese (Simplified)',
    'ja': 'Japanese',
    'ar': 'Arabic',
    'ta': 'Tamil',
    'pt': 'Portuguese'
}


def translate_text(text, target_lang='es', source_lang='auto'):
    """
    Translates text to target language.
    
    Args:
        text (str): Review text to translate.
        target_lang (str): 2-letter language code (e.g. 'es', 'fr', 'de', 'hi').
        source_lang (str): Source language or 'auto'.
        
    Returns:
        dict: translated_text, source_lang, target_lang, target_lang_name
    """
    if not text or not text.strip():
        return {
            'translated_text': '',
            'source_lang': source_lang,
            'target_lang': target_lang,
            'target_lang_name': SUPPORTED_LANGUAGES.get(target_lang, target_lang),
            'success': False,
            'error': 'No text provided for translation.'
        }

    try:
        # Public translation API endpoint (no API key required)
        encoded_query = urllib.parse.quote(text.strip())
        url = (
            f"https://translate.googleapis.com/translate_a/single?"
            f"client=gtx&sl={source_lang}&tl={target_lang}&dt=t&q={encoded_query}"
        )

        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )

        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            # Google translation format: data[0] is array of translated sentence chunks
            translated_chunks = [item[0] for item in data[0] if item and item[0]]
            translated_text = "".join(translated_chunks)
            detected_source = data[2] if len(data) > 2 else source_lang

            return {
                'translated_text': translated_text,
                'source_lang': detected_source,
                'target_lang': target_lang,
                'target_lang_name': SUPPORTED_LANGUAGES.get(target_lang, target_lang),
                'success': True
            }

    except Exception as err:
        # Offline or network failure fallback
        return {
            'translated_text': f"[{SUPPORTED_LANGUAGES.get(target_lang, target_lang)} Translation (Offline)]: {text}",
            'source_lang': source_lang,
            'target_lang': target_lang,
            'target_lang_name': SUPPORTED_LANGUAGES.get(target_lang, target_lang),
            'success': False,
            'error': str(err)
        }
