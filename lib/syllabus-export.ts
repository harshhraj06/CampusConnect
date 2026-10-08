import { clock, csvCell, hours, type PlannerDocument, type Session } from './syllabus-calendar';
export type ExportContext = { subjectCode: string; subjectName: string; batch: string; facultyName: string; saved: boolean; revision: number };
export type ExportRow = [string, string, string, string, string, string, number];
export function scheduleRows(sessions: Session[]): ExportRow[] {
  return sessions.flatMap(s => {
    const rows: ExportRow[] = s.segments.map(p => [s.date, clock(p.start), clock(p.start + p.minutes), s.extra ? 'Extra' : 'Regular', p.unit, p.title, p.minutes]);
    const used = s.segments.reduce((n, p) => n + p.minutes, 0);
    if (used < s.minutes) rows.push([s.date, clock(s.start + used), clock(s.start + s.minutes), s.extra ? 'Extra' : 'Regular', '', s.revision ? 'Revision / assessment' : 'Unallocated buffer', s.minutes - used]);
    return rows;
  });
}
export const exportHeadings = ['Date', 'Start', 'End', 'Class', 'Module / unit', 'Topic / activity', 'Minutes'];
export function exportMetadata(doc: PlannerDocument, context: ExportContext): [string, string][] {
  if (!context.facultyName.trim()) throw new Error('Enter the faculty name before downloading.');
  return [
    ['CampusConnect Pro', 'Smart Syllabus Planner'], ['Faculty', context.facultyName.trim()],
    ['Subject', `${context.subjectCode} - ${context.subjectName}`], ['Batch / section', context.batch],
    ['Semester dates', `${doc.config.start} to ${doc.config.end}`],
    ['Plan status', context.saved ? `Saved plan - version ${context.revision}` : 'Draft / unsaved plan - verify coverage'],
    ['Planned topic teaching', hours(doc.topics.reduce((n, t) => n + t.minutes, 0))],
    ['Document module total', doc.source?.moduleMinutes.length ? hours(doc.source.moduleMinutes.reduce((n, u) => n + u.minutes, 0)) : 'Not specified'],
    ['Source file', doc.source?.fileName || 'Existing syllabus / manual entry'],
    ['Source course header', doc.source?.hoursLabel || 'Not specified'],
    ['Allocation method', doc.source?.moduleMinutes.length ? 'Document module hours split across topics; editable estimates. SL hours are not added to module teaching.' : 'Faculty-entered topic teaching times.'],
  ];
}
export function brandedCsv(doc: PlannerDocument, sessions: Session[], context: ExportContext): string {
  const meta = exportMetadata(doc, context);
  const rows: (string | number)[][] = [...meta.map(([a, b]) => [a, b, '', '', '', '', '']), [], exportHeadings, ...scheduleRows(sessions)];
  rows.push([], ['SYLLABUS TOPICS'], ['Order', 'Module / unit', 'Topic', 'Minutes', 'Hours']);
  doc.topics.forEach((t, i) => rows.push([i + 1, t.unit, t.title, t.minutes, Number((t.minutes / 60).toFixed(4))]));
  if (doc.source) { rows.push([], ['SOURCE DOCUMENT TEXT']); for (const line of doc.source.text.split('\n')) rows.push([line]); }
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
export function saveBlob(blob: Blob, filename: string) {
  const link = document.createElement('a'); const url = URL.createObjectURL(blob);
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** App runtime exports use CampusConnect's existing SheetJS dependency. */
export async function downloadExcel(doc: PlannerDocument, sessions: Session[], context: ExportContext, filename: string) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const metadata = exportMetadata(doc, context);
  const rows = [[metadata[0].join(' - ')], ...metadata.slice(1), [], exportHeadings, ...scheduleRows(sessions)];
  const schedule = XLSX.utils.aoa_to_sheet(rows);
  schedule['!cols'] = [{ wch: 26 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 42 }, { wch: 72 }, { wch: 12 }];
  schedule['!merges'] = metadata.map((_, r) => ({ s: { r, c: r === 0 ? 0 : 1 }, e: { r, c: 6 } }));
  schedule['!autofilter'] = { ref: `A${metadata.length + 2}:G${rows.length}` };
  XLSX.utils.book_append_sheet(workbook, schedule, 'Teaching calendar');
  const syllabusRows = [['CampusConnect Pro - Syllabus and teaching hours'], ['Faculty', context.facultyName], [], ['Order', 'Module / unit', 'Topic', 'Minutes', 'Hours'], ...doc.topics.map((t, i) => [i + 1, t.unit, t.title, t.minutes, t.minutes / 60])];
  const syllabus = XLSX.utils.aoa_to_sheet(syllabusRows);
  syllabus['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 1 }, e: { r: 1, c: 4 } }];
  syllabus['!cols'] = [{ wch: 24 }, { wch: 48 }, { wch: 90 }, { wch: 12 }, { wch: 12 }];
  syllabus['!autofilter'] = { ref: `A4:E${syllabusRows.length}` };
  for (let r = 5; r <= syllabusRows.length; r++) if (syllabus[`E${r}`]) syllabus[`E${r}`].z = '0.00';
  XLSX.utils.book_append_sheet(workbook, syllabus, 'Syllabus');
  if (doc.source) {
    const source = XLSX.utils.aoa_to_sheet([['CampusConnect Pro - Source document'], [`Faculty: ${context.facultyName}`], [`File: ${doc.source.fileName || ''}`], [], ...doc.source.text.split('\n').map(line => [line])]);
    source['!cols'] = [{ wch: 120 }]; XLSX.utils.book_append_sheet(workbook, source, 'Source document');
  }
  workbook.Props = { Title: 'CampusConnect Pro - Smart Syllabus Planner', Author: context.facultyName, Subject: context.subjectName };
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}
