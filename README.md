# Review Insight AI Dashboard 🌟

A simple, fast, and transparent full-stack text analysis application. Input Amazon or eCommerce customer reviews and instantly analyze them with dedicated buttons for **Text Summarization**, **Sentiment Analysis**, **Emotional Analysis**, and **Customer Intent**.

---

## 🏛️ Modular Backend Architecture

The backend has separate, dedicated Python modules for each analysis type:

```
review-analyzer/
├── run_dev.bat                     # One-click Windows startup script
├── push_to_github.bat              # One-click GitHub push script
├── README.md                       # Full documentation & architecture guide
│
├── backend/
│   ├── app.py                      # Flask REST API routing requests to each module
│   ├── text_utils.py               # Shared text cleaning & tokenization utilities
│   ├── text_summarization.py       # [1] Text Summarization logic
│   ├── sentiment_analysis.py       # [2] Sentiment Analysis & star prediction
│   ├── emotion_analysis.py         # [3] Emotional Analysis (Joy, Anger, etc.)
│   ├── intent_analysis.py          # [4] Customer Intent & urgency detection
│   ├── nlp_engine.py               # Unified pipeline aggregator (analyze_all)
│   ├── requirements.txt            # Dependencies (Flask)
│   └── test_backend.py             # Unit & integration test suite (12 tests)
│
└── frontend/
    ├── package.json                # React + Vite dependencies
    ├── vite.config.js              # Vite config (runs on port 3000)
    ├── index.html                  # Clean HTML shell
    └── src/
        ├── App.jsx                 # Main Dashboard state & flow
        ├── App.css                 # High-quality modern glassmorphism styling
        ├── api.js                  # REST client with offline fallback support
        ├── main.jsx                # React root mount
        └── components/
            ├── Header.jsx          # Top bar & status badge
            ├── ReviewInput.jsx     # Textarea & Amazon presets
            ├── ActionButtons.jsx   # The 4 action buttons + Run All
            ├── ResultDisplay.jsx   # Dynamic results renderer
            └── ArchitectureModal.jsx # Interactive system architecture modal
```

---

## 🔍 The 4 Dedicated Backend Modules Explained

| Analysis Type | Dedicated Python File | Flask Endpoint | How It Works in Plain English |
|---|---|---|---|
| **📝 Summarize Text** | `text_summarization.py` | `POST /api/summarize` | Tokenizes sentences, removes common stopwords, calculates frequency importance of remaining words, scores sentences, and extracts the top 2 most informative sentences with key takeaway bullet points. |
| **😊 Sentiment Analysis** | `sentiment_analysis.py` | `POST /api/sentiment` | Uses a calibrated sentiment lexicon. Checks for negation modifiers (e.g. *"not good"* flips to negative) and intensifiers (e.g. *"extremely bad"* amplifies negativity). Outputs polarity (-1.0 to +1.0), confidence %, and predicted 1–5 Amazon star rating. |
| **🎭 Emotional Analysis** | `emotion_analysis.py` | `POST /api/emotion` | Categorizes text across 6 human emotions: **Joy**, **Anger**, **Sadness**, **Surprise**, **Fear**, and **Disgust**. Returns a visual percentage breakdown and trigger keywords. |
| **🎯 Intent Analysis** | `intent_analysis.py` | `POST /api/intent` | Matches actionable customer intents: **Refund/Return**, **Product Defect Complaint**, **Praise/Recommendation**, **Product Inquiry/Question**, or **Improvement Suggestion**, accompanied by recommended business actions and urgency level (`High`, `Medium`, `Low`). |
| **⚡ Run All** | `nlp_engine.py` | `POST /api/analyze-all` | Executes all 4 analyses simultaneously in a single unified payload. |

---

## 🚀 How to Run

### Method 1: One-Click Windows Launcher
Double-click `run_dev.bat` in the root folder. It starts both the Flask backend and the React frontend in separate windows.

### Method 2: Manual Terminal Startup

#### 1. Start the Flask Backend (Terminal 1)
```bash
cd backend
python app.py
```
> The API will be active at `http://127.0.0.1:5000`

#### 2. Start the React Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
> Open your browser at `http://localhost:3000`

---

## 🧪 Testing the Backend

You can run the built-in test suite anytime to test both individual modules and Flask endpoints:
```bash
cd backend
python test_backend.py
```
Outputs `Ran 12 tests in 0.6s ... OK`.
