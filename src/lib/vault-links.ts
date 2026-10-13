// Gemeinsam für Server und Browser: Links auf Vault-Inhalte

/** URL in Lunas OS für einen Vault-Pfad, ohne .md */
export const vaultHref = (path: string) =>
  `/ablage/vault/${path
    .replace(/\.md$/i, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

export const fileHref = (path: string) => `/api/vault/datei?pfad=${encodeURIComponent(path)}`;

export const obsidianHref = (vault: string, path: string) =>
  `obsidian://open?vault=${encodeURIComponent(vault)}${path ? `&file=${encodeURIComponent(path.replace(/\.md$/i, ""))}` : ""}`;
