# Phase plan and implementation prompts

Revised 2026-10-28 after a limited local run and source review. Existing phase numbers are preserved; Phase 2.1 is the next recommended step. This revision updates the plan, not the completion status of future work. The original brief remains a historical reference in `docs/reference/original-brief.txt`.

## Current baseline

| Area | Built now | Still to build or improve |
|---|---|---|
| Roadmap (Phase 1) | Four subject/class views, pan/zoom/fit, search, list, chapter previews, motion, local progress and export/import | A real session Continue action and mastery-driven successor recommendations; current bars mean **skills tried** |
| Lesson player (Phase 2) | Twelve checked answer formats, three tries, progressive hints, misconception feedback, live consequences, solutions, unscored reasoning | Mobile input polish, reliable save feedback and restoration of an unfinished question |
| Checking and visuals (Phase 2) | Worker checker, safe expression/unit handling; `vector-board`, `motion-track`, `graph-plot`, `number-line`; static `figure` adapter | Additional widgets only as real content needs them; static figures do not count as interactive replacements |
| Content | Validation/review tools; **20 templates in 10 of 24 chapters: 19 medium, 1 hard, 0 easy, 0 human-approved** | Full pilot coverage, easy diagnostics, hard variety, independent golden seeds, prerequisite/foundation practice and human review |
| Laws of Motion | Six templates covering six of nine required primary skills | `lom.resolve-forces`, `lom.momentum-conservation`, `lom.circular-dynamics`, plus suitable practice across difficulties |
| Progress and review | Completed attempts, derived skill states, flashcard creation, five-box Leitner scheduling and a working review dialog | Config-driven rules, adaptive session/frame records and actual mastery evaluation; normal playback does not currently write mastered chapter records |
| Adaptive journey | Curriculum graph and detailed design in docs/04 | Selection, easy diagnostics, probes, recursive detours, foundation lessons, stuck/return, class rule and exact resume |
| AI/voice | Authored hints work directly in the player; student runtime contains no AI SDK | Provider contracts, offline drafting package and voice fixtures; student AI stays disabled |

`ChapterLesson` currently chooses a seeded demonstration question; it is not an adaptive chapter session. Refresh keeps the chosen question/seed, not unfinished answer, retry or widget state. `learning.config.json` is a specification: its thresholds are not yet wired into a runtime config reader.

Phase 1 is recorded as approved. Phase 2 is built and awaiting product review, as recorded in [phase-2-report.md](phase-2-report.md). D-053 remains a proposed content-policy amendment: the implementation permits validated in-review demonstrations, but only unchanged human-approved content can count toward mastery. This planning update does not approve templates or resolve D-053.

## Phase sequence and completion gates

| Phase | Scope | Completion gate |
|---|---|---|
| **0 · Blueprint — complete** | Architecture, curriculum graphs, configuration specification, validators | Historical blueprint checks and corrections recorded |
| **1 · Roadmap — built, approval recorded** | Existing roadmap and browser progress experience | Preserve the working baseline; extend it when sessions/mastery exist |
| **2 · Player/checking — built, review pending** | Existing player, core widgets, checker and content tools | Keep the current demonstration scope distinct from chapter completion |
| **2.1 · Player reliability and usability — next** | Reproducible startup, honest save states, phone inputs, touch targets, answer/visual transitions, payload reduction | Representative main flow works after install; focused reliability checks pass; remaining measured limitations recorded |
| **3 · Pilot content** | Laws of Motion, prerequisite/foundation closure, golden seeds and human review | Every required skill has suitable validated content; pilot can be traversed manually. Adaptive completion is gated by Phases 4–5 |
| **4 · Adaptive sessions** | Runtime config, selection, diagnostics, planner, bounded detours, foundations, stuck/return and exact resume | Journey 2 detour/return and Journey 3 foundation/stuck/resume work; mastery conclusions remain Phase 5 |
| **5 · Mastery and completion** | Evaluator, question cap, Not yet, real chapter records, successors, Chocolate Problem, integration of existing review | Full pilot journey and Journey 1 pass; configurable thresholds and evidence exclusions are verified |
| **6 · Content scale-up** | Remaining chapters, foundations and widgets in reviewable batches | The ship rule holds for every chapter; a visible map node alone is not playable content |
| **7 · Tutor contract and offline drafting** | Provider-neutral interfaces, authored-hints adapter, fixture conformance, separate adult drafting tool | Offline contract verified; live drafting verification reported separately when a key is available |
| **8 · Voice contract** | Disabled, opt-in transport interface, captions, text fallback and bounded cue tools | Conformance fixture works; actual provider use needs the existing provider/privacy gates |
| **Launch gate** | Content readiness, representative real-device performance, accessibility and privacy review | Evidence and sign-offs recorded; unmet gates remain explicit |

