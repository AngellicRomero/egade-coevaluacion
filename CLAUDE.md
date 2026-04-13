# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

Open `coeval-6.html` directly in any modern web browser — no build step, no dependencies, no server required.

## Architecture

The entire application lives in a single file: `coeval-6.html`. HTML, CSS, and JavaScript are all embedded together. Sections are delimited by comments like `/* ═══ SECTION NAME ═══ */`.

### Screen-based SPA routing

Navigation is managed by re-rendering a single `#app` div. The `render(fn)` helper replaces `#app` innerHTML with whatever HTML string `fn` returns, then attaches event listeners. All screen functions follow this pattern.

**Student flow:** `renderHome` → `renderStudentCode` → `renderStudentForm` → `renderStudentSuccess`

**Professor flow:** `renderHome` → `renderProfMenu` → `renderProfCreate` → `renderProfCreated` → `renderProfDash`

### Data storage

All data is stored in `localStorage` with keys of the form `coeval:<CODE>`. Each form is a JSON object:

```js
{
  config: { title, courseName, profName, profEmail, instructions, criteria[], profCode },
  responses: [{ id, timestamp, evaluatorName, groupName, evaluations: [{ peerName, scores: {criteriaId: 1-5}, comment }] }],
  createdAt
}
```

`loadForm(code)` and `saveForm(code, data)` are the only persistence functions.

### Email / webhook integration

`EMAIL_WEBHOOK` (top of `<script>`) must be set to a Google Apps Script Web App URL to enable email features. Two payload types are sent via POST:
- `type: 'credentials'` — sent to professor after form creation
- `type: 'results'` — sends CSV of compiled responses

When the webhook URL is the placeholder `'PEGAR_URL_AQUI'`, email calls are silently skipped.

### Key utilities

- `esc(str)` — HTML-escapes all user-supplied strings before inserting into innerHTML (XSS protection — always use this)
- `uid()` — generates unique IDs for criteria and responses
- `genCode()` — 6-char alphanumeric form code (no ambiguous chars: I, O, L, 1, 0)
- `createStars(name, val)` — returns HTML for an interactive 1–5 star rating input
- `buildCSV(form)` — serializes all responses to CSV for download or email

### External dependency

QR codes are generated via `https://api.qrserver.com/v1/create-qr-code/` (requires internet access on the professor's device at form creation time).
