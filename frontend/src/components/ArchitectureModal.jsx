import React from 'react';
import { X, Check, Code, Layers, Cpu, Server, Monitor } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Layers className="modal-icon" size={24} />
            <div>
              <h2 className="modal-title">System Architecture & Design</h2>
              <p className="modal-subtitle">Clean, Transparent & Built With Normal Code</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Architecture diagram cards */}
          <div className="arch-flow-diagram">
            <div className="arch-box">
              <div className="arch-box-icon"><Monitor size={22} /></div>
              <h4>1. React Frontend</h4>
              <p>Dashboard UI with stateful buttons for Summarize, Sentiment, Emotion & Intent.</p>
              <span className="tech-badge">React 18 + Vite</span>
            </div>

            <div className="flow-arrow">➔</div>

            <div className="arch-box">
              <div className="arch-box-icon"><Server size={22} /></div>
              <h4>2. Flask Backend API</h4>
              <p>Clean REST endpoints with instant CORS handling at <code>http://127.0.0.1:5000</code>.</p>
              <span className="tech-badge">Python Flask</span>
            </div>

            <div className="flow-arrow">➔</div>

            <div className="arch-box">
              <div className="arch-box-icon"><Cpu size={22} /></div>
              <h4>3. NLP Engine</h4>
              <p>Deterministic, fast rule-based algorithms for sentence scoring & polarity.</p>
              <span className="tech-badge">Pure Python Code</span>
            </div>
          </div>

          <div className="arch-section">
            <h3 className="arch-section-title">Why "Normal Code" & Simple Architecture?</h3>
            <ul className="arch-reasons-list">
              <li>
                <Check size={16} className="text-emerald" />
                <span><strong>No Bulky 5GB AI Models:</strong> Runs instantly on any computer without needing GPUs, PyTorch, or long model downloads.</span>
              </li>
              <li>
                <Check size={16} className="text-emerald" />
                <span><strong>Zero Cost & No API Keys:</strong> Doesn't require paid OpenAI or third-party keys; 100% offline and private.</span>
              </li>
              <li>
                <Check size={16} className="text-emerald" />
                <span><strong>Completely Transparent & Explainable:</strong> You can open <code>nlp_engine.py</code> and understand every calculation, weight, and sentence score.</span>
              </li>
              <li>
                <Check size={16} className="text-emerald" />
                <span><strong>Independent Operation:</strong> The React frontend even includes a smart fallback engine to preview results if the backend is not yet started.</span>
              </li>
            </ul>
          </div>

          <div className="arch-section">
            <h3 className="arch-section-title">How Each Button Works</h3>
            <div className="table-responsive">
              <table className="arch-table">
                <thead>
                  <tr>
                    <th>Button</th>
                    <th>Backend File</th>
                    <th>Flask Endpoint</th>
                    <th>Algorithm in Plain English</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Summarize Text</strong></td>
                    <td><code>text_summarization.py</code></td>
                    <td><code>POST /api/summarize</code></td>
                    <td>Splits into sentences, calculates non-stopword frequencies, scores sentences by word weight & position, selects top key sentences.</td>
                  </tr>
                  <tr>
                    <td><strong>Sentiment</strong></td>
                    <td><code>sentiment_analysis.py</code></td>
                    <td><code>POST /api/sentiment</code></td>
                    <td>Lexicon polarity scoring (-2 to +2), reverses polarity on negation words ('not good'), amplifies on intensifiers ('very'), predicts 1-5 star rating.</td>
                  </tr>
                  <tr>
                    <td><strong>Emotion</strong></td>
                    <td><code>emotion_analysis.py</code></td>
                    <td><code>POST /api/emotion</code></td>
                    <td>Scans text for emotional lexicon clusters (Joy, Anger, Sadness, Surprise, Fear, Disgust) and returns a percentage breakdown.</td>
                  </tr>
                  <tr>
                    <td><strong>Intent</strong></td>
                    <td><code>intent_analysis.py</code></td>
                    <td><code>POST /api/intent</code></td>
                    <td>Detects customer goals: Refund Request, Quality Complaint, Praise, Inquiries, or Feature Suggestions with recommended merchant actions.</td>
                  </tr>
                  <tr>
                    <td><strong>Voice to Text</strong></td>
                    <td><code>Browser Native</code></td>
                    <td><code>Web Speech API</code></td>
                    <td>Uses native browser speech recognition engine to transcribe spoken voice into review text in real-time with zero server latency.</td>
                  </tr>
                  <tr>
                    <td><strong>Translation</strong></td>
                    <td><code>translation_service.py</code></td>
                    <td><code>POST /api/translate</code></td>
                    <td>Translates text across 10+ languages (Spanish, French, German, Hindi, etc.) without requiring paid API keys.</td>
                  </tr>
                  <tr>
                    <td><strong>Similarity Index</strong></td>
                    <td><code>similarity_service.py</code></td>
                    <td><code>POST /api/similarity</code></td>
                    <td>Computes Jaccard word set overlap and Cosine term frequency vectors between 2 reviews to detect duplicates and template spam.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-primary-btn" onClick={onClose}>
            Got It! Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
