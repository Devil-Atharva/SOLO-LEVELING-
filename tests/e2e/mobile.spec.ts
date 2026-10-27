import { expect, test } from "@playwright/test";

test.describe("phone layout", () => {
  test("no horizontal overflow; tabs, search and canvas fit; progress panel collapses", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByRole("tab", { name: "Class 11 Physics" })).toBeVisible();
    await expect(page.getByTestId("search")).toBeVisible();
    const peek = page.getByRole("button", { name: /Progress ·/ });
    await expect(peek).toBeVisible();
    await expect(peek).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#progress-panel-body")).toHaveAttribute("inert", "");
    await peek.click();
    await expect(peek).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("heading", { name: "Questions attempted" })).toBeInViewport();
    await peek.click();
    await expect(page.getByTestId("legend")).toContainText("Show legend"); // collapsed by default on phones
  });

  test("tapping a chapter opens the preview as a bottom sheet with Try a question", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("node-kin").tap();
    const sheet = page.getByTestId("chapter-preview");
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    const vh = page.viewportSize()!.height;
    expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(vh - 2);
    await expect(sheet.getByTestId("try-question")).toBeVisible();
  });

  test("question screen stacks the visual above the prompt", async ({ page }) => {
    await page.goto("/chapter/vec/try");
    const stage = (await page.locator(".qstage").boundingBox())!;
    const prompt = (await page.locator(".qprompt").boundingBox())!;
    expect(prompt.y).toBeGreaterThan(stage.y + stage.height - 2);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
