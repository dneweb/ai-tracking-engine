# AI Tracking Engine

A professional SaaS dashboard for tracking AI-driven activities, featuring a modern Next.js frontend and a powerhouse FastAPI backend. The project integrates Retrieval-Augmented Generation (RAG) capabilities with Supabase and Groq for intelligent querying and analysis.

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Auth**: NextAuth.js with Supabase adapter

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: Supabase (PostgreSQL + Vector)
- **AI/LLM**: Groq (Llama-3), SentenceTransformers (Embeddings)
- **Utilities**: Pydantic, NumPy, Scikit-learn

## ✨ Key Features

- **Ask Question**: Interactive interface for querying AI models with confidence scoring.
- **Query History**: Complete log of past interactions and generated responses.
- **Documents Management**: Manage and analyze uploaded documents used for RAG.
- **Analytics Dashboard**: (In Progress) Visual insights into usage patterns and AI performance.
- **Modern UI**: Sleek, responsive design with fixed sidebar and premium aesthetics.

## 📁 Project Structure

```text
ai-tracking-engine/
├── frontend/           # Next.js application
│   ├── src/app/        # App router (Pages & API)
│   ├── src/components/ # Reusable UI components
│   └── public/         # Static assets (Favicons, Logos)
├── backend/            # FastAPI application
│   ├── app/            # Core logic
│   │   ├── api/        # REST endpoints
│   │   ├── services/   # AI and DB logic
│   │   └── models/     # Pydantic schemas
│   └── requirements.txt# Python dependencies
└── README.md           # Project documentation
```

## 🛠️ Getting Started

### Backend Setup
1. `cd backend`
2. `python -m venv venv`
3. `source venv/bin/activate` # On Windows: .\venv\Scripts\activate
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`