## Shared preface for implementation prompts

Use this preface with one phase prompt below:

> Work in the existing NOÊSIS repository. Inspect the relevant implementation before editing and preserve the working roadmap, theme, checker and widget contracts. Follow applicable repository instructions and bundled framework documentation. Treat the original brief and phase reports as product references and historical evidence; the selected phase below defines the current task. Implement only that phase. Do not rebuild completed features or silently claim planned behavior is present. Keep unfinished development details out of the student UI. Run checks that exercise changed behavior and a small representative browser flow; do not click every feature or rerun the full browser matrix unless the change requires it. Report what changed, how to run it, checks actually run and remaining gaps. Do not reuse historical test counts as fresh results. Keep authored hints usable and student AI disabled. Content approval must come from a named human through the review workflow; never approve content automatically.

## Phase 2.1 prompt — player reliability and usability

> Stabilise the existing player before expanding it. Confirm startup from the committed package manifest and lockfile; the 2026-10-28 checkout was missing installed `katex`, `tsx` and `fast-check`, causing a build overlay. Restore dependencies without upgrading package ranges. Show pending, saved and failed states based on the actual persistence promise, with retry on failure. Define and implement restoration of an unfinished demonstration question: answer, hints, tries, visual state and question/seed, without duplicating completed attempts. Leave the recursive session stack to Phase 4.
>
> Improve phone input: keep the answer and Check action usable while the keyboard is open, add a convenient fraction-entry route, and move widget hit targets toward the documented 44 px goal. At compact viewport widths, keep the roadmap legend from obscuring nodes and preserve readable labels when fitting or closing a chapter preview. Add the planned short input-to-visual transition with a reduced-motion equivalent. Address the ranking-hint and low-variation content warnings. Review consequences that reveal partial answer information and preserve assisted-answer accounting. Split question/widget payloads where useful, then measure against the existing budgets. Acceptance: focused persistence/resume checks plus representative desktop/phone flows; record unmeasured real-device behavior rather than claiming it passes.

## Phase 3 prompt — a content-ready Laws of Motion pilot

> Complete Laws of Motion content using the existing template/solver/review system. Start with the missing required primary skills: resolving forces, conservation of momentum and circular-motion dynamics. Provide easy diagnostics and remediation, medium main questions, and enough hard questions and distinct templates to satisfy the mastery coverage window without repeating a template within a session. Meet docs/05's ship rule: at least two human-approved templates per skill at every difficulty selection can request. Build the content coverage table against all nine required skills and the actual prerequisite/foundation closure. Author the reachable prerequisite questions and micro-lessons; add only the foundation widget capabilities they require.
>
> Add misconception evidence and flashcards, answer-safe hints/consequences, worked solutions, accessible controls, and independently hand-verified golden seeds. Passing a solver against its own checker is not independent answer verification. Run configured 50-seed validation for every template, plus the golden cases, and prepare variations for named human review; leave content unapproved until that review occurs. Acceptance: a reviewer can manually traverse the complete pilot question/micro-lesson pack. This phase supplies content; automatic adaptive sessions and mastery arrive in Phases 4–5.

## Phase 4 prompt — adaptive sessions, detours and resume

> Implement docs/04's adaptive loop around the existing player and pure models. Add validated runtime configuration and replace the relevant hard-coded retry, hint, skill-evidence and scheduling rules with config values. Build deterministic medium-first selection, difficulty adjustment, coverage tracking and template-repeat avoidance. Record main, diagnostic, probe, detour, foundation and return roles explicitly so that remediation never enters the main-question mastery window.
>
> After exhausted tries, provide the easy diagnostic, tag/evidence planner, probes and prerequisite detours, with cycle guards, maximum depth four, sibling limits and a persisted frame stack. Add foundation micro-lessons/practice, bounded repeats, Stuck choices, recommendations, return-solution replay and a fresh return variant. Persist question/seed, answer, tries, hints, visual state and return point; resume exactly and save attempts once. Add class selection and the proposed OQ-2 no-forward-remediation default, leaving every chapter manually open and documenting the unresolved alternative.
>
> Include the small Motion in a Plane/trigonometric-foundation content pack and `triangle-explorer` behavior needed for Journey 3; do not postpone a required journey dependency to Phase 6. Acceptance: exercise Journey 2's detour/return and Journey 3's stuck/pause/resume, including quitting mid-detour, invalid input, depth limits and unavailable eligible content. Pending human content review must be reported explicitly; use clearly separated test fixtures for automated eligibility tests. Full mastery endings are completed in Phase 5.

