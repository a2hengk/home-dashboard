import { File, FileImage, FileSpreadsheet, FileText } from "lucide-react";
import { diffDays, formatShort } from "@/lib/dates";
import { formatSize, type Doc } from "@/lib/sample-data";
import { SubjectTag } from "./ui";

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const props = { size: 17, strokeWidth: 1.6, className: "text-faint", "aria-hidden": true } as const;
  if (["pdf", "doc", "docx"].includes(ext)) return <FileText {...props} />;
  if (["jpg", "jpeg", "png", "heic"].includes(ext)) return <FileImage {...props} />;
  if (["xlsx", "csv"].includes(ext)) return <FileSpreadsheet {...props} />;
  return <File {...props} />;
}

/** Eine Zeile in einer Dokumentliste. Spalten blenden sich auf schmalen Screens aus. */
export function DocRow({
  doc,
  today,
  showSubject = true,
}: {
  doc: Doc;
  today: string;
  showSubject?: boolean;
}) {
  const age = diffDays(doc.uploaded, today);
  const uploaded = age === 0 ? "Heute" : age === 1 ? "Gestern" : formatShort(doc.uploaded);

  return (
    <li className="border-b border-line last:border-b-0">
      <a
        href="#"
        className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2.5 hover:bg-surface sm:grid-cols-[auto_1fr_5rem_4.5rem_5.5rem] sm:gap-x-4 sm:px-2 sm:-mx-2 rounded-md"
      >
        <FileIcon name={doc.name} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] text-ink">{doc.name}</span>
          <span className="flex gap-3 text-[13px] text-faint sm:hidden">
            {showSubject && doc.subject ? <SubjectTag kuerzel={doc.subject} /> : null}
            <span>{formatSize(doc.sizeBytes)}</span>
            <span>{uploaded}</span>
          </span>
        </span>
        <span className="hidden text-[13px] text-muted sm:block">
          {showSubject ? (doc.subject ? <SubjectTag kuerzel={doc.subject} /> : <span className="text-faint">ohne</span>) : doc.tags[0]}
        </span>
        <span className="hidden text-right text-[13px] text-faint sm:block">{formatSize(doc.sizeBytes)}</span>
        <span className="text-right text-[13px] text-faint sm:block">
          <span className="hidden sm:inline">{uploaded}</span>
          <span className="sm:hidden">{doc.tags[0]}</span>
        </span>
      </a>
    </li>
  );
}
