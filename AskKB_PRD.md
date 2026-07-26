# AskKB — Product Requirements Document
### *"Ask your Knowledge Base"*

**Version:** 1.0
**Status:** Draft for implementation
**Prepared for:** Engineering LLM / Coding Agent (e.g., Claude Code) + Human Builder

---

## 0. How to Use This Document (Read This First — Instructions for the Coding LLM)

This PRD is written to be fed directly into an LLM/coding agent to build **AskKB** end-to-end. It is intentionally **decisive** about product behavior and architecture patterns, but **deliberately open** on a small number of infrastructure decisions (vector DB, LLM provider, embedding model, hosting, auth) and on all secrets/credentials.

**Rules the coding agent MUST follow:**

1. **Do not silently pick defaults** for anything marked `🛑 DECISION REQUIRED`. Stop, present the options listed, and ask the human which one to use. Wait for the answer before writing code that depends on it.
2. **Do not fabricate or auto-generate `.env` values.** Every time a section says `🔑 ENV NEEDED`, list the exact variable names, explain what each is for, and ask the human to paste in real values (or explicitly say "use a placeholder/mock for now"). Never invent API keys.
3. **Work stage by stage, in order.** Do not start Stage *N+1* until Stage *N*'s acceptance criteria are met, unless the human explicitly says to skip ahead.
4. **After finishing each stage**, produce a short checklist of what was built, what was tested, and what's left — before moving on.
5. **If a requirement is ambiguous**, prefer asking a clarifying question over assuming — but don't ask about things this document already answers definitively.
6. **Keep the rubric in mind** (Section 20) — every stage exists because it maps to a graded evaluation criterion.

---

## 1. Product Vision

AskKB is a notebook-based, source-grounded AI research assistant — a Gemini Notebook-style tool. Users create **Notebooks** (isolated workspaces), populate each with **Sources** (PDFs, plain text, websites, YouTube videos, VTT/transcript files), and then **ask questions** that are answered strictly from the content of those sources, with **inline, clickable citations** back to the exact place the answer came from.

The core promise: **the user should never receive an answer without knowing exactly where it came from, and should be able to jump straight to that spot in the original source.**

## 2. Problem Statement

Generic chatbots hallucinate and can't be trusted for research over a specific, private set of documents. Users need a tool that:
- Lets them scope an LLM's knowledge to *only* the sources they provide.
- Is transparent about provenance for every claim.
- Handles heterogeneous source types (documents, video, web, transcripts) uniformly.
- Shows clear pipeline state (uploading → indexing → ready) so trust isn't broken by silent failures.

## 3. Target Users

| Persona | Need |
|---|---|
| Student / researcher | Summarize and query a pile of papers/notes without hallucination |
| Content creator | Turn a stack of YouTube videos into a study guide or podcast |
| Analyst | Ground answers in internal docs + web sources, with audit trail (citations) |
| Evaluator (for this assignment) | Verify RAG correctness, citation accuracy, and engineering quality |

## 4. Core Concepts & Glossary

| Term | Definition |
|---|---|
| **Notebook** | An isolated workspace containing its own sources, embeddings, and chat history. No cross-notebook leakage. |
| **Source** | One ingested unit of knowledge: PDF, Text, Web URL, YouTube video, or VTT transcript. |
| **Chunk** | A segment of a source's extracted text, sized for embedding + retrieval. |
| **Embedding** | Vector representation of a chunk, stored in a vector DB with metadata. |
| **Indexing Status** | Source lifecycle state: `uploading → extracting → chunking → embedding → ready` (or `failed`). |
| **Citation** | A pointer from a piece of generated answer text back to the specific chunk(s)/source location that support it. |
| **Grounded Answer** | An LLM response constructed only from retrieved chunks, with citations attached. |

Indexing status maps to the mockup's dot indicators:
- 🟡 **Yellow dot** = Indexing in progress
- 🟢 **Green dot** = Indexed / ready for querying
- 🔴 (added by this PRD) **Red dot** = Failed — needs re-index

