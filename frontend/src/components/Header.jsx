import React from 'react';
import { Sparkles, Server, Info, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Header({ isBackendOnline, onOpenArchitecture }) {
  return (
    <header className="header-container">
      <div className="header-brand">
        <div className="logo-badge">
          <Sparkles className="logo-icon" size={26} />
        </div>
        <div>
          <h1 className="header-title">Review Insight AI Dashboard</h1>
          <p className="header-subtitle">
            Smart Text Summarization • Sentiment Analysis • Emotion Detection • Customer Intent
          </p>
        </div>
      </div>

      <div className="header-actions">
        <div className={`status-pill ${isBackendOnline ? 'status-online' : 'status-fallback'}`}
             title={isBackendOnline ? 'Connected to Flask Backend at http://127.0.0.1:5000' : 'Backend is not running. Using built-in browser fallback engine.'}>
          {isBackendOnline ? (
            <>
              <CheckCircle2 size={15} />
              <span>Flask API: Online</span>
            </>
          ) : (
            <>
              <AlertCircle size={15} />
              <span>Offline / Built-in Engine</span>
            </>
          )}
        </div>

        <button 
          className="arch-btn"
          onClick={onOpenArchitecture}
          title="See how this project is structured and works"
        >
          <Info size={16} />
          <span>System Architecture</span>
        </button>
      </div>
    </header>
  );
}
