# NOÊSIS

Interactive, adaptive Physics and Mathematics for CBSE/NCERT Class 11–12, covering a curated 24-chapter subset.

**Current state (2026-10-28):** the roadmap, player/checker and the consolidated **Phase 3** (Laws of Motion pilot content, adaptive sessions with recursive detours and exact resume, mastery and completion) are built. Phase 2 and Phase 3 product review and the **named human content review** are pending: no content is approved yet, so real mastery can't be earned until it is (a labelled reviewer preview demonstrates the journeys). See the [Phase 3 report](docs/phase-3-report.md) and the [phase plan](docs/phase-plan.md). Historical reports: [Phase 1](docs/phase-1-report.md), [Phase 2](docs/phase-2-report.md). The blueprint starts at [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md).

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
npm run check          # curriculum rules, content validation, contrast, no-AI-SDK guard, typecheck, unit tests
npm run build && npx playwright test   # browser tests (desktop + phone): navigation, persistence, keyboard,
                                       # reduced motion, accessibility (axe), frame timing
```

## Content

51 templates (25 Laws of Motion, plus small Motion in a Plane, trigonometric-foundation and Straight Lines packs) and 3 lessons, all `in-review`; none counts toward mastery until a named reviewer approves it. `/chapter/<id>/try` runs an adaptive session; `?q=<templateId>&seed=<n>` opens a single question, and `?preview=review` starts a clearly labelled reviewer-preview session in which in-review content counts for that session only.

```bash
npm run content:validate   # validates every question template (50 seeds each) and writes the student manifest
npm run content:review     # local review tool at http://127.0.0.1:4100 (run npm run dev alongside it)
```

Question templates live in `content/templates/<chapter>/<skill>/<id>.json`, lessons in `content/lessons/<skill>.lesson.json`, misconception catalogues in `content/misconceptions/`. Approval is recorded only by a person through `content:review`; nothing approves itself. See docs/05 §4 and docs/phase-2-report.md.

Browser tests need Playwright's Chromium. Run `npx playwright install chromium` once on a new machine.

## What's here

```
app/ and src/               the web app (Next.js + React + TypeScript); see docs/01-architecture.md
content/curriculum/         chapters, skills, foundations, related links (source of truth) + generated graph data
config/learning.config.json adaptive-engine thresholds (all configurable)
content/templates/          question templates (JSON); answers come from code solvers in src/content/solvers
scripts/                    checks; scripts/content/ holds content:validate and content:review
tests/unit, tests/e2e       Vitest and Playwright
docs/                       blueprint, decision log, generated reports, reference images
```

Student-facing AI is off by default, and the app contains no AI SDK (`npm run check:no-ai-sdk`). See docs/09.
