import React, { useState, useEffect, useRef } from 'react';
import { Clipboard, Trash2, FileText, Mic, MicOff, Languages, GitCompare, ArrowRight, Check } from 'lucide-react';

export default function ReviewInput({
  reviewText,
  setReviewText,
  compareText,
  setCompareText,
  showCompare,
  setShowCompare,
  onTranslate,
  translationLoading,
  translationResult,
  onApplyTranslation
}) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [targetLang, setTargetLang] = useState('es');
  const [copiedTrans, setCopiedTrans] = useState(false);
  const recognitionRef = useRef(null);

  const wordCount = reviewText.trim() ? reviewText.trim().split(/\s+/).length : 0;
  const charCount = reviewText.length;

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.lang = 'ta-IN';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }
      if (finalTranscript) {
        setReviewText((prev) => (prev ? prev.trim() + ' ' + finalTranscript.trim() : finalTranscript.trim()));
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [setReviewText]);

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Speech-to-text is supported natively in Chrome, Edge, Safari, and Brave. Please use a supported browser or type directly.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setReviewText(text);
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  const handleClear = () => {
    setReviewText('');
  };

  const handleCopyTranslation = () => {
    if (translationResult?.translated_text) {
      navigator.clipboard.writeText(translationResult.translated_text);
      setCopiedTrans(true);
      setTimeout(() => setCopiedTrans(false), 2000);
    }
  };

  return (
    <div className="card input-card">
      <div className="card-header">
        <div className="card-title-wrap">
          <FileText className="card-icon" size={20} />
          <div>
            <h2 className="card-title">Customer Review Input</h2>
            <p className="card-desc">Type, paste, or speak a customer review to analyze</p>
          </div>
        </div>

        <div className="quick-actions">
          {/* 1. Voice to Text Button */}
          <button
            type="button"
            className={`text-action-btn ${isListening ? 'text-action-btn-recording' : ''}`}
            onClick={toggleListening}
            title={isListening ? 'Click to stop recording' : 'Click to speak review via microphone'}
          >
            {isListening ? (
              <>
                <span className="recording-pulse" />
                <MicOff size={14} /> Listening... Stop
              </>
            ) : (
              <>
                <Mic size={14} /> Voice Input
              </>
            )}
          </button>

          {/* 2. Paste Button */}
          <button 
            type="button" 
            className="text-action-btn"
            onClick={handlePaste}
            title="Paste text from clipboard"
          >
            <Clipboard size={14} /> Paste
          </button>

          {/* 3. Compare with 2nd review toggle */}
          <button
            type="button"
            className={`text-action-btn ${showCompare ? 'text-action-btn-active' : ''}`}
            onClick={() => setShowCompare(!showCompare)}
            title="Compare with a second review to compute Similarity Index"
          >
            <GitCompare size={14} /> Compare (Similarity)
          </button>

          {/* 4. Clear Button */}
          {reviewText && (
            <button 
              type="button" 
              className="text-action-btn text-action-btn-danger"
              onClick={handleClear}
              title="Clear review text"
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Review Text Area */}
      <div className="textarea-wrapper">
        <textarea
          className={`review-textarea ${isListening ? 'textarea-listening' : ''}`}
          rows={5}
          placeholder="Paste or speak review text here (e.g. 'I bought these headphones last week. The sound quality is amazing and bass is punchy, but the ear cushions hurt after an hour. Can I return them?')"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
        />
        {isListening && (
          <div className="listening-badge">
            <span className="live-dot" />
            <span>Listening to your voice... Speak now</span>
          </div>
        )}
      </div>

      {/* Secondary Review Text Area (Visible when user toggles Compare) */}
      {showCompare && (
        <div className="compare-input-box animate-fade-in">
          <div className="compare-header">
            <div className="compare-title">
              <GitCompare size={16} className="text-purple" />
              <span>Review #2 / Reference Text (to compare against):</span>
            </div>
            {compareText && (
              <button
                type="button"
                className="text-action-btn"
                onClick={() => setCompareText('')}
              >
                Clear Review #2
              </button>
            )}
          </div>
          <textarea
            className="review-textarea compare-textarea"
            rows={3}
            placeholder="Paste a 2nd review or product description here to compute lexical and semantic similarity..."
            value={compareText}
            onChange={(e) => setCompareText(e.target.value)}
          />
        </div>
      )}

      {/* Quick Translation Bar */}
      <div className="translation-bar">
        <div className="trans-controls">
          <Languages size={15} className="text-muted" />
          <span className="trans-label">Translate To:</span>
          <select 
            className="lang-select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            <option value="es">Spanish (Español)</option>
            <option value="fr">French (Français)</option>
            <option value="de">German (Deutsch)</option>
            <option value="hi">Hindi (हिंदी)</option>
            <option value="zh">Chinese (中文)</option>
            <option value="ja">Japanese (日本語)</option>
            <option value="ta">Tamil (தமிழ்)</option>
            <option value="ar">Arabic (العربية)</option>
            <option value="en">English</option>
          </select>
          <button
            type="button"
            className="trans-btn"
            onClick={() => onTranslate(targetLang)}
            disabled={!reviewText.trim() || translationLoading}
          >
            {translationLoading ? 'Translating...' : 'Translate'}
          </button>
        </div>

        {/* Character & Word Statistics */}
        <div className="text-stats">
          <span><strong>{wordCount}</strong> words</span>
          <span className="dot-sep">•</span>
          <span><strong>{charCount}</strong> characters</span>
        </div>
      </div>

      {/* Inline Translated Preview (if available) */}
      {translationResult && (
        <div className="translation-preview-box animate-fade-in">
          <div className="trans-preview-header">
            <span className="trans-preview-lang">
              Translated to {translationResult.target_lang_name || 'Language'}:
            </span>
            <div className="trans-preview-actions">
              <button
                type="button"
                className="text-action-btn"
                onClick={handleCopyTranslation}
              >
                {copiedTrans ? <Check size={12} /> : null}
                {copiedTrans ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                className="text-action-btn text-action-btn-highlight"
                onClick={onApplyTranslation}
                title="Replace review textarea with translated text to analyze it"
              >
                Use this text for analysis <ArrowRight size={12} />
              </button>
            </div>
          </div>
          <p className="trans-preview-text">{translationResult.translated_text}</p>
        </div>
      )}
    </div>
  );
}
