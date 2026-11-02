import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20261009190000_legal_documents.sql", import.meta.url), "utf8");
const adminRoute = await readFile(new URL("../app/api/admin/legal/[slug]/route.ts", import.meta.url), "utf8");
const publicRoute = await readFile(new URL("../app/api/legal/[slug]/route.ts", import.meta.url), "utf8");

test("public RPC is limited to published privacy and terms snapshots", () => {
  const rpc = migration.match(/create or replace function public\.get_published_legal_document[\s\S]*?\$\$;/)?.[0];
  assert.ok(rpc);
  assert.match(rpc, /status = 'published'/);
  assert.match(rpc, /p_slug in \('privacy', 'terms'\)/);
  assert.doesNotMatch(rpc, /draft_(title|introduction|sections|meta_description)/);
  assert.match(migration, /grant execute on function public\.get_published_legal_document\(text\) to anon, authenticated/);
  assert.match(publicRoute, /get_published_legal_document/);
});

test("all privileged RPCs require authenticated active Main Admin", () => {
  const protectedFunctions = [
    "get_legal_document_for_admin",
    "get_legal_document_revisions_by_slug",
    "get_legal_document_revision_by_slug",
    "update_legal_document_by_slug",
  ];
  for (const functionName of protectedFunctions) {
    const functionSql = migration.match(new RegExp(`create or replace function public\\.${functionName}[\\s\\S]*?\\$\\$;`))?.[0];
    assert.ok(functionSql, `${functionName} definition exists`);
    assert.match(functionSql, /auth\.uid\(\) is null/);
    assert.match(functionSql, /current_campus_role\(\).*'Main Admin'/);
    assert.match(functionSql, /account_status.*'Active'/);
  }
  assert.match(adminRoute, /allowedRoles: \['Main Admin'\]/);
});

test("draft saves leave published columns untouched and every save is recoverable", () => {
  const update = migration.match(/create or replace function public\.update_legal_document_by_slug[\s\S]*?\$\$;/)?.[0];
  assert.ok(update);
  assert.match(update, /if p_action = 'publish' then[\s\S]*?title = p_title[\s\S]*?draft_title = null[\s\S]*?else[\s\S]*?draft_title = p_title/);
  assert.match(update, /insert into public\.legal_document_revisions/);
  assert.match(update, /current_version = v_version/);
  assert.match(update, /published_by = auth\.uid\(\)/);
});

test("direct table access is revoked and rich text is constrained", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.legal_documents, public\.legal_document_revisions from public, anon, authenticated/);
  assert.match(migration, /Legal links require safe HTTP, HTTPS, or mailto URLs/);
  assert.match(migration, /Unsupported legal content block/);
  assert.match(migration, /drop function if exists public\.update_legal_document\(/);
});
