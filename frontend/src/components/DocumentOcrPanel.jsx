import React, { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { Upload, PenTool, Eraser, ScanText, FileCheck, Loader2, X } from 'lucide-react';

export default function DocumentOcrPanel({
  onOcrComplete,
  onClose
}) {
  const [ocrMode, setOcrMode] = useState('upload'); // 'upload' | 'handwritten'
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
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
    ctx.lineWidth = 4;
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

  // Run Tesseract.js OCR on an image source (File, URL, or Canvas)
  const runOcrEngine = async (imageSource, mode, name) => {
    setIsScanning(true);
    setProgress(5);
    setStatusMsg('Initializing OCR Engine...');

    try {
      const result = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setStatusMsg(`Reading text (${Math.round(m.progress * 100)}%)...`);
          } else {
            setStatusMsg(m.status);
          }
        }
      });

      const extractedText = (result?.data?.text || '').trim();
      setIsScanning(false);
      setProgress(100);
      setStatusMsg(extractedText ? 'Text extracted successfully!' : 'No clear text found. Try a clearer image or write larger.');

      if (extractedText) {
        onOcrComplete(extractedText, mode, name);
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setIsScanning(false);
      setStatusMsg('OCR failed. Please try a clearer image.');
    }
  };

  // Handle Document / Image File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

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

    // If image (scanned document, receipt, or photo of handwritten note) -> Run OCR
    const imageUrl = URL.createObjectURL(file);
    setPreviewUrl(imageUrl);
    runOcrEngine(imageUrl, 'document', file.name);
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
              <span>Supports Images (PNG, JPG, Receipts, Handwritten Notes) & Text Docs (.TXT, .CSV)</span>
            </div>
          </label>

          {previewUrl && (
            <div className="ocr-preview-row">
              <img src={previewUrl} alt="Uploaded preview" className="ocr-thumb" />
              <div className="ocr-file-meta">
                <FileCheck size={16} className="text-emerald" />
                <span>{fileName}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Interactive Handwritten Canvas */}
      {ocrMode === 'handwritten' && (
        <div className="handwriting-area">
          <p className="handwriting-hint">
            Write clearly in dark strokes below (works best with neat block letters), then click <strong>Scan Handwriting</strong>:
          </p>
          <canvas
            ref={canvasRef}
            width={680}
            height={170}
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
