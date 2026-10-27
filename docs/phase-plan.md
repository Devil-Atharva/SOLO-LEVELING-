# Phase plan (revised 2026-10-27, D-037)

Each phase: inspect the repository, implement working behaviour, run the relevant checks, and report what works, how to try it and what remains. Static mockups, placeholder chapters, prerecorded animations and fake AI responses never count as complete.

| Phase | Scope | Done when |
|---|---|---|
| **0 · Blueprint** ✅ | Documentation; curriculum, skill and foundation graphs; config; validators; review corrections (D-031–D-037) | Validators pass; blueprint reviewed |
| **1 · Animated chapter roadmap** ✅ (awaiting your review; see docs/phase-1-report.md) | App shell; four roadmap views; dotted pan/zoom/fit canvas; search; list view; legend; real node states; arrival, path and recommendation animation with reduced-motion equivalents; chapter preview with *Try a question*; a small set of real diagnostic questions for clearly labelled playable chapters; right-side progress panel (mobile-collapsible); IndexedDB persistence | Navigation, persistence, keyboard, mobile layout, reduced motion and frame timing verified in automated browser tests |
| **2 · Lesson player + checking engine** | Full checking engine (docs/05 §3) in a worker with the full test suite; question screen; all formats; core widgets (`vector-board`, `motion-track`, `graph-plot`, `number-line`) with non-drag controls, cues and scrub; offline content CLI (`content:validate`, `content:review`) | Checker table, trap and property tests pass; widgets meet frame budgets |
| **3 · Pilot chapter** | Laws of Motion fully authored and approved, with micro-lessons for the foundations its closure reaches | Content validation passes for every seed; a student can complete it end to end |
| **4 · Adaptive engine** | `practiceLoop`: selection, difficulty, attempts, easy diagnostic, planner, probes, detours to depth 4, foundations, stuck, return, class-ahead; persisted stack; detour/return motion | Journeys 2 and 3 pass as e2e tests, including quit/resume mid-detour |
| **5 · Mastery loop** | Mastery rule, *Not yet* at the cap, resolution, successors, Chocolate Problem, Leitner review | Journey 1 passes as e2e; changing thresholds in config takes effect without code changes |
| **6 · Content scale-up** | Verify skill lists against current NCERT texts; remaining widgets; all 24 chapters and foundation micro-lessons | Ship rule met for every chapter |
| **7 · Tutor contract + offline drafting** | `TutorProvider` contract, `AuthoredHintsProvider`, feature flags (off), conformance suite with fixtures; separate `tools/content-drafting` package (adult-only; Gemini), with live `verify` once you set the key in your shell | Conformance suite passes against fixtures; app bundle contains no AI SDK or vendor host; drafting tool verified live |
| **8 · Voice (contract only until a provider is approved)** | Transport-neutral voice client (mic opt-in, push-to-talk, captions, cue tools), disabled by default | Works against a conformance fixture; enabled only after OQ-1 and the privacy gate |
| **Launch gate** | Privacy review (docs/10), OQ-1 decision if any student AI is wanted, performance and accessibility audits | Sign-offs recorded in the decision log |
