import path from "path";
import fs from "fs";
import { CollectionRegistry } from "../collection-registry";

const FIXTURE_DIR = path.resolve(__dirname, "__fixtures__");

beforeAll(() => {
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  }
});

afterAll(() => {
  fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

function writeFixture(name: string, data: unknown): string {
  const filePath = path.join(FIXTURE_DIR, name);
  fs.writeFileSync(filePath, JSON.stringify(data));
  return filePath;
}

describe("CollectionRegistry", () => {
  it("loads collections from config file", () => {
    const configPath = writeFixture("collections-basic.json", [
      { contract: "0xAAA", enabled: true },
      { contract: "0xBBB", enabled: false },
    ]);

    const registry = new CollectionRegistry(configPath);
    expect(registry.getAll()).toHaveLength(2);
  });

  it("returns only enabled collections", () => {
    const configPath = writeFixture("collections-filter.json", [
      { contract: "0xAAA", enabled: true },
      { contract: "0xBBB", enabled: false },
      { contract: "0xCCC", enabled: true },
    ]);

    const registry = new CollectionRegistry(configPath);
    expect(registry.getEnabled()).toHaveLength(2);
    expect(registry.getEnabled().map((c) => c.contract)).toEqual(["0xaaa", "0xccc"]);
  });

  it("normalizes contract addresses to lowercase", () => {
    const configPath = writeFixture("collections-case.json", [
      { contract: "0xB47E3CD837DDF8E4C57F05D70AB865DE6E193BBB", enabled: true },
    ]);

    const registry = new CollectionRegistry(configPath);
    expect(registry.getAll()[0].contract).toBe("0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb");
  });

  it("isEnabled checks case-insensitively", () => {
    const configPath = writeFixture("collections-enabled.json", [
      { contract: "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb", enabled: true },
      { contract: "0xdead", enabled: false },
    ]);

    const registry = new CollectionRegistry(configPath);
    expect(registry.isEnabled("0xB47E3CD837DDF8E4C57F05D70AB865DE6E193BBB")).toBe(true);
    expect(registry.isEnabled("0xdead")).toBe(false);
    expect(registry.isEnabled("0xunknown")).toBe(false);
  });

  it("returns empty arrays when config file does not exist", () => {
    const registry = new CollectionRegistry("/nonexistent/path.json");
    expect(registry.getAll()).toHaveLength(0);
    expect(registry.getEnabled()).toHaveLength(0);
    expect(registry.isEnabled("0xanything")).toBe(false);
  });

  it("handles empty config array", () => {
    const configPath = writeFixture("collections-empty.json", []);
    const registry = new CollectionRegistry(configPath);
    expect(registry.getAll()).toHaveLength(0);
  });
});
