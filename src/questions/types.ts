import type { CheckResult, Interval } from "./check";

/** Visual specs rendered by src/ui/question/visuals.tsx. Each responds to the student's answer and to cues. */
export type VisualSpec =
  | { kind: "vt-graph"; u: number; v: number; t: number }
  | { kind: "braking"; u: number; a: number }
  | { kind: "circuit"; E: number; r: number; R: number; showVoltmeter: boolean }
  | { kind: "venn"; A: number[]; B: number[]; U: number[]; op: "difference" | "intersection" | "union" }
  | { kind: "number-line"; target: Interval }
  | { kind: "vector-grid"; a: [number, number]; b: [number, number] }
  | { kind: "box-diagonal"; p: number; q: number; r: number };

/** What the visual should show right now. */
export type Cue =
  | { type: "idle" }
  | { type: "student"; value: unknown; tags: string[] } // consequence of the student's own answer
  | { type: "solution"; step: number }; // worked-solution step being shown

export interface QuestionInstance {
  templateId: string;
  version: number;
  status: "in-review"; // Phase 1 diagnostics: authored, self-tested, awaiting human approval (D-043)
  chapterId: string;
  skillId: string;
  difficulty: "medium";
  seed: number;
  stem: string[];
  answerLabel: string;
  placeholder: string;
  inputMode: "text" | "decimal";
  check(input: string): CheckResult;
  /** parsed student value for the visual (null if unparseable) */
  interpret(input: string): unknown;
  hints: [string, string, string];
  feedback: Record<string, string>; // by misconception tag, plus "generic"
  solution: string[]; // worked-solution steps; step i also drives the visual (Cue.solution)
  answerText: string;
  visual: VisualSpec;
  flashcards: Record<string, { front: string; back: string }>;
  /** Content self-test data (docs/05 §3): inputs a student could type that must be accepted, and inputs
   *  produced by each wrong method that must be rejected with the stated tags. Never shown to students. */
  selfTest: { correct: string[]; buggy: { input: string; tags: string[] }[] };
}

export interface DiagnosticTemplate {
  id: string;
  version: number;
  chapterId: string;
  skillId: string;
  generate(seed: number): QuestionInstance;
}
