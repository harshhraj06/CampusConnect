import type { SyllabusSource } from "./syllabus-document";
/** Calendar dates and wall-clock times are interpreted in the campus timezone.
 * UTC arithmetic deliberately avoids browser timezone / DST date shifts. */
export type Topic = { id: string; unit: string; title: string; minutes: number };
export type WeeklyClass = { id: string; day: number; start: string; minutes: number };
export type ExtraClass = { id: string; date: string; start: string; minutes: number };
export type CalendarConfig = {
  start: string; end: string; weekly: WeeklyClass[]; extras: ExtraClass[];
  excluded: string[]; reserve: number;
};
export type PlannerDocument = { version: 1; topics: Topic[]; config: CalendarConfig; facultyName?: string; source?: SyllabusSource };
export type Segment = { topicId: string; unit: string; title: string; start: number; minutes: number };
export type Session = {
  id: string; date: string; start: number; minutes: number; extra: boolean;
  revision: boolean; segments: Segment[];
};
export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') && Number.isFinite(Date.parse(value + 'T00:00:00Z')) &&
    new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
}
export function timeMinutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [h, m] = value.split(':').map(Number); return h * 60 + m;
}
export function clock(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
export function hours(minutes: number): string { return `${Number((minutes / 60).toFixed(2))} h`; }
export function displayDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
}
export function buildCalendar(config: CalendarConfig, topics: Topic[]) {
  const errors: string[] = [];
  const sessions: Session[] = [];
  const integer = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  if (!validDate(config.start) || !validDate(config.end) || config.end < config.start) errors.push('Choose a valid semester start and end date.');
  else if ((Date.parse(config.end) - Date.parse(config.start)) / 86400000 > 365) errors.push('Plan at most 366 calendar days at a time.');
  if (config.weekly.length > 35 || config.extras.length > 100) errors.push('Use at most 35 weekly slots and 100 extra classes.');
  const slotIds = [...config.weekly, ...config.extras].map(s => s.id);
  if (new Set(slotIds).size !== slotIds.length || slotIds.some(id => !id || id.length > 80)) errors.push('Class slots must have unique identifiers.');
  if (config.excluded.length > 366) errors.push('Use at most 366 excluded dates.');
  if (!integer(config.reserve, 0, 50)) errors.push('Reserve between 0 and 50 final classes for revision.');
  if (config.excluded.some(d => !validDate(d) || d < config.start || d > config.end)) errors.push('Holidays and cancelled dates must fall within the semester.');
  if (!topics.length || topics.length > 300) errors.push('Add between 1 and 300 syllabus topics.');
  if (new Set(topics.map(t => t.id)).size !== topics.length || topics.some(t => !t.id)) errors.push('Each topic must have a unique identifier.');
  if (topics.some(t => !t.unit.trim() || t.unit.length > 240 || !t.title.trim() || t.title.length > 240 || !integer(t.minutes, 1, 6000))) errors.push('Give every topic a unit, a title, and 1–6000 whole teaching minutes.');
  const checkSlot = (s: WeeklyClass | ExtraClass) => Number.isFinite(timeMinutes(s.start)) && integer(s.minutes, 5, 480) && timeMinutes(s.start) + s.minutes <= 1440;
  if (config.weekly.some(s => !integer(s.day, 0, 6) || !checkSlot(s)) || config.extras.some(s => !checkSlot(s))) errors.push('Classes need a valid start time and 5–480 minutes; they cannot run past midnight.');
  if (config.extras.some(s => !validDate(s.date) || s.date < config.start || s.date > config.end)) errors.push('Extra classes must fall within the semester.');
  if (config.extras.some(s => config.excluded.includes(s.date))) errors.push('An extra class falls on an excluded date. Remove that exclusion or move the extra class.');
  if (errors.length) return { errors, sessions, available: 0, teaching: 0, required: 0, shortfall: 0, remaining: [] as Topic[] };
  const excluded = new Set(config.excluded);
  for (let stamp = Date.parse(config.start); stamp <= Date.parse(config.end); stamp += 86400000) {
    const date = new Date(stamp).toISOString().slice(0, 10);
    if (excluded.has(date)) continue;
    config.weekly.filter(s => s.day === new Date(stamp).getUTCDay()).forEach((s, i) => sessions.push({ id: `${date}-regular-${i}`, date, start: timeMinutes(s.start), minutes: s.minutes, extra: false, revision: false, segments: [] }));
  }
  config.extras.forEach((s, i) => sessions.push({ id: `${s.date}-extra-${i}`, date: s.date, start: timeMinutes(s.start), minutes: s.minutes, extra: true, revision: false, segments: [] }));
  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  for (let i = 1; i < sessions.length; i++) {
    const a = sessions[i - 1], b = sessions[i];
    if (a.date === b.date && a.start + a.minutes > b.start) errors.push(`Classes overlap on ${b.date} at ${clock(b.start)}.`);
  }
  if (!sessions.length) errors.push('No classes fall within these dates. Add a weekday slot or an extra class.');
  if (config.reserve >= sessions.length && config.reserve > 0) errors.push('Leave at least one class for syllabus teaching.');
  if (sessions.length > 2000) errors.push('This plan exceeds 2000 class sessions. Shorten the date range.');
  if (errors.length) return { errors: [...new Set(errors)], sessions: [] as Session[], available: 0, teaching: 0, required: 0, shortfall: 0, remaining: [] as Topic[] };
  const available = sessions.reduce((n, s) => n + s.minutes, 0);
  let topicIndex = 0, consumed = 0;
  sessions.forEach((s, i) => {
    s.revision = i >= sessions.length - config.reserve;
    if (s.revision) return;
    let free = s.minutes, offset = 0;
    while (free > 0 && topicIndex < topics.length) {
      const t = topics[topicIndex];
      const minutes = Math.min(free, t.minutes - consumed);
      s.segments.push({ topicId: t.id, unit: t.unit, title: t.title, start: s.start + offset, minutes });
      free -= minutes; offset += minutes; consumed += minutes;
      if (consumed === t.minutes) { topicIndex++; consumed = 0; }
    }
  });
  const teaching = sessions.filter(s => !s.revision).reduce((n, s) => n + s.minutes, 0);
  const required = topics.reduce((n, t) => n + t.minutes, 0);
  const remaining = topics.slice(topicIndex).map((t, i) => ({ ...t, minutes: t.minutes - (i === 0 ? consumed : 0) }));
  return { errors, sessions, available, teaching, required, shortfall: Math.max(0, required - teaching), remaining };
}
export function csvCell(value: string | number): string {
  const str = String(value);
  return '"' + (/^[\s]*[=+@-]/.test(str) ? "'" : '') + str.replace(/"/g, '""') + '"';
}
export function calendarCsv(sessions: Session[]): string {
  const rows: (string | number)[][] = [['Date', 'Start', 'End', 'Class type', 'Unit', 'Topic', 'Minutes']];
  for (const s of sessions) {
    for (const p of s.segments) rows.push([s.date, clock(p.start), clock(p.start + p.minutes), s.extra ? 'Extra' : 'Regular', p.unit, p.title, p.minutes]);
    const used = s.segments.reduce((n, p) => n + p.minutes, 0);
    if (used < s.minutes) rows.push([s.date, clock(s.start + used), clock(s.start + s.minutes), s.extra ? 'Extra' : 'Regular', '', s.revision ? 'Revision / assessment' : 'Unallocated buffer', s.minutes - used]);
  }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
