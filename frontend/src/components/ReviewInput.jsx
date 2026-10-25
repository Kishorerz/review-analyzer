import React from 'react';
import { Clipboard, Trash2, FileText } from 'lucide-react';

export default function ReviewInput({
  reviewText,
  setReviewText
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
            <p className="card-desc">Paste an Amazon, eCommerce, or customer review text to analyze</p>
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

      {/* Raw Review Text Area */}
      <div className="textarea-wrapper">
        <textarea
          className="review-textarea"
          rows={6}
          placeholder="Paste review text here (e.g. 'I bought this item last week. The quality is fantastic, but shipping took too long. Can I get a replacement?')"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
        />
      </div>

      {/* Character & Word Statistics */}
      <div className="input-footer">
        <div className="text-stats">
          <span><strong>{wordCount}</strong> words</span>
          <span className="dot-sep">•</span>
          <span><strong>{charCount}</strong> characters</span>
        </div>
      </div>
    </div>
  );
}
