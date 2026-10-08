import { issueSignedToken } from "@vercel/blob";
import { handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { getUser } from "@/lib/session";
import { storageMode } from "@/lib/storage";
import { MAX_UPLOAD_MB, UPLOAD_PATH } from "@/lib/upload";

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
const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Login und Pfad direkt hier prüfen, nicht nur im Proxy */
async function guard(pathname: string) {
  if (!(await getUser())) throw new Error("Nicht angemeldet");
  if (!UPLOAD_PATH.test(pathname)) throw new Error("Ungültiger Pfad");
}

/**
 * Erlaubt dem Browser, eine Datei direkt in den privaten Blob-Store zu laden
 * (auch über 4,5 MB). Den Datenbank-Eintrag legt danach registerDocument an.
 */
export async function POST(request: Request) {
  const mode = storageMode();
  if (!mode) {
    return Response.json({ error: "Dateispeicher ist noch nicht verbunden (Vercel → Storage → Blob)." }, { status: 503 });
  }

  try {
    if (mode === "oidc") {
      // Store über Vercel verbunden: kurzlebige, auf genau diesen Pfad begrenzte Upload-URL
      const body = (await request.json()) as HandleUploadPresignedBody;
      const json = await handleUploadPresigned({
        body,
        request,
        getSignedToken: async (pathname) => {
          await guard(pathname);
          const token = await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: ALLOWED,
            maximumSizeInBytes: MAX_BYTES,
            validUntil: Date.now() + 10 * 60 * 1000,
          });
          return { token, urlOptions: { allowedContentTypes: ALLOWED, maximumSizeInBytes: MAX_BYTES, allowOverwrite: false } };
        },
      });
      return Response.json(json);
    }

    const body = (await request.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        await guard(pathname);
        return { allowedContentTypes: ALLOWED, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
      },
    });
    return Response.json(json);
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[upload]", msg);
    return Response.json({ error: msg }, { status: msg === "Nicht angemeldet" ? 401 : 400 });
  }
}
