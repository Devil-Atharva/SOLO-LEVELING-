import { notFound } from "next/navigation";
import { chapterById } from "@/src/domain/curriculum";
import { DiagnosticQuestion } from "@/src/ui/question/DiagnosticQuestion";

export function generateStaticParams() {
  return [...chapterById.keys()].map((chapterId) => ({ chapterId }));
}

export default async function TryPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params;
  if (!chapterById.has(chapterId)) notFound();
  return <DiagnosticQuestion chapterId={chapterId} />;
}
