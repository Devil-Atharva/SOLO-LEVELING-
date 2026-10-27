# 05 · Content schema, widgets, answer checking and verification

## 1. Question template schema

Content is authored as JSON files in `content/templates/<chapter>/<skill>/`. One template produces many variations through parameters. A complete worked example lives at `content/templates/lom/lom.friction/lom.friction.h.incline-will-it-slide.json`; the misconception catalogue it references is `content/misconceptions/lom.json`.

The TypeScript shape below becomes Zod schemas in Phase 1.

```ts
type Difficulty = "easy" | "medium" | "hard";
type Status = "draft" | "auto-checked" | "in-review" | "approved" | "retired";

interface QuestionTemplate {
  id: string;                         // "<skill>.<e|m|h>.<slug>"
  version: number;                    // bump on any change to stem, answer, parameters or solver
  status: Status;                     // only "approved" is bundled or counted
  provenance: {
    origin: "human" | "ai-draft";
    author: string;
    model?: string;                   // ai-draft only: model id
    promptRef?: string;               // ai-draft only: drafting prompt file and hash
    createdAt: string;
    reviewedBy: string | null;        // a developer/content reviewer, recorded in git
    reviewedAt: string | null;
    contentHash: string | null;       // sha256 of the canonical JSON when approved
  };
  chapterId: string;
  skillIds: string[];                 // every skill exercised
  primarySkillId: string;             // the skill whose evidence this updates
  difficulty: Difficulty;
  format: "choice" | "multi-choice" | "numeric" | "expression" | "interval" | "set"
        | "equation" | "ordering" | "drag-drop" | "diagram" | "reasoning";
  estimatedSeconds: number;
  parameters: Record<string, ParamSpec>;  // int | decimal | choice | const, with ranges/steps/units
  constraints: string[];              // parameter-only predicates, evaluated by mathjs; resampled until all hold (max 200 tries, else build error)
  stem: RichText;                     // Markdown + KaTeX, with {{param}} and {{derived}} substitution
  widget?: WidgetUse;                 // type + mode ("explore" | "answer") + config (may reference params)
  answer: AnswerSpec;                 // see section 3
  misconceptionRules: Array<{ tags: string[]; match: MisconceptionMatch }>;
  hints: Array<{ level: 1 | 2 | 3; text: RichText; cue?: CueRef }>;   // 2–3 levels; level 3 may approach but never state the final answer
  feedback: Record<string /*tag*/ | "generic", { text: RichText; cue?: CueRef }>;
  workedSolution: Array<{ text: RichText; cue?: CueRef; widgetState?: unknown }>;
  visualExplanation: { widget: string; timeline: CueRef[] };          // scrubbable
  reasoning?: { prompt: RichText; rubric: string[] };                 // optional; AI-advisory only, never scored
  accessibility: { altText: RichText; nonDragAlternative?: string };  // required whenever any input is a drag
}

type MisconceptionMatch =
  | { buggySolver: string }           // a registered "wrong method" function; numeric match within tolerance
  | { optionId: string }              // a distractor option
  | { dimensionNot: string }          // answer has the wrong physical dimension
  | { expressionEquivalentTo: string }// e.g. derivative with the chain rule omitted
  | { diagramRule: string };          // e.g. "extraForceWithoutAgent"
```

**Solvers are code, not text.** Every template names a reference solver registered in `src/content/solvers/<chapter>.ts`:

- a pure function from parameters to the exact answer, plus derived values used in hints and solutions;
- optional *buggy solvers* that reproduce common wrong methods;
- each one with its own unit tests.

AI never supplies an answer value.

**Misconception catalogue** (`content/misconceptions/<chapter>.json`). Each tag has:

- a description;
- `implicates` — the skills whose weakness the tag is evidence of. The detour planner uses this list;
- a visual cue;
- exactly one flashcard.

## 2. Widget library

A widget is a **pure model** plus a view. Each widget exports:

```ts
interface WidgetDefinition<Config, State, Derived> {
  type: string;
  configSchema: ZodType<Config>;
  init(config: Config, params: Params): State;
  reduce(state: State, action: WidgetAction): State;      // pure, deterministic
  derive(state: State): Derived;                          // resultant, readouts, trajectories…
  step?(state: State, dt: number): State;                 // simulations: fixed dt (1/120 s), deterministic → scrubbable
  describe(state: State, d: Derived): string;             // text for the live region and the static alternative
  extractAnswer?(state: State): AnswerPayload;            // for format "diagram"
  cues: Record<string, CueTimeline>;                      // named teaching animations used by hints, feedback and solutions
  controls: NonDragControlSpec;                           // keyboard and form equivalents for every drag
}
```

