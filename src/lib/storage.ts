import "server-only";
import type { StorageMode } from "./upload";

/** Welcher Blob-Zugang auf dem Server verfügbar ist. Das Token hat Vorrang, falls beides gesetzt ist. */
export function storageMode(): StorageMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "token";
  if (process.env.BLOB_STORE_ID) return "oidc";
  return null;
}
