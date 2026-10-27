"use client";
// One shared progress store for the whole app (useSyncExternalStore). Every write goes to the repo first.
import { useSyncExternalStore } from "react";
import { emptySnapshot, newFlashcard, reviewCard, type AttemptRecord, type FlashcardRecord, type ProgressSnapshot } from "@/src/domain/progress";
import { ExportFile, openRepo, type ProgressRepo } from "./db";

interface StoreState {
  ready: boolean;
  persistent: boolean;
  snapshot: ProgressSnapshot;
}

let state: StoreState = { ready: false, persistent: true, snapshot: emptySnapshot() };
let repo: ProgressRepo | null = null;
let opening: Promise<ProgressRepo> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function getRepo() {
  if (repo) return repo;
  opening ??= openRepo();
  repo = await opening;
  return repo;
}

async function refresh() {
  const r = await getRepo();
  state = { ready: true, persistent: r.persistent, snapshot: await r.load() };
  emit();
}

export const progressStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    if (!state.ready && listeners.size === 1) void refresh();
    return () => listeners.delete(l);
  },
  get: () => state,
  refresh,
  async recordAttempt(a: AttemptRecord, cards: { tag: string; front: string; back: string }[]) {
    const r = await getRepo();
    await r.addAttempt(a);
    if (cards.length) {
      const now = a.at;
      await r.putFlashcards(cards.map((c) => newFlashcard({ chapterId: a.chapterId, skillId: a.skillId, ...c }, now)));
    }
    await refresh();
  },
  /** Update an attempt already saved (the student's optional explanation). Never changes its outcome. */
  async updateReasoning(a: AttemptRecord, reasoning: NonNullable<AttemptRecord["reasoning"]>) {
    const r = await getRepo();
    await r.addAttempt({ ...a, reasoning });
    await refresh();
  },
  async review(card: FlashcardRecord, knewIt: boolean, now = Date.now()) {
    const r = await getRepo();
    await r.putFlashcards([reviewCard(card, knewIt, now)]);
    await refresh();
  },
  async exportJson(): Promise<string> {
    const s = (await getRepo()).load();
    const snap = await s;
    const file: ExportFile = { app: "noesis", schema: 1, exportedAt: new Date().toISOString(), attempts: snap.attempts, flashcards: snap.flashcards, chapters: snap.chapterRecords };
    return JSON.stringify(file, null, 2);
  },
  async importJson(text: string) {
    const f = ExportFile.parse(JSON.parse(text));
    await (await getRepo()).replaceAll({ attempts: f.attempts, flashcards: f.flashcards, chapterRecords: f.chapters });
    await refresh();
  },
  async eraseAll() {
    await (await getRepo()).replaceAll(emptySnapshot());
    await refresh();
  },
};

const serverState: StoreState = { ready: false, persistent: true, snapshot: emptySnapshot() };
export function useProgress(): StoreState {
  return useSyncExternalStore(progressStore.subscribe, progressStore.get, () => serverState);
}
