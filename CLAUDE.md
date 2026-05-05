# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Frontend**: Vite 6 + React 19, Tailwind v4, Zustand (state), SWR (fetch), Radix UI primitives, framer-motion, sonner.
- **Backend**: FastAPI + SQLModel + SQLite (`./neuro_kaizen.db`), `slowapi` rate limiting.
- **PWA**: hand-written service worker at `public/sw.js`; manifest at `public/manifest.json`. Registered from `src/App.jsx`.

> Heads-up: `ARCHITECTURE.md` describes the codebase as Next.js Pages Router with files under `pages/`, `components/`, `store/`, `lib/`. That is **stale**. The frontend is a Vite SPA; all sources live under `src/`. The execution-flow narratives in ARCHITECTURE.md are still accurate — only the file paths are wrong.

## Commands

Frontend (from repo root):
- `npm run dev` — Vite dev server on `:5173`
- `npm run build` — production bundle to `dist/`
- `npm run preview` — serve built bundle

Backend (from repo root, with venv active):
- `pip install -r requirements.txt`
- `uvicorn main:app --reload` — API on `:8000`

No test runner is configured. `tests/` contains only a placeholder file.

## Environment

- `VITE_API_URL` (frontend) — base URL for API calls. Defaults to `http://localhost:8000/api`. Set this in Vercel/Render for deployed frontends to point at the deployed backend.
- Backend CORS allows `http://localhost:3000` and `http://localhost:5173`. Add deployed origins in `main.py` when shipping.

## Architecture (big picture)

Single-user local-first PWA. No auth layer. Two processes communicate over plain HTTP REST.

**Routing decision is one line in `src/App.jsx`**: `moodLogged ? <Arena/> : <MoodGate/>`. Daily mood is gated, persisted in `localStorage` (`mile_last_mood_date`, `mile_last_mood_score`), and rehydrated on mount.

**Global state lives in `src/store/useStore.js` (Zustand)** — single source of truth for `moodLogged`, `currentMood`, `xpBalance`, `activeTask`, `activeTab`. Components read slices; cross-tab coordination (Planner → Timer handoff) flows through `setActiveTask` + `setActiveTab`.

**Arena keeps both Timer and Planner mounted** (inactive tab gets Tailwind `hidden`) so the Pomodoro countdown survives tab switches.

**Task completion is derived, not flagged** — backend exposes `GET /api/tasks` (active, `spent < target`) and `GET /api/tasks/completed` (`spent >= target`). On Timer completion: `PATCH /api/tasks/{id}/add_time` → `mutate('/api/tasks')` + `mutate('/api/tasks/completed')` → `POST /api/xp` (+50). See `src/lib/taskBridge.js` for the derivation helpers (`isCompleted`, `getProgress`, `adaptTask`).

**XP is event-sourced** — no denormalized balance. `GET /api/xp/balance` runs `SUM(amount)`. Reward redemption inserts a negative `XpTransaction` inside a nested transaction with re-read balance check (TOCTOU guard in `redeem_reward`, `main.py:99`).

**API base URL** is centralized in `src/lib/api.js` (`API` const + `fetcher`). Always import from there — don't hardcode URLs in components.

**Service worker strategy**: stale-while-revalidate for `:8000` GETs, cache-first for static assets. Mutations on offline are silently swallowed by component-level catches — UI may drift from DB until reload.

For full functional-area breakdown, execution flows, and the mermaid diagram, see `ARCHITECTURE.md` (mind the path drift noted above).

## GitNexus

This repo is indexed by GitNexus as `Mile`. Full rules in `AGENTS.md`. Short version: before editing any function/class, run `gitnexus_impact({target, direction: "upstream"})`; before committing, run `gitnexus_detect_changes()`; for renames use `gitnexus_rename` (dry-run first), never find-and-replace. After commits, the index is refreshed via PostToolUse hook (`npx gitnexus analyze`).
