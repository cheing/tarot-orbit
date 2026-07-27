# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Tarot Orbit (星环塔罗) — a single-page, Chinese-language tarot reading app. Plain HTML/CSS/JS frontend (no build step, no package manager, no framework) plus one PHP endpoint that proxies OpenAI chat completions for the AI-generated reading. Designed to run as-is under XAMPP's `htdocs`.

## Running it

- Serve the project through Apache/PHP (XAMPP), e.g. `http://localhost/tarot_orbit/index.html`. Opening `index.html` directly via `file://` will not work because the reading feature calls `api/reading.php`.
- `api/reading.php` needs `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`). It reads real environment variables first, then falls back to parsing a `.env` file (plain `KEY=VALUE`, via `parse_ini_file`) at the project root.
- If PHP's `curl` extension is enabled, the endpoint streams the OpenAI response back as SSE. If `curl` is missing, it falls back to a single blocking `file_get_contents` request over `allow_url_fopen` and returns plain JSON instead of a stream — `assets/js/app.js` handles both response types.
- There is no test suite, linter, or build/bundling step in this repo.

## Architecture

The app is a two-screen SPA driven by DOM class toggles (`#intro` → `#orbitScene`), animated with GSAP (loaded from CDN in `index.html`).

- `assets/js/cards.js` — static data for the 22 Major Arcana (name, meanings, image path) and `shuffledCards()`.
- `assets/js/gesture.js` — `OrbitGesture` class wrapping MediaPipe `Hands`/`Camera` (also CDN-loaded) to drive the card orbit via webcam: an open palm rotates it, a pointing index finger selects the front-most card. Fails gracefully (returns `false` from `start()`) when MediaPipe or the camera isn't available, so the UI must keep working via pointer drag/click alone.
- `assets/js/app.js` — the main state machine:
  - Builds the 3D CSS "orbit" of card buttons (`buildOrbit`/`renderOrbit`), driven by pointer drag, momentum (`animate`), and/or gesture input.
  - Tracks `selected` (up to 3 cards → past/present/future slots), animates each pick into its slot with a cloned/GSAP-tweened element (`flyToSlot`).
  - Once 3 cards are chosen, reveals the result stage and calls `requestReading()`, which POSTs to `api/reading.php` and renders either an SSE stream (`readStream`) or a plain JSON response.
  - `getReadingApiUrl()` special-cases local dev on port 5500 (VS Code Live Server) to hit `http://localhost/minigame/games/tarot_orbit/api/reading.php` — a holdover from when this app lived nested under a `minigame/games/` site. Everywhere else it just uses the relative `api/reading.php`.
- `api/reading.php` — stateless proxy: validates the POST body (`question` + exactly 3 `cards`), builds a Chinese system/user prompt instructing a 300–500 word reading, and forwards it to `https://api.openai.com/v1/chat/completions`.

## Known gaps worth knowing about before touching card art

- `cards.js` points each card's `image` at `../tarot/assets/cards/{id}.svg`, but the only files actually present are `assets/cards/0.png` through `3.png` (plus one unrelated `.jpg`) — cards 4–21 have no matching asset yet, and the extension/path in the data doesn't match what's on disk. If you add art, make sure both the path *and* extension in `cards.js` line up with the real files.