## Phase 5 prompt — mastery, completion and review integration

> Implement configurable chapter mastery over main-question evidence: at least ten main questions, at least eight independent correct and two hard independent correct in the last ten, all required skills covered independently in the session, and a cap of sixteen. Only unchanged human-approved content is eligible. Hinted, retried, remediation, return and unscored reasoning evidence must not inflate mastery. At the cap show Not yet, retain learning evidence/cards, and start a fresh mastery window in the next session.
>
> Persist real chapter mastery records and drive the existing roadmap's mastered state, counters and successor motion from them. Add ranked successor recommendations with prerequisite/class context, completion feedback and an optional Chocolate Problem outside mastery. Integrate the working flashcard creation, review dialog and Leitner scheduler into the session lifecycle; do not rebuild them. Supply the small Straight Lines content pack needed for the exact Journey 1 before its acceptance test. Acceptance: Journey 1, the complete Laws of Motion pilot, mastery boundary cases, config changes and reload persistence pass; test fixtures never masquerade as human-approved production content.

## Phase 6 prompt — scale the content and remaining visuals

> Expand the remaining chapters in small batches through the pilot's authoring, validation, golden-seed and named-review process. At implementation time verify each skill list against current primary NCERT/CBSE source texts and record the edition/source used. Build the remaining interactive widgets only as their batch requires them; retain deterministic models, teaching cues, scrub controls, non-drag inputs and reduced-motion explanations. Replace static figures when a lesson needs real manipulation.
>
> Each chapter must meet the ship rule: required-skill/difficulty coverage, sufficient distinct templates for feasible sessions, misconception mappings, approved unchanged content, reachable prerequisite/foundation support and a real learner journey. Keep preview-only chapters labelled honestly. Acceptance is per batch and then across all 24 chapters; avoid declaring all content finished from a successful map render or a template count.

## Phase 7 prompt — tutor contract and separate offline drafting

> Wrap the existing authored hints and cue actions in the provider-neutral `TutorProvider`/`AuthoredHintsProvider` contract from docs/09. Add feature flags, bounded cue requests and fixture conformance checks while preserving the fully offline help experience. Build adult-only drafting as a separate `tools/content-drafting` package; no AI vendor SDK, secret or vendor host belongs in the student app. Drafts still need code solvers, validation and human review.
>
> Acceptance: contract fixtures pass and the student bundle has no AI dependency/calls. If a drafting key is available in the operator's shell, verify the separate tool live without exposing it. Otherwise report the live check as pending; lack of a key must not block the offline contract work. Enabling a student provider remains conditional on OQ-1 and the existing privacy gate.

## Phase 8 prompt — disabled voice contract

> Build a transport-neutral voice client against conformance fixtures: explicit microphone opt-in, push-to-talk, captions, text fallback, cancellation and bounded hint/highlight tools operating on the same model. Handle denied permission, disconnects and expired grants with clear text fallback. Keep the feature disabled by default. Acceptance: the fixture demonstrates the complete interface and failure paths. A simulated provider is labelled as a fixture, and real student voice access stays gated on an approved provider and the privacy decision.

## Launch-gate prompt

> Review the implemented product against docs/08 and docs/10, content ship rules and the performance budgets. Use representative real phones/laptops to supplement historical headless timing; measure initial/lesson payloads, responsiveness, keyboard/assistive access, reduced motion and resume behavior. Verify that all learner routes have suitable reviewed content and honest progress/mastery states. Record evidence, remaining defects and explicit sign-offs. If student AI remains disabled, do not make provider selection a prerequisite for launching the authored-hints experience. Deploy only when deployment is requested and the applicable launch gates are met.

## Verification for this revision

- Scope: source inventory and a small local browser smoke check, not a fresh full feature audit. Exact commands and observed results are recorded in the accompanying 2026-10-28 review note.
- The Phase 2 report's 208 unit tests, 71 browser tests and performance numbers are historical results from 2026-10-27, not results rerun for this planning update.
- No template approval, mastery-policy approval, AI/provider enablement or future-phase implementation is implied by this document.
