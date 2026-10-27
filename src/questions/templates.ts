// Phase 1 diagnostic templates: one medium "where are you?" question per playable chapter, two variants each.
// Every number comes from a code solver; wrong-method ("buggy") solvers detect misconceptions.
// Status "in-review": authored and self-tested (tests/unit/templates.test.ts), awaiting human approval (D-043).
import { checkInterval, checkNumber, checkQuantity, checkSet, formatInterval, parseIntSet, parseInterval, parseNumber, parseQuantity, type Buggy, type Interval } from "./check";
import { rng } from "./rng";
import type { DiagnosticTemplate, QuestionInstance } from "./types";

export const fmt = (x: number, sig = 3) => {
  if (!Number.isFinite(x)) return x > 0 ? "∞" : "−∞";
  const s = Number(x.toPrecision(sig)).toString();
  return s.replace("-", "−");
};
const distinct = (correct: number, bugs: Buggy[]) =>
  bugs.filter((b, i) => Math.abs(b.value - correct) > 0.02 * Math.max(Math.abs(correct), 1) && bugs.findIndex((c) => Math.abs(c.value - b.value) < 1e-9) === i);
const quantityInterpret = (input: string) => {
  const q = parseQuantity(input);
  return q && q.dimension ? q.value : null;
};

// ---------------- Motion in a Straight Line ----------------
const kinArea: DiagnosticTemplate = {
  id: "kin.acceleration.m.vt-area",
  version: 1,
  chapterId: "kin",
  skillId: "kin.acceleration",
  generate(seed) {
    const r = rng(seed);
    const u = r.int(2, 9);
    const v = u + 2 * r.int(2, 7);
    const t = r.pick([4, 5, 6, 8, 10]);
    const s = ((u + v) / 2) * t;
    const buggy = distinct(s, [
      { value: v * t, tags: ["area-uses-final-velocity"] },
      { value: u * t, tags: ["area-ignores-acceleration"] },
      { value: ((v - u) * t) / 2, tags: ["area-misses-rectangle"] },
      { value: (v - u) / t, tags: ["slope-instead-of-area"] },
    ]);
    const q: QuestionInstance = {
      templateId: this.id, version: this.version, status: "in-review", chapterId: this.chapterId, skillId: this.skillId, difficulty: "medium", seed,
      stem: [
        `A cyclist's velocity rises steadily from ${u} m/s to ${v} m/s over ${t} s, as the velocity–time graph shows.`,
        `How far does the cyclist travel in those ${t} seconds?`,
      ],
      answerLabel: "Distance travelled",
      placeholder: "for example 42 m",
      inputMode: "text",
      check: (input) => checkQuantity(input, { value: s, dimension: "length", rel: 0.01, buggy }),
      interpret: quantityInterpret,
      hints: [
        "On a velocity–time graph, what does the area under the line stand for?",
        "Split the region under the line into a rectangle and a triangle.",
        `Rectangle: ${u} × ${t}. Triangle: ½ × (${v} − ${u}) × ${t}. Add them.`,
      ],
      feedback: {
        "area-uses-final-velocity": `${v} m/s × ${t} s assumes the cyclist moved at the final speed the whole time. The shaded rectangle shows the extra triangle you counted that the cyclist never covered.`,
        "area-ignores-acceleration": `${u} m/s × ${t} s is only the rectangle under the starting speed. The cyclist sped up, so the triangle on top counts too.`,
        "area-misses-rectangle": "That's only the triangle. The cyclist was already moving at the start, so the rectangle underneath counts as well.",
        "slope-instead-of-area": "That's the slope of the line (the acceleration). Distance is the area under a velocity–time graph, not its slope.",
        "dimension-mismatch": "Distance is a length. Check your unit.",
        generic: "Distance on a velocity–time graph is the area under the line. Which shapes make up that area?",
      },
      solution: [
        "Displacement equals the area under the velocity–time graph from 0 to t.",
        `Rectangle under the starting speed: ${u} m/s × ${t} s = ${fmt(u * t)} m.`,
        `Triangle for the gain in speed: ½ × (${v} − ${u}) m/s × ${t} s = ${fmt(((v - u) * t) / 2)} m.`,
        `Total distance: ${fmt(u * t)} + ${fmt(((v - u) * t) / 2)} = ${fmt(s)} m. This is the same as the average velocity (u + v)/2 × t.`,
      ],
      answerText: `${fmt(s)} m`,
      visual: { kind: "vt-graph", u, v, t },
      selfTest: { correct: [`${s} m`, `${s}m`, `${s / 1000} km`, `${s * 100} cm`, `${s} metres`], buggy: buggy.map((b) => ({ input: `${b.value} m`, tags: b.tags })).concat([{ input: `${s} s`, tags: ["dimension-mismatch"] }]) },
      flashcards: {
        "area-uses-final-velocity": { front: "Velocity rises from u to v in time t. Why isn't the distance v × t?", back: "The body was slower earlier. Distance is the area under the v–t line: rectangle u·t plus triangle ½(v − u)t." },
        "area-ignores-acceleration": { front: "Speeding up from u to v: is the distance u × t?", back: "No. That is only the rectangle. Add the triangle ½(v − u)t for the speed gained." },
        "area-misses-rectangle": { front: "Which shapes make up the area under a rising v–t line that starts at u > 0?", back: "A rectangle u·t under the starting speed plus a triangle ½(v − u)t on top." },
        "slope-instead-of-area": { front: "On a v–t graph, what do the slope and the area tell you?", back: "Slope = acceleration. Area under the line = displacement." },
        generic: { front: "How do you get distance from a velocity–time graph?", back: "Find the area under the line between the two times." },
      },
    };
    return q;
  },
};

