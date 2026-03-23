import fs from "fs";
import path from "path";

import { logger } from "@/common/logger";

interface CollectionConfig {
  contract: string;
  enabled: boolean;
}

let enabledContracts: Set<string> | null = null;

const loadCollections = (): CollectionConfig[] => {
  const configPath = path.resolve(__dirname, "../../../../config/collections.json");

  if (!fs.existsSync(configPath)) {
    logger.info("collections-config", "No collections.json found, collection filtering disabled");
    return [];
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as CollectionConfig[];
};

export const getEnabledContracts = (): Set<string> => {
  if (!enabledContracts) {
    const collections = loadCollections();
    enabledContracts = new Set(
      collections.filter((c) => c.enabled).map((c) => c.contract.toLowerCase())
    );

    logger.info(
      "collections-config",
      `Loaded ${enabledContracts.size} enabled contracts: ${[...enabledContracts].join(", ")}`
    );
  }

  return enabledContracts;
};

export const isCollectionFilterEnabled = (): boolean => {
  return getEnabledContracts().size > 0;
};

export const isContractEnabled = (address: string): boolean => {
  const contracts = getEnabledContracts();
  if (contracts.size === 0) {
    return true; // No filter configured, allow all
  }
  return contracts.has(address.toLowerCase());
};
