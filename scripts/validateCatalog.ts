import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";

const rootDir = process.cwd();
const schemaPath = path.join(rootDir, "data", "bta.schema.json");
const catalogPath = path.join(rootDir, "data", "bta.catalog.v1.json");

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

if (!validate(catalog)) {
  console.error("Catalog validation failed:");
  for (const error of validate.errors ?? []) {
    console.error(`- ${error.instancePath || "/"} ${error.message}`);
  }
  process.exit(1);
}

const items = catalog.items ?? [];
console.log(`Catalog items: ${items.length}`);

const seen = new Set<string>();
const duplicates = new Set<string>();
for (const item of items) {
  if (seen.has(item.id)) {
    duplicates.add(item.id);
  }
  seen.add(item.id);
}

if (duplicates.size > 0) {
  console.error("Duplicate item IDs found:");
  for (const dup of duplicates) {
    console.error(`- ${dup}`);
  }
  process.exit(1);
}

const requiredSubCategories = [
  "SUB_TEACH",
  "SUB_SUP",
  "SUB_PUB",
  "SUB_RES",
  "SUB_CONF",
  "SUB_ADMIN",
  "SUB_SVC",
];

const presentSubCategories = new Set<string>(items.map((item: { subCategoryId: string }) => item.subCategoryId));
const missing = requiredSubCategories.filter((id) => !presentSubCategories.has(id));

if (missing.length > 0) {
  console.error("Missing subCategoryId coverage:");
  for (const id of missing) {
    console.error(`- ${id}`);
  }
  process.exit(1);
}

console.log("Catalog validation succeeded.");
