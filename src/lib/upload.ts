/** Größte erlaubte Datei, gilt für Browser und Upload-Route */
export const MAX_UPLOAD_MB = 50;

/**
 * Wie der Browser in den Blob-Store hochlädt:
 * - "oidc": Store mit Vercel verbunden (BLOB_STORE_ID), Upload über vorsignierte URL
 * - "token": klassischer BLOB_READ_WRITE_TOKEN, Upload über Client-Token
 * - null: kein Speicher verbunden
 */
export type StorageMode = "oidc" | "token" | null;

/** Erlaubte Pfade: ablage/<zufall>-<dateiname> */
export const UPLOAD_PATH = /^ablage\/[A-Za-z0-9_.\-]{1,200}$/;
