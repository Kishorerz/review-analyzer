# Review Insight AI Dashboard 🌟

A simple, fast, and transparent full-stack text analysis application. Input Amazon or eCommerce customer reviews and instantly analyze them with dedicated buttons for **Text Summarization**, **Sentiment Analysis**, **Emotional Analysis**, and **Customer Intent**.

---

## 🏛️ System Architecture

The project is intentionally built using **clean, normal code** without heavy, opaque deep-learning libraries or paid API keys.

```
┌────────────────────────────────────────────────────────┐
│             React Dashboard (Port 3000)                │
│  - Input Review Text / 1-Click Amazon Presets          │
│  - [Summarize Text] [Sentiment] [Emotion] [Intent]     │
│  - Interactive Visual Result Cards & Meters            │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST (JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Flask REST API (Port 5000)                 │
│  - /api/summarize    - /api/sentiment                  │
│  - /api/emotion      - /api/intent                     │
│  - /api/analyze-all  - /api/samples                    │
└───────────────────────────┬────────────────────────────┘
                            │ Calls pure Python logic
                            ▼
┌────────────────────────────────────────────────────────┐
│               NLP Engine (nlp_engine.py)               │
│  - Sentence Tokenization & Frequency Scoring           │
│  - Polarity Lexicon + Negations & Intensifiers         │
│  - Emotion Spectrum Matching (Joy, Anger, etc.)        │
│  - Pattern-based Customer Intent Classification        │
└────────────────────────────────────────────────────────┘
```

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

## 🔍 The 4 Core Analyses Explained ("Normal Code")

| Button | Endpoint | How It Works in Plain English |
|---|---|---|
| **📝 Summarize Text** | `POST /api/summarize` | Tokenizes sentences, removes common stopwords, calculates frequency importance of remaining words, scores sentences, and extracts the top 2 most informative sentences with key takeaway bullet points. |
| **😊 Sentiment Analysis** | `POST /api/sentiment` | Uses a calibrated sentiment lexicon. Checks for negation modifiers (e.g. *"not good"* flips to negative) and intensifiers (e.g. *"extremely bad"* amplifies negativity). Outputs polarity (-1.0 to +1.0), confidence %, and predicted 1–5 Amazon star rating. |
| **🎭 Emotional Analysis** | `POST /api/emotion` | Categorizes text across 6 human emotions: **Joy**, **Anger**, **Sadness**, **Surprise**, **Fear**, and **Disgust**. Returns a visual percentage breakdown and trigger keywords. |
| **🎯 Intent Analysis** | `POST /api/intent` | Matches actionable customer intents: **Refund/Return**, **Product Defect Complaint**, **Praise/Recommendation**, **Product Inquiry/Question**, or **Improvement Suggestion**, accompanied by recommended business actions and urgency level (`High`, `Medium`, `Low`). |
| **⚡ Run All** | `POST /api/analyze-all` | Executes all 4 analyses simultaneously in a single unified payload. |

---

## 📁 Project Structure

```
review-analyzer/
├── run_dev.bat                 # One-click Windows startup script
├── README.md                   # Full documentation & architecture guide
│
├── backend/
│   ├── app.py                  # Clean Flask REST API with CORS headers
│   ├── nlp_engine.py           # Transparent NLP algorithms (no bulky dependencies)
│   ├── requirements.txt        # Backend dependencies (Flask)
│   └── test_backend.py         # Automated unit test suite (7 tests)
│
└── frontend/
    ├── package.json            # React + Vite dependencies
    ├── vite.config.js          # Vite config (runs on port 3000)
    ├── index.html              # Clean HTML shell
    └── src/
        ├── App.jsx             # Main Dashboard state & flow
        ├── App.css             # High-quality modern glassmorphism styling
        ├── api.js              # REST client with offline fallback support
        ├── main.jsx            # React root mount
        └── components/
            ├── Header.jsx             # Top bar & status badge
            ├── ReviewInput.jsx        # Textarea & Amazon presets
            ├── ActionButtons.jsx      # The 4 action buttons + Run All
            ├── ResultDisplay.jsx      # Dynamic results renderer
            └── ArchitectureModal.jsx  # Interactive system architecture modal
```

---

## 🧪 Testing the Backend

You can run the built-in test suite anytime:
```bash
cd backend
python test_backend.py
```
Outputs `Ran 7 tests in 0.5s ... OK`.