## 5. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           FRONTEND (SPA)                         │
│  Notebook List | Source Manager | Chat + Citations | Source View │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ REST/WS (streaming)
┌───────────────────────────────▼───────────────────────────────────┐
│                          BACKEND API (server)                     │
│  ┌───────────────┐ ┌────────────────┐ ┌─────────────────────────┐│
│  │ Notebook CRUD │ │ Source Ingest   │ │ Query / RAG Orchestrator││
│  └───────────────┘ │  Pipeline       │ └───────────┬─────────────┘│
│                     │ (extract→chunk │             │              │
│                     │  →embed→store) │             │              │
│                     └───────┬────────┘             │              │
└─────────────────────────────┼──────────────────────┼──────────────┘
                              │                       │
                 ┌────────────▼───────────┐  ┌────────▼─────────────┐
                 │  Vector DB (chunks +   │  │  LLM Provider          │
                 │  embeddings + metadata)│  │  (chat + embeddings)   │
                 └────────────┬───────────┘  └───────────────────────┘
                              │
                 ┌────────────▼───────────┐
                 │ Relational/Doc DB       │
                 │ (Notebooks, Sources,    │
                 │  Chat history, status)  │
                 └────────────┬───────────┘
                              │
                 ┌────────────▼───────────┐
                 │ Object/File Storage     │
                 │ (raw PDFs, VTT files)   │
                 └─────────────────────────┘
```

**Key architectural principle:** Vector DB stores *only* embeddings + minimal retrieval metadata (source_id, chunk_id, notebook_id, position/timestamp/page info). The relational DB is the source of truth for Notebooks, Sources, status, and chat history. This separation keeps re-indexing and deletion clean and keeps notebook isolation enforceable at the query filter level (`notebook_id` is **always** a mandatory filter on every vector search — this is the isolation guarantee, not an afterthought).

## 6. 🛑 DECISION REQUIRED — Tech Stack

Before Stage 0 begins, the coding agent must ask the human to choose from each row below. Do not proceed with defaults silently — present the tradeoffs, then ask.

| Layer | Options | Notes to relay to human |
|---|---|---|
| **Vector DB** | Qdrant (self-host/Docker or Cloud), Pinecone (managed SaaS), Weaviate, Chroma (simplest, local/embedded), pgvector (if already using Postgres, keeps stack unified) | Chroma = fastest to get running locally for a graded assignment. Qdrant = best balance of "production-real" + free self-host via Docker. Pinecone = zero-ops but requires API key + billing. pgvector = one less moving part if Postgres is already chosen for metadata. |
| **Metadata/relational DB** | PostgreSQL (recommended), SQLite (simplest for local demo), MongoDB | Postgres pairs naturally with pgvector if that's chosen above. |
| **LLM provider (chat)** | Anthropic Claude API, OpenAI API, or local (Ollama) | Determines `.env` keys and streaming implementation details. |
| **Embedding model** | OpenAI `text-embedding-3-small/large`, Voyage AI (Anthropic-recommended), Cohere embed, or open-source (e.g., `bge-small`, `all-MiniLM-L6-v2` via sentence-transformers, free/local) | Local/open-source embeddings avoid extra API cost and are good enough for a graded demo; managed embeddings are higher quality for production. |
| **Backend framework** | Node.js (Express/Fastify/NestJS) or Python (FastAPI) | FastAPI is a strong default given Python's RAG/ML tooling (LangChain/LlamaIndex, pypdf, youtube-transcript-api, etc.) |
| **Frontend framework** | React (Next.js) or plain React (Vite) | Next.js gives file-based routing + easy deployment to Vercel; Vite+React is lighter if backend is separate. |
| **File/object storage** | Local disk (fine for a demo), AWS S3, Supabase Storage, Cloudflare R2 | Local disk is acceptable for Stage 1–2 development; swap later if needed. |
| **Auth** | None (single-user demo), simple email/password, or OAuth (Google) | For a graded assignment, "no auth / single implicit user" is usually acceptable — confirm with human. |
| **Deployment target** | Local only, Docker Compose, Vercel + Railway/Render, or full cloud | Determines whether Stage 0 includes a `docker-compose.yml`. |
| **Orchestration library (optional)** | Raw API calls (full control, recommended for learning RAG internals), LangChain, or LlamaIndex | Since the goal is to *understand* RAG internals, this PRD recommends writing the pipeline with raw SDK calls rather than a heavy framework — but ask the human, since a framework saves time. |

> **Agent instruction:** Ask these as a single batched question set (not one at a time) once you reach Stage 0, so the human isn't interrupted repeatedly. Record the answers at the top of `ARCHITECTURE.md` (see Stage 0) so they aren't re-asked later.

## 7. 🔑 Environment Variables — Ask, Never Assume

Once the stack decisions above are made, the agent must generate a `.env.example` and then explicitly ask the human to fill in the **real** `.env` (never invent values, never hardcode a "test key" that looks real). Categories to ask about, conditional on choices made in Section 6:

```
# --- LLM Provider (pick based on Section 6 answer) ---
ANTHROPIC_API_KEY=            # if Claude chosen
OPENAI_API_KEY=                # if OpenAI chosen (also used for embeddings if OpenAI embeddings picked)
OLLAMA_BASE_URL=                # if local model chosen

