import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getBacklinks, getFolders, getNote, getNoteTitles } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { NoteEditor } from "@/components/note-editor";
import { PageSkeleton } from "@/components/hud";

export const metadata: Metadata = { title: "Notiz" };

export default function NotizPage({ params, searchParams }: PageProps<"/ablage/notiz/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Notiz params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Notiz({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const note = await getNote(id);
  if (!note) notFound();
  const [folders, titles, backlinks] = await Promise.all([getFolders(), getNoteTitles(), getBacklinks(note)]);

  return <NoteEditor key={note.id} note={note} folders={folders} titles={titles} backlinks={backlinks} fresh={sp.neu === "1"} />;
}