const kinBraking: DiagnosticTemplate = {
  id: "kin.suvat.m.braking-distance",
  version: 1,
  chapterId: "kin",
  skillId: "kin.suvat",
  generate(seed) {
    const r = rng(seed);
    const u = 2 * r.int(6, 15);
    const a = r.pick([2, 2.5, 4, 5]);
    const s = (u * u) / (2 * a);
    const buggy = distinct(s, [
      { value: (u * u) / a, tags: ["missing-half"] },
      { value: u / (2 * a), tags: ["dropped-square"] },
      { value: u / a, tags: ["time-instead-of-distance"] },
    ]);
    return {
      templateId: this.id, version: this.version, status: "in-review", chapterId: this.chapterId, skillId: this.skillId, difficulty: "medium", seed,
      stem: [
        `A car moving at ${u} m/s brakes with a steady deceleration of ${fmt(a)} m/s².`,
        "How far does it travel from the moment the brakes are applied until it stops?",
      ],
      answerLabel: "Stopping distance",
      placeholder: "for example 30 m",
      inputMode: "text",
      check: (input) => checkQuantity(input, { value: s, dimension: "length", rel: 0.01, buggy }),
      interpret: quantityInterpret,
      hints: [
        "You know the starting speed, the final speed and the deceleration. Which equation links those three with distance and leaves out time?",
        "Use v² = u² − 2as, with v = 0 when the car stops.",
        `0 = ${u}² − 2 × ${fmt(a)} × s. Solve for s.`,
      ],
      feedback: {
        "missing-half": "That distance is twice too large. Moving at the starting speed for the whole stopping time over-counts. The car slows down, so its average speed is only half the starting speed.",
        "dropped-square": "The starting speed should be squared. Stopping distance grows with the square of speed.",
        "time-instead-of-distance": "That number is the stopping time (u ÷ a), not the distance.",
        "dimension-mismatch": "Distance is a length. Check your unit.",
        generic: "Try the equation that links speeds, deceleration and distance without time.",
      },
      solution: [
        "The car stops, so its final speed v = 0. Time isn't given, so use v² = u² − 2as.",
        `0 = ${u}² − 2 × ${fmt(a)} × s`,
        `s = ${u}² ÷ (2 × ${fmt(a)}) = ${fmt(u * u)} ÷ ${fmt(2 * a)} = ${fmt(s)} m.`,
        `Check: it stops after t = u/a = ${fmt(u / a)} s at an average speed of ${fmt(u / 2)} m/s, and ${fmt(u / 2)} × ${fmt(u / a)} = ${fmt(s)} m.`,
      ],
      answerText: `${fmt(s)} m`,
      visual: { kind: "braking", u, a },
      selfTest: { correct: [`${s} m`, `${s / 1000} km`], buggy: buggy.map((b) => ({ input: `${b.value} m`, tags: b.tags })).concat([{ input: `${s} m/s`, tags: ["dimension-mismatch"] }]) },
      flashcards: {
        "missing-half": { front: "Braking from u to rest: is the distance u × t?", back: "No. The speed falls steadily, so the average speed is u/2 and the distance is u²/(2a)." },
        "dropped-square": { front: "If a car's speed doubles, what happens to its stopping distance at the same deceleration?", back: "It becomes four times as large: s = u²/(2a)." },
        "time-instead-of-distance": { front: "What do u/a and u²/(2a) give for a car braking to rest?", back: "u/a is the stopping time; u²/(2a) is the stopping distance." },
        generic: { front: "Which equation gives stopping distance without the time?", back: "v² = u² − 2as with v = 0, so s = u²/(2a)." },
      },
    };
  },
};

