import "server-only";
import { gunzipSync } from "node:zlib";
import { cache } from "react";
import { fileHref, vaultHref } from "./vault-links";

/*
  Liest den Obsidian-Vault aus einem privaten GitHub-Repo.
  Ein Request holt das ganze Repo als Tarball, danach liegt alles im Speicher,
  bis es einen neuen Commit gibt. Geschrieben wird nur in Obsidian, hier nur gelesen.

  Env:
    VAULT_GITHUB_TOKEN  Fine-grained Token, nur dieses Repo, "Contents: Read-only"
    VAULT_REPO          owner/name, Standard a2hengk/obsidian-vault
    VAULT_BRANCH        Standard main
    VAULT_NAME          Name des Vaults in Obsidian (für "In Obsidian öffnen"), Standard Lunas
*/

export type VaultNote = {
  path: string; // "Schule/WI/Rechtsfähigkeit.md"
  folder: string; // "Schule/WI"
  title: string; // "Rechtsfähigkeit"
  body: string; // ohne Frontmatter
  tags: string[];
  props: Record<string, string>;
  excerpt: string;
  links: string[]; // Pfade der verlinkten Notizen (aufgelöst)
};

export type VaultFolder = { path: string; name: string; parent: string; notes: number; folders: number };

export type Vault = {
  sha: string;
  notes: Map<string, VaultNote>;
  folders: Map<string, VaultFolder>;
  files: Map<string, Buffer>; // Bilder, PDFs usw.
  byName: Map<string, string>; // "rechtsfähigkeit" -> Pfad, für [[Links]]
  backlinks: Map<string, string[]>;
};

export type VaultState =
  | { status: "off" }
  | { status: "error"; message: string }
  | { status: "ok"; vault: Vault; name: string; repo: string };

export const vaultName = () => process.env.VAULT_NAME || "Lunas";
const repo = () => process.env.VAULT_REPO || "a2hengk/obsidian-vault";
const branch = () => process.env.VAULT_BRANCH || "main";
// Nur für Tests umstellbar
const api = () => (process.env.VAULT_API_URL || "https://api.github.com").replace(/\/$/, "");

/** Ordner, die in Lunas OS nicht auftauchen (Vorlagen sind keine echten Notizen) */
const HIDDEN = /^(\.|Vorlagen\/|_)/;
const MAX_FILE = 15 * 1024 * 1024;

/* ---------- Tar lesen (GitHub-Tarball: ustar + pax) ---------- */

function readTar(buf: Buffer): { name: string; data: Buffer }[] {
  const out: { name: string; data: Buffer }[] = [];
  let off = 0;
  let longName: string | null = null;
  const str = (b: Buffer) => {
    const end = b.indexOf(0);
    return b.subarray(0, end === -1 ? b.length : end).toString("utf8");
  };
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const size = parseInt(str(h.subarray(124, 136)).trim() || "0", 8);
    const type = String.fromCharCode(h[156] || 48);
    const prefix = str(h.subarray(345, 500));
    let name = str(h.subarray(0, 100));
    if (prefix) name = `${prefix}/${name}`;
    const data = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;

    if (type === "x") {
      // pax: "len key=value\n" – wir brauchen nur path (lange oder Unicode-Namen)
      const m = /\d+ path=([^\n]*)\n/.exec(data.toString("utf8"));
      if (m) longName = m[1];
      continue;
    }
    if (type === "L") {
      longName = str(data);
      continue;
    }
    if (type === "g") continue;
    if (longName) {
      name = longName;
      longName = null;
    }
    if (type === "0" || type === "\0") out.push({ name, data: Buffer.from(data) });
  }
  return out;
}

/* ---------- Markdown auswerten ---------- */

function splitFrontmatter(src: string) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { props: {} as Record<string, string>, tags: [] as string[], body: src };
  const props: Record<string, string> = {};
  let tags: string[] = [];
  let listKey: string | null = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && listKey === "tags") {
      tags.push(item[1].trim());
      continue;
    }
    const kv = /^([\w-äöüÄÖÜß]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    listKey = kv[1];
    const v = kv[2].trim();
    if (kv[1] === "tags") {
      tags = v
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
    } else if (v) props[kv[1]] = v.replace(/^["']|["']$/g, "");
  }
  return { props, tags, body: src.slice(m[0].length) };
}

const WIKI = /!?\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|[^\]\n]*)?\]\]/g;