# --- Embeddings (if different provider than chat LLM) ---
VOYAGE_API_KEY=
COHERE_API_KEY=

# --- Vector DB ---
QDRANT_URL=
QDRANT_API_KEY=
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
# (pgvector uses DATABASE_URL below instead)

# --- Relational DB ---
DATABASE_URL=                  # postgres:// or sqlite path

# --- File storage ---
STORAGE_DRIVER=local|s3|supabase|r2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# --- YouTube ingestion ---
YOUTUBE_API_KEY=                # only if fetching metadata via official API; transcript extraction itself typically doesn't need a key

# --- Bonus: Podcast generation (TTS) ---
ELEVENLABS_API_KEY=             # or OPENAI_API_KEY (tts-1), or other TTS provider chosen

# --- App config ---
PORT=
NEXT_PUBLIC_API_BASE_URL=
JWT_SECRET=                     # only if auth is enabled
```

> **Agent instruction:** Present this list *after* Section 6 answers are known (so irrelevant vars are pruned), explain each variable in one line, and literally ask: *"Please provide values for these, or tell me which ones to stub/mock for local development."* Do not continue building the ingestion pipeline until at least the LLM + vector DB + database vars are confirmed (even if stubbed).

## 8. Data Model

```
Notebook
 - id (uuid, pk)
 - name
 - created_at, updated_at

Source
 - id (uuid, pk)
 - notebook_id (fk -> Notebook, indexed, NOT NULL)
 - type (enum: pdf | text | web | youtube | vtt)
 - title
 - original_ref (file path / URL / raw text pointer)
 - status (enum: uploading | extracting | chunking | embedding | ready | failed)
 - error_message (nullable)
 - metadata (jsonb: page_count, duration, url, video_id, etc.)
 - created_at, updated_at

Chunk
 - id (uuid, pk)
 - source_id (fk -> Source, indexed)
 - notebook_id (denormalized for fast filtering, indexed)
 - content (text)
 - order_index (int)
 - location_metadata (jsonb — see below, type-specific)
 - embedding_id (pointer/id in vector DB, if vector DB is external to relational store)
 - created_at

ChatMessage
 - id (uuid, pk)
 - notebook_id (fk, indexed)
 - role (user | assistant)
 - content
 - citations (jsonb array of {chunk_id, source_id, snippet, location})
 - created_at
