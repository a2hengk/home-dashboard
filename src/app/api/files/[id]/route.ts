import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { getUser } from "@/lib/session";

/**
 * Öffnet eine Datei aus dem privaten Blob-Store, nur eingeloggt.
 * ?download=1 lädt sie herunter statt sie im Browser anzuzeigen.
 * Login-Prüfung direkt hier, nicht über den Proxy (Empfehlung von Vercel für private Blobs).
 */
export async function GET(request: Request, ctx: RouteContext<"/api/files/[id]">) {
  if (!(await getUser())) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return new Response("Nicht gefunden", { status: 404 });

  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!doc) return new Response("Nicht gefunden", { status: 404 });

  const result = await get(doc.pathname, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
  }).catch(() => null);
  if (!result) return new Response("Datei nicht im Speicher gefunden", { status: 404 });

  if (result.statusCode === 304) {
    return new Response(null, {
      status: 304,
      headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" },
    });
  }

  const download = new URL(request.url).searchParams.has("download");
  const filename = encodeURIComponent(doc.name);
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || doc.contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
      "X-Content-Type-Options": "nosniff",
      // Nur der eigene Browser darf cachen, und er fragt jedes Mal nach (Login wird geprüft)
      "Cache-Control": "private, no-cache",
      ETag: result.blob.etag,
    },
  });
}