// ---------------- Current Electricity ----------------
const curCurrent: DiagnosticTemplate = {
  id: "cur.emf.m.internal-resistance-current",
  version: 1,
  chapterId: "cur",
  skillId: "cur.emf",
  generate(seed) {
    const r0 = rng(seed);
    const E = r0.pick([6, 9, 12]);
    const r = r0.pick([0.5, 1, 1.5, 2]);
    const R = r0.int(2, 10);
    const I = E / (R + r);
    const buggy = distinct(I, [
      { value: E / R, tags: ["ignores-internal-resistance"] },
      { value: E / r, tags: ["only-internal-resistance"] },
    ]);
    return {
      templateId: this.id, version: this.version, status: "in-review", chapterId: this.chapterId, skillId: this.skillId, difficulty: "medium", seed,
      stem: [`A cell of emf ${E} V and internal resistance ${fmt(r)} Ω is connected across a ${R} Ω resistor.`, "What current flows in the circuit?"],
      answerLabel: "Current",
      placeholder: "for example 1.5 A",
      inputMode: "text",
      check: (input) => checkQuantity(input, { value: I, dimension: "current", rel: 0.01, buggy }),
      interpret: quantityInterpret,
      hints: [
        "The current has to pass through two resistances. Where is the second one?",
        "The internal resistance is in series with the external resistor.",
        `I = E ÷ (R + r) = ${E} ÷ (${R} + ${fmt(r)}).`,
      ],
      feedback: {
        "ignores-internal-resistance": "You divided by the external resistor only. The current also flows through the cell's own internal resistance, highlighted inside the cell.",
        "only-internal-resistance": "You used only the internal resistance. The current also passes through the external resistor.",
        "dimension-mismatch": "Current is measured in amperes. Check your unit.",
        generic: "Add up every resistance the current passes through, then divide the emf by the total.",
      },
      solution: [
        "The cell's internal resistance r and the external resistor R are in series.",
        `Total resistance = R + r = ${R} + ${fmt(r)} = ${fmt(R + r)} Ω.`,
        `I = E ÷ (R + r) = ${E} ÷ ${fmt(R + r)} = ${fmt(I)} A.`,
      ],
      answerText: `${fmt(I)} A`,
      visual: { kind: "circuit", E, r, R, showVoltmeter: false },
      selfTest: { correct: [`${I} A`, `${I * 1000} mA`, `${E}/${R + r} A`], buggy: buggy.map((b) => ({ input: `${b.value} A`, tags: b.tags })).concat([{ input: `${I} V`, tags: ["dimension-mismatch"] }]) },
      flashcards: {
        "ignores-internal-resistance": { front: "A cell has emf E and internal resistance r. What current flows through an external resistor R?", back: "I = E/(R + r). The internal resistance is in series with R." },
        "only-internal-resistance": { front: "When is the current E/r?", back: "Only when the terminals are shorted (R = 0). Otherwise I = E/(R + r)." },
        generic: { front: "Current from a real cell into a resistor R?", back: "I = E/(R + r)." },
      },
    };
  },
};

