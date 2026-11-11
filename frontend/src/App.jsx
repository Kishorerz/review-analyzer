import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ReviewInput from './components/ReviewInput';
import ActionButtons from './components/ActionButtons';
import ResultDisplay from './components/ResultDisplay';
import ArchitectureModal from './components/ArchitectureModal';
import { checkBackendHealth, requestAnalysis, requestTranslation, requestSimilarity, requestOcrProcess, requestRpaWorkflow } from './api';

export default function App() {
  const [reviewText, setReviewText] = useState('');
  const [compareText, setCompareText] = useState('');
  const [showCompare, setShowCompare] = useState(false);

  const [sourceMode, setSourceMode] = useState('text');
  const [sourceFilename, setSourceFilename] = useState('Direct Text Input');

  const [translationResult, setTranslationResult] = useState(null);
  const [translationLoading, setTranslationLoading] = useState(false);
  
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

    const interval = setInterval(async () => {
      const online = await checkBackendHealth();
      setIsBackendOnline(online);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handle Translate
  const handleTranslate = async (targetLang) => {
    if (!reviewText.trim()) {
      alert('Please enter or speak review text first before translating.');
      return;
    }
    setTranslationLoading(true);
    const res = await requestTranslation(reviewText, targetLang);
    if (res.success && res.data) {
      setTranslationResult(res.data);
      setResults((prev) => ({
        ...prev,
        translation: res.data
      }));
    }
    setTranslationLoading(false);
  };

  // Replace review textarea with translated text
  const handleApplyTranslation = () => {
    if (translationResult?.translated_text) {
      setReviewText(translationResult.translated_text);
    }
  };

  // Handle Document / Handwritten OCR Completion
  const handleOcrExtracted = async (rawText, mode, name) => {
    setSourceMode(mode);
    setSourceFilename(name);
    const res = await requestOcrProcess(rawText, mode, name);
    if (res.success && res.data) {
      setReviewText(res.data.cleaned_text || rawText);
      setResults((prev) => ({
        ...prev,
        ocr: res.data
      }));
      setIsLocalFallback(res.isLocalFallback);
      setActiveTab('ocr');
    }
  };

  // Handle Analysis Triggers
  const handleAnalyze = async (actionType) => {
    if (!reviewText.trim()) {
      alert('Please enter, paste, speak, or scan a review/document text first!');
      return;
    }

    // RPA Bot Automation Workflow
    if (actionType === 'rpa') {
      setLoadingType('rpa');
      const res = await requestRpaWorkflow(reviewText, sourceMode, sourceFilename);
      if (res.success && res.data) {
        const analysis = res.data.analysis || {};
        setResults((prev) => ({
          ...prev,
          rpa: res.data,
          ocr: res.data.document_info || prev.ocr,
          summarize: analysis.summarization || prev.summarize,
          sentiment: analysis.sentiment || prev.sentiment,
          emotion: analysis.emotion || prev.emotion,
          intent: analysis.intent || prev.intent
        }));
        setIsLocalFallback(res.isLocalFallback);
        setActiveTab('rpa');
      }
      setLoadingType(null);
      return;
    }

    // Similarity special handling: Requires 2 texts
    if (actionType === 'similarity') {
      if (!compareText.trim()) {
        setShowCompare(true);
        alert('Similarity Index compares two reviews! Please paste a 2nd review into the "Review #2" box that just opened, then click Similarity Index again.');
        return;
      }
      setLoadingType('similarity');
      const res = await requestSimilarity(reviewText, compareText);
      if (res.success && res.data) {
        setResults((prev) => ({
          ...prev,
          similarity: res.data
        }));
        setIsLocalFallback(res.isLocalFallback);
        setActiveTab('similarity');
      }
      setLoadingType(null);
      return;
    }

    setLoadingType(actionType);

    if (actionType === 'analyze-all') {
      const res = await requestAnalysis('analyze-all', reviewText);
      if (res.success && res.data) {
        const updated = {
          summarize: res.data.summarization,
          sentiment: res.data.sentiment,
          emotion: res.data.emotion,
          intent: res.data.intent
        };

        // If user provided a 2nd review, also compute similarity in "analyze-all"
        if (compareText.trim()) {
          const simRes = await requestSimilarity(reviewText, compareText);
          if (simRes.success && simRes.data) {
            updated.similarity = simRes.data;
          }
        }

        setResults(updated);
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
          {/* Review Input Box with Voice, OCR, Translate & Compare */}
          <ReviewInput
            reviewText={reviewText}
            setReviewText={setReviewText}
            compareText={compareText}
            setCompareText={setCompareText}
            showCompare={showCompare}
            setShowCompare={setShowCompare}
            onTranslate={handleTranslate}
            translationLoading={translationLoading}
            translationResult={translationResult}
            onApplyTranslation={handleApplyTranslation}
            onOcrExtracted={handleOcrExtracted}
            sourceMode={sourceMode}
            setSourceMode={setSourceMode}
          />

          {/* Action Trigger Buttons */}
          <ActionButtons
            onAnalyze={handleAnalyze}
            activeTab={activeTab}
            loadingType={loadingType}
            hasCompareText={Boolean(compareText.trim())}
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
            Voice to Text • Translation • Similarity Index • Summarization • Sentiment • Emotion • Intent
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
