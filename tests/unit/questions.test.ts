import { describe, expect, it } from "vitest";
import { checkInterval, checkNumber, checkQuantity, checkSet, parseInterval, parseNumber, parseQuantity } from "@/src/questions/check";
import { TEMPLATES, PLAYABLE_CHAPTERS, pickQuestion } from "@/src/questions/templates";
import { skillById } from "@/src/domain/curriculum";

describe("safe number parser", () => {
  it.each([
    ["42", 42], ["-3.5", -3.5], ["2^3", 8], ["√29", Math.sqrt(29)], ["3√2", 3 * Math.sqrt(2)], ["sqrt(16)", 4],
    ["2(3+1)", 8], ["12/7.5", 1.6], ["1e3", 1000], ["π", Math.PI], ["−4", -4], ["√(4^2 + 3^2)", 5], ["(-2)^2", 4],
  ])("%s = %d", (s, v) => expect(parseNumber(s)).toBeCloseTo(v, 9));
  it.each(["", "alert(1)", "2+", "((3)", "1/0", "x+1", "constructor", "(".repeat(60) + "1" + ")".repeat(60), "9".repeat(130)])("rejects %s", (s) =>
    expect(parseNumber(s)).toBeNull());
});

describe("quantities with units", () => {
  it("converts units to SI", () => {
    expect(parseQuantity("72 km/h")).toMatchObject({ value: 20, dimension: "velocity" });
    expect(parseQuantity("250mA")?.value).toBeCloseTo(0.25);
    expect(parseQuantity("1.2 km")).toMatchObject({ value: 1200, dimension: "length" });
    expect(parseQuantity("5 ms")).toMatchObject({ value: 0.005, dimension: "time" });
    expect(parseQuantity("9.8 m/s^2")).toMatchObject({ dimension: "acceleration" });
  });
  const spec = { value: 72, dimension: "length" as const, rel: 0.01, buggy: [{ value: 114, tags: ["area-uses-final-velocity"] }] };
  it("accepts within 1%", () => {
    expect(checkQuantity("72 m", spec).status).toBe("correct");
    expect(checkQuantity("72.5 m", spec).status).toBe("correct");
    expect(checkQuantity("7200 cm", spec).status).toBe("correct");
    expect(checkQuantity("73 m", spec).status).toBe("incorrect");
  });
  it("does not use a try for a missing or unknown unit", () => {
    expect(checkQuantity("72", spec)).toMatchObject({ status: "invalid", reason: "missing-unit" });
    expect(checkQuantity("72 furlongs", spec)).toMatchObject({ status: "invalid", reason: "unknown-unit" });
    expect(checkQuantity("", spec)).toMatchObject({ status: "invalid", reason: "empty" });
  });
  it("tags wrong dimensions and known wrong methods", () => {
    expect(checkQuantity("72 s", spec)).toEqual({ status: "incorrect", tags: ["dimension-mismatch"] });
    expect(checkQuantity("114 m", spec)).toEqual({ status: "incorrect", tags: ["area-uses-final-velocity"] });
  });
});

describe("sets and intervals", () => {
  it("compares sets ignoring order and duplicates", () => {
    const s = { elements: [1, 3, 5], buggy: [{ elements: [2], tags: ["x"] }] };
    expect(checkSet("{5, 1, 3, 3}", s).status).toBe("correct");
    expect(checkSet("1 3 5", s).status).toBe("correct");
    expect(checkSet("{2}", s)).toEqual({ status: "incorrect", tags: ["x"] });
    expect(checkSet("{a, b}", s).status).toBe("invalid");
    expect(checkSet("∅", { elements: [], buggy: [] }).status).toBe("correct");
  });
  it("parses and checks intervals", () => {
    expect(parseInterval("(−1, 4]")).toEqual({ lo: -1, hi: 4, loClosed: false, hiClosed: true });
    expect(parseInterval("[3, ∞)")).toMatchObject({ hi: Infinity });
    expect(parseInterval("(4, 1)")).toBeNull();
    const t = { lo: -1, hi: 4, loClosed: false, hiClosed: true };
    expect(checkInterval("(-1,4]", t).status).toBe("correct");
    expect(checkInterval("[-1,4]", t)).toEqual({ status: "incorrect", tags: ["open-closed-confusion"] });
    expect(checkInterval("(-1, inf]", { lo: -1, hi: Infinity, loClosed: false, hiClosed: false })).toEqual({ status: "incorrect", tags: ["infinity-closed"] });
    expect(checkInterval("1 to 4", t).status).toBe("invalid");
  });
  it("checks exact numeric answers", () => {
    expect(checkNumber("√29", { value: Math.sqrt(29), rel: 0.005, buggy: [] }).status).toBe("correct");
    expect(checkNumber("5.39", { value: Math.sqrt(29), rel: 0.005, buggy: [] }).status).toBe("correct");
    expect(checkNumber("5.3", { value: Math.sqrt(29), rel: 0.005, buggy: [] }).status).toBe("incorrect");
  });
});

describe("diagnostic template self-tests (200 seeds each)", () => {
  it("covers exactly one playable chapter per view", () => {
    expect([...PLAYABLE_CHAPTERS].sort()).toEqual(["cur", "kin", "set", "vec"]);
  });
  for (const t of TEMPLATES) {
    it(`${t.id}: solver answers pass, wrong methods are caught and tagged, content is complete`, () => {
      expect(skillById.get(t.skillId)?.chapter).toBe(t.chapterId);
      for (let seed = 1; seed <= 200; seed++) {
        const q = t.generate(seed * 7919);
        expect(q.status).toBe("in-review");
        const text = [...q.stem, ...q.hints, ...q.solution, q.answerText, ...Object.values(q.feedback)].join(" ");
        expect(text, `seed ${seed}`).not.toMatch(/undefined|NaN|Infinity|\{\{/);
        for (const c of q.selfTest.correct) expect(q.check(c).status, `seed ${seed}: correct input ${c}`).toBe("correct");
        for (const b of q.selfTest.buggy) {
          const r = q.check(b.input);
          expect(r.status, `seed ${seed}: buggy ${b.input}`).toBe("incorrect");
          if (r.status === "incorrect") for (const tag of b.tags) expect(r.tags, `seed ${seed}: ${b.input}`).toContain(tag);
          for (const tag of b.tags) expect(q.feedback[tag], `feedback for ${tag}`).toBeTruthy();
        }
        expect(q.hints).toHaveLength(3);
        expect(q.feedback.generic).toBeTruthy();
        expect(q.flashcards.generic).toBeTruthy();
        expect(q.solution.length).toBeGreaterThanOrEqual(2);
        // hints 1–2 never give the final value away
        for (const h of q.hints.slice(0, 2)) expect(h.includes(q.answerText)).toBe(false);
      }
    });
  }
  it("is deterministic per seed and alternates templates within a chapter", () => {
    expect(pickQuestion("kin", 42).stem).toEqual(pickQuestion("kin", 42).stem);
    expect(pickQuestion("kin", 42).templateId).not.toBe(pickQuestion("kin", 43).templateId);
  });
});