| Widget | Used for | Student manipulates | Phase |
|---|---|---|---|
| `vector-board` | vectors, forces, FBDs, components, dot and cross products (2D) | add, drag and rotate arrows; tilted axes; agent labels | **3** |
| `motion-track` | 1D/2D kinematics, projectiles, collisions, circular motion, power | initial conditions, launch angle, time scrubber; linked x–t and v–t graphs | **3** |
| `graph-plot` | functions, slope, tangents, area, limits, lines, conics, extrema | draggable points and handles, sliders, shading regions | **3** |
| `number-line` | positions, intervals, unions, inequalities | drag endpoints, toggle open/closed ends | **3** |
| `unit-circle` | radians, trig functions, allied and compound angles, trig limits | drag angle; linked sine/cosine graphs | 6 |
| `venn` | sets, operations, complements | select and shade regions; drag elements | 6 |
| `ray-diagram` | mirrors, lenses, refraction, TIR, prisms, instruments | drag object, focal points, lens and surface; principal rays | 6 |
| `circuit-board` | Ohm, Kirchhoff, Wheatstone, cells, capacitors | place components on a grid; meters; loop tracing | 6 |
| `field-map` | charges, field lines, flux, equipotentials, magnetic fields, induction | drag charges, wires and surfaces; probe | 6 |
| `oscillator` | SHM, springs, pendulums, energy | drag amplitude and phase; phasor view | 6 |
| `rigid-body` | torque, moment of inertia, rotation, AC generator coil | apply forces at points; spin; pivot | 6 |
| `space-3d` | lines in space, direction cosines, cross product | orbit view by drag or keys; drag direction vector | 6 |
| `triangle-explorer`, `mapping-diagram`, `balance-scale`, `algebra-tiles`, `unit-converter` | foundation micro-lessons and relations | drag vertices, arrows, tiles | 3–6 as foundations require |

**Accuracy is tested against physics and mathematics, not screenshots.** Each model has unit tests against analytic results. Examples:

- projectile range and apex;
- SHM period and energy drift under 0.1% over 10 periods (semi-implicit Euler or velocity Verlet);
- thin-lens and mirror equations matching ray-intersection geometry;
- circuit solver (modified nodal analysis) matching hand-solved networks;
- field superposition matching Coulomb's law;
- tangent slope matching the symbolic derivative.

## 3. Answer checking

All checkers are pure functions in `src/domain/checking/` and return:

```ts
type CheckResult =
  | { status: "correct"; notes?: string[] }                 // notes, e.g. "remember + C"
  | { status: "incorrect"; tags: string[] }                 // tags from misconceptionRules
  | { status: "invalid"; reason: "unparseable" | "missing-unit" | "not-exact" | "too-long" | "wrong-form" }
  | { status: "indeterminate"; reason: string };            // could not decide safely
```

Only `correct` and `incorrect` use up an attempt (config: `invalidInputConsumesAttempt: false`). An `indeterminate` result asks the student to write the answer another way, and is logged so the content team can review the case.

| Kind | Canonical form | Equivalence rule | Defaults |
|---|---|---|---|
| `choice` / `multi-choice` | option ids; order shuffled by seed | set equality | Distractors map to tags. |
| `quantity` (physics numeric) | mathjs unit value converted to the SI canonical unit | relative error ≤ `tolerance.relative` (or absolute when the expected value is 0) | 1% relative. Unit required. A wrong dimension is `incorrect` with the `dimension-mismatch` tag. A missing unit is `invalid` (no attempt used). Significant figures are not graded in v1. Sign matters (optics sign convention). |
| `number` (maths numeric) | exact rational or algebraic value | exact when the author sets `exact: true`; otherwise relative error ≤ 1e-9 | A decimal for an exact-required answer is `invalid: not-exact`. |
| `expression` | MathJSON from Compute Engine, canonicalised | **Multi-point sampling**: evaluate both at 16 seeded points in the author-declared domain. Skip points where either is non-finite and require ≥ 10 valid points. Relative tolerance 1e-8. Then a symbolic tie-break when sampling is near-degenerate. | Variables are restricted to the declared set. Domain is required, e.g. x > 0 for logs. |
| `antiderivative` | expression | **Derivative of student answer ≡ integrand** by sampling, *or* (student − reference) constant across samples | Missing `+ C` is `correct` with a note. Configurable per template (`requireConstant`). |
| `form` requirements | AST inspection | "factorised", "simplified", "no negative exponents", "rationalised denominator" | Failing a required form is `invalid: wrong-form` with guidance. |
| `equation` (lines, conics, planes) | `F(x,y)=0` | equivalent up to a non-zero constant multiple: the coefficient vectors are proportional (exact), or each equation is satisfied at ≥ 8 sampled points of the other | Rejects `0 = 0` and other trivial forms. |
| `interval` | sorted union of intervals with exact or symbolic endpoints and open/closed flags | normalise (merge touching or overlapping pieces, drop empties), then compare endpoints (tolerance 1e-9) and closure flags exactly | Accepts `(-∞, 2] ∪ (3, 5)`, plain-text `(-inf,2] U (3,5)` and number-line widget state. |
| `set` | roster of canonical elements (numbers, ordered pairs, symbols) | set equality; order and duplicates ignored | Set-builder notation is not accepted as an answer (it is undecidable in general). The UI offers roster entry or Venn selection. |
| `ordering` | sequence of item ids | exact, or satisfies the author's partial-order constraints | — |
| `drag-drop` | mapping of item to target | equals any accepted mapping | — |
| `diagram` | widget `extractAnswer()` (e.g. list of forces with agent, direction, magnitude) | rule set: required elements present (angle ±5°, magnitude ±5% relative), no forbidden elements, and the net result matches | Each failed rule maps to a tag (e.g. `extraForceWithoutAgent` → `extra-force-of-motion`). |
| `reasoning` | free text ≤ 1,000 chars | **AI advisory only** (docs/09). Never part of mastery. Templates that include reasoning always pair it with an auto-checked part, and only that part is scored. | — |

