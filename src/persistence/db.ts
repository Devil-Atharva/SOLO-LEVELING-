// Browser-only progress storage (U-10, D-006): IndexedDB via Dexie, with an in-memory fallback.
import Dexie, { type Table } from "dexie";
import { z } from "zod";
import {
  AttemptRecord,
  ChapterRecord,
  emptySnapshot,
  FlashcardRecord,
  type ProgressSnapshot,
} from "@/src/domain/progress";

class NoesisDB extends Dexie {
  attempts!: Table<AttemptRecord, string>;
  flashcards!: Table<FlashcardRecord, string>;
  chapters!: Table<ChapterRecord, string>;
  constructor() {
    super("noesis");
    this.version(1).stores({
      attempts: "id, at, chapterId, skillId",
      flashcards: "id, chapterId, dueAt",
      chapters: "chapterId",
    });
  }
}

export const ExportFile = z.object({
  app: z.literal("noesis"),
  schema: z.literal(1),
  exportedAt: z.string(),
  attempts: z.array(AttemptRecord),
  flashcards: z.array(FlashcardRecord),
  chapters: z.array(ChapterRecord),
});
export type ExportFile = z.infer<typeof ExportFile>;

export interface ProgressRepo {
  readonly persistent: boolean;
  load(): Promise<ProgressSnapshot>;
  addAttempt(a: AttemptRecord): Promise<void>;
  putFlashcards(cards: FlashcardRecord[]): Promise<void>;
  putChapter(r: ChapterRecord): Promise<void>;
  replaceAll(s: ProgressSnapshot): Promise<void>;
}

class DexieRepo implements ProgressRepo {
  readonly persistent = true;
  constructor(private db: NoesisDB) {}
  async load() {
    const [attempts, flashcards, chapterRecords] = await Promise.all([
      this.db.attempts.orderBy("at").toArray(),
      this.db.flashcards.toArray(),
      this.db.chapters.toArray(),
    ]);
    return { attempts, flashcards, chapterRecords };
  }
  async addAttempt(a: AttemptRecord) {
    await this.db.attempts.put(AttemptRecord.parse(a));
  }
  async putFlashcards(cards: FlashcardRecord[]) {
    await this.db.flashcards.bulkPut(cards.map((c) => FlashcardRecord.parse(c)));
  }
  async putChapter(r: ChapterRecord) {
    await this.db.chapters.put(ChapterRecord.parse(r));
  }
  async replaceAll(s: ProgressSnapshot) {
    await this.db.transaction("rw", this.db.attempts, this.db.flashcards, this.db.chapters, async () => {
      await Promise.all([this.db.attempts.clear(), this.db.flashcards.clear(), this.db.chapters.clear()]);
      await this.db.attempts.bulkPut(s.attempts);
      await this.db.flashcards.bulkPut(s.flashcards);
      await this.db.chapters.bulkPut(s.chapterRecords);
    });
  }
}

export class MemoryRepo implements ProgressRepo {
  readonly persistent = false;
  private s: ProgressSnapshot = emptySnapshot();
  async load() {
    return structuredClone(this.s);
  }
  async addAttempt(a: AttemptRecord) {
    this.s.attempts.push(AttemptRecord.parse(a));
  }
  async putFlashcards(cards: FlashcardRecord[]) {
    for (const c of cards) {
      this.s.flashcards = this.s.flashcards.filter((f) => f.id !== c.id);
      this.s.flashcards.push(FlashcardRecord.parse(c));
    }
  }
  async putChapter(r: ChapterRecord) {
    this.s.chapterRecords = this.s.chapterRecords.filter((c) => c.chapterId !== r.chapterId);
    this.s.chapterRecords.push(ChapterRecord.parse(r));
  }
  async replaceAll(s: ProgressSnapshot) {
    this.s = structuredClone(s);
  }
}

export async function openRepo(): Promise<ProgressRepo> {
  try {
    if (typeof indexedDB === "undefined") throw new Error("no indexedDB");
    const db = new NoesisDB();
    await db.open();
    return new DexieRepo(db);
  } catch {
    return new MemoryRepo();
  }
}
