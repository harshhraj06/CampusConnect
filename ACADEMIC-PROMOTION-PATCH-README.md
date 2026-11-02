# CampusConnect Academic Promotion Patch

This is a targeted patch for the existing CampusConnect repository. It is not a replacement application, and it does not include or replace the rest of the app.

## Included files

- `app/admin/academic-promotion/page.tsx` — keys results by batch + student, prevents stale semester data from remaining selectable after slow or failed loads, tightens selection/override safeguards, surfaces duplicate source memberships, and improves responsive/accessibility behavior while retaining the cream-and-brown styling.
- `app/api/admin/academic-promotion/route.ts` — validates credit inputs as real numeric JSON values, prevents blank credits being coerced to zero, detects legacy duplicate shared rules after semester normalization, identifies duplicate source memberships, and keeps empty selections distinct from `null` all-eligible semantics.
- `lib/academic-promotion.ts` — rejects blank numeric input and duplicate student IDs, and sanitizes additional expected RPC errors.
- `supabase/migrations/20261010180000_academic_promotion_partial_blocking.sql` — an additive forward migration for the promotion RPC. In all-eligible mode, duplicate source memberships and missing/ambiguous targets are reported as blocked candidates while other safe candidates may continue. Explicitly selected malformed duplicate memberships still abort the request so the admin can resolve them first.

## Apply safely from VS Code Terminal

Run these commands from the `CampusConnect` repository root. They assume you downloaded this ZIP into the parent `Downloads` folder, beside the `CampusConnect` directory.

```bash
set -e
PATCH_ZIP="../campusconnect-academic-promotion-fix.zip"
test -f "$PATCH_ZIP" || { echo "Patch ZIP not found: $PATCH_ZIP"; exit 1; }

BACKUP_DIR="academic-promotion-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR/app/admin/academic-promotion"          "$BACKUP_DIR/app/api/admin/academic-promotion"          "$BACKUP_DIR/lib"
cp app/admin/academic-promotion/page.tsx "$BACKUP_DIR/app/admin/academic-promotion/"
cp app/api/admin/academic-promotion/route.ts "$BACKUP_DIR/app/api/admin/academic-promotion/"
cp lib/academic-promotion.ts "$BACKUP_DIR/lib/"

echo "Backup created: $BACKUP_DIR"
unzip -l "$PATCH_ZIP"
unzip -o "$PATCH_ZIP" -d .

git diff -- app/admin/academic-promotion/page.tsx   app/api/admin/academic-promotion/route.ts   lib/academic-promotion.ts   supabase/migrations/20261010180000_academic_promotion_partial_blocking.sql
```

If the ZIP is not in the parent folder, set `PATCH_ZIP` to its actual path. Review the diff before committing or deploying. The new migration is added to the repository but is **not applied to Supabase** by these commands.

## Validation commands

After applying the patch, run:

```bash
npx tsc --noEmit
npm run lint
npm run build
npm test
```

Use the actual output from your full repository as the source of truth. These commands have not been run against your complete local checkout in this environment.

## Checks performed here

- Isolated TypeScript check of the modified page, API, and helper with temporary declarations: passed. This is not the same as a full-project TypeScript check.
- Seven focused academic-promotion helper tests: passed against the current helper source.
- Static scan for malformed SQL tokens noted in the task (`THENRAISE`, `TOAUTHENTICATED`, and `)TO AUTHENTICATED`): passed.
- Full build, repository lint/test commands, PostgreSQL parsing, database integration tests, and remote Supabase verification: not run. The supplied source archive omitted the repository scripts, public assets, and tests, and this environment has no PostgreSQL tooling or live database connection.

## Database and production safety

- No migration was executed and no remote Supabase data was changed.
- Do not apply the new migration to a shared or production database until the deployed schema and `supabase_migrations.schema_migrations` history have been inspected, along with shared credit rules, promotion logs, target batch mappings, and function grants.
- Validate the migration in a disposable/local Supabase environment and test a realistic promotion transaction before production approval.
- The earlier migration `20261010030000_semester_wide_academic_promotion.sql` deletes older duplicate credit-rule rows when their values match. If that migration has already been applied, confirm a backup or other recovery source exists before assuming those deleted rows can be recovered.
- The production RPC still depends on the project's actual schema and prior migration sequence; static SQL review is not proof that PostgreSQL will accept or execute it correctly.
