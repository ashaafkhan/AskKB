# AskKB Demo Video Script

**Length:** ~2-3 Minutes
**Goal:** Showcase ingestion, semantic retrieval, strict citations, notebook isolation, and bonus features.

### [0:00 - 0:30] Introduction & Ingestion
*   **Visual:** Start on the main AskKB screen.
*   **Voiceover:** "Welcome to AskKB, your personal AI research assistant that guarantees every answer is backed by a verifiable source. Let's create a new Notebook called 'React Fundamentals'."
*   **Action:** Create a new Notebook. Click "Add Source".
*   **Voiceover:** "We can upload PDFs, text files, or just paste a YouTube link. Let's add a popular React tutorial video."
*   **Action:** Paste a YouTube URL. Hit Add. Point to the status dot turning Yellow, then Green as the backend extracts the transcript, chunks it, embeds it with Gemini, and stores it in Qdrant.

### [0:30 - 1:15] Querying & Clickable Citations
*   **Visual:** The center Chat UI.
*   **Voiceover:** "Now that our knowledge base is populated, let's ask a question: 'What is the useEffect hook?' Notice how quickly the answer streams in, powered by Groq's Llama-3."
*   **Action:** Type the question. The streaming answer appears.
*   **Voiceover:** "Crucially, the AI doesn't hallucinate. It cites its sources directly. If I click on this citation..."
*   **Action:** Click the inline `Doc 1` citation chip. The right-rail `Source Viewer` slides open.
*   **Voiceover:** "...AskKB instantly opens the Source Viewer, pulling up the exact chunk of the transcript where that answer was derived, complete with a link to jump straight to that timestamp in the video."

### [1:15 - 1:45] Notebook Isolation Guarantee
*   **Visual:** Switch to a different Notebook on the left sidebar.
*   **Voiceover:** "Security and isolation are built-in. If I switch to my 'History' notebook and ask the exact same question about React..."
*   **Action:** Ask "What is the useEffect hook?" in the History notebook.
*   **Visual:** The AI responds: "I'm sorry, but based on the provided documents, I do not have information about the useEffect hook."
*   **Voiceover:** "The RAG pipeline strictly filters vector searches by `notebook_id`, ensuring answers never leak across workspaces."

### [1:45 - 2:15] Bonus Features
*   **Visual:** Click "Bonus Features" in the left rail. The Bonus Panel opens.
*   **Voiceover:** "Finally, AskKB can synthesize your sources in creative ways. By clicking 'Generate Roadmap', the AI analyzes the videos in this notebook and creates a step-by-step curriculum, with deep links to specific timestamps."
*   **Action:** Click 'Generate Roadmap', show the generated markdown.
*   **Voiceover:** "Or, hit 'Generate Podcast', and AskKB drafts a conversational summary script and uses Google Cloud Text-to-Speech to generate a playable audio file summarizing your research."
*   **Action:** Click 'Generate Podcast'. Wait for it to finish and click play on the audio player briefly.

### [2:15 - 2:30] Outro
*   **Voiceover:** "AskKB: Fast, verifiable, and completely private research. Thank you for watching!"
