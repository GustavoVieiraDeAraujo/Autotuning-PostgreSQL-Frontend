# Autotuning-PostgreSQL Frontend

Static browser dashboard for the PostgreSQL autotuning research pipeline. It
visualizes the task queue, generated configurations, benchmark results
(TPC-H / TPC-DS), live hardware metrics, and streams live terminal output
(config generation, prepare, runner) from the backend `api` service over
Server-Sent Events.

This is plain HTML/CSS/JS — no build step, no framework, no bundler. It is
one of three repos split out of the original monolith:

- `pipeline` — the benchmarking/sampling engine
- `api` — a FastAPI JSON service exposing `/api/*` endpoints and `/stream/*`
  SSE endpoints (default `http://localhost:8000`)
- `frontend` (this repo) — the static dashboard, served independently of the
  API

## Running locally

Option 1 — Node (via `serve`):

```
npm install
npm run dev
```

Option 2 — zero dependencies, using Python:

```
python3 -m http.server 3000
```

Then open the printed URL (e.g. `http://localhost:3000`) in a browser.

## Pointing at the API

All API calls and SSE streams are prefixed with a configurable `API_BASE`,
defined in `js/config.js`:

```js
const API_BASE = window.API_BASE || "http://localhost:8000";
```

By default this points at the `api` service running locally on port 8000.
To point at a different host (e.g. a deployed API), add a small inline
script in `index.html` **before** the `js/config.js` `<script>` tag:

```html
<script>window.API_BASE = "https://your-api-host.example.com";</script>
<script src="js/config.js"></script>
```

Because the frontend and API are separate origins, the API must either be
served from the same origin as this frontend (e.g. behind a shared reverse
proxy) or have CORS enabled for the frontend's origin. The companion `api`
repo already enables permissive CORS for local development, so pointing
`API_BASE` at `http://localhost:8000` works out of the box in dev.

## Structure

```
index.html       Flattened single-page dashboard (Jinja includes inlined)
css/styles.css   Dashboard styles
js/config.js     API_BASE definition (loaded first)
js/*.js          Dashboard logic (load order matters, see index.html)
```
