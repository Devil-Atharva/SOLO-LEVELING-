# NOÊSIS

Interactive, adaptive Physics and Mathematics for CBSE/NCERT Class 11–12, covering a curated 24-chapter subset.

**Current phase:** 1 — animated chapter roadmap ([report](docs/phase-1-report.md)). The blueprint starts at [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).

## Run it

Needs Node.js 20.9 or newer.

```bash
npm install
npm run dev            # http://localhost:3000
# or a production build:
npm run build && npm start
```

Progress is stored only in your browser (IndexedDB). Use *Export progress* / *Import progress* / *Erase progress* in the right-hand panel.

## Checks

```bash
npm run check          # curriculum rules, contrast, no-AI-SDK guard, typecheck, unit tests
npm run build && npx playwright test   # browser tests (desktop + phone): navigation, persistence, keyboard,
                                       # reduced motion, accessibility (axe), frame timing
```

Browser tests need Playwright's Chromium. Run `npx playwright install chromium` once on a new machine.

## What's here

```
app/ and src/               the web app (Next.js + React + TypeScript); see docs/01-architecture.md
content/curriculum/         chapters, skills, foundations, related links (source of truth) + generated graph data
config/learning.config.json adaptive-engine thresholds (all configurable)
scripts/                    zero-dependency checks
tests/unit, tests/e2e       Vitest and Playwright
docs/                       blueprint, decision log, generated reports, reference images
```

Student-facing AI is off by default, and the app contains no AI SDK (`npm run check:no-ai-sdk`). See docs/09.
