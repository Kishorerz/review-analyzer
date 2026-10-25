import React from 'react';
import { Clipboard, Trash2, FileText, Sparkles } from 'lucide-react';

export default function ReviewInput({
  reviewText,
  setReviewText,
  sampleReviews,
  onSelectSample,
  activeSampleId
}) {
  const wordCount = reviewText.trim() ? reviewText.trim().split(/\s+/).length : 0;
  const charCount = reviewText.length;

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

  return (
    <div className="card input-card">
      <div className="card-header">
        <div className="card-title-wrap">
          <FileText className="card-icon" size={20} />
          <div>
            <h2 className="card-title">Customer Review Input</h2>
            <p className="card-desc">Paste an Amazon review or select a ready-to-test sample below</p>
          </div>
        </div>

        <div className="quick-actions">
          <button 
            type="button" 
            className="text-action-btn"
            onClick={handlePaste}
            title="Paste text from clipboard"
          >
            <Clipboard size={14} /> Paste
          </button>
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

      {/* Preset Review Chips */}
      <div className="samples-container">
        <span className="samples-label">Quick Test Reviews:</span>
        <div className="samples-chips">
          {sampleReviews.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className={`sample-chip ${activeSampleId === sample.id ? 'active' : ''}`}
              onClick={() => onSelectSample(sample)}
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Text Area */}
      <div className="textarea-wrapper">
        <textarea
          className="review-textarea"
          rows={6}
          placeholder="Paste an Amazon, eCommerce, or customer review here (e.g. 'I bought this camera last month. The picture quality is amazing in daylight, but the battery dies in 40 minutes...')"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
        />
      </div>

      {/* Stats bar */}
      <div className="input-footer">
        <div className="text-stats">
          <span><strong>{wordCount}</strong> words</span>
          <span className="dot-sep">•</span>
          <span><strong>{charCount}</strong> characters</span>
        </div>
        <div className="input-hint">
          {wordCount === 0 && 'Tip: Click any sample review above to start instantly!'}
        </div>
      </div>
    </div>
  );
}
