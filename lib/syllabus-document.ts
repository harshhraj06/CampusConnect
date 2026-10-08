/** Source-grounded extraction for text PDFs with explicit module-hour headings.
 * Other layouts continue through the existing authenticated AI extraction. */
export type ExtractedUnit = { unitNumber: number; title: string; description: string; hours: number | null; topics: { topicOrder: number; title: string; description: string }[] };
export type ExtractedSyllabus = { documentTitle: string; detectedSubject: string; units: ExtractedUnit[]; warnings: string[]; metadata?: SyllabusSource };
export type SyllabusSource = {
  fileName?: string; courseTitle: string; courseCode: string; semester: string;
  credits: string; hoursLabel: string; moduleMinutes: { unit: string; minutes: number }[];
  text: string;
};
const normal = (s: string) => s.replace(/\s+/g, ' ').trim();
export function cleanSyllabusText(text: string): string {
  return text.replace(/\u0000/g, '').split(/\r?\n/).filter(line => !/^(?:Department of Electronics and Communication|Engineering\s*$|Autonomous Scheme\b|RNS Institute of Technology\s+Page\s+\d+|RN Shetty Trust)/i.test(line.trim())).join('\n');
}
export function sourceMetadata(text: string, units: ExtractedUnit[]): SyllabusSource {
  const flat = normal(text);
  return {
    courseTitle: normal(flat.match(/Course\s+Title\s+(.+?)\s+Course\s+Code\b/i)?.[1] || ''),
    courseCode: flat.match(/Course\s+Code\s+([A-Z0-9-]+)/i)?.[1] || '',
    semester: flat.match(/SEMESTER\s*[-–—:]?\s*([IVX]+|\d+)/i)?.[1] || '',
    credits: flat.match(/Credits\s+(\d+(?:\.\d+)?)/i)?.[1] || '',
    hoursLabel: flat.match(/\([^)]*\)\s*\+\s*\d+(?:\.\d+)?\s*Hours\s*\/\s*Sem/i)?.[0] || flat.match(/\d+(?:\.\d+)?\s*Hours\s*\/\s*Sem/i)?.[0] || '',
    moduleMinutes: units.filter(u => u.hours !== null && u.hours > 0).map(u => ({ unit: `Module ${u.unitNumber} · ${u.title}`, minutes: Math.round(u.hours! * 60) })),
    text: text.slice(0, 60000),
  };
}
function splitTopics(body: string): string[] {
  // References remain in full module/source text, not as scheduled lessons.
  const clean = normal(body.replace(/\((?:Selected topics|Text\s*\d+\s*:)[\s\S]*?\)\.?/gi, '; ')).replace(/Micro,\s*Small,?\s*and\s*Medium/gi, value => value.replace(/,/g, '\uE000'));
  const pieces: string[] = []; let part = '', depth = 0;
  for (let index = 0; index < clean.length; index++) {
    const character = clean[index];
    const next = clean.slice(index + 1).trimStart();
    if (character === '(') depth++;
    if (character === ')') depth = Math.max(0, depth - 1);
    if ((character === ';' || (character === ',' && !/^(?:a |an |and |\d)/i.test(next)) || (character === '.' && /^[A-Z]/.test(next))) && depth === 0) {
      if (part.trim()) pieces.push(part.trim()); part = '';
    } else part += character;
  }
  if (part.trim()) pieces.push(part.trim());
  // Preserve long text without silently truncating any source content.
  let section = '';
  return pieces.flatMap(rawPiece => {
    let piece = rawPiece.replace(/\uE000/g, ',');
    const match = piece.match(/^([^:]{2,100}):\s*(.+)$/);
    if (match) section = match[1];
    else if (section) piece = section + ': ' + piece;
    const chunks: string[] = []; let rest = piece;
    while (rest.length > 230) { let cut = rest.lastIndexOf(' ', 230); if (cut < 80) cut = 230; chunks.push(rest.slice(0, cut)); rest = rest.slice(cut).trim(); }
    if (rest) chunks.push(rest); return chunks;
  });
}
export function parseModuleSyllabus(text: string): ExtractedSyllabus | null {
  const cleaned = cleanSyllabusText(text);
  const heading = /\b(?:Module|Unit)\s*[-–—:]?\s*(\d+)\s+([^\n]*?)\s+(\d+(?:\.\d+)?)\s*(?:hrs?\.?|hours?)\b/gi;
  const matches = [...cleaned.matchAll(heading)];
  // Handle only unambiguous sequential headings with explicit hours.
  if (!matches.length || matches.length > 40 || matches.some((m, i) => Number(m[1]) !== i + 1)) return null;
  const units: ExtractedUnit[] = matches.map((match, i) => {
    let body = cleaned.slice(match.index! + match[0].length, matches[i + 1]?.index ?? cleaned.length);
    if (i === matches.length - 1) body = body.split(/\b(?:Course\s+Outcomes|Assessment\s+Details|Text\s*Books|Reference\s*Books)\s*:/i)[0];
    const topics = splitTopics(body);
    return { unitNumber: Number(match[1]), title: normal(match[2]), hours: Number(match[3]), description: normal(body), topics: topics.map((title, n) => ({ topicOrder: n + 1, title, description: '' })) };
  });
  if (units.some(u => !u.title || !u.topics.length || !u.hours || u.hours > 1000 || u.topics.length > 100) || units.reduce((n, u) => n + u.topics.length, 0) > 300) return null;
  const metadata = sourceMetadata(text, units);
  return {
    documentTitle: metadata.courseTitle, detectedSubject: `${metadata.courseCode} ${metadata.courseTitle}`.trim(), units, metadata,
    warnings: ['Module hours were read from the document. Topic minutes are an editable equal-share allocation within each module, not official topic-level timings.', ...(metadata.hoursLabel.includes('+') ? ['The + SL hours in the course header are retained as source information and are not added to module teaching hours.'] : [])],
  };
}
export function distributeMinutes(total: number, count: number): number[] {
  if (!Number.isInteger(total) || !Number.isInteger(count) || count < 1 || total < count) throw new Error('Module time is too short to assign at least one minute to every topic.');
  const base = Math.floor(total / count), remainder = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}
