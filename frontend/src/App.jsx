import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ReviewInput from './components/ReviewInput';
import ActionButtons from './components/ActionButtons';
import ResultDisplay from './components/ResultDisplay';
import ArchitectureModal from './components/ArchitectureModal';
import { checkBackendHealth, requestAnalysis } from './api';

export default function App() {
  const [reviewText, setReviewText] = useState('');
  
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [activeTab, setActiveTab] = useState('summarize');
  
  const [results, setResults] = useState({});
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [showArchModal, setShowArchModal] = useState(false);

  // Initialize backend health check
  useEffect(() => {
    async function init() {
      const online = await checkBackendHealth();
      setIsBackendOnline(online);
    }
    init();

    // Check health periodically every 10 seconds
    const interval = setInterval(async () => {
      const online = await checkBackendHealth();
      setIsBackendOnline(online);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = async (actionType) => {
    if (!reviewText.trim()) {
      alert('Please enter or paste a review text first!');
      return;
    }

    setLoadingType(actionType);

    if (actionType === 'analyze-all') {
      const res = await requestAnalysis('analyze-all', reviewText);
      if (res.success && res.data) {
        setResults({
          summarize: res.data.summarization,
          sentiment: res.data.sentiment,
          emotion: res.data.emotion,
          intent: res.data.intent
        });
        setIsLocalFallback(res.isLocalFallback);
        setActiveTab('summarize');
      }
    } else {
      const res = await requestAnalysis(actionType, reviewText);
      if (res.success && res.data) {
        setResults((prev) => ({
          ...prev,
          [actionType]: res.data
        }));
        setIsLocalFallback(res.isLocalFallback);
        setActiveTab(actionType);
      }
    }

    setLoadingType(null);
  };

  return (
    <div className="dashboard-layout">
      <div className="dashboard-container">
        {/* Top Navigation & Status */}
        <Header 
          isBackendOnline={isBackendOnline} 
          onOpenArchitecture={() => setShowArchModal(true)} 
        />

        <main className="main-content">
          {/* Review Input Box */}
          <ReviewInput
            reviewText={reviewText}
            setReviewText={setReviewText}
          />

          {/* Action Trigger Buttons */}
          <ActionButtons
            onAnalyze={handleAnalyze}
            activeTab={activeTab}
            loadingType={loadingType}
          />

          {/* Results Display */}
          <ResultDisplay
            results={results}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isLocalFallback={isLocalFallback}
          />
        </main>

        <footer className="footer-credits">
          <p>
            Review Insight Dashboard • Built with React & Python Flask • 
            Modular and easy to understand code architecture.
          </p>
        </footer>
      </div>

      {/* Architecture Modal */}
      <ArchitectureModal 
        isOpen={showArchModal} 
        onClose={() => setShowArchModal(false)} 
      />
    </div>
  );
}
