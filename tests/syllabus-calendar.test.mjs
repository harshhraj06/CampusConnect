import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendar, calendarCsv, validDate } from '../lib/syllabus-calendar.ts';
const topic = (id, minutes) => ({ id, unit: 'Unit 1', title: `Topic ${id}`, minutes });
const config = (patch = {}) => ({ start: '2026-09-28', end: '2026-10-05', weekly: [{ id: 'm', day: 1, start: '09:00', minutes: 60 }], extras: [], excluded: [], reserve: 0, ...patch });
test('inclusive dates allocate exact minutes across two classes', () => {
  const r = buildCalendar(config(), [topic('a', 90), topic('b', 30)]);
  assert.deepEqual(r.errors, []); assert.equal(r.sessions.length, 2);
  assert.deepEqual(r.sessions[1].segments.map(x => [x.title, x.start, x.minutes]), [['Topic a', 540, 30], ['Topic b', 570, 30]]);
  assert.equal(r.shortfall, 0);
});
test('holiday removes capacity; an extra class restores it', () => {
  const r = buildCalendar(config({ excluded: ['2026-09-28'], extras: [{ id: 'x', date: '2026-09-29', start: '14:00', minutes: 90 }] }), [topic('a', 150)]);
  assert.equal(r.teaching, 150); assert.equal(r.sessions[0].extra, true); assert.equal(r.shortfall, 0);
});
test('shortfall preserves all unallocated topic minutes', () => {
  const r = buildCalendar(config(), [topic('a', 150), topic('b', 45)]);
  assert.equal(r.shortfall, 75); assert.deepEqual(r.remaining.map(t => t.minutes), [30, 45]);
});
test('final revision class is not allocated to syllabus', () => {
  const r = buildCalendar(config({ reserve: 1 }), [topic('a', 60)]);
  assert.equal(r.teaching, 60); assert.equal(r.sessions[1].revision, true); assert.equal(r.sessions[1].segments.length, 0);
});
test('overlaps rejected, adjacent sessions accepted', () => {
  assert.match(buildCalendar(config({ extras: [{ id: 'x', date: '2026-09-28', start: '09:30', minutes: 60 }] }), [topic('a', 60)]).errors.join(), /overlap/);
  assert.deepEqual(buildCalendar(config({ extras: [{ id: 'x', date: '2026-09-28', start: '10:00', minutes: 60 }] }), [topic('a', 60)]).errors, []);
});
test('extra class cannot silently disappear on an excluded day', () => {
  const r = buildCalendar(config({ excluded: ['2026-09-29'], extras: [{ id: 'x', date: '2026-09-29', start: '09:00', minutes: 60 }] }), [topic('a', 60)]);
  assert.match(r.errors.join(), /excluded/);
});
test('rejects out-of-range dates, invalid dates, backwards dates and zero durations', () => {
  assert.equal(validDate('2026-02-30'), false); assert.equal(validDate('2028-02-29'), true);
  for (const c of [config({ end: '2026-09-01' }), config({ end: '2028-01-01' }), config({ extras: [{ id: 'x', date: '2026-09-27', start: '09:00', minutes: 60 }] }), config({ weekly: [{ id: 'm', day: 1, start: '23:30', minutes: 60 }] })]) assert.ok(buildCalendar(c, [topic('a', 60)]).errors.length);
  assert.ok(buildCalendar(config(), [topic('a', 0)]).errors.length);
});
test('unused time becomes buffer, not inflated topic duration', () => {
  const r = buildCalendar(config(), [topic('a', 15)]);
  assert.equal(r.required, 15); assert.equal(r.sessions[0].segments[0].minutes, 15); assert.equal(r.sessions[1].segments.length, 0);
  assert.match(calendarCsv(r.sessions), /Unallocated buffer/);
});
test('CSV protects formula-looking titles and escapes quotes', () => {
  const r = buildCalendar(config(), [{ ...topic('a', 10), title: '=HYPERLINK("unsafe")' }]);
  assert.match(calendarCsv(r.sessions), /'=HYPERLINK\(""unsafe""\)/);
});
test('leap-day, weekends, and DST do not shift campus dates', () => {
  const c = config({ start: '2028-02-28', end: '2028-03-05', weekly: [{ id: 't', day: 2, start: '08:00', minutes: 45 }, { id: 's', day: 0, start: '10:00', minutes: 45 }] });
  assert.deepEqual(buildCalendar(c, [topic('a', 90)]).sessions.map(s => s.date), ['2028-02-29', '2028-03-05']);
});
test('multiple weekly classes are sorted; topic order remains authoritative', () => {
  const c = config({ end: '2026-09-28', weekly: [{ id: 'b', day: 1, start: '11:00', minutes: 30 }, { id: 'a', day: 1, start: '09:00', minutes: 30 }] });
  const r = buildCalendar(c, [topic('z', 30), topic('a', 30)]);
  assert.deepEqual(r.sessions.map(s => s.segments[0].topicId), ['z', 'a']);
});
test('cannot reserve every available session', () => assert.ok(buildCalendar(config({ reserve: 2 }), [topic('a', 60)]).errors.length));
test('no matching weekdays and duplicate topic identifiers are rejected', () => {
  assert.ok(buildCalendar(config({ weekly: [] }), [topic('a', 10)]).errors.length);
  assert.ok(buildCalendar(config(), [topic('a', 10), topic('a', 10)]).errors.length);
});
