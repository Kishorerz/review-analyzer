import React from 'react';
import { AlignLeft, Smile, Heart, Compass, Zap, Loader2 } from 'lucide-react';

export default function ActionButtons({ onAnalyze, activeTab, loadingType }) {
  const actions = [
    {
      id: 'summarize',
      label: 'Summarize Text',
      subtitle: 'Key takeaways & bullet points',
      icon: AlignLeft,
      color: 'blue'
    },
    {
      id: 'sentiment',
      label: 'Sentiment Analysis',
      subtitle: 'Positive / Negative / Neutral score',
      icon: Smile,
      color: 'emerald'
    },
    {
      id: 'emotion',
      label: 'Emotional Analysis',
      subtitle: 'Joy, Anger, Disappointment, etc.',
      icon: Heart,
      color: 'rose'
    },
    {
      id: 'intent',
      label: 'Intent Analysis',
      subtitle: 'Refund, Defect, Praise, Inquiry',
      icon: Compass,
      color: 'amber'
    }
  ];

  return (
    <div className="action-buttons-section">
      <div className="section-title-row">
        <h3 className="section-title">Select Analysis Type</h3>
        <button
          type="button"
          className={`analyze-all-btn ${loadingType === 'analyze-all' ? 'is-loading' : ''}`}
          onClick={() => onAnalyze('analyze-all')}
          disabled={!!loadingType}
        >
          {loadingType === 'analyze-all' ? (
            <Loader2 className="spin-icon" size={17} />
          ) : (
            <Zap size={17} />
          )}
          <span>⚡ Run Complete Analysis (All 4)</span>
        </button>
      </div>

      <div className="action-grid">
        {actions.map((act) => {
          const Icon = act.icon;
          const isActive = activeTab === act.id;
          const isLoading = loadingType === act.id;

          return (
            <button
              key={act.id}
              type="button"
              className={`action-card-btn color-${act.color} ${isActive ? 'is-active' : ''}`}
              onClick={() => onAnalyze(act.id)}
              disabled={!!loadingType}
            >
              <div className="btn-icon-wrapper">
                {isLoading ? (
                  <Loader2 className="spin-icon" size={24} />
                ) : (
                  <Icon size={24} />
                )}
              </div>
              <div className="btn-content">
                <span className="btn-main-label">{act.label}</span>
                <span className="btn-sub-label">{act.subtitle}</span>
              </div>
              {isActive && <div className="active-glow-indicator" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