const curTerminal: DiagnosticTemplate = {
  id: "cur.emf.m.terminal-voltage",
  version: 1,
  chapterId: "cur",
  skillId: "cur.emf",
  generate(seed) {
    const r0 = rng(seed);
    const E = r0.pick([6, 9, 12]);
    const r = r0.pick([0.5, 1, 1.5, 2]);
    const R = r0.int(3, 10);
    const V = (E * R) / (R + r);
    const buggy = distinct(V, [
      { value: E, tags: ["terminal-equals-emf"] },
      { value: (E * r) / (R + r), tags: ["drop-across-internal"] },
      { value: E + (E * r) / (R + r), tags: ["added-internal-drop"] },
    ]);
    return {
      templateId: this.id, version: this.version, status: "in-review", chapterId: this.chapterId, skillId: this.skillId, difficulty: "medium", seed,
      stem: [
        `A cell of emf ${E} V and internal resistance ${fmt(r)} Ω drives current through a ${R} Ω resistor.`,
        "What does a voltmeter connected across the cell's terminals read?",
      ],
      answerLabel: "Terminal voltage",
      placeholder: "for example 8.4 V",
      inputMode: "text",
      check: (input) => checkQuantity(input, { value: V, dimension: "voltage", rel: 0.01, buggy }),
      interpret: quantityInterpret,
      hints: [
        "Is the voltmeter's reading the full emf while current flows? What happens inside the cell?",
        "Find the current first, then subtract the voltage lost across the internal resistance: V = E − Ir.",
        `I = ${E} ÷ (${R} + ${fmt(r)}). Then V = ${E} − I × ${fmt(r)}.`,
      ],
      feedback: {
        "terminal-equals-emf": "The emf is the reading only when no current flows. With current flowing, some voltage is used up inside the cell. Watch the potential drop across r.",
        "drop-across-internal": "That is the voltage lost inside the cell (Ir). The voltmeter reads what is left: E − Ir.",
        "added-internal-drop": "The internal drop should be subtracted from the emf, not added. Potential falls across every resistance the current passes through.",
        "dimension-mismatch": "A voltmeter reads volts. Check your unit.",
        generic: "Find the current, then subtract the drop across the internal resistance from the emf.",
      },
      solution: [
        `Current: I = E ÷ (R + r) = ${E} ÷ ${fmt(R + r)} = ${fmt(E / (R + r))} A.`,
        `Voltage lost inside the cell: Ir = ${fmt(E / (R + r))} × ${fmt(r)} = ${fmt((E * r) / (R + r))} V.`,
        `Terminal voltage: V = E − Ir = ${E} − ${fmt((E * r) / (R + r))} = ${fmt(V)} V. This equals IR across the external resistor.`,
      ],
      answerText: `${fmt(V)} V`,
      visual: { kind: "circuit", E, r, R, showVoltmeter: true },
      selfTest: { correct: [`${V} V`, `${V * 1000} mV`, `${V} volts`], buggy: buggy.map((b) => ({ input: `${b.value} V`, tags: b.tags })).concat([{ input: `${V} A`, tags: ["dimension-mismatch"] }]) },
      flashcards: {
        "terminal-equals-emf": { front: "When does a voltmeter across a cell read its full emf?", back: "Only when no current flows. Otherwise it reads V = E − Ir." },
        "drop-across-internal": { front: "What is Ir for a cell delivering current I?", back: "The voltage lost inside the cell. The terminal voltage is E − Ir." },
        "added-internal-drop": { front: "Terminal voltage of a cell delivering current: E + Ir or E − Ir?", back: "E − Ir (while the cell is discharging)." },
        generic: { front: "Terminal voltage of a cell with internal resistance r supplying current I?", back: "V = E − Ir = IR." },
      },
    };
  },
};

