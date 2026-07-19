/**
 * Local Storage Provider — stores files in public/uploads/repair/
 *
 * FOR DEVELOPMENT USE ONLY.
 * Files are served as Next.js static assets via /uploads/repair/<key>.
 *
 * Set STORAGE_PROVIDER=local in .env.local to activate.
 */

import fs from "fs/promises";
import path from "path";
import type { StorageProvider } from "./provider.interface";

const BASE_DIR = path.join(process.cwd(), "public", "uploads", "repair");

export class LocalStorageProvider implements StorageProvider {
  async upload({
    buffer,
    storageKey,
  }: {
    buffer: Buffer;
    mimeType: string;
    storageKey: string;
  }): Promise<void> {
    const filePath = path.join(BASE_DIR, storageKey);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  async getUrl(storageKey: string): Promise<string> {
    return `/uploads/repair/${storageKey}`;
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = path.join(BASE_DIR, storageKey);
    await fs.unlink(filePath).catch(() => {
      // Ignore not-found errors (file may already be gone)
    });
  }
}
