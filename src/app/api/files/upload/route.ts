import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getUser } from "@/lib/session";

/** Was hochgeladen werden darf: Dokumente, Bilder, Office, Text */
const ALLOWED = [
  "application/pdf",
  "image/*",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
];

const MAX_UPLOAD_MB = 50; // gleiche Grenze wie in src/lib/upload.ts

/**
 * Gibt dem Browser einen kurzlebigen Token, damit er direkt in den privaten
 * Blob-Store hochladen kann (auch Dateien über 4,5 MB). Nur für dich.
 * Den Datenbank-Eintrag legt danach die Server Action registerDocument an.
 */
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Dateispeicher ist noch nicht verbunden (Vercel → Storage → Blob)." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Login direkt hier prüfen, nicht nur im Proxy
        if (!(await getUser())) throw new Error("Nicht angemeldet");
        if (!pathname.startsWith("ablage/")) throw new Error("Ungültiger Pfad");
        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: MAX_UPLOAD_MB * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