// ---------------- Sets ----------------
const setOps: DiagnosticTemplate = {
  id: "set.operations.m.difference-intersection",
  version: 1,
  chapterId: "set",
  skillId: "set.operations",
  generate(seed) {
    const r = rng(seed);
    const U = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let A: number[] = [], B: number[] = [];
    for (let guard = 0; guard < 200; guard++) {
      A = U.filter(() => r.next() < 0.45);
      B = U.filter(() => r.next() < 0.45);
      const both = A.filter((x) => B.includes(x));
      if (A.length >= 3 && A.length <= 6 && B.length >= 3 && B.length <= 6 && both.length >= 1 && both.length < Math.min(A.length, B.length)) break;
    }
    const op = r.pick(["difference", "intersection"] as const);
    const diff = (X: number[], Y: number[]) => X.filter((x) => !Y.includes(x));
    const inter = A.filter((x) => B.includes(x));
    const union = [...new Set([...A, ...B])].sort((a, b) => a - b);
    const answer = op === "difference" ? diff(A, B) : inter;
    const buggy =
      op === "difference"
        ? [
            { elements: diff(B, A), tags: ["difference-order-reversed"] },
            { elements: inter, tags: ["difference-vs-intersection"] },
            { elements: union, tags: ["union-instead"] },
            { elements: A, tags: ["difference-not-removed"] },
          ]
        : [
            { elements: union, tags: ["union-vs-intersection"] },
            { elements: diff(A, B), tags: ["difference-instead"] },
          ];
    const show = (xs: number[]) => (xs.length ? `{${xs.join(", ")}}` : "∅");
    const sym = op === "difference" ? "A − B" : "A ∩ B";
    return {
      templateId: this.id, version: this.version, status: "in-review", chapterId: this.chapterId, skillId: this.skillId, difficulty: "medium", seed,
      stem: [`Let A = ${show(A)} and B = ${show(B)}.`, `Write ${sym} in roster form.`],
      answerLabel: sym,
      placeholder: "for example {2, 5, 9}",
      inputMode: "text",
      check: (input) => checkSet(input, { elements: answer, buggy }),
      interpret: (input) => parseIntSet(input),
      hints:
        op === "difference"
          ? ["A − B keeps the elements of one set and removes the others. Which set do you start from?", "Start with A. Remove every element that is also in B.", `Cross out ${show(inter)} from A.`]
          : ["A ∩ B contains elements that satisfy a condition about both sets. Which condition?", "Keep only the elements that appear in A and in B.", "Look at the overlap of the two circles."],
      feedback: {
        "difference-order-reversed": "That's B − A: elements of B that are not in A. A − B starts from A.",
        "difference-vs-intersection": "That's the overlap, A ∩ B. A − B is what's left of A after removing the overlap.",
        "union-instead": "That's A ∪ B, everything in either set. A − B keeps only the part of A outside B.",
        "difference-not-removed": "That's all of A. Remove the elements that A shares with B.",
        "union-vs-intersection": "That's A ∪ B (in A or B). A ∩ B needs elements in A and B.",
        "difference-instead": "That's A − B. The intersection is the overlap: elements in both sets.",
        generic: "Place each element in the Venn diagram first, then read off the region you need.",
      },
      solution:
        op === "difference"
          ? [`Elements in both A and B: ${show(inter)}.`, `Remove them from A: ${show(A)} → ${show(answer)}.`, `A − B = ${show(answer)}.`]
          : [`Go through A = ${show(A)} and keep each element that is also in B.`, `A ∩ B = ${show(answer)}.`],
      answerText: show(answer),
      visual: { kind: "venn", A, B, U, op },
      selfTest: {
        correct: [show(answer), answer.join(", ") || "∅", show([...answer].reverse())],
        buggy: buggy.filter((b) => b.elements.join() !== answer.join()).map((b) => ({ input: show(b.elements), tags: b.tags })),
      },
      flashcards: {
        "difference-order-reversed": { front: "Is A − B the same as B − A?", back: "No. A − B: in A but not in B. B − A: in B but not in A." },
        "difference-vs-intersection": { front: "A − B vs A ∩ B?", back: "A ∩ B is the overlap. A − B is the part of A outside the overlap." },
        "union-instead": { front: "What does A − B contain?", back: "Only elements of A that are not in B." },
        "difference-not-removed": { front: "Forming A − B, what do you remove from A?", back: "Every element that A shares with B." },
        "union-vs-intersection": { front: "∪ or ∩: which means 'in both'?", back: "∩ (intersection) means in both; ∪ (union) means in either." },
        "difference-instead": { front: "A ∩ B in words?", back: "Elements belonging to A and to B." },
        generic: { front: "How do you read a set operation off a Venn diagram?", back: "Place every element in its region, then shade the region the operation describes." },
      },
    };
  },
};