```

**`location_metadata` shape per source type** (this powers the Source Viewer in Section 13):

| Type | Fields |
|---|---|
| PDF | `{ page_number, bbox? (optional, if doing precise highlighting) }` |
| Text | `{ char_start, char_end }` |
| Web | `{ url, section_heading? or char_start/char_end on extracted text }` |
| YouTube | `{ video_id, start_seconds, end_seconds }` |
| VTT | `{ cue_index, start_timestamp, end_timestamp }` |

## 9. Ingestion Pipeline (per source type)

All types funnel into the same four-stage pipeline; only the **extraction** step differs:

```
Upload/Register → Extract → Chunk → Embed → Store (vector + relational) → status = ready
```

| Type | Extraction method |
|---|---|
| **PDF** | Parse with a PDF text-extraction library (e.g., `pypdf`/`pdfplumber` in Python or `pdf-parse` in Node), preserving page numbers per extracted text block. |
| **Plain Text** | Direct ingestion; store char offsets for citation. |
| **Website URL** | Fetch HTML, strip boilerplate (nav/ads) using readability-style extraction, keep the canonical URL for citation and (optionally) heading structure. |
| **YouTube** | Extract transcript (e.g., via `youtube-transcript-api` or captions endpoint) with per-cue timestamps; if no captions exist, flag as failed with a clear error ("no captions available for this video"). |
| **VTT/Transcript** | Parse `.vtt` cue blocks directly — timestamps are already present, no extra extraction needed. |

**Chunking strategy (recommended, adjust if needed):**
- Target chunk size: ~500–800 tokens with ~10–15% overlap, split on paragraph/sentence boundaries (not mid-sentence).
- For transcripts (YouTube/VTT), chunk by grouping consecutive cues until the token budget is hit, keeping the **start timestamp of the first cue in the chunk** and **end timestamp of the last** as the chunk's location metadata — this is what enables "opens at the referenced timestamp."
- For PDFs, do not let a chunk span more than 2 pages if avoidable, and always record the page number(s) covered.

**Status tracking:** every transition (`uploading → extracting → chunking → embedding → ready`, or `→ failed` with `error_message`) must be persisted immediately and pushed to the frontend (via polling or WebSocket/SSE) so the yellow/green dot updates live, per the mockup.

## 10. Retrieval & RAG Query Flow

```
User question (+ notebook_id)
   → Embed the question (same embedding model as ingestion)
   → Vector search filtered by notebook_id, top-k (k=5–8 recommended)
   → [Optional] Rerank results (cross-encoder or LLM-based rerank) — nice-to-have, not required for MVP
   → Construct prompt: system instructions + retrieved chunks (each tagged with a citation ID) + chat history + user question
   → Call LLM with streaming enabled
   → Stream tokens to frontend
   → Parse/attach citation markers in the response to the chunk IDs actually used
   → Persist ChatMessage with citations
