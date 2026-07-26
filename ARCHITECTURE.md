# Architecture Decisions

This document records the foundational technology stack choices made for the AskKB project during Stage 0.

## Tech Stack Choices

- **Vector DB**: Qdrant
- **Metadata/Relational DB**: PostgreSQL
- **LLM Provider (Chat)**: Groq (via raw API)
- **Embedding Model**: Google Gemini (`text-embedding-004`)
- **Backend Framework**: Node.js (Express)
- **Frontend Framework**: Next.js (React)
- **File/Object Storage**: Cloudflare R2
- **Auth**: OAuth (Google)
- **Deployment Target**: Vercel (Frontend) + Render (Backend)
- **Orchestration Library**: Raw API calls (no LangChain/LlamaIndex)
- **Bonus Features**: In scope (YouTube roadmap generator, Podcast generator - requires TTS provider).
