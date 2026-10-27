import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { MemoryRepo, openRepo } from "@/src/persistence/db";
import type { AttemptRecord } from "@/src/domain/progress";

const a: AttemptRecord = {
  id: "x1", at: 1, chapterId: "kin", skillId: "kin.acceleration", templateId: "t@1", seed: 9, difficulty: "medium",
  kind: "diagnostic", outcome: "exhausted", attemptsUsed: 3, hintsUsed: 1, tags: ["area-uses-final-velocity"],
};

describe("IndexedDB repository", () => {
  it("persists attempts, flashcards and chapter records across re-opening", async () => {
    const r1 = await openRepo();
    expect(r1.persistent).toBe(true);
    await r1.addAttempt(a);
    await r1.putFlashcards([{ id: "kin:t", chapterId: "kin", skillId: "kin.acceleration", tag: "t", front: "f", back: "b", box: 1, dueAt: 5, createdAt: 1 }]);
    await r1.putChapter({ chapterId: "kin", mastered: false });
    const r2 = await openRepo();
    const s = await r2.load();
    expect(s.attempts).toEqual([a]);
    expect(s.flashcards).toHaveLength(1);
    expect(s.chapterRecords).toEqual([{ chapterId: "kin", mastered: false }]);
    await r2.replaceAll({ attempts: [], flashcards: [], chapterRecords: [] });
    expect((await r2.load()).attempts).toEqual([]);
  });
  it("rejects malformed records", async () => {
    const r = await openRepo();
    await expect(r.addAttempt({ ...a, outcome: "great" as never })).rejects.toThrow();
  });
  it("falls back to memory when storage is unavailable", async () => {
    const m = new MemoryRepo();
    expect(m.persistent).toBe(false);
    await m.addAttempt(a);
    expect((await m.load()).attempts).toHaveLength(1);
  });
});