```

**Prompt construction — non-negotiable rules to encode in the system prompt:**
1. Answer **only** using the provided context chunks. If the answer isn't in the context, say so explicitly — never fill gaps from general knowledge.
2. Every factual sentence must be traceable to at least one chunk; the answer should reference chunks using a consistent inline marker format, e.g. `[1]`, `[2]`, matching an ordered list of the chunks that were retrieved.
3. If multiple chunks conflict, surface the conflict rather than silently picking one.
4. Keep formatting clean: use markdown (headers/bullets/bold) only where it aids readability, not by default.

**Isolation guarantee:** the `notebook_id` filter on the vector search is mandatory and enforced at the query-construction layer (not left to the LLM or to a frontend "current notebook" variable) — cross-notebook leakage is a hard failure condition.

## 11. Citation & Source Viewer

Every assistant message stores a `citations[]` array: `{ marker: "[1]", chunk_id, source_id, source_type, snippet, location_metadata }`.

Clicking a citation marker opens a **Source Viewer panel** (the right-hand panel in mockup image 2 — the "Actual PDF File / YT Video" pane that slides in when a source/citation is engaged):

| Source type | Viewer behavior |
|---|---|
| PDF | Open embedded PDF viewer scrolled/jumped to `page_number` |
| Website | Show an iframe/preview of the page (or open in new tab if embedding is blocked), scrolled to the cited text if feasible |
| YouTube | Embed the YouTube player with `?t=start_seconds`, i.e. opens at the referenced timestamp |
| Text | Render the full text with the cited `char_start`–`char_end` range highlighted |
| VTT/Transcript | Render the transcript with the cited cue range highlighted, scrolled into view |

## 12. UI/UX Specification (mapped to provided wireframes)

**Layout: three-pane structure**

1. **Left rail — Notebook/Source list**
   - "Add Source" button → opens the source-type picker modal (PDF / Text / Web Link / YouTube / VTT — matches mockup image 1 exactly)
   - List of sources per notebook, each row shows: title + status dot (🟡 indexing / 🟢 ready / 🔴 failed) + overflow menu (remove, re-index)
2. **Center — Chat**
   - Message history (user + assistant turns)
   - Assistant turns render inline citation markers as clickable chips
   - Bottom-fixed input: "Type a Query here....." matching mockup image 2
   - Streaming tokens render progressively (typing effect, not a spinner-then-dump)
3. **Right — Source Viewer** (collapsed by default, opens on citation click — matches the second frame of mockup image 2, with the arrow showing a citation chip opening the panel)

**Required UI states (graded explicitly):**
- **Uploading**: progress indicator on the source row.
- **Indexing**: yellow dot + disabled/greyed "ask about this" affordance.
- **Ready**: green dot, fully queryable.
- **Failed**: red dot + inline error + "Retry" action.
- **Empty states**: no notebooks yet ("Create your first notebook"), no sources yet ("Add a source to start asking questions"), no messages yet.
- **Notebook management**: create / rename (inline edit) / delete (with confirmation) — must not be an afterthought, it's 10 rubric points on its own.

## 13. Streaming Responses

Use Server-Sent Events (SSE) or a WebSocket to stream LLM tokens to the frontend as they're generated, rather than waiting for the full completion. The citations array can be sent as a final event once the full response (and thus final marker list) is known, or incrementally if the LLM is prompted to emit citation markers inline as it streams.

## 14. Bonus Features (build only after core MVP + rubric-required items are solid)

### 14.1 YouTube Roadmap Generator
Given a list of YouTube videos/playlists as sources, generate a personalized learning roadmap: cluster transcript chunks into concepts, order them by dependency/difficulty (LLM-assisted), and output a step-by-step roadmap where each step links to the specific video+timestamp that teaches it.

### 14.2 Podcast Generator
Given the notebook's sources, generate a script (LLM-summarized, dialogue or monologue style) and synthesize it into audio via a TTS provider (e.g., ElevenLabs, OpenAI TTS). Support male/female voice selection. Output as a playable/downloadable audio file, with an optional "script + audio" side-by-side view.

> **Agent instruction:** 🛑 Confirm with the human whether bonus features are in scope for the current milestone before starting Stage 9 — they add meaningful scope and a new `.env` (TTS provider key).

## 15. Non-Functional Requirements

- **Error handling:** every ingestion step must fail gracefully with a user-visible reason (e.g., "PDF is password protected," "no YouTube captions found," "URL returned 403").
- **Idempotency:** re-indexing a source should cleanly delete old chunks/embeddings before creating new ones (no duplicate/stale vectors).
- **Notebook isolation:** covered by mandatory `notebook_id` filtering (Section 10) — add an automated test that asserts a query in Notebook A never returns chunks from Notebook B.
- **Observability:** log each pipeline stage transition with timestamps for debugging indexing failures.
- **Performance target:** retrieval + first streamed token under ~3s for a typical notebook (a few dozen sources) on managed vector DB/LLM providers.

## 16. Proposed Folder Structure

```
askkb/
├── ARCHITECTURE.md              # Records Section 6 decisions once made
├── README.md
├── .env.example
├── docker-compose.yml           # if chosen in Section 6
├── backend/
│   ├── src/
│   │   ├── api/                 # route handlers (notebooks, sources, query)
│   │   ├── ingestion/
│   │   │   ├── extractors/      # pdf.ts, text.ts, web.ts, youtube.ts, vtt.ts
│   │   │   ├── chunker.ts
│   │   │   └── pipeline.ts      # orchestrates extract→chunk→embed→store
│   │   ├── rag/
│   │   │   ├── retriever.ts
│   │   │   ├── promptBuilder.ts
│   │   │   └── generator.ts     # LLM call + streaming
│   │   ├── db/                  # models/migrations (relational)
│   │   ├── vectorstore/         # adapter for chosen vector DB (swappable)
│   │   └── utils/
│   └── tests/
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── NotebookList/
    │   │   ├── SourceManager/
    │   │   ├── ChatPanel/
    │   │   ├── CitationChip/
    │   │   └── SourceViewer/
    │   ├── pages/ (or app/ for Next.js)
    │   ├── hooks/
    │   └── lib/api.ts
    └── tests/
