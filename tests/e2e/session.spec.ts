// Representative adaptive-session journeys (docs/02): quick mastery (Straight Lines, reviewer preview),
// a misconception-driven detour and the return to the original question (Laws of Motion), and a
// foundation failure → Stuck → pause → exact resume (Motion in a Plane). The test reads which question
// is on screen from the browser's own IndexedDB and answers it through the ordinary, non-drag controls.
import { expect, test, type Page } from "@playwright/test";
import { entryById } from "@/src/content/catalog";
import { instantiate, SI_SYMBOL, type QuestionInstance } from "@/src/content/instantiate";
import type { CheckInput, CheckSpec, DiagramForce } from "@/src/checking/types";

interface OnScreen { sessionId: string; step: string; role?: string; templateId?: string; seed?: number; skillId?: string; frames: number; mains: number }

/** Test-only: read the newest unfinished session's top frame from IndexedDB. */
async function onScreen(page: Page): Promise<OnScreen> {
  return page.evaluate(() => new Promise<OnScreen>((resolve, reject) => {
    const req = indexedDB.open("noesis");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction("sessions");
      const all = tx.objectStore("sessions").getAll();
      all.onsuccess = () => {
        type S = { id: string; status: string; updatedAt: number; frames: { step: { kind: string; itemId?: string }; items: { id: string; role: string; templateId: string; seed: number; skillId: string; outcome?: string }[] }[] };
        const s = (all.result as S[]).sort((a, b) => b.updatedAt - a.updatedAt)[0]!;
        const f = s.frames[s.frames.length - 1]!;
        const it = f.step.kind === "question" ? f.items.find((i) => i.id === f.step.itemId) : undefined;
        resolve({ sessionId: s.id, step: f.step.kind, role: it?.role, templateId: it?.templateId, seed: it?.seed, skillId: it?.skillId, frames: s.frames.length, mains: s.frames[0]!.items.filter((i) => i.role === "main" && i.outcome).length });
      };
    };
  }));
}

const instOf = (o: OnScreen) => instantiate(entryById.get(o.templateId!)!.template, o.seed!);

async function enter(page: Page, inst: QuestionInstance, input: CheckInput) {
  switch (inst.format) {
    case "single-choice": await page.locator(`[data-testid=choices] input[value="${input as string}"]`).check(); return;
    case "multi-choice":
      for (const box of await page.locator("[data-testid=choices] input").all()) {
        const v = await box.getAttribute("value");
        if ((input as string[]).includes(v!)) await box.check(); else await box.uncheck();
      }
      return;
    case "ordering": {
      const want = input as string[];
      for (let i = 0; i < want.length; i++) {
        for (let guard = 0; guard < 6; guard++) {
          const items = await page.locator(".order-item").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")!.slice(6)));
          if (items.indexOf(want[i]!) <= i) break;
          await page.getByTestId(`order-${want[i]}`).getByRole("button", { name: /up$/ }).click();
        }
      }
      return;
    }
    case "mapping":
      for (const [item, target] of Object.entries(input as Record<string, string>)) await page.getByTestId(`map-select-${item}`).selectOption(target);
      return;
    case "diagram": {
      const forces = input as DiagramForce[];
      for (let i = 0; i < forces.length; i++) {
        const f = forces[i]!;
        await page.getByTestId("vb-add-kind").selectOption(f.kind);
        await page.getByTestId("vb-add-agent").selectOption(f.agent);
        await page.getByTestId("vb-add").click();
        await page.getByTestId(`vb-mag-v${i + 1}`).fill(String(Math.round(f.magnitude * 100) / 100));
        await page.getByTestId(`vb-ang-v${i + 1}`).fill(String(f.angleDeg));
      }
      return;
    }
    default: await page.getByTestId("answer-input").fill(input as string);
  }
}

/** A wrong answer: a recognised wrong method when the template has one, else a plainly wrong value. */
function wrong(inst: QuestionInstance, k = 0): CheckInput {
  const b = inst.selfTest.buggy;
  if (b.length) return b[k % b.length]!.input;
  const spec = inst.check as CheckSpec;
  if (spec.kind === "single-choice") return spec.options.find((o) => o.id !== spec.correct)!.id;
  if (spec.kind === "quantity") return `${Math.abs(spec.value) * 1.37 + 1} ${SI_SYMBOL[spec.dimension]}`;
  if (spec.kind === "number") return String(Math.abs(spec.value) * 1.37 + 1);
  throw new Error(`no wrong answer for ${inst.templateId}`);
}

