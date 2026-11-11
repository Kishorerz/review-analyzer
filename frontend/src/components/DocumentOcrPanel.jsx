import React, { useState, useRef, useEffect } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import { Upload, PenTool, Eraser, ScanText, FileCheck, Loader2, RefreshCw, Sparkles, KeyRound, X } from 'lucide-react';
import { requestVisionOcr } from '../api';

// Convert any uploaded blob URL / data URL into a clean JPEG data URL for AI Vision OCR
function prepareImageDataUrlForVision(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;
      const maxDim = 1600;
      const scale = Math.max(srcW, srcH) > maxDim ? maxDim / Math.max(srcW, srcH) : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(srcW * scale);
      canvas.height = Math.round(srcH * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = imageSource;
  });
}

// Compute local illumination normalization in O(W*H) via 2D Integral Image to strip shadows & faint ruled lines
function normalizeLocalIllumination(grays, w, h, radius = 26) {
  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));

  for (let y = 0; y < h; y += 1) {
    let rowSum = 0;
    const rowOff = y * w;
    const iCurr = (y + 1) * stride;
    const iPrev = y * stride;
    for (let x = 0; x < w; x += 1) {
      rowSum += grays[rowOff + x];
      integral[iCurr + x + 1] = integral[iPrev + x + 1] + rowSum;
    }
  }

  const normalized = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y += 1) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    const offY0 = y0 * stride;
    const offY1 = (y1 + 1) * stride;
    for (let x = 0; x < w; x += 1) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum = integral[offY1 + x1 + 1] - integral[offY0 + x1 + 1] - integral[offY1 + x0] + integral[offY0 + x0];
      const localMean = Math.max(1, sum / area);
      const idx = y * w + x;
      normalized[idx] = Math.min(255, Math.round((grays[idx] / localMean) * 245));
    }
  }
  return normalized;
}

// Preprocess image in an offscreen canvas (upscale, pad, auto-invert dark mode, local shadow removal / Otsu B&W)
function preprocessImageForOcr(imageSource, enhanceMode = 'auto', isHandwritten = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;
      if (!srcW || !srcH) {
        resolve(imageSource);
        return;
      }

      const targetMinWidth = isHandwritten ? Math.max(srcW * 2, 1400) : 1400;
      let scale = srcW < targetMinWidth ? targetMinWidth / srcW : 1;
      if (isHandwritten) {
        scale = Math.max(scale, 2);
      }
      const maxDim = Math.max(srcW * scale, srcH * scale);
      if (maxDim > 2200) {
        scale = 2200 / Math.max(srcW, srcH);
      }

      const scaledW = Math.round(srcW * scale);
      const scaledH = Math.round(srcH * scale);
      const pad = 48;

      const canvas = document.createElement('canvas');
      canvas.width = scaledW + pad * 2;
      canvas.height = scaledH + pad * 2;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, pad, pad, scaledW, scaledH);

      if (enhanceMode === 'original') {
        resolve(canvas.toDataURL('image/png'));
        return;
      }

      const imageData = ctx.getImageData(pad, pad, scaledW, scaledH);
      const data = imageData.data;
      const totalPixels = scaledW * scaledH;
      const grays = new Uint8ClampedArray(totalPixels);
      let lumSum = 0;

      for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
        const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        grays[p] = g;
        lumSum += g;
      }

      const shouldInvert = lumSum / Math.max(1, totalPixels) < 120;
      if (shouldInvert) {
        for (let p = 0; p < totalPixels; p += 1) {
          grays[p] = 255 - grays[p];
        }
      }

      const normalized = normalizeLocalIllumination(grays, scaledW, scaledH, 28);

      const histogram = new Array(256).fill(0);
      for (let p = 0; p < totalPixels; p += 1) {
        histogram[normalized[p]] += 1;
      }

      if (enhanceMode === 'bw') {
        let sumAll = 0;
        for (let t = 0; t < 256; t += 1) sumAll += t * histogram[t];
        let sumBg = 0;
        let weightBg = 0;
        let maxVariance = -1;
        let threshold = 165;

        for (let t = 0; t < 256; t += 1) {
          weightBg += histogram[t];
          if (weightBg === 0) continue;
          const weightFg = totalPixels - weightBg;
          if (weightFg === 0) break;
          sumBg += t * histogram[t];
          const meanBg = sumBg / weightBg;
          const meanFg = (sumAll - sumBg) / weightFg;
          const betweenVar = weightBg * weightFg * (meanBg - meanFg) * (meanBg - meanFg);
          if (betweenVar > maxVariance) {
            maxVariance = betweenVar;
            threshold = t;
          }
        }

        const safeThreshold = Math.min(threshold, 178);
        for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
          const val = normalized[p] <= safeThreshold ? 0 : 255;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = 255;
        }
      } else {
        for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
          const v = normalized[p];
          const val = v > 178 ? 255 : Math.max(0, Math.min(255, Math.round((v - 55) * 1.45)));
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(imageData, pad, pad);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
    img.src = imageSource;
  });
}

