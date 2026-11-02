import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(new URL("../supabase/migrations/20261011030000_academic_promotion_notifications.sql", import.meta.url), "utf8");
const center = await readFile(new URL("../app/unified-notification-center.tsx", import.meta.url), "utf8");

test("successful promotion log entries create an idempotent student notification", () => {
  assert.match(migration, /after insert on public\.student_academic_promotion_log/);
  assert.match(migration, /create_academic_promotion_notification/);
  assert.match(migration, /on conflict \(promotion_log_id\) do nothing/);
  assert.match(migration, /insert into public\.student_academic_promotion_notifications/);
});

test("promotion notifications are restricted to the owning student", () => {
  assert.match(migration, /enable row level security/);
  assert.match(migration, /using \(student_id = \(select auth\.uid\(\)\)\)/);
  assert.match(migration, /with check \(student_id = \(select auth\.uid\(\)\)\)/);
  assert.match(migration, /revoke all on public\.student_academic_promotion_notifications from public, anon, authenticated/);
  assert.match(migration, /grant update \(read_at\) on public\.student_academic_promotion_notifications to authenticated/);
});

test("notification center loads, categorizes, refreshes, and marks promotions read", () => {
  assert.match(center, /from\("student_academic_promotion_notifications"\)/);
  assert.match(center, /category: "academic"/);
  assert.match(center, /ACADEMIC PROGRESSION/);
  assert.match(center, /markPromotionNotificationRead/);
  assert.match(center, /student_academic_promotion_notifications/);
});
