"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getChapter, skillById, viewOfChapter } from "@/src/domain/curriculum";
import type { AttemptRecord } from "@/src/domain/progress";
import { progressStore, useProgress } from "@/src/persistence/store";
import type { CheckResult } from "@/src/questions/check";
import { newSeed } from "@/src/questions/rng";
import { PLAYABLE_CHAPTERS, pickQuestion } from "@/src/questions/templates";
import type { Cue } from "@/src/questions/types";
import { applyStoredMotionSetting, useMotion } from "../motion";
import { Visual, visualCaption } from "./visuals";

const MAX_TRIES = 3; // initial answer + two retries (U-05)
type Phase = "answering" | "correct" | "exhausted";

export function DiagnosticQuestion({ chapterId }: { chapterId: string }) {
  const chapter = getChapter(chapterId);
  const view = viewOfChapter(chapterId);
  const playable = PLAYABLE_CHAPTERS.has(chapterId);
  const backHref = `/?view=${view.id}&chapter=${chapterId}`;
  useProgress(); // keeps the store warm for the return to the map
  const { reduced } = useMotion();
  const [seed, setSeed] = useState<number | null>(null);

  // keep the same question across refreshes in this tab; "Try another question" draws a new one
  useEffect(() => {
    applyStoredMotionSetting();
    const key = `noesis:q:${chapterId}`;
    let s: number | null = null;
    try { s = Number(sessionStorage.getItem(key)) || null; } catch { /* no storage */ }
    if (!s) { s = newSeed(); try { sessionStorage.setItem(key, String(s)); } catch { /* ignore */ } }
    setSeed(s);
  }, [chapterId]);

  if (!playable) {
    return (
      <main className="qshell">
        <div className="qbar"><Link className="btn btn--quiet" href={backHref}>← Back to map</Link></div>
        <section className="qprompt">
          <h1>{chapter.title}</h1>
          <p>Questions for this chapter arrive in a later phase. Its skills and prerequisites are on the map.</p>
          <Link className="btn btn--primary" href={backHref}>Back to the map</Link>
        </section>
      </main>
    );
  }
  if (seed === null) return <main className="qshell" aria-busy="true" />;
  return (
    <QuestionRun
      key={seed}
      chapterId={chapterId}
      seed={seed}
      reduced={reduced}
      backHref={backHref}
      onAnother={() => {
        const s = newSeed();
        try { sessionStorage.setItem(`noesis:q:${chapterId}`, String(s)); } catch { /* ignore */ }
        setSeed(s);
      }}
    />
  );
}