export default function DocumentOcrPanel({
  onOcrComplete,
  onClose
}) {
  const [ocrMode, setOcrMode] = useState('upload'); // 'upload' | 'handwritten'
  const [ocrEngine, setOcrEngine] = useState('tesseract'); // 'tesseract' | 'vision'
  const [visionApiKey, setVisionApiKey] = useState(() => localStorage.getItem('gemini_ocr_key') || '');
  const [enhanceMode, setEnhanceMode] = useState('auto'); // 'auto' | 'bw' | 'original'
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [lowAccuracyHint, setLowAccuracyHint] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileName, setFileName] = useState('');

  // Handwritten Canvas Refs
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Initialize white canvas background (high contrast for OCR accuracy)
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    if (ocrMode === 'handwritten') {
      setTimeout(initCanvas, 50);
    }
  }, [ocrMode]);

  // Canvas drawing handlers (supports both mouse and touch)
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleVisionKeyChange = (val) => {
    setVisionApiKey(val);
    localStorage.setItem('gemini_ocr_key', val);
  };

  // Run OCR via either AI Vision (best for cursive/lined paper) or Local Tesseract.js
  const runOcrEngine = async (imageSource, mode, name, overrideEnhance, overrideEngine) => {
    const activeEngine = overrideEngine || ocrEngine;
    const activeEnhance = overrideEnhance || enhanceMode;
    setIsScanning(true);
    setConfidence(null);
    setLowAccuracyHint(false);
    setProgress(10);

    if (activeEngine === 'vision') {
      setStatusMsg('Transcribing with AI Vision OCR...');
      try {
        setProgress(35);
        const dataUrl = await prepareImageDataUrlForVision(imageSource);
        setProgress(65);
        const res = await requestVisionOcr(dataUrl, visionApiKey);
        const extractedText = (res?.text || '').trim();
        setIsScanning(false);
        setProgress(100);
        setConfidence(extractedText ? 98 : null);
        setStatusMsg(extractedText ? 'AI Vision extracted handwriting cleanly!' : 'No readable text found in image.');
        if (extractedText) {
          onOcrComplete(extractedText, mode, name);
        }
      } catch (err) {
        console.error('AI Vision OCR Error:', err);
        setIsScanning(false);
        setProgress(0);
        setStatusMsg(err.message || 'AI Vision OCR failed. Check your Gemini API key.');
      }
      return;
    }

    setStatusMsg('Removing shadows & enhancing image...');
    let worker = null;
    try {
      const preparedSource = await preprocessImageForOcr(
        imageSource,
        activeEnhance,
        mode === 'handwritten'
      );

      setProgress(15);
      setStatusMsg('Loading Offline OCR Engine...');

      worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.max(20, Math.round(m.progress * 100));
            setProgress(pct);
            setStatusMsg(`Reading text (${pct}%)...`);
          } else {
            setStatusMsg(m.status);
          }
        }
      });

      await worker.setParameters({
        tessedit_pageseg_mode: mode === 'handwritten' ? (PSM?.SINGLE_BLOCK || '6') : (PSM?.AUTO || '3'),
        preserve_interword_spaces: '1'
      });

      const result = await worker.recognize(preparedSource);
      const extractedText = (result?.data?.text || '').trim();
      const ocrConf = typeof result?.data?.confidence === 'number'
        ? Math.max(0, Math.min(100, Math.round(result.data.confidence)))
        : null;

      setIsScanning(false);
      setProgress(100);
      setConfidence(ocrConf);
      const isLow = ocrConf !== null && ocrConf < 65;
      setLowAccuracyHint(isLow || !extractedText);
      setStatusMsg(
        extractedText
          ? (isLow ? 'Extracted with low confidence (likely cursive or lined paper).' : 'Text extracted cleanly!')
          : 'No clear printed text found. Cursive handwriting requires AI Vision OCR.'
      );

      if (extractedText) {
        onOcrComplete(extractedText, mode, name);
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setIsScanning(false);
      setConfidence(null);
      setStatusMsg('OCR failed. Please try a clearer image (PNG/JPG).');
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Ignore worker cleanup errors
        }
      }
    }
  };

  // Handle Document / Image File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-uploading the same file triggers onChange
    e.target.value = '';
    setFileName(file.name);
    setConfidence(null);

    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      setPreviewUrl('');
      setStatusMsg('PDF files are binary documents. Please upload a screenshot/image (PNG, JPG) or a .TXT/.CSV file.');
      return;
    }

    // If plain text / CSV / Markdown document, read directly without needing OCR
    if (file.type === 'text/plain' || /\.(txt|csv|md|log)$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result || '';
        setPreviewUrl('');
        setStatusMsg(`Loaded document "${file.name}"`);
        onOcrComplete(String(text), 'document', file.name);
      };
      reader.readAsText(file);
      return;
    }

    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|bmp|gif|tiff?)$/i.test(file.name)) {
      setPreviewUrl('');
      setStatusMsg('Unsupported file format. Please upload an image (PNG, JPG, WEBP) or .TXT/.CSV/.MD file.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // If image (scanned document, receipt, or photo of handwritten note) -> Run OCR
    const imageUrl = URL.createObjectURL(file);
    setPreviewUrl(imageUrl);
    runOcrEngine(imageUrl, 'document', file.name);
  };

  const handleEngineChange = (newEngine) => {
    setOcrEngine(newEngine);
    setLowAccuracyHint(false);
    if (ocrMode === 'upload' && previewUrl && !isScanning && (newEngine === 'tesseract' || visionApiKey.trim())) {
      runOcrEngine(previewUrl, 'document', fileName || 'Uploaded Image', enhanceMode, newEngine);
    }
  };

  const handleEnhanceChange = (newMode) => {
    setEnhanceMode(newMode);
    if (ocrMode === 'upload' && previewUrl && !isScanning && ocrEngine === 'tesseract') {
      runOcrEngine(previewUrl, 'document', fileName || 'Uploaded Image', newMode);
    }
  };

  // Scan Handwritten Canvas
  const handleScanCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    runOcrEngine(dataUrl, 'handwritten', 'Handwritten Pad');
  };

  return (
    <div className="ocr-panel animate-fade-in">
      <div className="ocr-panel-header">
        <div className="ocr-tabs">
          <button
            type="button"
            className={`ocr-tab-btn ${ocrMode === 'upload' ? 'active' : ''}`}
            onClick={() => setOcrMode('upload')}
          >
            <Upload size={14} /> Document / Image OCR
          </button>
          <button
            type="button"
            className={`ocr-tab-btn ${ocrMode === 'handwritten' ? 'active' : ''}`}
            onClick={() => setOcrMode('handwritten')}
          >
            <PenTool size={14} /> Handwritten Pad (OCR)
          </button>
        </div>

        <button
          type="button"
          className="text-action-btn"
          onClick={onClose}
          title="Close OCR scanner"
        >
          <X size={14} /> Close
        </button>
      </div>

      {/* OCR Engine Toggle: Offline Printed vs AI Vision Handwriting */}
      <div className="ocr-engine-bar">
        <span className="ocr-enhance-label">OCR Engine:</span>
        <div className="ocr-enhance-pills">
          <button
            type="button"
            className={`ocr-enhance-pill ${ocrEngine === 'tesseract' ? 'active' : ''}`}
            onClick={() => handleEngineChange('tesseract')}
            disabled={isScanning}
          >
            Standard OCR (Offline / Printed)
          </button>
          <button
            type="button"
            className={`ocr-enhance-pill ${ocrEngine === 'vision' ? 'active' : ''}`}
            onClick={() => handleEngineChange('vision')}
            disabled={isScanning}
          >
            <Sparkles size={11} style={{ display: 'inline', marginRight: 4 }} />
            AI Vision OCR (Cursive &amp; Handwriting)
          </button>
        </div>
      </div>

      {ocrEngine === 'vision' && (
        <div className="ocr-key-row">
          <KeyRound size={14} />
          <input
            type="password"
            className="ocr-key-input"
            placeholder="Paste free Gemini API Key for Cursive/Handwriting (saved locally, optional if server GEMINI_API_KEY is set)"
            value={visionApiKey}
            onChange={(e) => handleVisionKeyChange(e.target.value)}
          />
        </div>
      )}

      {/* Image Preprocessing Mode Selector (only needed for Standard Tesseract OCR) */}
      {ocrEngine === 'tesseract' && (
        <div className="ocr-enhance-bar">
          <span className="ocr-enhance-label">Image Filter:</span>
          <div className="ocr-enhance-pills">
            <button
              type="button"
              className={`ocr-enhance-pill ${enhanceMode === 'auto' ? 'active' : ''}`}
              onClick={() => handleEnhanceChange('auto')}
              disabled={isScanning}
              title="Removes camera shadows, auto-inverts dark screenshots, and suppresses ruled paper lines"
            >
              Auto Enhance (Shadow Removal)
            </button>
            <button
              type="button"
              className={`ocr-enhance-pill ${enhanceMode === 'bw' ? 'active' : ''}`}
              onClick={() => handleEnhanceChange('bw')}
              disabled={isScanning}
              title="Adaptive Otsu Black & White threshold for photos of paper or receipts"
            >
              High-Contrast B&amp;W
            </button>
            <button
              type="button"
              className={`ocr-enhance-pill ${enhanceMode === 'original' ? 'active' : ''}`}
              onClick={() => handleEnhanceChange('original')}
              disabled={isScanning}
              title="Minimal padding without altering image colors"
            >
              Original
            </button>
          </div>
        </div>
      )}

      {/* Mode 1: Upload Printed Document, Image, or Handwritten Photo */}
      {ocrMode === 'upload' && (
        <div className="ocr-upload-area">
          <label className="ocr-dropzone">
            <input
              type="file"
              accept="image/*,.txt,.csv,.md"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isScanning}
            />
            <Upload size={24} className="text-muted" />
            <div className="ocr-drop-text">
              <strong>Click to Upload Document or Handwritten Photo</strong>
              <span>Supports Images (PNG, JPG, Receipts, Handwritten Notes) &amp; Text Docs (.TXT, .CSV)</span>
            </div>
          </label>

          {previewUrl && (
            <div className="ocr-preview-row">
              <img src={previewUrl} alt="Uploaded preview" className="ocr-thumb" />
              <div className="ocr-file-meta">
                <FileCheck size={16} className="text-emerald" />
                <span>{fileName}</span>
              </div>
              <button
                type="button"
                className="text-action-btn ocr-rescan-btn"
                onClick={() => runOcrEngine(previewUrl, 'document', fileName || 'Uploaded Image')}
                disabled={isScanning}
                title="Re-run OCR with the selected filter"
              >
                <RefreshCw size={13} /> Re-scan
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Interactive Handwritten Canvas */}
      {ocrMode === 'handwritten' && (
        <div className="handwriting-area">
          <p className="handwriting-hint">
            Write large, neat block letters separated cleanly below, then click <strong>Scan Handwriting</strong>:
          </p>
          <canvas
            ref={canvasRef}
            width={800}
            height={220}
            className="handwriting-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="handwriting-actions">
            <button
              type="button"
              className="text-action-btn"
              onClick={initCanvas}
              disabled={isScanning}
            >
              <Eraser size={14} /> Clear Pad
            </button>
            <button
              type="button"
              className="trans-btn"
              onClick={handleScanCanvas}
              disabled={isScanning}
            >
              {isScanning ? (
                <><Loader2 size={14} className="spin-icon" /> Scanning...</>
              ) : (
                <><ScanText size={14} /> Scan Handwriting (OCR)</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Live OCR Progress & Status */}
      {(isScanning || statusMsg) && (
        <div className="ocr-status-bar">
          <div className="ocr-status-text">
            {isScanning && <Loader2 size={14} className="spin-icon" />}
            <span>{statusMsg}</span>
            {!isScanning && confidence !== null && (
              <span className={`ocr-confidence-badge ${confidence >= 70 ? 'good' : 'low'}`}>
                Confidence: {confidence}%
              </span>
            )}
          </div>
          {!isScanning && lowAccuracyHint && ocrEngine === 'tesseract' && (
            <div className="ocr-low-hint">
              Tesseract only reads printed fonts reliably. For cursive or lined-paper handwriting, switch to <strong>AI Vision OCR</strong> above.
            </div>
          )}
          {isScanning && (
            <div className="ocr-progress-track">
              <div className="ocr-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