async function answerCurrent(page: Page, how: "right" | "wrong" | "exhaust") {
  await expect(page.getByTestId("check")).toBeVisible();
  const o = await onScreen(page);
  const inst = instOf(o);
  const tries = how === "exhaust" ? 3 : 1;
  for (let k = 0; k < tries; k++) {
    if (inst.format === "diagram" && k > 0) await page.getByTestId("tr-reset").click();
    await enter(page, inst, how === "right" ? inst.selfTest.correct[0]! : wrong(inst, k));
    await page.getByTestId("check").click();
    if (how === "right") await expect(page.getByTestId("feedback-correct")).toBeVisible();
    else if (k < tries - 1) await expect(page.getByTestId("tries")).toContainText(`${2 - k} ${2 - k === 1 ? "try" : "tries"} left`);
  }
  if (how !== "wrong") {
    await expect(page.getByTestId("saved")).toContainText("Saved to this device");
    await page.getByTestId("continue").click();
  }
  return o;
}

async function startSession(page: Page, path: string, cls: "11" | "12") {
  await page.goto(path);
  await page.getByTestId(`class-${cls}`).click();
  await expect(page.getByTestId("role-label")).toContainText("Main question 1");
}

test.describe("adaptive sessions", () => {
  test("Journey 1 · quick mastery of Straight Lines in reviewer preview, with successors on the map", async ({ page }) => {
    await startSession(page, "/chapter/sl/try?preview=review", "12");
    await expect(page.getByTestId("preview-banner")).toBeVisible();
    const first = await onScreen(page);
    expect(first.skillId).toBe("sl.forms");
    expect(entryById.get(first.templateId!)!.template.difficulty).toBe("medium");
    const skills = new Set<string>();
    for (let q = 1; q <= 10; q++) {
      await expect(page.getByTestId("role-label")).toContainText(`Main question ${q}`);
      if (q === 2) await expect(page.getByTestId("role-label")).toContainText("hard");
      skills.add((await answerCurrent(page, "right")).skillId!);
    }
    expect(skills.size).toBe(5);
    await expect(page.getByTestId("summary")).toHaveAttribute("data-result", "mastered");
    await expect(page.getByTestId("preview-note")).toBeVisible();
    await expect(page.getByTestId("successors")).toContainText("Conic Sections");
    await expect(page.getByTestId("successors").locator("[data-label=Recommended]")).toContainText("Conic Sections");
    await page.getByTestId("summary-map").click();
    await expect(page.getByTestId("node-sl")).toHaveAttribute("data-state", "mastered");
    await expect(page.getByTestId("mastered-total")).toHaveText("1");
    // preview results are never shown as mastery once preview is off
    await page.getByTestId("preview-off").click();
    await expect(page.getByTestId("node-sl")).not.toHaveAttribute("data-state", "mastered");
    await expect(page.getByTestId("mastered-total")).toHaveText("0");
  });

  test("Journey 2 · a misconception-driven detour, exact resume mid-detour, and the return to the original question", async ({ page }) => {
    await startSession(page, "/chapter/lom/try", "11");
    // answer correctly until the session reaches resolving forces at hard (deterministic selection order)
    for (let guard = 0; guard < 8; guard++) {
      const o = await onScreen(page);
      if (o.skillId === "lom.resolve-forces") break;
      await answerCurrent(page, "right");
    }
    const q = await onScreen(page);
    expect(q).toMatchObject({ role: "main", skillId: "lom.resolve-forces" });
    await answerCurrent(page, "exhaust");
    // easy diagnostic on the same skill, answered with a recognised misconception
    expect(await onScreen(page)).toMatchObject({ role: "diagnostic", skillId: "lom.resolve-forces" });
    await answerCurrent(page, "exhaust");
    // the evidence implicates resolving vectors (Motion in a Plane, Class 11): probe, then detour
    expect(await onScreen(page)).toMatchObject({ role: "probe", skillId: "mip.resolution" });
    await answerCurrent(page, "exhaust");
    await expect(page.getByTestId("detour-intro")).toBeVisible();
    await expect(page.getByTestId("paused-card")).toContainText("Resolving forces");
    await expect(page.getByTestId("detour-path")).toBeVisible();
    await expect(page.getByTestId("crumbs")).toContainText("Paused");
    await page.getByTestId("detour-start").click();
    await expect(page.getByTestId("role-label")).toContainText("Detour practice");
    // quit mid-detour and come back: the same frame, question and seed
    const before = await onScreen(page);
    await page.reload();
    await expect(page.getByTestId("role-label")).toContainText("Detour practice");
    expect(await onScreen(page)).toMatchObject({ templateId: before.templateId, seed: before.seed, frames: 2 });
    await expect(page.getByTestId("crumbs")).toContainText("Resolving forces");
    for (let i = 0; i < 3; i++) await answerCurrent(page, "right");
    // back through the worked explanation, then a fresh variant of the same question
    await expect(page.getByTestId("worked")).toHaveAttribute("data-reason", "return");
    await page.getByTestId("worked-next").click();
    await page.getByTestId("worked-continue").click();
    const ret = await onScreen(page);
    expect(ret).toMatchObject({ role: "return", templateId: q.templateId, frames: 1 });
    expect(ret.seed).not.toBe(q.seed);
    await expect(page.getByTestId("role-label")).toContainText("Back to the paused question");
    await answerCurrent(page, "right");
    const next = await onScreen(page);
    expect(next.role).toBe("main");
    expect(entryById.get(next.templateId!)!.template.difficulty).toBe("medium");
    expect(next.mains).toBe(q.mains + 1); // remediation and return questions never count as main questions
  });

  test("Journey 3 · foundation failure, Stuck, pause, Continue from the map, recap and return", async ({ page }) => {
    await startSession(page, "/chapter/mip/try", "11");
    expect((await onScreen(page)).skillId).toBe("mip.vector-addition");
    await answerCurrent(page, "right");
    const q2 = await onScreen(page);
    expect(q2.skillId).toBe("mip.resolution");
    await answerCurrent(page, "exhaust");
    expect(await onScreen(page)).toMatchObject({ role: "diagnostic", skillId: "mip.resolution" });
    await answerCurrent(page, "exhaust");
    expect(await onScreen(page)).toMatchObject({ role: "probe", skillId: "f.trig-ratios" });
    await answerCurrent(page, "exhaust");
    await expect(page.getByTestId("detour-intro")).toContainText("foundation lesson");
    await page.getByTestId("detour-start").click();
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-variant", "main");
    await expect(page.getByTestId("triangle-explorer")).toBeVisible();
    await page.getByTestId("lesson-next").click();
    await page.getByTestId("te-mark-B").click(); // the live widget: θ moves to B and the labels swap
    await expect(page.getByTestId("stage-description")).toContainText("Adjacent to θ: BC");
    for (let i = 0; i < 4; i++) await page.getByTestId("lesson-next").click();
    await page.getByTestId("lesson-done").click();
    await answerCurrent(page, "exhaust");
    await answerCurrent(page, "exhaust");
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-variant", "alternate");
    for (let i = 0; i < 3; i++) await page.getByTestId("lesson-next").click();
    await page.getByTestId("lesson-done").click();
    await answerCurrent(page, "exhaust");
    await answerCurrent(page, "exhaust");
    await expect(page.getByTestId("stuck")).toContainText("Trigonometric ratios in a right triangle");
    await page.getByTestId("stuck-pause").click();
    // the dashboard's Continue card names the exact place
    await expect(page.getByTestId("continue-card")).toContainText("Paused");
    await expect(page.getByTestId("continue-card")).toContainText("Trigonometric ratios");
    await page.getByTestId("continue-session").click();
    await expect(page.getByTestId("lesson")).toHaveAttribute("data-variant", "recap");
    await page.getByTestId("lesson-done").click();
    await answerCurrent(page, "right");
    await answerCurrent(page, "right");
    await expect(page.getByTestId("worked")).toHaveAttribute("data-reason", "return");
    await page.getByTestId("worked-continue").click();
    const ret = await onScreen(page);
    expect(ret).toMatchObject({ role: "return", templateId: q2.templateId, frames: 1 });
    await answerCurrent(page, "right");
    expect((await onScreen(page)).role).toBe("main");
  });

  test("invalid input never uses a try inside a session, and the class is never used to route forward", async ({ page }) => {
    await startSession(page, "/chapter/cur/try", "11");
    const o = await onScreen(page);
    const inst = instOf(o);
    if (inst.format === "quantity") {
      await page.getByTestId("answer-input").fill("3");
      await page.getByTestId("check").click();
      await expect(page.getByTestId("notice")).toContainText("doesn't use up a try");
      await expect(page.getByTestId("tries")).toContainText("3 tries left");
    }
    await answerCurrent(page, "exhaust");
    // no remediation content exists for these Class 12 prerequisites: a worked solution, never a forward detour
    const after = await onScreen(page);
    expect(after.frames).toBe(1);
  });
});
