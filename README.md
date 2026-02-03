# RAG-APP

A Retrieval-Augmented Generation (RAG) application built on Cloudflare Workers that allows you to build a knowledge base and query it using AI.

## Overview

This RAG application enables you to:
- **Add notes** to a knowledge base that are automatically embedded and stored for semantic search
- **Query the AI** with questions that retrieve relevant notes as context for more accurate answers
- **View and manage** your stored notes

The application uses Cloudflare's native AI and vectorization services, making it a serverless, scalable solution without requiring external AI frameworks like LangChain.

## Architecture

This application is built using:
- **Cloudflare Workers** - Serverless runtime for the application
- **Hono** - Fast web framework for building the API and serving HTML
- **Cloudflare AI** - For generating embeddings and running LLM inference
- **Cloudflare D1** - SQLite database for storing notes
- **Cloudflare Vectorize** - Vector database for semantic similarity search

## Features

### 1. Query Interface (`/`)
Ask questions to the AI. The system will:
- Generate embeddings for your query
- Search for similar notes in the vector database
- Use relevant notes as context when generating the AI response

### 2. Add Notes (`/write`)
Create new notes that are:
- Stored in the D1 database
- Automatically embedded using the BGE-base-en-v1.5 model
- Indexed in Vectorize for semantic search

### 3. Notes Management (`/notes`)
View all your notes and delete them as needed.

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **AI Models**:
  - `@cf/baai/bge-base-en-v1.5` - For generating embeddings
  - `@cf/meta/llama-2-7b-chat-int8` - For LLM responses
- **Database**: Cloudflare D1 (SQLite)
- **Vector Search**: Cloudflare Vectorize
- **Frontend**: Vanilla HTML with HTMX for dynamic interactions

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Cloudflare resources**:
   - Ensure you have a D1 database named `rag-app` created
   - Create a Vectorize index named `rag-app-index`
   - The database should have a `notes` table with `id` and `text` columns

3. **Create the database schema**:
   ```sql
   CREATE TABLE notes (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     text TEXT NOT NULL
   );
   ```

4. **Run locally**:
   ```bash
   npm run dev
   ```

5. **Deploy**:
   ```bash
   npm run deploy
   ```

## How It Works

1. **Adding Notes**:
   - User submits text via `/write`
   - Text is stored in D1 database
   - Embedding is generated using BGE model
   - Embedding is stored in Vectorize with the note ID

2. **Querying**:
   - User asks a question via `/`
   - Query is embedded using the same BGE model
   - Vectorize searches for similar notes (similarity threshold: 0.75)
   - Matching notes are retrieved from D1
   - Notes are included as context in the LLM prompt
   - LLM generates response using Llama-2 model

## API Endpoints

- `GET /` - Query interface (HTML)
- `GET /query?text=<question>` - Query the AI with a question
- `GET /write` - Add note interface (HTML)
- `POST /notes` - Create a new note
- `GET /notes` - View all notes (HTML)
- `GET /notes.json` - Get all notes as JSON
- `DELETE /notes/:id` - Delete a note

## Note on LangChain

This project does **not** use LangChain or similar AI frameworks. It uses Cloudflare's native AI SDK (`@cloudflare/ai`) directly, which provides:
- Direct access to Cloudflare's AI models
- Built-in embedding generation
- Simpler deployment without additional dependencies
- Native integration with Cloudflare's infrastructure

## Testing

Run tests with:
```bash
npm test
```

## License

Private project