function plain(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[\[[^\]]*\]\]/g, " ")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, a, b) => b ?? a)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^>\s*\[![^\]]+\][+-]?/gm, " ")
    .replace(/[#>*_`~|=-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function build(sha: string, entries: { name: string; data: Buffer }[]): Vault {
  const notes = new Map<string, VaultNote>();
  const files = new Map<string, Buffer>();
  const folders = new Map<string, VaultFolder>();
  const ensureFolder = (path: string) => {
    if (!path || folders.has(path)) return;
    const parts = path.split("/");
    const parent = parts.slice(0, -1).join("/");
    folders.set(path, { path, name: parts.at(-1)!, parent, notes: 0, folders: 0 });
    ensureFolder(parent);
  };

  for (const e of entries) {
    // Erste Ebene ist "owner-repo-sha/"
    const path = e.name.split("/").slice(1).join("/");
    if (!path || HIDDEN.test(path) || path.split("/").some((p) => p.startsWith("."))) continue;
    const folder = path.split("/").slice(0, -1).join("/");
    ensureFolder(folder);
    if (path.toLowerCase().endsWith(".md")) {
      const { props, tags, body } = splitFrontmatter(e.data.toString("utf8"));
      notes.set(path, {
        path,
        folder,
        title: path.split("/").at(-1)!.slice(0, -3),
        body,
        tags,
        props,
        excerpt: plain(body).slice(0, 240),
        links: [],
      });
    } else if (e.data.length <= MAX_FILE) {
      files.set(path, e.data);
    }
  }

  // Wie Obsidian: [[Name]] trifft die Datei mit diesem Namen, egal in welchem Ordner.
  // Bei gleichen Namen gewinnt der kürzeste Pfad.
  const byName = new Map<string, string>();
  const register = (key: string, path: string) => {
    const k = key.toLowerCase();
    const prev = byName.get(k);
    if (!prev || path.length < prev.length) byName.set(k, path);
  };
  for (const p of [...notes.keys(), ...files.keys()]) {
    const base = p.split("/").at(-1)!;
    register(base, p);
    register(p, p);
    if (p.endsWith(".md")) {
      register(base.slice(0, -3), p);
      register(p.slice(0, -3), p);
    }
  }

  const backlinks = new Map<string, string[]>();
  for (const n of notes.values()) {
    const targets = new Set<string>();
    for (const m of n.body.matchAll(WIKI)) {
      if (m[0].startsWith("!")) continue;
      const t = byName.get(m[1].trim().toLowerCase());
      if (t && t !== n.path && t.endsWith(".md")) targets.add(t);
    }
    n.links = [...targets];
    for (const t of targets) backlinks.set(t, [...(backlinks.get(t) ?? []), n.path]);
  }

  for (const f of folders.values()) {
    const parent = folders.get(f.parent);
    if (parent) parent.folders++;
  }
  // Notizen inkl. Unterordner, damit "Schule" nicht 1 sondern alle zeigt
  for (const f of folders.values()) {
    f.notes = [...notes.values()].filter((n) => n.folder === f.path || n.folder.startsWith(`${f.path}/`)).length;
  }

  return { sha, notes, folders, files, byName, backlinks };
}

/* ---------- Laden mit Cache ---------- */

let cached: Vault | null = null;
let checkedAt = 0;
const RECHECK_MS = 20_000;

async function gh(path: string, token: string, accept = "application/vnd.github+json") {
  return fetch(`${api()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: accept, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "lunas-os" },
    cache: "no-store",
    redirect: "follow",
  });
}

async function load(): Promise<VaultState> {
  const token = process.env.VAULT_GITHUB_TOKEN;
  if (!token) return { status: "off" };
  const r = repo();

  // Höchstens alle 20 Sekunden nachsehen, ob es einen neuen Commit gibt
  if (cached && Date.now() - checkedAt < RECHECK_MS) return { status: "ok", vault: cached, name: vaultName(), repo: r };

  try {
    const head = await gh(`/repos/${r}/commits/${encodeURIComponent(branch())}`, token, "application/vnd.github.sha");
    if (head.status === 401) return { status: "error", message: "Token ungültig oder abgelaufen (VAULT_GITHUB_TOKEN)." };
    if (head.status === 404 || head.status === 403)
      return { status: "error", message: `Repo ${r} nicht gefunden oder Token hat keinen Zugriff darauf.` };
    if (head.status === 409) return { status: "error", message: `Repo ${r} ist noch leer. Einmal aus Obsidian pushen.` };
    if (!head.ok) throw new Error(`GitHub ${head.status}`);
    const sha = (await head.text()).trim();
    checkedAt = Date.now();
    if (cached?.sha === sha) return { status: "ok", vault: cached, name: vaultName(), repo: r };

    const tar = await gh(`/repos/${r}/tarball/${sha}`, token);
    if (!tar.ok) throw new Error(`Tarball ${tar.status}`);
    cached = build(sha, readTar(gunzipSync(Buffer.from(await tar.arrayBuffer()))));
    return { status: "ok", vault: cached, name: vaultName(), repo: r };
  } catch (e) {
    console.error("[vault]", e);
    // Lieber den alten Stand zeigen als gar nichts
    if (cached) return { status: "ok", vault: cached, name: vaultName(), repo: r };
    return { status: "error", message: "GitHub gerade nicht erreichbar." };
  }
}

/** Pro Request nur einmal laden */
export const getVault = cache(load);

/* ---------- Hilfen für die Seiten ---------- */

export type NoteMeta = Pick<VaultNote, "path" | "folder" | "title" | "excerpt" | "tags">;
export const meta = (n: VaultNote): NoteMeta => ({ path: n.path, folder: n.folder, title: n.title, excerpt: n.excerpt, tags: n.tags });

/**
 * Nur die [[Links]] dieser einen Notiz auflösen: Name (klein) -> URL.
 * Nicht gefundene Ziele fehlen in der Tabelle und werden als "gibt's noch nicht" gezeigt.
 */
export function linkTable(v: Vault, body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/!?\[\[([^\]|#\n]+)/g)) {
    const key = m[1].trim().toLowerCase();
    const path = v.byName.get(key);
    if (path) out[key] = path.endsWith(".md") ? vaultHref(path) : fileHref(path);
  }
  return out;
}
