"use client";

import type { Doc } from "@/lib/types";
import { DocList, DropZone, Toast, useDocs, useToast, useUploader } from "./files";

/** Dateien eines Fachs mit Upload direkt dort hinein */
export function SubjectFiles({ docs: initial, subjectId, kuerzel, today, storageReady }: { docs: Doc[]; subjectId: string; kuerzel: string; today: string; storageReady: boolean }) {
  const toast = useToast();
  const { docs, run } = useDocs(initial, toast.show);
  const { uploads, uploadFiles } = useUploader(toast.show, storageReady);
  return (
    <>
      <DropZone disabled={!storageReady} uploads={uploads} onFiles={(f) => uploadFiles(f, { subjectId })} hint={`Landen in ${kuerzel}`} />
      <DocList
        docs={docs}
        today={today}
        showSubject={false}
        onDelete={(id) => run({ kind: "delete", id }, "Datei gelöscht")}
        empty="Noch keine Dateien für dieses Fach."
      />
      <Toast message={toast.message} />
    </>
  );
}
