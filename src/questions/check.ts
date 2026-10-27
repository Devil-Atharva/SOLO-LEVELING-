// Phase 1 answer checkers for the diagnostic questions. Pure; no eval; bounded input.
// The full checking engine (Compute Engine, mathjs units, worker) arrives in Phase 2 (docs/05 §3).

export type CheckResult =
  | { status: "correct"; notes?: string[] }
  | { status: "incorrect"; tags: string[] }
  | { status: "invalid"; reason: "unparseable" | "missing-unit" | "unknown-unit" | "too-long" | "empty"; message: string };

const MAX_LEN = 120;

// ---------- safe arithmetic expression parser ----------
// grammar: expr = term (('+'|'-') term)* ; term = factor (('*'|'/'|implicit) factor)* ;
// factor = unary ('^' factor)? ; unary = ('-'|'+') unary | primary ; primary = number | 'pi' | sqrt primary | '(' expr ')'
export function parseNumber(src: string): number | null {
  const s = src.replace(/\s+/g, "").replace(/×|·/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/√/g, "sqrt");
  if (!s || s.length > MAX_LEN) return null;
  let i = 0;
  const peek = () => s[i];
  const eat = (t: string) => (s.startsWith(t, i) ? ((i += t.length), true) : false);
  let depth = 0;
  const expr = (): number => {
    let v = term();
    for (;;) {
      if (eat("+")) v += term();
      else if (eat("-")) v -= term();
      else return v;
    }
  };
  const term = (): number => {
    let v = factor();
    for (;;) {
      if (eat("*")) v *= factor();
      else if (eat("/")) v /= factor();
      else if (peek() !== undefined && /[0-9.(sp]/.test(peek()!)) v *= factor(); // implicit: 2sqrt3, 2(3)
      else return v;
    }
  };
  const factor = (): number => {
    const b = unary();
    if (eat("^") || eat("**")) return b ** factor();
    if (eat("²")) return b * b;
    return b;
  };
  const unary = (): number => (eat("-") ? -unary() : eat("+") ? unary() : primary());
  const primary = (): number => {
    if (++depth > 40) throw new Error("depth");
    try {
      if (eat("(")) {
        const v = expr();
        if (!eat(")")) throw new Error(")");
        return v;
      }
      if (eat("pi")) return Math.PI;
      if (eat("sqrt")) return Math.sqrt(primaryOrFactorAfterSqrt());
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (!m) throw new Error("number");
      i += m[0].length;
      return Number(m[0]);
    } finally {
      depth--;
    }
  };
  const primaryOrFactorAfterSqrt = (): number => primary();
  try {
    const v = expr();
    if (i !== s.length || !Number.isFinite(v)) return null;
    return v;
  } catch {
    return null;
  }
}

// ---------- units ----------
export type Dimension = "length" | "time" | "velocity" | "acceleration" | "current" | "voltage" | "resistance" | "force" | "energy";
const UNITS: Record<string, [Dimension, number]> = {
  m: ["length", 1], cm: ["length", 0.01], mm: ["length", 0.001], km: ["length", 1000],
  metre: ["length", 1], metres: ["length", 1], meter: ["length", 1], meters: ["length", 1],
  s: ["time", 1], sec: ["time", 1], secs: ["time", 1], second: ["time", 1], seconds: ["time", 1], ms: ["time", 0.001], min: ["time", 60],
  "m/s": ["velocity", 1], "ms^-1": ["velocity", 1], "ms-1": ["velocity", 1], "km/h": ["velocity", 1 / 3.6], kmph: ["velocity", 1 / 3.6], "km/hr": ["velocity", 1 / 3.6],
  "m/s^2": ["acceleration", 1], "m/s²": ["acceleration", 1], "ms^-2": ["acceleration", 1], "ms-2": ["acceleration", 1], "m/s/s": ["acceleration", 1],
  A: ["current", 1], amp: ["current", 1], amps: ["current", 1], ampere: ["current", 1], amperes: ["current", 1], mA: ["current", 0.001],
  V: ["voltage", 1], volt: ["voltage", 1], volts: ["voltage", 1], mV: ["voltage", 0.001], kV: ["voltage", 1000],
  "Ω": ["resistance", 1], ohm: ["resistance", 1], ohms: ["resistance", 1],
  N: ["force", 1], newton: ["force", 1], newtons: ["force", 1],
  J: ["energy", 1], joule: ["energy", 1], joules: ["energy", 1],
};
const UNIT_KEYS = Object.keys(UNITS).sort((a, b) => b.length - a.length);

/** Match a known unit at the end of the input; the rest must parse as a number. */
export function parseQuantity(input: string): { value: number; dimension: Dimension | null; unitKnown: boolean } | null {
  const raw = input.trim().replace(/−/g, "-");
  const compact = raw.replace(/\s+/g, "");
  const LOWER_OK = new Set(["V", "A", "N", "J"]);
  for (const key of UNIT_KEYS) {
    const exact = compact.endsWith(key);
    const loose = !exact && (key.length > 1 || LOWER_OK.has(key)) && compact.toLowerCase().endsWith(key.toLowerCase());
    if (!exact && !loose) continue;
    const value = parseNumber(compact.slice(0, compact.length - key.length));
    if (value === null) continue;
    const [dimension, factor] = UNITS[key]!;
    return { value: value * factor, dimension, unitKnown: true };
  }
  const bare = parseNumber(compact);
  if (bare !== null) return { value: bare, dimension: null, unitKnown: false };
  const tail = /([A-Za-zΩ°µμ][A-Za-z0-9Ωµμ/^\-²]*)$/.exec(compact);
  if (tail) {
    const value = parseNumber(compact.slice(0, compact.length - tail[1]!.length));
    if (value !== null) return { value, dimension: null, unitKnown: true };
  }
  return null;
}

const close = (a: number, b: number, rel: number) => Math.abs(a - b) <= rel * Math.max(Math.abs(b), 1e-12);

export interface Buggy { value: number; tags: string[] }

export function checkQuantity(input: string, spec: { value: number; dimension: Dimension; rel: number; buggy: Buggy[] }): CheckResult {
  if (!input.trim()) return { status: "invalid", reason: "empty", message: "Type an answer first." };
  if (input.length > MAX_LEN) return { status: "invalid", reason: "too-long", message: "That answer is too long." };
  const q = parseQuantity(input);
  if (!q) return { status: "invalid", reason: "unparseable", message: "Write a number followed by a unit, for example 12.5 m." };
  if (q.dimension === null)
    return q.unitKnown
      ? { status: "invalid", reason: "unknown-unit", message: "That unit isn't recognised. Try an SI unit such as m, s, A or V." }
      : { status: "invalid", reason: "missing-unit", message: "Add a unit to your answer. This doesn't use up a try." };
  if (q.dimension !== spec.dimension) return { status: "incorrect", tags: ["dimension-mismatch"] };
  if (close(q.value, spec.value, spec.rel)) return { status: "correct" };
  const hit = spec.buggy.find((b) => close(q.value, b.value, spec.rel));
  return { status: "incorrect", tags: hit ? hit.tags : [] };
}

export function checkNumber(input: string, spec: { value: number; rel: number; buggy: Buggy[] }): CheckResult {
  if (!input.trim()) return { status: "invalid", reason: "empty", message: "Type an answer first." };
  if (input.length > MAX_LEN) return { status: "invalid", reason: "too-long", message: "That answer is too long." };
  const v = parseNumber(input);
  if (v === null) return { status: "invalid", reason: "unparseable", message: "Enter a number or an exact form such as √29 or 3√2." };
  if (close(v, spec.value, spec.rel)) return { status: "correct" };
  const hit = spec.buggy.find((b) => close(v, b.value, spec.rel));
  return { status: "incorrect", tags: hit ? hit.tags : [] };
}

// ---------- sets (roster of integers) ----------
export function parseIntSet(input: string): number[] | null {
  const s = input.trim().replace(/−/g, "-");
  if (/^(∅|\{\s*\}|phi|empty)$/i.test(s)) return [];
  const inner = s.replace(/^\{/, "").replace(/\}$/, "");
  if (/[{}]/.test(inner)) return null;
  const parts = inner.split(/[,;\s]+/).filter(Boolean);
  const out: number[] = [];
  for (const p of parts) {
    if (!/^-?\d+$/.test(p)) return null;
    out.push(Number(p));
  }
  return [...new Set(out)].sort((a, b) => a - b);
}
const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function checkSet(input: string, spec: { elements: number[]; buggy: { elements: number[]; tags: string[] }[] }): CheckResult {
  if (!input.trim()) return { status: "invalid", reason: "empty", message: "Type a set, for example {1, 3, 5}, or ∅ for the empty set." };
  if (input.length > MAX_LEN) return { status: "invalid", reason: "too-long", message: "That answer is too long." };
  const got = parseIntSet(input);
  if (!got) return { status: "invalid", reason: "unparseable", message: "List the elements in braces, for example {1, 3, 5}." };
  const want = [...spec.elements].sort((a, b) => a - b);
  if (sameSet(got, want)) return { status: "correct" };
  const hit = spec.buggy.find((b) => sameSet(got, [...b.elements].sort((x, y) => x - y)));
  return { status: "incorrect", tags: hit ? hit.tags : [] };
}

// ---------- intervals (single interval) ----------
export interface Interval { lo: number; hi: number; loClosed: boolean; hiClosed: boolean }
export function parseInterval(input: string): Interval | null {
  const s = input.trim().replace(/\s+/g, "").replace(/−/g, "-").replace(/∞/g, "inf");
  const m = /^([[(])([^,]+),([^,]+)([\])])$/.exec(s);
  if (!m) return null;
  const end = (t: string) => (/^[+]?inf(inity)?$/i.test(t) ? Infinity : /^-inf(inity)?$/i.test(t) ? -Infinity : parseNumber(t));
  const lo = end(m[2]!), hi = end(m[3]!);
  if (lo === null || hi === null || !(lo < hi)) return null;
  return { lo, hi, loClosed: m[1] === "[", hiClosed: m[4] === "]" };
}
const showEnd = (x: number) => (x === Infinity ? "∞" : x === -Infinity ? "−∞" : String(x).replace("-", "−"));
export const formatInterval = (i: Interval) => `${i.loClosed ? "[" : "("}${showEnd(i.lo)}, ${showEnd(i.hi)}${i.hiClosed ? "]" : ")"}`;

export function checkInterval(input: string, spec: Interval): CheckResult {
  if (!input.trim()) return { status: "invalid", reason: "empty", message: "Type an interval, for example (2, 7]." };
  if (input.length > MAX_LEN) return { status: "invalid", reason: "too-long", message: "That answer is too long." };
  const got = parseInterval(input);
  if (!got) return { status: "invalid", reason: "unparseable", message: "Use interval notation: a bracket or parenthesis, two endpoints, a comma, for example [−1, 4)." };
  if ((got.lo === -Infinity && got.loClosed) || (got.hi === Infinity && got.hiClosed))
    return { status: "incorrect", tags: ["infinity-closed"] };
  const endsMatch = got.lo === spec.lo && got.hi === spec.hi;
  if (endsMatch && got.loClosed === spec.loClosed && got.hiClosed === spec.hiClosed) return { status: "correct" };
  if (endsMatch) return { status: "incorrect", tags: ["open-closed-confusion"] };
  return { status: "incorrect", tags: ["wrong-endpoints"] };
}