const setIntervals: DiagnosticTemplate = {
  id: "set.intervals.m.inequality-to-interval",
  version: 1,
  chapterId: "set",
  skillId: "set.intervals",
  generate(seed) {
    const r = rng(seed);
    const a = r.int(-6, 4);
    const b = a + r.int(2, 7);
    const pattern = r.pick(["lt-le", "le-lt", "lt-lt", "le-le", "gt", "le-only"] as const);
    const target: Interval =
      pattern === "lt-le" ? { lo: a, hi: b, loClosed: false, hiClosed: true }
      : pattern === "le-lt" ? { lo: a, hi: b, loClosed: true, hiClosed: false }
      : pattern === "lt-lt" ? { lo: a, hi: b, loClosed: false, hiClosed: false }
      : pattern === "le-le" ? { lo: a, hi: b, loClosed: true, hiClosed: true }
      : pattern === "gt" ? { lo: a, hi: Infinity, loClosed: false, hiClosed: false }
      : { lo: -Infinity, hi: b, loClosed: false, hiClosed: true };
    const n = (x: number) => fmt(x);
    const cond =
      pattern === "gt" ? `x > ${n(a)}`
      : pattern === "le-only" ? `x ≤ ${n(b)}`
      : `${n(a)} ${pattern.startsWith("le") ? "≤" : "<"} x ${pattern.endsWith("le") ? "≤" : "<"} ${n(b)}`;
    return {
      templateId: this.id, version: this.version, status: "in-review", chapterId: this.chapterId, skillId: this.skillId, difficulty: "medium", seed,
      stem: [`Write the set {x ∈ ℝ : ${cond}} as an interval.`],
      answerLabel: "Interval",
      placeholder: "for example (−1, 4]",
      inputMode: "text",
      check: (input) => checkInterval(input, target),
      interpret: (input) => parseInterval(input),
      hints: [
        "Mark the endpoints on the number line. Is each endpoint included or not?",
        "Use [ or ] when the endpoint is included (≤ or ≥) and ( or ) when it is not (< or >).",
        "∞ is never included, so it always takes a round bracket.",
      ],
      feedback: {
        "open-closed-confusion": "The endpoints are right, but check which ones are included. ≤ and ≥ include the endpoint (square bracket); < and > don't (round bracket).",
        "infinity-closed": "∞ is not a number you can reach, so it can never be included. Use a round bracket next to it.",
        "wrong-endpoints": "Check the endpoints against the inequality. Each endpoint should be one of the numbers in the condition, or ±∞.",
        generic: "Mark the endpoints first, then decide on each bracket.",
      },
      solution: [
        `The condition is ${cond}.`,
        `Endpoints: ${n(target.lo)} (${target.loClosed ? "included" : "not included"}) and ${n(target.hi)} (${target.hiClosed ? "included" : "not included"}).`,
        `As an interval: ${formatInterval(target)}.`,
      ],
      answerText: formatInterval(target),
      visual: { kind: "number-line", target },
      selfTest: {
        correct: [formatInterval(target), formatInterval(target).replace(/−/g, "-").replace("∞", "inf")],
        buggy: [
          ...(Number.isFinite(target.lo) && Number.isFinite(target.hi) ? [{ input: formatInterval({ ...target, loClosed: !target.loClosed }), tags: ["open-closed-confusion"] }] : []),
          ...(target.hi === Infinity ? [{ input: formatInterval(target).replace(")", "]"), tags: ["infinity-closed"] }] : []),
          { input: formatInterval({ ...target, lo: Number.isFinite(target.lo) ? target.lo - 1 : target.lo, hi: Number.isFinite(target.hi) ? target.hi + 1 : target.hi }), tags: ["wrong-endpoints"] },
        ],
      },
      flashcards: {
        "open-closed-confusion": { front: "Which bracket goes with ≤ and which with <?", back: "≤ or ≥ → square bracket [ ]; < or > → round bracket ( )." },
        "infinity-closed": { front: "Can an interval be written [3, ∞]?", back: "No. ∞ is never included: write [3, ∞)." },
        "wrong-endpoints": { front: "Where do an interval's endpoints come from?", back: "From the numbers in the inequality, or ±∞ when one side is unbounded." },
        generic: { front: "Convert a < x ≤ b to interval notation.", back: "(a, b]" },
      },
    };
  },
};

