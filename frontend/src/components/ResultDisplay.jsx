import React from 'react';
import { 
  AlignLeft, 
  Smile, 
  Heart, 
  Compass, 
  CheckCircle, 
  TrendingUp, 
  AlertTriangle, 
  Star, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function ResultDisplay({ 
  results, 
  activeTab, 
  setActiveTab,
  isLocalFallback 
}) {
  const hasResults = Object.keys(results).length > 0;

  if (!hasResults) {
    return (
      <div className="card empty-state-card">
        <div className="empty-icon-wrap">
          <Sparkles size={38} className="empty-icon" />
        </div>
        <h3 className="empty-title">Ready for Analysis</h3>
        <p className="empty-desc">
          Paste your review text above and click any analysis button (Summarize, Sentiment, Emotion, or Intent).
        </p>
      </div>
    );
  }

  return (
    <div className="card results-card">
      {/* Result Tabs Navigation */}
      <div className="results-tab-header">
        <div className="tab-pill-group">
          {results.summarize && (
            <button
              type="button"
              className={`result-tab-btn ${activeTab === 'summarize' ? 'active' : ''}`}
              onClick={() => setActiveTab('summarize')}
            >
              <AlignLeft size={16} />
              <span>Summary</span>
            </button>
          )}

          {results.sentiment && (
            <button
              type="button"
              className={`result-tab-btn ${activeTab === 'sentiment' ? 'active' : ''}`}
              onClick={() => setActiveTab('sentiment')}
            >
              <Smile size={16} />
              <span>Sentiment</span>
            </button>
          )}

          {results.emotion && (
            <button
              type="button"
              className={`result-tab-btn ${activeTab === 'emotion' ? 'active' : ''}`}
              onClick={() => setActiveTab('emotion')}
            >
              <Heart size={16} />
              <span>Emotion</span>
            </button>
          )}

          {results.intent && (
            <button
              type="button"
              className={`result-tab-btn ${activeTab === 'intent' ? 'active' : ''}`}
              onClick={() => setActiveTab('intent')}
            >
              <Compass size={16} />
              <span>Intent</span>
            </button>
          )}
        </div>

        {isLocalFallback && (
          <span className="fallback-note" title="Analysis executed via built-in fallback parser">
            Browser Fallback Mode
          </span>
        )}
      </div>

      <div className="tab-content-area">
        {activeTab === 'summarize' && results.summarize && (
          <SummaryView data={results.summarize} />
        )}

        {activeTab === 'sentiment' && results.sentiment && (
          <SentimentView data={results.sentiment} />
        )}

        {activeTab === 'emotion' && results.emotion && (
          <EmotionView data={results.emotion} />
        )}

        {activeTab === 'intent' && results.intent && (
          <IntentView data={results.intent} />
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// 1. SUMMARY VIEW COMPONENT
// -------------------------------------------------------------------
function SummaryView({ data }) {
  return (
    <div className="view-panel animate-fade-in">
      <div className="view-badge-row">
        <span className="view-badge badge-blue">
          <AlignLeft size={14} /> Text Summarization
        </span>
        <span className="compression-badge">
          {data.compression_ratio || 'Synthesized'}
        </span>
      </div>

      <div className="summary-highlight-box">
        <h4 className="box-title">Executive Summary</h4>
        <p className="summary-text">{data.summary}</p>
      </div>

      {data.key_takeaways && data.key_takeaways.length > 0 && (
        <div className="takeaways-section">
          <h4 className="takeaways-title">Key Review Points</h4>
          <ul className="takeaways-list">
            {data.key_takeaways.map((point, idx) => (
              <li key={idx} className="takeaway-item">
                <CheckCircle size={16} className="item-icon-check" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="stats-strip">
        <div className="stat-box">
          <span className="stat-label">Original Length</span>
          <span className="stat-value">{data.original_word_count} words</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Summary Length</span>
          <span className="stat-value">{data.summary_word_count} words</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">Efficiency</span>
          <span className="stat-value text-emerald">{data.compression_ratio}</span>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// 2. SENTIMENT VIEW COMPONENT
// -------------------------------------------------------------------
function SentimentView({ data }) {
  const isPositive = data.sentiment === 'Positive';
  const isNegative = data.sentiment === 'Negative';
  
  const sentimentColorClass = isPositive 
    ? 'sentiment-positive' 
    : (isNegative ? 'sentiment-negative' : 'sentiment-neutral');

  const starCount = data.predicted_rating || 3;

  return (
    <div className="view-panel animate-fade-in">
      <div className="view-badge-row">
        <span className="view-badge badge-emerald">
          <Smile size={14} /> Sentiment Analysis
        </span>
      </div>

      <div className={`sentiment-hero-card ${sentimentColorClass}`}>
        <div className="sentiment-main-info">
          <span className="sentiment-tag">{data.sentiment}</span>
          <p className="sentiment-explanation">{data.explanation}</p>
        </div>

        <div className="sentiment-rating-box">
          <span className="rating-label">Predicted Rating</span>
          <div className="stars-row">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={22}
                className={star <= starCount ? 'star-filled' : 'star-empty'}
              />
            ))}
          </div>
          <span className="rating-number">{starCount} out of 5 stars</span>
        </div>
      </div>

      {/* Confidence & Polarity meters */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Confidence Level</span>
          <div className="meter-wrapper">
            <div 
              className="meter-fill fill-primary" 
              style={{ width: `${data.confidence}%` }} 
            />
          </div>
          <span className="metric-value">{data.confidence}% confident</span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Polarity Score (-1.0 to +1.0)</span>
          <div className="meter-wrapper">
            {/* Center-anchored meter */}
            <div 
              className={`meter-fill ${data.score >= 0 ? 'fill-emerald' : 'fill-rose'}`}
              style={{ 
                width: `${Math.abs(data.score) * 50}%`,
                marginLeft: data.score >= 0 ? '50%' : `${50 - (Math.abs(data.score) * 50)}%`
              }} 
            />
          </div>
          <span className="metric-value">{data.score > 0 ? `+${data.score}` : data.score}</span>
        </div>
      </div>

      {/* Keywords detected */}
      <div className="keywords-section">
        {data.positive_words && data.positive_words.length > 0 && (
          <div className="keyword-group">
            <span className="keyword-header positive-header">Positive Signals:</span>
            <div className="tags-container">
              {data.positive_words.map((kw, i) => (
                <span key={i} className="tag tag-pos">+{kw}</span>
              ))}
            </div>
          </div>
        )}

        {data.negative_words && data.negative_words.length > 0 && (
          <div className="keyword-group">
            <span className="keyword-header negative-header">Negative Signals:</span>
            <div className="tags-container">
              {data.negative_words.map((kw, i) => (
                <span key={i} className="tag tag-neg">-{kw}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// 3. EMOTION VIEW COMPONENT
// -------------------------------------------------------------------
function EmotionView({ data }) {
  return (
    <div className="view-panel animate-fade-in">
      <div className="view-badge-row">
        <span className="view-badge badge-rose">
          <Heart size={14} /> Emotional Analysis
        </span>
        <span className="dominant-pill">
          Dominant Emotion: <strong>{data.dominant_emotion}</strong>
        </span>
      </div>

      <div className="emotion-breakdown-card">
        <h4 className="box-title">Emotion Spectrum Distribution</h4>

        <div className="emotion-bars-container">
          {data.breakdown.map((item) => (
            <div key={item.key} className="emotion-row">
              <div className="emotion-label-group">
                <span className="emotion-name">{item.emotion}</span>
                <span className="emotion-pct">{item.percentage}%</span>
              </div>
              <div className="emotion-progress-track">
                <div 
                  className={`emotion-progress-bar emotion-color-${item.key}`}
                  style={{ width: `${Math.max(item.percentage, 3)}%` }}
                />
              </div>
              {item.clues && item.clues.length > 0 && (
                <div className="clue-subtext">
                  Triggers: {item.clues.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// 4. INTENT VIEW COMPONENT
// -------------------------------------------------------------------
function IntentView({ data }) {
  const urgencyColor = {
    'High': 'urgency-high',
    'Medium': 'urgency-medium',
    'Low': 'urgency-low'
  }[data.urgency] || 'urgency-low';

  return (
    <div className="view-panel animate-fade-in">
      <div className="view-badge-row">
        <span className="view-badge badge-amber">
          <Compass size={14} /> Intent Analysis
        </span>
        <span className={`urgency-pill ${urgencyColor}`}>
          Urgency: {data.urgency}
        </span>
      </div>

      <div className="intent-main-box">
        <div className="intent-icon-badge">{data.icon || '🎯'}</div>
        <div className="intent-desc-wrap">
          <h3 className="intent-title">{data.primary_intent}</h3>
          <p className="intent-description">{data.description}</p>
        </div>
      </div>

      <div className="action-recommendation-card">
        <div className="rec-header">
          <ArrowRight size={18} className="rec-icon" />
          <span className="rec-title">Recommended Business Action</span>
        </div>
        <p className="rec-body">{data.recommended_action}</p>
      </div>

      {data.detected_triggers && data.detected_triggers.length > 0 && (
        <div className="intent-triggers">
          <span className="triggers-label">Detected Trigger Terms:</span>
          <div className="tags-container">
            {data.detected_triggers.map((trigger, i) => (
              <span key={i} className="tag tag-intent">"{trigger}"</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
