# Data Tables

This folder stores BTA tables and reference data used by the UMS app.

## Catalog + schema

- `bta.catalog.v1.json` is the authoritative BTA activity weight catalog.
- `bta.schema.json` is the JSON Schema used to validate catalog data.

## Updating catalog versions

1. Duplicate the latest catalog (e.g., `bta.catalog.v1.json`) and increment the version in the filename.
2. Update `meta.version`, `meta.effectiveDate`, and any values that change based on the new source.
3. Ensure new/updated items keep stable IDs and consistent `activity.code`/`option.code` values.
4. Run `npm run validate:data` to confirm schema validation and completeness checks pass.
5. Document the source document and version changes in the catalog `meta.notes`.

## Placeholder workflow

- `bta_tables.example.json` defines the keys and structure for BTA tables without real values.
- `btaMinimumTargets.json` stores minimum target percentages and hours per pathway and grade/role.
- Values are derived from the Garis Panduan BTA UMS (40 jam/minggu); update alongside any guideline changes.
- Keep source notes and citations in documentation alongside any future value updates.
