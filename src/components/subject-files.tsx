"use client";

import type { Doc } from "@/lib/types";
import type { StorageMode } from "@/lib/upload";
import { DocList, DropZone, Toast, useDocs, useToast, useUploader } from "./files";

/** Dateien eines Fachs mit Upload direkt dort hinein */
export function SubjectFiles({ docs: initial, subjectId, kuerzel, today, storage }: { docs: Doc[]; subjectId: string; kuerzel: string; today: string; storage: StorageMode }) {
  const toast = useToast();
  const { docs, run } = useDocs(initial, toast.show);
  const { uploads, uploadFiles } = useUploader(toast.show, storage);
  return (
    <>
      <DropZone disabled={!storage} uploads={uploads} onFiles={(f) => uploadFiles(f, { subjectId })} hint={`Landen in ${kuerzel}`} />
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