function QuestionRun({ chapterId, seed, reduced, backHref, onAnother }: { chapterId: string; seed: number; reduced: boolean; backHref: string; onAnother(): void }) {
  const q = useMemo(() => pickQuestion(chapterId, seed), [chapterId, seed]);
  const chapter = getChapter(chapterId);
  const skill = skillById.get(q.skillId)!;
  const [input, setInput] = useState("");
  const [tries, setTries] = useState<{ input: string; result: CheckResult }[]>([]);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [hints, setHints] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [cue, setCue] = useState<Cue>({ type: "idle" });
  const [solStep, setSolStep] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(Date.now());

  const wrong = tries.filter((t) => t.result.status === "incorrect");
  const last = tries[tries.length - 1];

  const record = async (final: Phase, all: typeof tries) => {
    const wrongTags = [...new Set(all.flatMap((t) => (t.result.status === "incorrect" ? t.result.tags : [])))];
    const outcome: AttemptRecord["outcome"] = final === "exhausted" ? "exhausted" : all.length === 1 && hints === 0 ? "independent" : "assisted";
    const cardTags = wrongTags.filter((t) => q.flashcards[t]);
    if (final === "exhausted" && cardTags.length === 0) cardTags.push("generic");
    const now = Date.now();
    await progressStore.recordAttempt(
      {
        id: `${q.templateId}@${q.version}:${seed}:${startedAt.current}`,
        at: now,
        chapterId: q.chapterId,
        skillId: q.skillId,
        templateId: `${q.templateId}@${q.version}`,
        seed,
        difficulty: q.difficulty,
        kind: "diagnostic",
        outcome,
        attemptsUsed: all.length,
        hintsUsed: hints,
        tags: wrongTags,
      },
      cardTags.map((tag) => ({ tag: `${q.skillId}:${tag}`, front: q.flashcards[tag]!.front, back: q.flashcards[tag]!.back })),
    );
    setSaved(true);
  };

  const submit = () => {
    if (phase !== "answering") return;
    const result = q.check(input);
    if (result.status === "invalid") {
      setInvalid(result.message);
      inputRef.current?.focus();
      return;
    }
    setInvalid(null);
    const all = [...tries, { input, result }];
    setTries(all);
    setCue({ type: "student", value: q.interpret(input), tags: result.status === "incorrect" ? result.tags : [] });
    if (result.status === "correct") {
      setPhase("correct");
      void record("correct", all);
    } else if (all.length >= MAX_TRIES) {
      setPhase("exhausted");
      void record("exhausted", all);
    } else {
      setInput("");
    }
    requestAnimationFrame(() => (result.status === "correct" || all.length >= MAX_TRIES ? resultRef.current?.focus() : inputRef.current?.focus()));
  };

  // worked solution: stepper bound to the visual; optional autoplay (never under reduced motion)
  useEffect(() => {
    if (solStep === null) return;
    setCue({ type: "solution", step: solStep });
  }, [solStep]);
  useEffect(() => {
    if (!autoplay || reduced || solStep === null) return;
    if (solStep >= q.solution.length - 1) { setAutoplay(false); return; }
    const id = window.setTimeout(() => setSolStep((s) => (s ?? 0) + 1), 2600);
    return () => window.clearTimeout(id);
  }, [autoplay, solStep, reduced, q.solution.length]);

  const done = phase !== "answering";
  const feedbackText =
    phase === "exhausted"
      ? "Step through the worked solution below. The visual follows each step, and a review card is saved for this idea."
      : last?.result.status === "incorrect"
      ? q.feedback[last.result.tags[0] ?? "generic"] ?? q.feedback.generic
      : last?.result.status === "correct"
        ? tries.length === 1 && hints === 0 ? "Correct, first try." : "Correct."
        : null;

  return (
    <main className="qshell">
      <div className="qbar">
        <Link className="btn btn--quiet" href={backHref} data-testid="back-to-map">← Back to map</Link>
        <nav className="crumbs" aria-label="Breadcrumb">
          <span>{viewOfChapter(chapterId).label}</span><span aria-hidden="true">›</span>
          <strong>{chapter.title}</strong><span aria-hidden="true">›</span>
          <span>{skill.title}</span>
        </nav>
      </div>
      <div className="qmain">
        <section className="qstage" aria-label="Interactive visual">
          <Visual spec={q.visual} cue={cue} reduced={reduced} />
          <p className="vis-caption" aria-live="polite" data-testid="visual-caption">{visualCaption(q.visual, cue)}</p>
        </section>
        <section className="qprompt" aria-labelledby="q-heading">
          <h1 id="q-heading">Diagnostic question · Medium</h1>
          <p className="preview-note">One question to see where you are. You can try it even if earlier chapters are new to you. Phase 1 question set, awaiting content review.</p>
          <div className="stem">{q.stem.map((p, i) => <p key={i}>{p}</p>)}</div>

          {!done && (
            <form className="answer-row" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <div className="field">
                <label htmlFor="answer">{q.answerLabel}</label>
                <input
                  id="answer"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setInvalid(null); }}
                  placeholder={q.placeholder}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-invalid={invalid ? true : undefined}
                  aria-describedby="answer-help tries"
                  data-testid="answer"
                />
              </div>
              <button className="btn btn--primary" type="submit" data-testid="check">Check</button>
            </form>
          )}
          {!done && (
            <div className="tries" id="tries" aria-live="polite">
              {Array.from({ length: MAX_TRIES }, (_, i) => <i key={i} data-used={i < wrong.length} aria-hidden="true" />)}
              <span>{MAX_TRIES - tries.length} {MAX_TRIES - tries.length === 1 ? "try" : "tries"} left</span>
            </div>
          )}
          <p id="answer-help" className="muted" style={{ margin: 0, fontSize: 14, color: invalid ? "var(--accent-coral)" : undefined }} role={invalid ? "alert" : undefined}>
            {invalid ?? (!done && /Distance|Current|voltage|distance/.test(q.answerLabel) ? "Include a unit." : "")}
          </p>

          {feedbackText && (
            <div className="feedback" data-kind={last?.result.status} role="status" tabIndex={-1} ref={resultRef} data-testid="feedback">
              <p><strong>{last?.result.status === "correct" ? "Right." : phase === "exhausted" ? "Not this time." : "Not quite."}</strong> {feedbackText}</p>
              {last?.result.status === "incorrect" && phase === "answering" && <p className="muted">The visual shows what your answer would mean. Try again, or open a hint.</p>}
              {done && <p>Answer: <strong>{q.answerText}</strong></p>}
            </div>
          )}

          {!done && (
            <div className="hints">
              {q.hints.slice(0, hints).map((h, i) => <p className="hint" key={i}><strong>Hint {i + 1}.</strong> {h}</p>)}
              {hints < 3 && (
                <button className="btn btn--quiet" style={{ justifySelf: "start" }} onClick={() => setHints((h) => h + 1)} data-testid="hint">
                  {hints === 0 ? "Help: show a hint" : hints === 2 ? "Show a stronger hint" : "Show another hint"}
                </button>
              )}
              {hints > 0 && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Hints count as learning progress, not as independent mastery.</p>}
            </div>
          )}

          {done && (
            <section aria-labelledby="sol-heading" style={{ display: "grid", gap: 10 }}>
              <h2 id="sol-heading" style={{ fontSize: 17, margin: 0 }}>Worked solution</h2>
              <ol className="steps">
                {q.solution.map((s, i) => (
                  <li key={i} data-active={solStep === i} data-future={solStep !== null && i > solStep}>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <div className="transport" role="group" aria-label="Worked solution controls">
                <button className="btn" onClick={() => setSolStep((s) => (s === null ? 0 : Math.max(0, s - 1)))} disabled={solStep === 0}>Previous step</button>
                <button className="btn" onClick={() => setSolStep((s) => (s === null ? 0 : Math.min(q.solution.length - 1, s + 1)))} disabled={solStep === q.solution.length - 1} data-testid="next-step">
                  {solStep === null ? "Show step 1 on the visual" : "Next step"}
                </button>
                {!reduced && (
                  <button className="btn btn--quiet" onClick={() => { setSolStep(0); setAutoplay(true); }}>{autoplay ? "Playing…" : "Play all steps"}</button>
                )}
                <button className="btn btn--quiet" onClick={() => { setAutoplay(false); setSolStep(null); setCue(tries.length ? { type: "student", value: q.interpret(tries[tries.length - 1]!.input), tags: last?.result.status === "incorrect" ? last.result.tags : [] } : { type: "idle" }); }}>
                  Back to my answer
                </button>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }} data-testid="saved-note">
                {saved ? (phase === "exhausted" ? "Saved. This chapter now shows Needs review on the map, and a review card is scheduled." : "Saved to your progress on this device.") : "Saving…"}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link className="btn btn--primary" href={backHref} data-testid="done-back">Back to the map</Link>
                <button className="btn" onClick={onAnother}>Try another question</button>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