```

**Separation-of-concerns principle:** the `vectorstore/` adapter must expose a provider-agnostic interface (`upsert`, `query`, `delete`) so swapping Qdrant ↔ Pinecone ↔ pgvector later doesn't touch business logic — this directly serves the "reusable components / maintainable code" rubric line.

## 17. Development Stages

> Each stage lists objective, tasks, decision checkpoints, and acceptance criteria. Do not skip the checkpoints.

### Stage 0 — Project Setup & Foundational Decisions
- **Tasks:** Ask and record all Section 6 decisions; scaffold backend + frontend; set up `.env.example`; ask for real `.env` values (Section 7); set up relational DB + migrations; set up chosen vector DB connection (local Docker or cloud).
- **🛑 Decision checkpoints:** Section 6 (full stack), Section 7 (env values).
- **Acceptance criteria:** Backend boots, connects to DB and vector store successfully; frontend boots and hits a health-check endpoint; `ARCHITECTURE.md` written recording every decision made.

### Stage 1 — Notebook Management
- **Tasks:** CRUD endpoints + UI for notebooks (create, rename, delete with confirmation); notebook list/empty states.
- **Acceptance criteria:** Multiple notebooks can be created; each is isolated (no shared source list); deleting a notebook cascades and removes its sources/chunks/vectors.

### Stage 2 — Source Ingestion: Upload & Extraction
- **Tasks:** Build the "Add Source" modal (5 source types per mockup image 1); implement extractors for all 5 types; persist raw files/URLs; write status = `uploading`/`extracting`.
- **Acceptance criteria:** Each of the 5 source types can be added and its raw text is correctly extracted with location metadata captured (page/timestamp/offset).

### Stage 3 — Chunking & Embedding
- **Tasks:** Implement chunker per Section 9; call the chosen embedding model; write status transitions `chunking → embedding → ready`.
- **Acceptance criteria:** Chunks are stored with correct `order_index` and `location_metadata`; embeddings are generated and stored in the vector DB with `notebook_id`/`source_id`/`chunk_id` metadata attached.

### Stage 4 — Status Indicators & Source Management UI
- **Tasks:** Live status updates (poll or SSE) reflected as yellow/green/red dots; implement remove-source and re-index actions (must clean up old vectors on re-index).
- **Acceptance criteria:** UI never shows a stale status; removing a source removes its chunks + vectors; re-indexing produces no duplicate vectors.

### Stage 5 — Retrieval Pipeline
- **Tasks:** Implement `retriever.ts` (embed query → filtered vector search → top-k results); unit test notebook isolation explicitly.
- **Acceptance criteria:** Given a query, retrieval returns relevant chunks only from the active notebook, ranked sensibly.

### Stage 6 — Grounded Answer Generation + Streaming
- **Tasks:** Build `promptBuilder.ts` per Section 10's rules; implement streaming LLM calls; render streaming tokens in the chat UI.
- **Acceptance criteria:** Answers are grounded, refuse to answer when context is insufficient, stream visibly token-by-token in the UI.

### Stage 7 — Citations & Source Viewer
- **Tasks:** Attach citation metadata to each assistant message; build clickable citation chips; build the Source Viewer panel per Section 11 (PDF page jump, YouTube timestamp jump, text/transcript highlighting, web preview).
- **Acceptance criteria:** Every answer has at least one citation (or explicitly states none found); clicking any citation opens the correct source at the correct location.

### Stage 8 — UX Polish
- **Tasks:** Empty states, loading states, responsive layout, error toasts, smooth transitions for panel open/close.
- **Acceptance criteria:** App feels coherent on both desktop and a reasonably narrow viewport; no dead-end states without guidance.

### Stage 9 — Bonus Features *(optional, confirm scope first)*
- **Tasks:** YouTube roadmap generator; podcast generator (TTS).
- **🛑 Decision checkpoint:** confirm in-scope, confirm TTS provider + `.env` key.
- **Acceptance criteria:** Roadmap links resolve to correct video+timestamp; podcast audio is generated and playable/downloadable.

### Stage 10 — Testing, Hardening & Docs
- **Tasks:** Add tests for isolation, ingestion failure paths, citation correctness; write `README.md` (setup, architecture, retrieval flow, env vars — see Section 20); prepare demo video script.
- **Acceptance criteria:** README allows a fresh clone to run the app end-to-end; core flows have automated test coverage; demo video covers ingestion → query → citation click end-to-end.

## 18. API Sketch (adjust to chosen framework's conventions)

```
POST   /notebooks                      create notebook
GET    /notebooks                      list notebooks
PATCH  /notebooks/:id                  rename
DELETE /notebooks/:id                  delete (cascades)

