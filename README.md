# Review Insight AI Dashboard 🌟

A simple, fast, and transparent full-stack text analysis application. Input Amazon or eCommerce customer reviews and instantly analyze them with dedicated buttons for **Text Summarization**, **Sentiment Analysis**, **Emotional Analysis**, and **Customer Intent**.

---

## 🏛️ Vercel 2-Service Architecture

The repository is configured to deploy on Vercel as a **multi-service project** (`vercel.json`):

```
┌────────────────────────────────────────────────────────┐
│            Vercel Project Routing (vercel.json)        │
│                                                        │
│  /(.*)           ──► frontend service (React / Vite)   │
│  /api/(.*)       ──► backend service  (Python / Flask) │
└────────────────────────────────────────────────────────┘
```

- **`frontend` service** (`root: "frontend"`): Builds the React SPA with Vite. Publicly serves UI traffic on `/(.*)`.
- **`backend` service** (`root: "backend"`): Runs the modular Flask NLP application. Publicly serves API endpoints on `/api/(.*)`.

---

## 📁 Project Structure

```
review-analyzer/
├── vercel.json                     # Vercel multi-service configuration
├── run_dev.bat                     # One-click Windows startup script
├── push_to_github.bat              # One-click GitHub push script
├── README.md                       # Documentation & architecture guide
│
├── backend/                        # [Service 1: backend]
│   ├── app.py                      # Flask REST router
│   ├── text_utils.py               # Shared text cleaning & tokenization utilities
│   ├── text_summarization.py       # [1] Text Summarization logic
│   ├── sentiment_analysis.py       # [2] Sentiment Analysis & star rating
│   ├── emotion_analysis.py         # [3] Emotional Analysis (Joy, Anger, etc.)
│   ├── intent_analysis.py          # [4] Customer Intent & urgency detection
│   ├── nlp_engine.py               # Unified pipeline aggregator (analyze_all)
│   └── requirements.txt            # Python dependencies (Flask)
│
└── frontend/                       # [Service 2: frontend]
    ├── package.json                # React + Vite dependencies
    ├── vite.config.js              # Vite configuration
    ├── index.html                  # HTML entry point
    └── src/
        ├── App.jsx                 # Main Dashboard state & flow
        ├── App.css                 # Modern glassmorphism styling
        ├── api.js                  # REST client with seamless Vercel / local routing
        ├── main.jsx                # React mount point
        └── components/
            ├── Header.jsx          # Top bar & status badge
            ├── ReviewInput.jsx     # Textarea & Amazon presets
            ├── ActionButtons.jsx   # The 4 action buttons + Run All
            ├── ResultDisplay.jsx   # Dynamic results renderer
            └── ArchitectureModal.jsx # Interactive system architecture modal
```

---

## 🚀 How to Run Locally

### Method 1: One-Click Windows Launcher
Double-click `run_dev.bat` in the root folder. It starts both backend and frontend in separate windows.

### Method 2: Vercel Dev (Multi-Service Local Testing)
```bash
npx vercel dev
```
Vercel will build and run both the `frontend` and `backend` services together, injecting routes automatically.


