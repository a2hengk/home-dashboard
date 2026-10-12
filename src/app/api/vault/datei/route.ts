import { getUser } from "@/lib/session";
import { getVault } from "@/lib/vault";

const types: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};

/** Bilder und Anhänge aus dem Vault, nur eingeloggt */
export async function GET(request: Request) {
  if (!(await getUser())) return new Response("Nicht angemeldet", { status: 401 });
  const path = new URL(request.url).searchParams.get("pfad") ?? "";
  const state = await getVault();
  if (state.status !== "ok") return new Response("Vault nicht verbunden", { status: 503 });
  const data = state.vault.files.get(path);
  if (!data) return new Response("Nicht gefunden", { status: 404 });
  const ext = path.split(".").at(-1)?.toLowerCase() ?? "";
  const type = types[ext] ?? "application/octet-stream";
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      // SVGs nicht als Seite ausführen lassen
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${type.startsWith("image/") || type === "application/pdf" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(path.split("/").at(-1)!)}`,
      "Cache-Control": "private, max-age=300",
      ETag: `"${state.vault.sha}-${encodeURIComponent(path)}"`,
    },
  });
}