// ---------------- Vector Algebra ----------------
const vecDot: DiagnosticTemplate = {
  id: "vec.dot-product.m.components-2d",
  version: 1,
  chapterId: "vec",
  skillId: "vec.dot-product",
  generate(seed) {
    const r = rng(seed);
    const nz = () => { let x = 0; while (x === 0) x = r.int(-5, 6); return x; };
    let a: [number, number] = [nz(), nz()], b: [number, number] = [nz(), nz()];
    for (let g = 0; g < 100 && a[0] * b[0] + a[1] * b[1] === a[0] * b[1] + a[1] * b[0]; g++) b = [nz(), nz()];
    const dot = a[0] * b[0] + a[1] * b[1];
    const buggy = distinct(dot, [
      { value: a[0] * b[1] + a[1] * b[0], tags: ["cross-multiplied-components"] },
      { value: Math.hypot(...a) * Math.hypot(...b), tags: ["ignored-angle"] },
      { value: a[0] * b[0], tags: ["dropped-j-term"] },
    ]);
    const vecStr = (v: [number, number]) => `${fmt(v[0])} î ${v[1] < 0 ? "−" : "+"} ${fmt(Math.abs(v[1]))} ĵ`;
    return {
      templateId: this.id, version: this.version, status: "in-review", chapterId: this.chapterId, skillId: this.skillId, difficulty: "medium", seed,
      stem: [`Let a = ${vecStr(a)} and b = ${vecStr(b)}.`, "Find the scalar product a · b."],
      answerLabel: "a · b",
      placeholder: "a number, for example −7",
      inputMode: "text",
      check: (input) => checkNumber(input, { value: dot, rel: 1e-9, buggy }),
      interpret: (input) => parseNumber(input),
      hints: [
        "The scalar product pairs up matching components. Which component of a goes with which component of b?",
        "Multiply x with x and y with y, then add: a·b = a₁b₁ + a₂b₂.",
        `(${fmt(a[0])})(${fmt(b[0])}) + (${fmt(a[1])})(${fmt(b[1])})`,
      ],
      feedback: {
        "cross-multiplied-components": "You multiplied x with y. The scalar product pairs î with î and ĵ with ĵ, because î·ĵ = 0.",
        "ignored-angle": "|a||b| is the scalar product only when the vectors point the same way. In general it is |a||b|cos θ, which the components give directly.",
        "dropped-j-term": "That's only the î part. Add the ĵ part too.",
        generic: "Pair matching components, multiply each pair, then add.",
      },
      solution: [
        "a·b = a₁b₁ + a₂b₂, because î·î = ĵ·ĵ = 1 and î·ĵ = 0.",
        `= (${fmt(a[0])})(${fmt(b[0])}) + (${fmt(a[1])})(${fmt(b[1])}) = ${fmt(a[0] * b[0])} + ${fmt(a[1] * b[1])}`,
        `= ${fmt(dot)}. Geometrically, that is |b| times the projection of a onto b.`,
      ],
      answerText: fmt(dot),
      visual: { kind: "vector-grid", a, b },
      selfTest: { correct: [String(dot), `${a[0]}*${b[0]} + ${a[1]}*(${b[1]})`], buggy: buggy.map((x) => ({ input: String(x.value), tags: x.tags })) },
      flashcards: {
        "cross-multiplied-components": { front: "a = a₁î + a₂ĵ, b = b₁î + b₂ĵ. What is a·b?", back: "a₁b₁ + a₂b₂ (matching components), because î·ĵ = 0." },
        "ignored-angle": { front: "Is a·b = |a||b| always?", back: "No: a·b = |a||b|cos θ. It equals |a||b| only when θ = 0." },
        "dropped-j-term": { front: "How many terms does a·b have for 2-D vectors?", back: "Two: a₁b₁ + a₂b₂." },
        generic: { front: "Scalar product from components?", back: "Multiply matching components and add." },
      },
    };
  },
};

