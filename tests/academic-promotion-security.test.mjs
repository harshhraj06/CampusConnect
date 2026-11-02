import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const migration = readFileSync(new URL('../supabase/migrations/20261009193000_student_academic_promotion.sql', import.meta.url), 'utf8');
const creditMigration = readFileSync(new URL('../supabase/migrations/20261009200000_credit-promotion-and-personal-announcements.sql', import.meta.url), 'utf8');
const route = readFileSync(new URL('../app/api/admin/academic-promotion/route.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/academic-promotion-module.tsx', import.meta.url), 'utf8');
const personalRoute = readFileSync(new URL('../app/api/personal-announcements/route.ts', import.meta.url), 'utf8');
const personalPage = readFileSync(new URL('../app/announcements/personal/page.tsx', import.meta.url), 'utf8');
const modules = readFileSync(new URL('../app/campus-modules.tsx', import.meta.url), 'utf8');

test('promotion RPCs require an authenticated active Main Admin and have locked-down grants', () => {
  assert.match(creditMigration, /public\.current_campus_role\(\) is distinct from 'Main Admin'/i);
  assert.match(creditMigration, /auth\.uid\(\) is null/i);
  assert.match(creditMigration, /security definer\s+set search_path = ''/i);
  assert.match(creditMigration, /revoke all on function public\.admin_promote_students\(uuid, uuid, uuid\[\], text\) from public, anon, authenticated/i);
  assert.match(route, /allowedRoles:\s*\['Main Admin'\]/);
});

test('credit rule enforces minimum <= total and student credits cannot exceed total', () => {
  assert.match(creditMigration, /p_minimum_credits > p_total_credits/i);
  assert.match(creditMigration, /p_credits_earned > v_rule\.total_credits/i);
  assert.match(page, /Minimum Credits Required/i);
  assert.match(page, /Total Semester Credits/i);
});

test('promotion requires verified passing result and minimum credits unless an audited admin override is supplied', () => {
  assert.match(creditMigration, /ar\.result_verified is true and ar\.exam_status='pass' and ar\.credits_earned>=v_rule\.minimum_credits/i);
  assert.match(creditMigration, /override_reason/);
  assert.match(creditMigration, /admin_promote_students_with_credits/);
  assert.match(page, /Required Override Reason/i);
});

test('promotion preserves old batch memberships and writes an audit trail', () => {
  assert.match(migration, /insert into public\.attendance_batch_students/i);
  assert.match(migration, /on conflict \(batch_id, student_id\) do nothing/i);
  assert.doesNotMatch(migration, /delete from public\.attendance_batch_students/i);
  assert.match(creditMigration, /student_academic_promotion_log/);
});

test('personal announcements are private, bounded, and role-checked', () => {
  assert.match(creditMigration, /create table if not exists public\.student_personal_announcements/i);
  assert.match(creditMigration, /revoke all on public\.student_personal_announcements from public,anon,authenticated/i);
  assert.match(personalRoute, /'Main Admin'/);
  assert.match(personalRoute, /eq\('student_id', actor\.id\)/);
  assert.match(personalPage, /Personal Announcements Center/);
});

test('both workspaces are integrated in CampusConnect', () => {
  assert.match(modules, /AcademicPromotionModule/);
  assert.match(modules, /PersonalAnnouncementsModule/);
});
