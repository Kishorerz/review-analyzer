import React, { useState, useRef, useEffect } from 'react';
import { createWorker, PSM } from 'tesseract.js';
import { Upload, PenTool, Eraser, ScanText, FileCheck, Loader2, RefreshCw, X } from 'lucide-react';

// Preprocess image in an offscreen canvas (upscale, pad, auto-invert dark mode, contrast/Otsu B&W)
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

      // Upscale small images so Tesseract LSTM has clear glyph detail (cap at 2400px)
      const targetMinWidth = isHandwritten ? Math.max(srcW * 2, 1400) : 1400;
      let scale = srcW < targetMinWidth ? targetMinWidth / srcW : 1;
      if (isHandwritten) {
        scale = Math.max(scale, 2);
      }
      const maxDim = Math.max(srcW * scale, srcH * scale);
      if (maxDim > 2400) {
        scale = (2400 / Math.max(srcW, srcH));
      }

      const scaledW = Math.round(srcW * scale);
      const scaledH = Math.round(srcH * scale);
      const pad = 48; // White quiet-zone border improves edge character detection

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

      // Auto-invert dark backgrounds (e.g., dark-mode UI screenshots with light text)
      const avgLum = lumSum / Math.max(1, totalPixels);
      const shouldInvert = avgLum < 120;

      const histogram = new Array(256).fill(0);
      let minG = 255;
      let maxG = 0;

      for (let p = 0; p < totalPixels; p += 1) {
        const g = shouldInvert ? 255 - grays[p] : grays[p];
        grays[p] = g;
        histogram[g] += 1;
        if (g < minG) minG = g;
        if (g > maxG) maxG = g;
      }

      if (enhanceMode === 'bw') {
        // Compute Otsu's optimal binarization threshold for noisy photos/receipts
        let sumAll = 0;
        for (let t = 0; t < 256; t += 1) sumAll += t * histogram[t];
        let sumBg = 0;
        let weightBg = 0;
        let maxVariance = -1;
        let threshold = 140;

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

        for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
          const val = grays[p] <= threshold ? 0 : 255;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = 255;
        }
      } else {
        // Contrast stretch preserves smooth glyph edges for Tesseract LSTM
        const range = Math.max(1, maxG - minG);
        for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
          let stretched = ((grays[p] - minG) / range) * 255;
          // Push near-white background to pure white and darken midtones slightly
          stretched = stretched > 215 ? 255 : Math.max(0, Math.min(255, (stretched - 128) * 1.35 + 128));
          const val = Math.round(stretched);
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
  const [enhanceMode, setEnhanceMode] = useState('auto'); // 'auto' | 'bw' | 'original'
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [confidence, setConfidence] = useState(null);
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

  // Run Tesseract.js OCR with image preprocessing & tuned worker parameters
  const runOcrEngine = async (imageSource, mode, name, overrideEnhance) => {
    const activeEnhance = overrideEnhance || enhanceMode;
    setIsScanning(true);
    setConfidence(null);
    setProgress(5);
    setStatusMsg('Enhancing image for OCR...');

    let worker = null;
    try {
      const preparedSource = await preprocessImageForOcr(
        imageSource,
        activeEnhance,
        mode === 'handwritten'
      );

      setProgress(15);
      setStatusMsg('Loading OCR Engine...');

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
      setStatusMsg(
        extractedText
          ? 'Text extracted cleanly!'
          : 'No clear text found. Try switching OCR Mode (e.g. High-Contrast B&W) or uploading a sharper crop.'
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

  const handleEnhanceChange = (newMode) => {
    setEnhanceMode(newMode);
    if (ocrMode === 'upload' && previewUrl && !isScanning) {
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

      {/* Image Preprocessing Mode Selector */}
      <div className="ocr-enhance-bar">
        <span className="ocr-enhance-label">OCR Image Filter:</span>
        <div className="ocr-enhance-pills">
          <button
            type="button"
            className={`ocr-enhance-pill ${enhanceMode === 'auto' ? 'active' : ''}`}
            onClick={() => handleEnhanceChange('auto')}
            disabled={isScanning}
            title="Upscales image, auto-inverts dark screenshots, and stretches contrast"
          >
            Auto Enhance
          </button>
          <button
            type="button"
            className={`ocr-enhance-pill ${enhanceMode === 'bw' ? 'active' : ''}`}
            onClick={() => handleEnhanceChange('bw')}
            disabled={isScanning}
            title="Otsu high-contrast Black & White threshold for photos of paper or receipts"
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
