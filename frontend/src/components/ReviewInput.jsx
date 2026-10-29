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
  const [voiceLang, setVoiceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [copiedTrans, setCopiedTrans] = useState(false);
  const [detectedVoiceLang, setDetectedVoiceLang] = useState('');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 real-time volume
  const [waveBars, setWaveBars] = useState([8, 12, 16, 20, 16, 12, 8]); // Sonagraph bars

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const wordCount = reviewText.trim() ? reviewText.trim().split(/\s+/).length : 0;
  const charCount = reviewText.length;

  // Function to detect script / language from transcribed text
  const detectLanguageScript = (text) => {
    if (!text) return '';
    if (/[\u0900-\u097F]/.test(text)) return 'Hindi (हिंदी)';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil (தமிழ்)';
    if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu (తెలుగు)';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'Kannada (ಕನ್ನಡ)';
    if (/[\u0D00-\u0D7F]/.test(text)) return 'Malayalam (മലയാളം)';
    if (/[\u0980-\u09FF]/.test(text)) return 'Bengali (বাংলা)';
    if (/[\u4E00-\u9FFF]/.test(text)) return 'Chinese (中文)';
    if (/[\u3040-\u30FF]/.test(text)) return 'Japanese (日本語)';
    if (/[\u0600-\u06FF]/.test(text)) return 'Arabic (العربية)';
    if (/[áéíóúüñ¿¡]/i.test(text)) return 'Spanish (Español)';
    if (/[éàèùâêîôûëïüç]/i.test(text)) return 'French (Français)';
    if (/[äöüß]/i.test(text)) return 'German (Deutsch)';
    return 'English / Latin';
  };

  // Real-time Audio Sonagraph using Web Audio API
  const startAudioSonagraph = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateSonagraph = () => {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume level (0 to 100)
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = Math.min(100, Math.round((sum / dataArray.length) * 1.6));
        setAudioLevel(avg);

        // Generate 7 responsive soundwave heights based on frequency spectrum
        const bars = [
          Math.max(6, Math.round((dataArray[1] || 0) / 4)),
          Math.max(8, Math.round((dataArray[3] || 0) / 3)),
          Math.max(12, Math.round((dataArray[5] || 0) / 2.5)),
          Math.max(16, Math.round((dataArray[7] || 0) / 2.2)),
          Math.max(12, Math.round((dataArray[9] || 0) / 2.5)),
          Math.max(8, Math.round((dataArray[11] || 0) / 3)),
          Math.max(6, Math.round((dataArray[13] || 0) / 4)),
        ];
        setWaveBars(bars);

        animationFrameRef.current = requestAnimationFrame(updateSonagraph);
      };

      updateSonagraph();
    } catch (err) {
      console.warn('Microphone audio stream error:', err);
    }
  };

  const stopAudioSonagraph = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
    setWaveBars([8, 12, 16, 20, 16, 12, 8]);
  };

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
    const initialLang = voiceLang === 'auto' ? (navigator.language || 'en-US') : voiceLang;
    recognition.lang = initialLang;

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
        const detected = detectLanguageScript(finalTranscript);
        if (detected) setDetectedVoiceLang(detected);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopAudioSonagraph();
      setIsListening(false);
    };

    recognition.onend = () => {
      stopAudioSonagraph();
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      stopAudioSonagraph();
      recognition.stop();
    };
  }, [setReviewText]);

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Speech-to-text is supported natively in Chrome, Edge, Safari, and Brave. Please use a supported browser or type directly.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      stopAudioSonagraph();
      setIsListening(false);
    } else {
      try {
        const targetLanguage = voiceLang === 'auto' ? (navigator.language || 'en-US') : voiceLang;
        if (recognitionRef.current) {
          recognitionRef.current.lang = targetLanguage;
        }
        startAudioSonagraph();
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech start error:', err);
        stopAudioSonagraph();
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
          {/* 1. Voice to Text Button + Language Selector */}
          <div className="voice-input-group">
            <button
              type="button"
              className={`text-action-btn ${isListening ? 'text-action-btn-recording' : ''}`}
              onClick={toggleListening}
              title={isListening ? 'Click to stop recording' : 'Click to speak review via microphone'}
            >
              {isListening ? (
                <>
                  <span className="recording-pulse" />
                  <MicOff size={14} /> Stop
                </>
              ) : (
                <>
                  <Mic size={14} /> Voice Input
                </>
              )}
            </button>
            <select
              className="voice-lang-select"
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value)}
              disabled={isListening}
              title="Select spoken language (or choose Auto-Detect)"
            >
              <option value="auto">✨ Auto-Detect (System Default)</option>
              <option value="en-IN">🇮🇳 English (India)</option>
              <option value="en-US">🇺🇸 English (US)</option>
              <option value="en-GB">🇬🇧 English (UK)</option>
              <option value="hi-IN">🇮🇳 Hindi (हिंदी)</option>
              <option value="ta-IN">🇮🇳 Tamil (தமிழ்)</option>
              <option value="te-IN">🇮🇳 Telugu (తెలుగు)</option>
              <option value="kn-IN">🇮🇳 Kannada (ಕನ್ನಡ)</option>
              <option value="ml-IN">🇮🇳 Malayalam (മലയാളം)</option>
              <option value="mr-IN">🇮🇳 Marathi (मराठी)</option>
              <option value="bn-IN">🇮🇳 Bengali (বাংলা)</option>
              <option value="es-ES">🇪🇸 Spanish (Español)</option>
              <option value="fr-FR">🇫🇷 French (Français)</option>
              <option value="de-DE">🇩🇪 German (Deutsch)</option>
              <option value="zh-CN">🇨🇳 Chinese (中文)</option>
              <option value="ja-JP">🇯🇵 Japanese (日本語)</option>
              <option value="ar-SA">🇸🇦 Arabic (العربية)</option>
            </select>
          </div>

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
          <div className="sonagraph-container animate-fade-in">
            <div className="sonagraph-status">
              <span className="live-dot" />
              <span className="sonagraph-text">
                {audioLevel > 14 ? '🎙️ Mic Active: Hearing Your Voice!' : '⏳ Mic Ready: Waiting for speech...'}
              </span>
            </div>

            {/* Real-time Sonagraph Waveform Spectrum */}
            <div className="sonagraph-wave">
              {waveBars.map((height, i) => (
                <span
                  key={i}
                  className={`wave-bar ${audioLevel > 14 ? 'wave-bar-active' : ''}`}
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>

            {/* Visual Volume Meter (0-100%) */}
            <div className="audio-meter-wrap" title={`Mic Volume Level: ${audioLevel}%`}>
              <div
                className={`audio-meter-bar ${audioLevel > 14 ? 'meter-hearing' : ''}`}
                style={{ width: `${Math.max(audioLevel, 8)}%` }}
              />
            </div>

            {detectedVoiceLang && (
              <span className="detected-lang-pill">
                Detected: <strong>{detectedVoiceLang}</strong>
              </span>
            )}
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
