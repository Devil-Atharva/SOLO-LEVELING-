# 09 · AI features and voice tutor architecture

**Status (revised 2026-10-27, U-14):**

- Student-facing AI is **provider-independent and disabled by default**.
- The student runtime contains **no Gemini calls and no AI vendor SDK**.
- The only planned use of Gemini is the **adult-only, offline content-drafting tool**. It lives in a separate package and is never part of the app.

## Two separate systems

| | Student runtime (the app) | Offline content drafting (developer tool) |
|---|---|---|
| Who uses it | Students (most under 18) | Adult developers and content reviewers on their own machines |
| Where the code lives | `app/`, `src/` | `tools/content-drafting/`, a separate package with its own `package.json` and lockfile |
| AI by default | **Off.** Help shows authored hints and visual cues only | On when the developer sets a key in their own shell environment |
| Vendor | None. Uses a provider-neutral contract; no adapter ships until a provider is chosen after legal review (OQ-1) | Gemini via `@google/genai` (any vendor could be swapped in) |
| Network calls to AI | None unless `STUDENT_AI_ENABLED=true` **and** an approved adapter is installed | Yes, from the developer's machine |
| Output | Help text on screen; never scores, never mastery | JSON drafts in `content/drafts/`, which must pass validation and human approval (docs/05) |

### How separation is enforced

- `tools/content-drafting/` is **not** a workspace dependency of the app. ESLint `no-restricted-imports` forbids `app/` and `src/` from importing anything under `tools/`.
- The app's `package.json` must not list any AI vendor SDK. A CI check fails if `@google/genai`, `openai`, `@anthropic-ai/sdk` or similar appear in the app's dependency tree.
- A CI check greps the production bundle and server output for AI vendor hosts (for example `generativelanguage.googleapis.com`) and for `GEMINI_`. The build fails on a match.
- CSP `connect-src 'self'` stays in place. Adding an AI host requires both the feature flag and an approved adapter, and the change is recorded in the decision log.

## Student runtime: provider-neutral contract (disabled by default)

```ts
// src/tutor/contract.ts — no vendor types, no network code
export interface TutorContext {            // built server-side from bundled content ids
  templateId: string; version: number; seedIndex: number;
  attempts: { answer: string; tags: string[] }[];
  hintLevelSeen: 0 | 1 | 2 | 3;
}
export interface TutorProvider {
  readonly id: string;                     // "authored-hints" | an approved adapter id
  readonly capabilities: { text: boolean; reasoningFeedback: boolean; voice: boolean };
  tutorTurn(ctx: TutorContext, history: Turn[], message?: string): AsyncIterable<string>;
  reasoningFeedback?(ctx: TutorContext, reasoning: string): Promise<ReasoningFeedback>; // advisory only
  createVoiceSession?(ctx: TutorContext): Promise<VoiceSessionGrant>;
}
export interface VoiceSessionGrant {       // transport-neutral: WebRTC or WebSocket
  transport: "webrtc" | "websocket";
  endpoint: string;
  credential: string;                      // short-lived, single-use, scoped; never a long-lived key
  expiresAt: string;
  tools: ("show_hint" | "highlight")[];    // the only actions a voice tutor may trigger
}
```

**Shipped implementation:**

- **`AuthoredHintsProvider`** gives the authored 3-level hint ladder with widget cues. It has no network access and is always available.
- Selected when `STUDENT_AI_ENABLED` is unset or `false`, which is the default, or when `STUDENT_AI_PROVIDER=none`.

**Server routes** (`/api/tutor/turn`, `/api/tutor/reasoning`, `/api/tutor/voice-session`):

- **Not registered** unless `STUDENT_AI_ENABLED=true` and `STUDENT_AI_PROVIDER` names an installed, approved adapter. Otherwise they return `404`.
- The UI asks `/api/features` (booleans only) and hides AI entry points when AI is disabled. The student never sees a broken or simulated tutor.

**Adding a provider later:**

1. An adapter in `src/tutor/adapters/<provider>.ts` implements `TutorProvider`.
2. It must pass the **conformance suite** (`tests/tutor-conformance/`). The suite runs against recorded fixtures and checks:
   - streaming;
   - the answer-leak filter;
   - refusal of off-topic requests;
   - schema-valid reasoning feedback;
   - voice credential scope and expiry;
   - timeouts, 429s and malformed output.
3. Enabling it in production also requires the privacy gate (docs/10) and an OQ-1 decision entry.

**Rules that hold for any provider:**

- **Server-built prompts.** The client sends ids, the seed, the student's attempts on the current question and typed text (≤ 1,000 chars). The server builds the prompt from reviewed content.
- **No final answer below hint level 3.** A server-side filter checks every outgoing sentence against the solver's value (unit-converted, within tolerance).
- **AI never scores.** `aiGradedItemsCount: false`. Reasoning feedback is shown as advisory suggestions and is hidden when the provider's confidence is below 0.6.
- **No long-lived credentials in the browser.** Voice uses a short-lived, single-use, scoped grant from the server.
- **Microphone:**
  - explicit opt-in after an explainer;
  - push-to-talk by default;
  - visible recording state (icon, text and timer);
  - released on close, after 60 s of silence, or after 10 min;
  - no audio or transcripts stored.
- **Complete text fallback:** if voice is unavailable or denied, the same help is available as text or authored hints.

### Voice flow (provider-neutral; only active when enabled)

```mermaid
sequenceDiagram
  participant S as Student
  participant UI as Browser (Help drawer)
  participant API as /api/tutor/voice-session
  participant P as Approved voice provider
  S->>UI: taps "Talk it through" (only visible if enabled)
  UI->>S: explainer: what is sent, nothing stored, push-to-talk
  S->>UI: "Allow microphone"
  UI->>UI: getUserMedia (browser permission prompt)
  UI->>API: question ids, seed, attempts, hint level
  API->>P: request short-lived scoped grant (provider adapter)
  API-->>UI: VoiceSessionGrant (transport, endpoint, credential, expiry)
  loop push-to-talk turns
    UI->>P: audio via grant (WebRTC/WebSocket)
    P-->>UI: audio + captions; optional show_hint / highlight
    UI->>UI: runs the same authored widget cues
  end
  S->>UI: ends or closes drawer → transport closed, mic released
```

## Offline content drafting (adult developers only)

- `npm --prefix tools/content-drafting run draft -- --template <id> --count 5`
  - Reads `GEMINI_API_KEY` from the **developer's shell environment**. It is never committed, never placed in the app's environment, and never pasted into chat.
  - Asks only for new contexts, stems, distractor ideas and hint wording for an existing human-authored template and solver.
  - Writes `content/drafts/*.json` with `origin: ai-draft`, the model id and the prompt hash.
  - **Never** produces answer values: answers come from code solvers.
- `npm --prefix tools/content-drafting run verify` makes one live call and checks the output schema. It is used once you set the key on your machine.
- Drafts enter the normal workflow (docs/05 §4): automated checks → developer review → `approved`. Only approved templates with a matching content hash are bundled into the app.
- The tool is for adults. It runs no student-facing service and processes no student data.
