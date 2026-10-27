# 10 · Privacy and data minimisation

**Not legal advice.** This document records engineering choices and the questions a qualified reviewer must answer before a public launch.

## What data exists and where

| Data | Where | Leaves the device? | Retention |
|---|---|---|---|
| Class (11/12/unset) | IndexedDB | no | until the student erases it |
| Progress: sessions, evidence, stack, flashcards, recommendations | IndexedDB | no | until erased; *Export* and *Erase everything* in Settings |
| Motion and voice preferences | IndexedDB | no | as above |
| Tutor/reasoning request (**only if student AI is enabled after review; off by default**): template id, version, seed, the student's attempts on **this question**, hint level, typed text (≤ 1,000 chars) | our server → the approved provider | only on an explicit student action, and only when enabled | Our server stores nothing. Provider retention to be assessed in the privacy review. |
| Voice audio (**only if enabled; off by default**) | browser → the approved provider using a short-lived grant | only while push-to-talk is active | Not stored by us. Provider retention to be assessed in the privacy review. |
| Server logs | host | — | route, status, latency, token counts only. **No bodies, no IPs beyond rate-limit memory.** |

**Not collected:** name, email, phone, school, age or birth date, location, device identifiers, contacts, analytics or advertising identifiers, cookies (none are needed in v1).

## Minimisation rules (enforced in code)

0. **Default: the student runtime sends nothing to any AI service.** Student AI is disabled and no vendor SDK is installed in the app (docs/09).
1. AI payloads carry **only the current question's context**. They contain no session history, no other chapters and no profile.
2. The class value is **never** sent to AI.
3. Typed student text is length-capped and sent only on an explicit action (Ask / Submit reasoning).
4. There is no persistent identifier. Rate limiting uses the IP in memory for 60 s.
5. Microphone access follows explicit opt-in, as in docs/09. Recording state is always visible, and the mic is released immediately afterwards.
6. **Offline drafting** (adults, developer machines) sends only template text and drafting prompts, never student data. Use a paid API tier for it: Google's terms say content sent to *unpaid* Gemini services may be used to improve products and read by human reviewers.

## Pre-launch privacy review (required gate)

A public launch is blocked until someone qualified signs off on each item and the outcome is recorded in `docs/decision-log.md`:

1. **Age and provider terms (OQ-1).** Before any student AI is enabled, confirm the chosen provider's terms permit use by an application likely to be accessed by under-18s. For example, the Gemini API Additional Terms (last updated 2026-04-28) prohibit this, which is why Gemini is limited to adult-only offline drafting.
2. **India DPDP Act 2023 and Rules.** Confirm current obligations and timelines with counsel, especially:
   - verifiable parental consent before processing a child's personal data;
   - the bar on tracking, behavioural monitoring and targeted advertising directed at children;
   - notices, grievance redressal and data-principal rights.

   Assess whether server-side AI processing of question context and voice counts as processing a child's personal data, and design consent accordingly.
3. **Privacy notice and in-app explanations:** a plain-language notice, the microphone explainer and the tutor explainer, written for students and parents.
4. **Data flows confirmed** against this document by inspecting network traffic in a production build.
5. **Security review:**
   - key handling, ephemeral token scope;
   - rate limits, CSP;
   - dependency audit;
   - logging configuration.
6. **Children's content safety:** a tutor red-team on off-topic, self-harm, abuse and personal-information prompts, with the expected refusals and redirections documented.
7. **Data subject rights in a browser-only model:** export and erase work, and the app explains that no copy exists on our servers.

None of this blocks the build phases: the student runtime uses no AI and keeps all progress on the device.