POST   /notebooks/:id/sources          add source { type, payload }
GET    /notebooks/:id/sources          list sources + status
DELETE /sources/:id                    remove source
POST   /sources/:id/reindex            re-run pipeline

POST   /notebooks/:id/query            { question } → streamed answer + citations
GET    /notebooks/:id/messages         chat history

GET    /sources/:id/view               source viewer payload (with location hint param)
```

## 19. Error Handling Requirements

- Every extractor must catch and classify failures (e.g., "unsupported PDF encoding," "no captions available," "URL unreachable/403," "malformed VTT").
- API layer returns structured errors: `{ error_code, message, retryable: boolean }`.
- Frontend must surface `retryable` errors with a "Retry" action and non-retryable ones with a clear explanation.
- LLM call failures (rate limit, timeout) must not corrupt chat history — show an inline "failed to generate, retry" affordance instead of a partial/broken message.

## 20. README Requirements (Stage 10 deliverable — graded separately, 10 marks)

The final `README.md` must include:
1. **Project overview** — one paragraph, what AskKB is.
2. **Architecture diagram/explanation** — can reuse Section 5, updated with actual chosen stack.
3. **Setup instructions** — clone, install, `.env` setup (list every variable and what it's for), run migrations, start dev servers, (docker-compose up if applicable).
4. **Retrieval flow explanation** — the exact chunking size/overlap used, embedding model used, top-k value, and prompt construction rules actually implemented (Section 10).
5. **Environment variables table** — name, purpose, required/optional, example format (never real secrets).
6. **Known limitations** — be honest (e.g., "web scraping may fail on JS-heavy SPAs," "PDF highlighting is page-level not bbox-level," etc.)
7. **Folder structure** — brief map, referencing Section 16.

## 21. Rubric Coverage Map (sanity check before calling any stage "done")

| Rubric Category | Marks | Covered by |
|---|---|---|
| Notebook Management | 10 | Stage 1 |
| Source Ingestion | 20 | Stage 2, 3, 4 |
| RAG Pipeline | 20 | Stage 3, 5 |
| AI Responses | 15 | Stage 6 |
| Citations & Attribution | 15 | Stage 7 |
| Architecture & Code Quality | 10 | Section 16, ongoing discipline every stage |
| UI/UX | 10 | Stage 8, Section 12 |
| README & Docs | 10 | Section 20 |
| Demo Video | 10 | Stage 10 (script prep) |
| Overall Engineering Thoughtfulness | 10 | This entire PRD's discipline (decision checkpoints, isolation guarantees, error handling, adapter pattern) |

## 22. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| YouTube videos without captions | Detect early, fail with clear message, don't silently skip |
| Website JS-rendering makes extraction incomplete | Use a readability extractor on fetched HTML; document as a known limitation if headless-browser rendering is out of scope |
| Vector DB choice adds ops overhead (Pinecone billing, Qdrant self-host) | Confirmed explicitly in Stage 0 before any code depends on it |
| Cross-notebook leakage | Enforced filter + explicit isolation test (Stage 5) |
| Hallucinated citations (LLM claims a chunk supports something it doesn't) | Only allow citation markers for chunk IDs that were actually in the retrieved context sent to the LLM; validate server-side before displaying |
| Re-indexing creates duplicate vectors | Delete-before-insert pattern enforced in vectorstore adapter |

## 23. Open Questions Log (fill in as answered during Stage 0)

```
[ ] Vector DB: ______________
[ ] Metadata DB: ______________
[ ] LLM provider (chat): ______________
[ ] Embedding model: ______________
[ ] Backend framework: ______________
[ ] Frontend framework: ______________
[ ] File storage: ______________
[ ] Auth required? ______________
[ ] Deployment target: ______________
[ ] Orchestration library (raw SDK vs LangChain/LlamaIndex): ______________
[ ] Bonus features in scope for this milestone? ______________
[ ] TTS provider (if podcast bonus in scope): ______________
```

---

**End of PRD.** Coding agent: start at Stage 0, Section 6 + 7 first.