const vecMagnitude: DiagnosticTemplate = {
  id: "vec.basics.m.magnitude-3d",
  version: 1,
  chapterId: "vec",
  skillId: "vec.basics",
  generate(seed) {
    const rr = rng(seed);
    const sgn = () => (rr.next() < 0.3 ? -1 : 1);
    const p = sgn() * rr.int(1, 6), q = sgn() * rr.int(1, 6), r = sgn() * rr.int(1, 6);
    const ss = p * p + q * q + r * r;
    const mag = Math.sqrt(ss);
    const buggy = distinct(mag, [
      { value: Math.abs(p) + Math.abs(q) + Math.abs(r), tags: ["added-components"] },
      { value: p + q + r, tags: ["added-components"] },
      { value: ss, tags: ["forgot-square-root"] },
      { value: Math.sqrt(p * p + q * q), tags: ["missed-k-component"] },
    ]);
    const term = (c: number, u: string, first: boolean) => `${first ? (c < 0 ? "−" : "") : c < 0 ? " − " : " + "}${Math.abs(c) === 1 ? "" : Math.abs(c)}${u}`;
    const exact = Number.isInteger(mag) ? `${mag}` : `√${ss}`;
    return {
      templateId: this.id, version: this.version, status: "in-review", chapterId: this.chapterId, skillId: this.skillId, difficulty: "medium", seed,
      stem: [`Find the magnitude of a = ${term(p, "î", true)}${term(q, "ĵ", false)}${term(r, "k̂", false)}.`, "Give an exact value (for example √29) or a decimal to 2 places."],
      answerLabel: "|a|",
      placeholder: "for example √29",
      inputMode: "text",
      check: (input) => checkNumber(input, { value: mag, rel: 0.005, buggy }),
      interpret: (input) => parseNumber(input),
      hints: [
        "Picture the vector as the diagonal of a box with sides along x, y and z.",
        "Use Pythagoras twice: across the base, then up to the opposite corner.",
        `|a| = √(${p}² + ${q}² + ${r}²)`.replace(/-/g, "−"),
      ],
      feedback: {
        "added-components": "Lengths along perpendicular directions don't add directly. Use Pythagoras: square them, add, then take the square root.",
        "forgot-square-root": "That's |a|², the sum of the squares. Take its square root.",
        "missed-k-component": "That's the diagonal across the base only. Include the k̂ component to reach the far corner.",
        generic: "Treat the vector as a box diagonal and use Pythagoras in three dimensions.",
      },
      solution: [
        `Across the base: √(${p}² + ${q}²) = √${p * p + q * q}.`.replace(/-/g, "−"),
        `Up to the far corner: |a| = √(${p * p + q * q} + ${r * r}) = √${ss}.`,
        `|a| = ${exact}${Number.isInteger(mag) ? "" : ` ≈ ${mag.toFixed(2)}`}.`,
      ],
      answerText: Number.isInteger(mag) ? `${mag}` : `√${ss} ≈ ${mag.toFixed(2)}`,
      visual: { kind: "box-diagonal", p, q, r },
      selfTest: { correct: [exact, `sqrt(${ss})`, mag.toFixed(2), `√((${p})^2 + (${q})^2 + (${r})^2)`], buggy: buggy.map((x) => ({ input: String(x.value), tags: x.tags })) },
      flashcards: {
        "added-components": { front: "Is |3î + 4ĵ| equal to 7?", back: "No. It is √(3² + 4²) = 5. Perpendicular components combine by Pythagoras." },
        "forgot-square-root": { front: "a₁² + a₂² + a₃² equals what?", back: "|a|². Take the square root for |a|." },
        "missed-k-component": { front: "Magnitude of a₁î + a₂ĵ + a₃k̂?", back: "√(a₁² + a₂² + a₃²): all three components." },
        generic: { front: "How do you find a 3-D vector's magnitude?", back: "√(a₁² + a₂² + a₃²): Pythagoras twice." },
      },
    };
  },
};

export const TEMPLATES: readonly DiagnosticTemplate[] = [kinArea, kinBraking, curCurrent, curTerminal, setOps, setIntervals, vecDot, vecMagnitude];
/** Chapters with real diagnostic questions in Phase 1. Every other chapter is labelled "Preview only". */
export const PLAYABLE_CHAPTERS: ReadonlySet<string> = new Set(TEMPLATES.map((t) => t.chapterId));
export const templatesFor = (chapterId: string) => TEMPLATES.filter((t) => t.chapterId === chapterId);
export function pickQuestion(chapterId: string, seed: number): QuestionInstance {
  const ts = templatesFor(chapterId);
  if (!ts.length) throw new Error(`No diagnostic templates for ${chapterId}`);
  return ts[seed % ts.length]!.generate(seed);
}
