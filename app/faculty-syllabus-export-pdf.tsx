"use client";
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { exportMetadata, scheduleRows, saveBlob, type ExportContext } from '../lib/syllabus-export';
import type { PlannerDocument, Session } from '../lib/syllabus-calendar';
const clean = (s: string) => s.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\u00a0/g, ' ');
const styles = StyleSheet.create({
  page: { paddingTop: 88, paddingBottom: 45, paddingHorizontal: 32, fontFamily: 'Helvetica', fontSize: 9, color: '#20394a' },
  header: { position: 'absolute', top: 25, left: 32, right: 32, borderBottomWidth: 1, borderBottomColor: '#cad5dc', paddingBottom: 10 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold' }, sub: { fontSize: 9, marginTop: 5, color: '#536977' },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 8, color: '#607280', textAlign: 'right' },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 12, marginTop: 4 },
  meta: { flexDirection: 'row', marginBottom: 5 }, label: { width: 126, fontFamily: 'Helvetica-Bold' }, value: { flex: 1 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#dde4e7', paddingVertical: 6 },
  head: { backgroundColor: '#edf2f0', fontFamily: 'Helvetica-Bold', paddingVertical: 7 },
  cell: { paddingHorizontal: 5, fontSize: 9, lineHeight: 1.2, letterSpacing: 0 }, body: { fontSize: 9, lineHeight: 1.2, marginBottom: 3 },
});
function Header({ context }: { context: ExportContext }) {
  return <View fixed style={styles.header}><Text style={styles.brand}>CampusConnect Pro</Text><Text style={styles.sub}>{clean(`Smart Syllabus Planner | Faculty: ${context.facultyName} | ${context.subjectCode}`)}</Text></View>;
}
function Footer() { return <Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `CampusConnect Pro | ${pageNumber} / ${totalPages}`} />; }
export function SyllabusPdf({ document: doc, sessions, context }: { document: PlannerDocument; sessions: Session[]; context: ExportContext }) {
  const metadata = exportMetadata(doc, context); const widths = [62, 76, 45, 180, 350, 55];
  return <Document title="CampusConnect Pro - Smart Syllabus Planner" author={context.facultyName}>
    <Page size="A4" orientation="landscape" style={styles.page}><Header context={context} /><Footer /><Text style={styles.title}>Teaching calendar</Text>
      {metadata.slice(1).map(([label, value]) => <View key={label} style={styles.meta}><Text style={styles.label}>{clean(label)}</Text><Text style={styles.value}>{clean(value)}</Text></View>)}
      <View style={[styles.row, styles.head]}>{['Date', 'Time', 'Class', 'Module / unit', 'Topic / activity', 'Minutes'].map((v, i) => <Text key={v} style={[styles.cell, { width: widths[i] }]}>{v}</Text>)}</View>
      {scheduleRows(sessions).map((r, n) => <View key={n} wrap={false} style={styles.row}>{[r[0], `${r[1]}-${r[2]}`, r[3], r[4], r[5], String(r[6])].map((v, i) => <Text key={i} style={[styles.cell, { width: widths[i] }]}>{clean(v)}</Text>)}</View>)}
    </Page>
    <Page size="A4" orientation="landscape" style={styles.page}><Header context={context} /><Footer /><Text style={styles.title}>Syllabus and allocated teaching time</Text>
      <View style={[styles.row, styles.head]}>{['Module / unit', 'Topic', 'Minutes'].map((v, i) => <Text key={v} style={[styles.cell, { width: [190, 520, 58][i] }]}>{v}</Text>)}</View>
      {doc.topics.map(t => <View key={t.id} wrap={false} style={styles.row}><Text style={[styles.cell, { width: 190 }]}>{clean(t.unit)}</Text><Text style={[styles.cell, { width: 520 }]}>{clean(t.title)}</Text><Text style={[styles.cell, { width: 58 }]}>{t.minutes}</Text></View>)}
    </Page>
    {!!doc.source?.text && <Page size="A4" style={styles.page}><Header context={context} /><Footer /><Text style={styles.title}>Source document - extracted text</Text><Text style={styles.body}>{clean(doc.source.fileName || '')}</Text><Text style={styles.body}>Includes course information, learning objectives, outcomes, assessment details and references as extracted. Source formatting may differ from the original PDF.</Text>{doc.source.text.split('\n').map((line, i) => <Text key={i} style={styles.body}>{clean(line) || ' '}</Text>)}</Page>}
  </Document>;
}
export async function downloadPlannerPdf(document: PlannerDocument, sessions: Session[], context: ExportContext, filename: string) {
  saveBlob(await pdf(<SyllabusPdf document={document} sessions={sessions} context={context} />).toBlob(), filename);
}
