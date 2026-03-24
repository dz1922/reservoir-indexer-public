import fs from "fs";
import path from "path";

import { CollectionInfo } from "./types";

interface CollectionConfigEntry {
  contract: string;
  enabled: boolean;
}

export class CollectionRegistry {
  private collections: CollectionInfo[] = [];

  constructor(configPath?: string) {
    const resolvedPath = configPath ?? path.resolve(__dirname, "../../../config/collections.json");

    if (fs.existsSync(resolvedPath)) {
      const raw = fs.readFileSync(resolvedPath, "utf-8");
      const entries: CollectionConfigEntry[] = JSON.parse(raw);

      this.collections = entries.map((entry) => ({
        id: entry.contract.toLowerCase(),
        name: entry.contract.toLowerCase(),
        contract: entry.contract.toLowerCase(),
        enabled: entry.enabled,
      }));
    }
  }

  getAll(): CollectionInfo[] {
    return this.collections;
  }

  getEnabled(): CollectionInfo[] {
    return this.collections.filter((c) => c.enabled);
  }

  isEnabled(contract: string): boolean {
    return this.collections.some(
      (c) => c.contract.toLowerCase() === contract.toLowerCase() && c.enabled
    );
  }
}