### Validation boundaries

- **Input limits:** 500 characters per expression and AST depth ≤ 40. Allowed functions are on an allow-list per chapter (e.g. no `log` in Class 11 trigonometry). Variables are limited to those declared.
- **Time budget:** 150 ms per check in the worker. If exceeded, the result is `indeterminate`.
- **No code execution:** parsing produces data (MathJSON or mathjs nodes). There is no `eval` and no `Function`.
- **Domains are mandatory** for expression answers whose functions have restricted domains. The content validator rejects a template that omits one.
- **Known traps** (each has a regression test):
  - √(x²) vs x
  - log(x²) vs 2 log x
  - sin²x + cos²x vs 1
  - |x|/x vs sgn x
  - (x² − 1)/(x − 1) vs x + 1 (differ at x = 1)
  - tan x near π/2
  - 1e-12 vs 0
  - km/h vs m/s
  - °C differences vs K
  - `[1,2) ∪ [2,3]` vs `[1,3]`
  - `{1, 2, 2}` vs `{2, 1}`
  - 2x + 4y − 6 = 0 vs x + 2y = 3

### Tests required before any checker ships

1. **Table tests** for every row above: equivalent pairs, non-equivalent pairs, invalid inputs and the traps list.
2. **Property tests** (fast-check):
   - parse → print → parse round-trips;
   - sampling equivalence is symmetric;
   - `x` vs `x·(1+ε)` is rejected for ε > tolerance;
   - unit conversions round-trip.
3. **Template self-tests** (run by `content:validate` for **every** template and **50 seeds**):
   - the solver's answer passes the template's own checker;
   - every buggy solver's answer fails and produces the declared tags;
   - every distractor fails;
   - all constraints are satisfiable;
   - the solver output is finite and within author-declared sane ranges;
   - no `{{placeholder}}` is left unrendered;
   - every tag exists in the catalogue;
   - hint ladders have 2–3 levels and level 1–2 hints never contain the final numeric answer;
   - the worked solution and visual explanation exist;
   - widget config validates;
   - `nonDragAlternative` is present when any input is a drag.
4. **Golden seeds:** for each numeric template, 3 seeds with hand-verified expected answers are committed in the template's test file and reviewed by a human.

## 4. Content verification workflow (offline, developer-run)

There is no reviewer role in the app (U-11). Verification happens in the repository.

```mermaid
flowchart LR
  A[Author writes template<br/>or AI drafts variation] --> B[draft]
  B -->|npm run content:validate<br/>schema · solvers · 50 seeds · traps| C[auto-checked]
  C -->|npm run content:review<br/>local-only preview of every seed| D[in-review]
  D -->|reviewer approves:<br/>status, reviewedBy, reviewedAt,<br/>contentHash written| E[approved]
  E -->|git commit + PR| F[bundled in production build]
  E -->|edit to stem/answer/params| B
  E -->|withdrawn| G[retired]
```

**AI drafting** — `npm --prefix tools/content-drafting run draft -- --template <id> --count 5` (separate adult-only package, docs/09):

- Runs **on the developer's machine** and calls Gemini with a key from the developer's own shell environment, never the app's.
- Asks only for *new contexts, stems, distractor ideas and hint wording* for an existing human-authored template and solver.
- Writes results to `content/drafts/`, marked `origin: ai-draft` with the model id and prompt hash.
- Drafts never contain answer values. Answers always come from the solver.

**Gates:**

- The production build (`next build`) includes only `approved` templates whose stored `contentHash` matches their current content. If a referenced template is not approved or its hash differs, the build fails.
- The engine filters to `approved` at load, and a test asserts that a non-approved template can never be selected.
- `content/drafts/` and the review preview route are excluded from production builds.

**Ship rule for a chapter:** every skill has at least 2 approved templates at each difficulty that the selection rules can request (easy for remediation; medium and hard for main questions), plus a micro-lesson for each foundation the chapter's closure reaches. One Chocolate Problem is optional.
