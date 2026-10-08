"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

import * as XLSX from "xlsx";

import {
  getSupabaseClient,
} from "../lib/supabase";


type PlannerSubject = {
  id: string;
  batch_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  credits: number;
  faculty_id: string;
  faculty_name: string;
};


type PlannerBatch = {
  id: string;
  batch_name: string;
  section: string;
  department: string;
  academic_year: string;
  semester: string;
};


type PlannerTopic = {
  topicOrder: number;
  title: string;
  description: string;
};


type PlannerUnit = {
  unitNumber: number;
  title: string;
  description: string;
  topics: PlannerTopic[];
};


type PlannerDraft = {
  documentTitle: string;
  detectedSubject: string;
  units: PlannerUnit[];
  warnings: string[];
};


type SyllabusWorkload = {
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  selfLearningHours: number;
  semesterHours: number;
  detectedText: string;
};


type ScanPayload = {
  success?: boolean;
  sourceType?: string;
  fileName?: string;
  mimeType?: string;
  pages?: number;
  draft?: PlannerDraft;
  error?: string;
  message?: string;

  syllabusMeta?: {
    lectureHours?: number;
    tutorialHours?: number;
    practicalHours?: number;
    selfLearningHours?: number;
    semesterHours?: number;
    totalHours?: number;
    ltp?: string;
    ltpSl?: string;
  };

  rawText?: string;
  extractedText?: string;
  text?: string;
};


type RawFacultyTimetable = {
  id?: string;
  publicationId?: string;
  batchId?: string;
  batchName?: string;
  section?: string;
  department?: string;
  academicYear?: string;
  semester?: string;
  batchSubjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  facultyId?: string;
  facultyName?: string;
  dayOfWeek?: string;
  periodOrder?: number;
  startTime?: string;
  endTime?: string;
  room?: string;
  classType?: string;
  subgroup?: string;
};


type RawBatchTimetable = {
  id?: string;
  batch_id?: string;
  batch_subject_id?: string;
  faculty_id?: string;
  faculty_name?: string;
  day_of_week?: string;
  period_order?: number;
  start_time?: string;
  end_time?: string;
  room?: string;
  class_type?: string;
  subgroup?: string;
};


type TimetableEntry = {
  id: string;
  batchId: string;
  batchSubjectId: string;
  subjectName: string;
  subjectCode: string;
  facultyId: string;
  facultyName: string;
  dayOfWeek: string;
  periodOrder: number;
  startTime: string;
  endTime: string;
  room: string;
  classType: string;
  subgroup: string;
};


type TopicInfo = {
  unitNumber: number;
  unitTitle: string;
  topicOrder: number;
  topicTitle: string;
  topicDescription: string;
};


type ScheduleRow = {
  id: string;
  lessonNumber: number;
  classDate: string;
  dayOfWeek: string;
  periodOrder: number | null;
  startTime: string;
  endTime: string;
  room: string;
  classType: string;
  extraClass: boolean;
  unitNumber: number;
  unitTitle: string;
  topicOrder: number;
  topicTitle: string;
  topicDescription: string;
};


type Props = {
  subject: PlannerSubject;
  batch: PlannerBatch | null;

  onStatus: (
    value: string
  ) => void;

  onApplied: () =>
    void |
    Promise<void>;
};


const MAX_FILE_SIZE =
  20 * 1024 * 1024;


const ALLOWED_TYPES =
  new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);


const DAY_INDEX:
  Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };


const normalize =
  (
    value: unknown
  ) =>
    String(
      value ?? ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        ""
      );


const clean =
  (
    value: unknown
  ) =>
    String(
      value ?? ""
    ).trim();


const isoDate =
  (
    date: Date
  ) => {

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;
  };


const formatDate =
  (
    value: string
  ) => {

    if (!value) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(
      new Date(
        `${value}T00:00:00`
      )
    );
  };


const fileSlug =
  (
    value: string
  ) =>
    clean(
      value
    )
      .replace(
        /[^a-z0-9]+/gi,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .toLowerCase() ||
    "syllabus-plan";


const extractWorkloadMetadata =
  (
    value: unknown
  ): SyllabusWorkload => {

    const source =
      typeof value === "string"
        ? value
        : JSON.stringify(
            value ??
            ""
          );


    const normalized =
      source
        .replace(
          /\\n/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        );


    let lectureHours =
      0;

    let tutorialHours =
      0;

    let practicalHours =
      0;

    let selfLearningHours =
      0;

    let semesterHours =
      0;


    const ltpPatterns =
      [
        /L\s*[:\-]?\s*T\s*[:\-]?\s*P[^0-9]{0,35}\(?\s*(\d+)\s*[:\-]\s*(\d+)\s*[:\-]\s*(\d+)\s*\)?/i,

        /\(\s*L\s*:\s*T\s*:\s*P\s*\)\s*\+\s*SL\s*\(?\s*(\d+)\s*:\s*(\d+)\s*:\s*(\d+)\s*\)?/i,

        /LTP[^0-9]{0,20}(\d+)\s*[:\-]\s*(\d+)\s*[:\-]\s*(\d+)/i,
      ];


    for (
      const pattern
      of ltpPatterns
    ) {

      const match =
        normalized.match(
          pattern
        );


      if (match) {

        lectureHours =
          Number(
            match[1]
          ) ||
          0;

        tutorialHours =
          Number(
            match[2]
          ) ||
          0;

        practicalHours =
          Number(
            match[3]
          ) ||
          0;

        break;
      }
    }


    const semesterPatterns =
      [
        /(\d{1,3})\s*Hours?\s*\/\s*Sem(?:ester)?/i,

        /(\d{1,3})\s*Hours?\s*(?:per|\/)\s*Semester/i,

        /Total\s+(?:Teaching\s+)?Hours?[^0-9]{0,15}(\d{1,3})/i,

        /Semester\s+Hours?[^0-9]{0,15}(\d{1,3})/i,
      ];


    for (
      const pattern
      of semesterPatterns
    ) {

      const match =
        normalized.match(
          pattern
        );


      if (match) {

        semesterHours =
          Number(
            match[1]
          ) ||
          0;

        break;
      }
    }


    const slMatch =
      normalized.match(
        /SL[^0-9]{0,10}(\d+)\s*(?:Hours?|Hrs?)?/i
      );


    if (slMatch) {

      selfLearningHours =
        Number(
          slMatch[1]
        ) ||
        0;
    }


    return {
      lectureHours,
      tutorialHours,
      practicalHours,
      selfLearningHours,
      semesterHours,
      detectedText:
        normalized,
    };
  };


const downloadBlob =
  (
    blob: Blob,
    fileName: string
  ) => {

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      url;

    anchor.download =
      fileName;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    window.setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      1000
    );
  };


const pdfStyles =
  StyleSheet.create({

    page: {
      paddingTop: 0,
      paddingBottom: 42,
      paddingHorizontal: 0,
      fontFamily: "Helvetica",
      fontSize: 8,
      color: "#1b2638",
      backgroundColor: "#ffffff",
    },

    brandBand: {
      height: 9,
      backgroundColor: "#294fc7",
    },

    header: {
      paddingTop: 25,
      paddingHorizontal: 32,
      paddingBottom: 20,
      backgroundColor: "#f7f9fd",
      borderBottomWidth: 1,
      borderBottomColor: "#e5eaf3",
    },

    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 17,
    },

    brandBlock: {
      flexDirection: "column",
    },

    brand: {
      fontSize: 8,
      color: "#294fc7",
      fontFamily: "Helvetica-Bold",
      letterSpacing: 1.5,
      marginBottom: 3,
    },

    documentType: {
      fontSize: 6.5,
      color: "#7b8698",
      letterSpacing: 0.7,
    },

    badge: {
      borderWidth: 1,
      borderColor: "#d8e0f2",
      backgroundColor: "#ffffff",
      borderRadius: 12,
      paddingVertical: 5,
      paddingHorizontal: 10,
      fontSize: 6.5,
      color: "#40506c",
    },

    title: {
      fontSize: 22,
      lineHeight: 1.12,
      fontFamily: "Helvetica-Bold",
      color: "#182338",
      marginBottom: 6,
    },

    subtitle: {
      fontSize: 8,
      lineHeight: 1.45,
      color: "#6e7b90",
    },

    body: {
      paddingHorizontal: 32,
      paddingTop: 18,
    },

    metaGrid: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 9,
    },

    metaCard: {
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 45,
      borderWidth: 1,
      borderColor: "#e3e8f0",
      borderRadius: 7,
      paddingVertical: 8,
      paddingHorizontal: 9,
      backgroundColor: "#ffffff",
    },

    metaLabel: {
      fontSize: 5.5,
      fontFamily: "Helvetica-Bold",
      color: "#8c97a8",
      letterSpacing: 0.7,
      marginBottom: 4,
    },

    metaValue: {
      fontSize: 7.6,
      fontFamily: "Helvetica-Bold",
      color: "#26344b",
      lineHeight: 1.25,
    },

    summary: {
      marginTop: 6,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: "#dce6fb",
      borderRadius: 7,
      backgroundColor: "#f5f8ff",
      paddingVertical: 9,
      paddingHorizontal: 11,
    },

    summaryTitle: {
      fontSize: 6,
      fontFamily: "Helvetica-Bold",
      color: "#294fc7",
      letterSpacing: 0.7,
      marginBottom: 3,
    },

    summaryText: {
      fontSize: 7,
      lineHeight: 1.45,
      color: "#58667d",
    },

    table: {
      borderWidth: 1,
      borderColor: "#e2e7ef",
      borderRadius: 7,
      overflow: "hidden",
    },

    tableHead: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 29,
      backgroundColor: "#202f49",
    },

    headText: {
      color: "#ffffff",
      fontFamily: "Helvetica-Bold",
      fontSize: 6,
      letterSpacing: 0.45,
      paddingHorizontal: 5,
    },

    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      minHeight: 34,
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: "#e9edf3",
      backgroundColor: "#ffffff",
    },

    rowAlt: {
      backgroundColor: "#fafbfd",
    },

    rowExtra: {
      backgroundColor: "#fff9ea",
    },

    cell: {
      paddingHorizontal: 5,
      color: "#344158",
      fontSize: 6.6,
      lineHeight: 1.4,
    },

    dateCol: {
      width: "14%",
    },

    dayCol: {
      width: "10%",
    },

    periodCol: {
      width: "9%",
    },

    unitCol: {
      width: "24%",
    },

    topicCol: {
      width: "35%",
    },

    typeCol: {
      width: "8%",
    },

    strongCell: {
      fontFamily: "Helvetica-Bold",
      color: "#233149",
    },

    footerLine: {
      position: "absolute",
      left: 32,
      right: 32,
      bottom: 28,
      borderTopWidth: 1,
      borderTopColor: "#e7ebf1",
    },

    footer: {
      position: "absolute",
      left: 32,
      right: 32,
      bottom: 15,
      flexDirection: "row",
      justifyContent: "space-between",
      color: "#929bab",
      fontSize: 5.8,
    },
  });

function PlannerPdf({
  rows,
  subject,
  batch,
  syllabusWorkload,
  semesterHours,
  weeklyPeriods,
}: {
  rows: ScheduleRow[];
  subject: PlannerSubject;
  batch: PlannerBatch | null;
  syllabusWorkload: SyllabusWorkload;
  semesterHours: number;
  weeklyPeriods: number;
}) {

  const className =
    batch
      ? [
          batch.batch_name,
          batch.section,
        ]
          .filter(Boolean)
          .join(" · ")
      : "Assigned batch";


  return (
    <Document>

      <Page
        size="A4"
        style={
          pdfStyles.page
        }
      >

        <View
          style={
            pdfStyles.brandBand
          }
          fixed
        />


        <View
          style={
            pdfStyles.header
          }
        >

          <View
            style={
              pdfStyles.brandRow
            }
          >

            <View
              style={
                pdfStyles.brandBlock
              }
            >

              <Text
                style={
                  pdfStyles.brand
                }
              >
                CAMPUSCONNECT
              </Text>

              <Text
                style={
                  pdfStyles.documentType
                }
              >
                FACULTY ACADEMIC PLANNING
              </Text>

            </View>


            <Text
              style={
                pdfStyles.badge
              }
            >
              SMART SYLLABUS PLANNER
            </Text>

          </View>


          <Text
            style={
              pdfStyles.title
            }
          >
            Semester Teaching Plan
          </Text>


          <Text
            style={
              pdfStyles.subtitle
            }
          >
            {subject.subject_name}
            {" · "}
            {subject.subject_code}
          </Text>

        </View>


        <View
          style={
            pdfStyles.body
          }
        >

          <View
            style={
              pdfStyles.metaGrid
            }
          >

            <View
              style={
                pdfStyles.metaCard
              }
            >

              <Text
                style={
                  pdfStyles.metaLabel
                }
              >
                FACULTY
              </Text>

              <Text
                style={
                  pdfStyles.metaValue
                }
              >
                {subject.faculty_name ||
                  "Faculty"}
              </Text>

            </View>


            <View
              style={
                pdfStyles.metaCard
              }
            >

              <Text
                style={
                  pdfStyles.metaLabel
                }
              >
                CLASS
              </Text>

              <Text
                style={
                  pdfStyles.metaValue
                }
              >
                {className}
              </Text>

            </View>


            <View
              style={
                pdfStyles.metaCard
              }
            >

              <Text
                style={
                  pdfStyles.metaLabel
                }
              >
                L : T : P
              </Text>

              <Text
                style={
                  pdfStyles.metaValue
                }
              >
                {syllabusWorkload.lectureHours}
                {" : "}
                {syllabusWorkload.tutorialHours}
                {" : "}
                {syllabusWorkload.practicalHours}
              </Text>

            </View>

          </View>


          <View
            style={
              pdfStyles.metaGrid
            }
          >

            <View
              style={
                pdfStyles.metaCard
              }
            >

              <Text
                style={
                  pdfStyles.metaLabel
                }
              >
                HOURS / SEMESTER
              </Text>

              <Text
                style={
                  pdfStyles.metaValue
                }
              >
                {semesterHours ||
                  rows.length}
              </Text>

            </View>


            <View
              style={
                pdfStyles.metaCard
              }
            >

              <Text
                style={
                  pdfStyles.metaLabel
                }
              >
                PERIODS / WEEK
              </Text>

              <Text
                style={
                  pdfStyles.metaValue
                }
              >
                {weeklyPeriods}
              </Text>

            </View>


            <View
              style={
                pdfStyles.metaCard
              }
            >

              <Text
                style={
                  pdfStyles.metaLabel
                }
              >
                PLANNED CLASSES
              </Text>

              <Text
                style={
                  pdfStyles.metaValue
                }
              >
                {rows.length}
              </Text>

            </View>

          </View>


          <View
            style={
              pdfStyles.summary
            }
          >

            <Text
              style={
                pdfStyles.summaryTitle
              }
            >
              PLAN SUMMARY
            </Text>

            <Text
              style={
                pdfStyles.summaryText
              }
            >
              CampusConnect generated this teaching plan by distributing the extracted syllabus across the faculty member&apos;s scheduled teaching days.
            </Text>

          </View>


          <View
            style={
              pdfStyles.table
            }
          >

            <View
              style={
                pdfStyles.tableHead
              }
              fixed
            >

              <Text
                style={[
                  pdfStyles.headText,
                  pdfStyles.dateCol,
                ]}
              >
                DATE
              </Text>

              <Text
                style={[
                  pdfStyles.headText,
                  pdfStyles.dayCol,
                ]}
              >
                DAY
              </Text>

              <Text
                style={[
                  pdfStyles.headText,
                  pdfStyles.periodCol,
                ]}
              >
                PERIOD
              </Text>

              <Text
                style={[
                  pdfStyles.headText,
                  pdfStyles.unitCol,
                ]}
              >
                UNIT
              </Text>

              <Text
                style={[
                  pdfStyles.headText,
                  pdfStyles.topicCol,
                ]}
              >
                PLANNED LESSON
              </Text>

              <Text
                style={[
                  pdfStyles.headText,
                  pdfStyles.typeCol,
                ]}
              >
                TYPE
              </Text>

            </View>


            {rows.map(
              (
                row,
                index
              ) => (

                <View
                  key={
                    row.id
                  }
                  wrap={
                    false
                  }
                  style={[
                    pdfStyles.row,
                    index % 2 === 1
                      ? pdfStyles.rowAlt
                      : {},
                    row.extraClass
                      ? pdfStyles.rowExtra
                      : {},
                  ]}
                >

                  <Text
                    style={[
                      pdfStyles.cell,
                      pdfStyles.dateCol,
                      pdfStyles.strongCell,
                    ]}
                  >
                    {formatDate(
                      row.classDate
                    )}
                  </Text>


                  <Text
                    style={[
                      pdfStyles.cell,
                      pdfStyles.dayCol,
                    ]}
                  >
                    {row.dayOfWeek}
                  </Text>


                  <Text
                    style={[
                      pdfStyles.cell,
                      pdfStyles.periodCol,
                    ]}
                  >
                    {row.extraClass
                      ? "Extra"
                      : row.periodOrder ??
                        "-"}
                  </Text>


                  <Text
                    style={[
                      pdfStyles.cell,
                      pdfStyles.unitCol,
                      pdfStyles.strongCell,
                    ]}
                  >
                    {row.unitTitle}
                  </Text>


                  <Text
                    style={[
                      pdfStyles.cell,
                      pdfStyles.topicCol,
                    ]}
                  >
                    {row.topicTitle}
                  </Text>


                  <Text
                    style={[
                      pdfStyles.cell,
                      pdfStyles.typeCol,
                    ]}
                  >
                    {row.extraClass
                      ? "Extra"
                      : "Class"}
                  </Text>

                </View>
              )
            )}

          </View>

        </View>


        <View
          style={
            pdfStyles.footerLine
          }
          fixed
        />


        <View
          style={
            pdfStyles.footer
          }
          fixed
        >

          <Text>
            CampusConnect · {subject.faculty_name || "Faculty"}
          </Text>

          <Text
            render={({
              pageNumber,
              totalPages,
            }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />

        </View>

      </Page>

    </Document>
  );
}

export default function FacultySyllabusSmartPlanner({
  subject,
  batch,
  onStatus,
  onApplied,
}: Props) {

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );


  const [
    sourceMode,
    setSourceMode,
  ] =
    useState<
      "upload" |
      "drive"
    >(
      "upload"
    );


  const [
    syllabusFile,
    setSyllabusFile,
  ] =
    useState<
      File |
      null
    >(
      null
    );


  const [
    driveUrl,
    setDriveUrl,
  ] =
    useState("");


  const [
    draft,
    setDraft,
  ] =
    useState<
      PlannerDraft |
      null
    >(
      null
    );


  const [
    syllabusWorkload,
    setSyllabusWorkload,
  ] =
    useState<SyllabusWorkload>({
      lectureHours:
        0,

      tutorialHours:
        0,

      practicalHours:
        0,

      selfLearningHours:
        0,

      semesterHours:
        0,

      detectedText:
        "",
    });


  const [
    scanning,
    setScanning,
  ] =
    useState(
      false
    );


  const [
    timetableLoading,
    setTimetableLoading,
  ] =
    useState(
      true
    );


  const [
    timetable,
    setTimetable,
  ] =
    useState<
      TimetableEntry[]
    >(
      []
    );


  const [
    timetableDiagnostic,
    setTimetableDiagnostic,
  ] =
    useState("");


  const [
    allocationWeeklyPeriods,
    setAllocationWeeklyPeriods,
  ] =
    useState(
      0
    );


  const [
    fallbackDays,
    setFallbackDays,
  ] =
    useState<string[]>(
      []
    );


  const [
    semesterStart,
    setSemesterStart,
  ] =
    useState(
      () =>
        isoDate(
          new Date()
        )
    );


  const [
    semesterEnd,
    setSemesterEnd,
  ] =
    useState(
      () => {

        const date =
          new Date();

        date.setMonth(
          date.getMonth() +
            4
        );

        return isoDate(
          date
        );
      }
    );


  const [
    extraClasses,
    setExtraClasses,
  ] =
    useState(
      0
    );


  const [
    schedule,
    setSchedule,
  ] =
    useState<
      ScheduleRow[]
    >(
      []
    );


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );


  const topics =
    useMemo<TopicInfo[]>(
      () =>
        draft?.units.flatMap(
          unit =>
            unit.topics.map(
              topic => ({
                unitNumber:
                  unit.unitNumber,

                unitTitle:
                  unit.title,

                topicOrder:
                  topic.topicOrder,

                topicTitle:
                  topic.title,

                topicDescription:
                  topic.description,
              })
            )
        ) ?? [],
      [
        draft,
      ]
    );


  const uniqueTeachingDays =
    useMemo(
      () =>
        Array.from(
          new Set(
            timetable.map(
              item =>
                item.dayOfWeek
            )
          )
        ),
      [
        timetable,
      ]
    );


  const syllabusSemesterHours =
    Math.max(
      0,
      syllabusWorkload
        .semesterHours
    );


  const syllabusWeeklyStructure =
    syllabusWorkload
      .lectureHours +
    syllabusWorkload
      .tutorialHours +
    syllabusWorkload
      .practicalHours;


  const effectiveWeeklyPeriods =
    timetable.length ||
    allocationWeeklyPeriods;


  const fallbackReady =
    !timetable.length &&
    allocationWeeklyPeriods > 0 &&
    fallbackDays.length > 0;


  const setStatus =
    useCallback(
      (
        value: string
      ) => {

        setMessage(
          value
        );

        if (value) {
          onStatus(
            value
          );
        }

      },
      [
        onStatus,
      ]
    );


  const loadTimetable =
    useCallback(
      async () => {

        const client =
          getSupabaseClient();


        setTimetableLoading(
          true
        );

        setTimetableDiagnostic(
          ""
        );

        setAllocationWeeklyPeriods(
          0
        );

        setFallbackDays(
          []
        );


        if (!client) {

          setTimetable(
            []
          );

          setTimetableDiagnostic(
            "CampusConnect is not connected to Supabase."
          );

          setTimetableLoading(
            false
          );

          return;
        }


        try {

          const {
            data:
              authData,
            error:
              authError,
          } =
            await client.auth
              .getUser();


          if (
            authError ||
            !authData.user
          ) {

            throw new Error(
              authError?.message ||
              "Your CampusConnect session is unavailable."
            );
          }


          const userId =
            authData.user.id;


          const selectedCode =
            normalize(
              subject.subject_code
            );


          const selectedName =
            normalize(
              subject.subject_name
            );


          /*
           * --------------------------------------------------
           * SOURCE 1
           * Official faculty timetable RPC.
           * --------------------------------------------------
           */

          const {
            data:
              facultyData,
            error:
              facultyError,
          } =
            await client.rpc(
              "get_my_faculty_timetable"
            );


          const facultyRows:
            RawFacultyTimetable[] =
            (
              !facultyError &&
              Array.isArray(
                facultyData
              )
            )
              ? (
                  facultyData as
                    RawFacultyTimetable[]
                )
              : [];


          const facultyBatchRows =
            facultyRows.filter(
              row =>
                clean(
                  row.batchId
                ) ===
                subject.batch_id
            );


          const exactFacultyRows =
            facultyBatchRows.filter(
              row =>
                clean(
                  row.batchSubjectId
                ) ===
                subject.id
            );


          const semanticFacultyRows =
            facultyBatchRows.filter(
              row => {

                const code =
                  normalize(
                    row.subjectCode
                  );


                const name =
                  normalize(
                    row.subjectName
                  );


                return Boolean(
                  (
                    selectedCode &&
                    code &&
                    selectedCode ===
                      code
                  ) ||
                  (
                    selectedName &&
                    name &&
                    selectedName ===
                      name
                  )
                );
              }
            );


          const matchedFacultyRows =
            exactFacultyRows.length
              ? exactFacultyRows
              : semanticFacultyRows;


          if (
            matchedFacultyRows.length
          ) {

            const mapped =
              matchedFacultyRows
                .map(
                  (
                    row,
                    index
                  ) => ({
                    id:
                      clean(
                        row.id
                      ) ||
                      `faculty-${index}`,

                    batchId:
                      clean(
                        row.batchId
                      ),

                    batchSubjectId:
                      clean(
                        row.batchSubjectId
                      ),

                    subjectName:
                      clean(
                        row.subjectName
                      ),

                    subjectCode:
                      clean(
                        row.subjectCode
                      ),

                    facultyId:
                      clean(
                        row.facultyId
                      ),

                    facultyName:
                      clean(
                        row.facultyName
                      ),

                    dayOfWeek:
                      clean(
                        row.dayOfWeek
                      ),

                    periodOrder:
                      Number(
                        row.periodOrder
                      ) || 0,

                    startTime:
                      clean(
                        row.startTime
                      ),

                    endTime:
                      clean(
                        row.endTime
                      ),

                    room:
                      clean(
                        row.room
                      ),

                    classType:
                      clean(
                        row.classType
                      ),

                    subgroup:
                      clean(
                        row.subgroup
                      ),
                  })
                )
                .filter(
                  row =>
                    Boolean(
                      row.dayOfWeek
                    ) &&
                    row.periodOrder >
                      0
                );


            if (
              mapped.length
            ) {

              setTimetable(
                mapped
              );

              setAllocationWeeklyPeriods(
                mapped.length
              );

              setTimetableDiagnostic(
                exactFacultyRows.length
                  ? "CampusConnect found the published timetable and linked it to this subject."
                  : "CampusConnect found the published timetable by matching the subject code/name. A legacy subject-ID mismatch was handled automatically."
              );

              return;
            }
          }


          /*
           * --------------------------------------------------
           * SOURCE 2
           *
           * Find every subject record in this batch representing
           * the same subject. This fixes old/duplicate subject IDs.
           * --------------------------------------------------
           */

          const {
            data:
              subjectRows,
            error:
              subjectRowsError,
          } =
            await client
              .from(
                "attendance_batch_subjects"
              )
              .select(
                "id,batch_id,subject_name,subject_code,faculty_id,faculty_name"
              )
              .eq(
                "batch_id",
                subject.batch_id
              );


          if (
            subjectRowsError
          ) {

            console.warn(
              "[Planner subject mapping]",
              subjectRowsError
            );
          }


          const candidateSubjectIds =
            new Set<string>(
              [
                subject.id,
              ]
            );


          (
            subjectRows ||
            []
          ).forEach(
            row => {

              const code =
                normalize(
                  row.subject_code
                );


              const name =
                normalize(
                  row.subject_name
                );


              const sameSubject =
                (
                  selectedCode &&
                  code &&
                  selectedCode ===
                    code
                ) ||
                (
                  selectedName &&
                  name &&
                  selectedName ===
                    name
                );


              if (
                sameSubject &&
                row.id
              ) {

                candidateSubjectIds.add(
                  String(
                    row.id
                  )
                );
              }
            }
          );


          /*
           * --------------------------------------------------
           * SOURCE 3
           *
           * Published batch timetable.
           *
           * IMPORTANT:
           * Do not require row.faculty_id === current user here.
           * Older timetable publications can retain an old
           * faculty UUID while the current subject assignment is
           * correct. Access is already scoped by the selected
           * faculty subject and batch.
           * --------------------------------------------------
           */

          const {
            data:
              batchTimetableData,
            error:
              batchTimetableError,
          } =
            await client.rpc(
              "get_current_batch_timetable_entries",
              {
                p_batch_ids: [
                  subject.batch_id,
                ],
              }
            );


          if (
            !batchTimetableError &&
            Array.isArray(
              batchTimetableData
            )
          ) {

            const matchingBatchRows =
              (
                batchTimetableData as
                  RawBatchTimetable[]
              )
                .filter(
                  row =>
                    clean(
                      row.batch_id
                    ) ===
                      subject.batch_id &&
                    candidateSubjectIds.has(
                      clean(
                        row.batch_subject_id
                      )
                    )
                )
                .map(
                  (
                    row,
                    index
                  ) => ({
                    id:
                      clean(
                        row.id
                      ) ||
                      `batch-${index}`,

                    batchId:
                      clean(
                        row.batch_id
                      ),

                    batchSubjectId:
                      clean(
                        row.batch_subject_id
                      ),

                    subjectName:
                      subject.subject_name,

                    subjectCode:
                      subject.subject_code,

                    facultyId:
                      clean(
                        row.faculty_id
                      ),

                    facultyName:
                      clean(
                        row.faculty_name
                      ),

                    dayOfWeek:
                      clean(
                        row.day_of_week
                      ),

                    periodOrder:
                      Number(
                        row.period_order
                      ) || 0,

                    startTime:
                      clean(
                        row.start_time
                      ),

                    endTime:
                      clean(
                        row.end_time
                      ),

                    room:
                      clean(
                        row.room
                      ),

                    classType:
                      clean(
                        row.class_type
                      ),

                    subgroup:
                      clean(
                        row.subgroup
                      ),
                  })
                )
                .filter(
                  row =>
                    Boolean(
                      row.dayOfWeek
                    ) &&
                    row.periodOrder >
                      0
                );


            if (
              matchingBatchRows.length
            ) {

              const unique =
                Array.from(
                  new Map(
                    matchingBatchRows.map(
                      row => [
                        [
                          row.dayOfWeek,
                          row.periodOrder,
                          row.startTime,
                          row.endTime,
                        ].join(
                          "|"
                        ),
                        row,
                      ]
                    )
                  ).values()
                );


              setTimetable(
                unique
              );

              setAllocationWeeklyPeriods(
                unique.length
              );

              setTimetableDiagnostic(
                candidateSubjectIds.size >
                  1
                  ? "Published timetable found. CampusConnect automatically repaired the planner lookup across duplicate/legacy subject records."
                  : "Published timetable found for this subject."
              );

              return;
            }

          } else if (
            batchTimetableError
          ) {

            console.warn(
              "[Planner batch timetable]",
              batchTimetableError
            );
          }


          /*
           * --------------------------------------------------
           * SOURCE 4
           * Active teaching allocation.
           *
           * Never display 0 when CampusConnect already knows
           * the faculty has weekly teaching hours.
           * --------------------------------------------------
           */

          const {
            data:
              allocationRows,
            error:
              allocationError,
          } =
            await client
              .from(
                "faculty_teaching_allocations"
              )
              .select(
                "id,batch_id,batch_subject_id,faculty_id,weekly_hours,status"
              )
              .eq(
                "faculty_id",
                userId
              )
              .eq(
                "batch_id",
                subject.batch_id
              )
              .eq(
                "status",
                "Active"
              );


          if (
            allocationError
          ) {

            console.warn(
              "[Planner allocation]",
              allocationError
            );
          }


          const allocations =
            (
              allocationRows ||
              []
            ).filter(
              row =>
                candidateSubjectIds.has(
                  clean(
                    row.batch_subject_id
                  )
                )
            );


          const weeklyAllocation =
            allocations.reduce(
              (
                total,
                row
              ) =>
                Math.max(
                  total,
                  Number(
                    row.weekly_hours
                  ) || 0
                ),
              0
            );


          setTimetable(
            []
          );


          setAllocationWeeklyPeriods(
            weeklyAllocation
          );


          if (
            weeklyAllocation >
            0
          ) {

            setTimetableDiagnostic(
              `CampusConnect found ${weeklyAllocation} weekly teaching period${weeklyAllocation === 1 ? "" : "s"} for this subject, but the old timetable publication is not linked to the current subject record. Select the actual teaching day(s) below and the planner can still generate correctly.`
            );

          } else if (
            facultyBatchRows.length
          ) {

            const availableSubjects =
              facultyBatchRows
                .map(
                  row => {

                    const code =
                      clean(
                        row.subjectCode
                      );


                    const name =
                      clean(
                        row.subjectName
                      );


                    return [
                      code,
                      name,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        " — "
                      );
                  }
                )
                .filter(
                  Boolean
                );


            setTimetableDiagnostic(
              availableSubjects.length
                ? `The published timetable exists for this class, but this subject is not linked to the same timetable subject record. Found: ${availableSubjects.join(", ")}.`
                : "The published timetable exists, but CampusConnect could not match this selected subject."
            );

          } else {

            setTimetableDiagnostic(
              "CampusConnect could not find a published timetable entry or active weekly teaching allocation for this subject."
            );
          }

        } catch (
          error
        ) {

          console.error(
            "[CampusConnect Planner timetable]",
            error
          );


          setTimetable(
            []
          );

          setAllocationWeeklyPeriods(
            0
          );


          setTimetableDiagnostic(
            error instanceof
              Error
              ? error.message
              : "Unable to load the timetable."
          );

        } finally {

          setTimetableLoading(
            false
          );
        }
      },
      [
        subject.batch_id,
        subject.id,
        subject.subject_code,
        subject.subject_name,
      ]
    );


  useEffect(
    () => {

      setDraft(
        null
      );

      setSyllabusWorkload({
        lectureHours:
          0,

        tutorialHours:
          0,

        practicalHours:
          0,

        selfLearningHours:
          0,

        semesterHours:
          0,

        detectedText:
          "",
      });

      setSyllabusFile(
        null
      );

      setDriveUrl(
        ""
      );

      setSchedule(
        []
      );

      setExtraClasses(
        0
      );

      setAllocationWeeklyPeriods(
        0
      );

      setFallbackDays(
        []
      );

      setMessage(
        ""
      );

      void loadTimetable();

    },
    [
      subject.id,
      loadTimetable,
    ]
  );


  const handleFile =
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {

      const nextFile =
        event.target.files?.[
          0
        ] ||
        null;


      if (!nextFile) {
        return;
      }


      if (
        nextFile.size >
        MAX_FILE_SIZE
      ) {

        event.target.value =
          "";

        setSyllabusFile(
          null
        );

        setStatus(
          "The syllabus file must be 20 MB or smaller."
        );

        return;
      }


      if (
        !ALLOWED_TYPES.has(
          nextFile.type
        )
      ) {

        const extension =
          nextFile.name
            .split(".")
            .pop()
            ?.toLowerCase();


        if (
          ![
            "pdf",
            "jpg",
            "jpeg",
            "png",
            "webp",
          ].includes(
            extension ||
              ""
          )
        ) {

          event.target.value =
            "";

          setSyllabusFile(
            null
          );

          setStatus(
            "Supported syllabus formats: PDF, JPG, JPEG, PNG and WEBP."
          );

          return;
        }
      }


      setSyllabusFile(
        nextFile
      );

      setDriveUrl(
        ""
      );

      setDraft(
        null
      );

      setSchedule(
        []
      );

      setStatus(
        `${nextFile.name} selected.`
      );
    };


  const extractSyllabus =
    async () => {

      if (
        sourceMode ===
          "upload" &&
        !syllabusFile
      ) {

        setStatus(
          "Choose a PDF or image syllabus first."
        );

        return;
      }


      if (
        sourceMode ===
          "drive" &&
        !clean(
          driveUrl
        )
      ) {

        setStatus(
          "Paste the Google Drive syllabus link first."
        );

        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {

        setStatus(
          "CampusConnect is not connected to Supabase."
        );

        return;
      }


      setScanning(
        true
      );

      setDraft(
        null
      );

      setSchedule(
        []
      );

      setStatus(
        "Extracting syllabus…"
      );


      try {

        const {
          data:
            sessionData,
          error:
            sessionError,
        } =
          await client.auth
            .getSession();


        const token =
          sessionData
            .session
            ?.access_token ||
          "";


        if (
          sessionError ||
          !token
        ) {
          throw new Error(
            sessionError
              ?.message ||
              "Your CampusConnect session is unavailable."
          );
        }


        const formData =
          new FormData();


        formData.set(
          "batchSubjectId",
          subject.id
        );


        if (
          sourceMode ===
            "upload" &&
          syllabusFile
        ) {

          formData.set(
            "file",
            syllabusFile
          );

        } else {

          formData.set(
            "driveUrl",
            clean(
              driveUrl
            )
          );
        }


        const response =
          await fetch(
            "/api/academics/syllabus/scan",
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              body:
                formData,
            }
          );


        const payload =
          (
            await response
              .json()
          ) as ScanPayload;


        if (
          !response.ok ||
          !payload.success ||
          !payload.draft
        ) {

          throw new Error(
            payload.error ||
            payload.message ||
            "CampusConnect could not extract this syllabus."
          );
        }


        setDraft(
          payload.draft
        );


        const detectedWorkload =
          extractWorkloadMetadata(
            {
              payload,

              draft:
                payload.draft,

              fileName:
                payload.fileName,

              rawText:
                payload.rawText,

              extractedText:
                payload.extractedText,

              scanText:
                payload.text,
            }
          );


        const apiSemesterHours =
          Number(
            payload
              .syllabusMeta
              ?.semesterHours ??
            payload
              .syllabusMeta
              ?.totalHours ??
            0
          );


        const apiL =
          Number(
            payload
              .syllabusMeta
              ?.lectureHours ??
            0
          );


        const apiT =
          Number(
            payload
              .syllabusMeta
              ?.tutorialHours ??
            0
          );


        const apiP =
          Number(
            payload
              .syllabusMeta
              ?.practicalHours ??
            0
          );


        setSyllabusWorkload({
          lectureHours:
            apiL ||
            detectedWorkload
              .lectureHours,

          tutorialHours:
            apiT ||
            detectedWorkload
              .tutorialHours,

          practicalHours:
            apiP ||
            detectedWorkload
              .practicalHours,

          selfLearningHours:
            Number(
              payload
                .syllabusMeta
                ?.selfLearningHours ??
              0
            ) ||
            detectedWorkload
              .selfLearningHours,

          semesterHours:
            apiSemesterHours ||
            detectedWorkload
              .semesterHours,

          detectedText:
            detectedWorkload
              .detectedText,
        });


        /*
         * Read official workload separately from the original
         * PDF so topic count is never mistaken for class count.
         */

        if (
          syllabusFile &&
          syllabusFile.type ===
            "application/pdf"
        ) {

          try {

            const workloadForm =
              new FormData();


            workloadForm.set(
              "file",
              syllabusFile
            );


            const workloadResponse =
              await fetch(
                "/api/academics/syllabus/workload",
                {
                  method:
                    "POST",

                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },

                  body:
                    workloadForm,
                }
              );


            const workloadPayload =
              (
                await workloadResponse.json()
              ) as {
                success?: boolean;
                error?: string;
                workload?: {
                  lectureHours?: number;
                  tutorialHours?: number;
                  practicalHours?: number;
                  selfLearningHours?: number;
                  semesterHours?: number;
                };
              };


            if (
              workloadResponse.ok &&
              workloadPayload
                ?.success &&
              workloadPayload
                ?.workload
            ) {

              const official =
                workloadPayload
                  .workload;


              setSyllabusWorkload(
                current => ({
                  lectureHours:
                    Number(
                      official
                        .lectureHours
                    ) ||
                    current
                      .lectureHours,

                  tutorialHours:
                    Number(
                      official
                        .tutorialHours
                    ) ||
                    current
                      .tutorialHours,

                  practicalHours:
                    Number(
                      official
                        .practicalHours
                    ) ||
                    current
                      .practicalHours,

                  selfLearningHours:
                    Number(
                      official
                        .selfLearningHours
                    ) ||
                    current
                      .selfLearningHours,

                  semesterHours:
                    Number(
                      official
                        .semesterHours
                    ) ||
                    current
                      .semesterHours,

                  detectedText:
                    current
                      .detectedText,
                })
              );
            }

          } catch (
            workloadError
          ) {

            console.warn(
              "[Planner workload extraction]",
              workloadError
            );
          }
        }


        const extractedTopics =
          payload.draft
            .units
            .reduce(
              (
                total,
                unit
              ) =>
                total +
                unit.topics.length,
              0
            );


        setStatus(
          `Extracted ${payload.draft.units.length} unit(s) and ${extractedTopics} lesson(s) from ${payload.fileName || "the syllabus"}.`
        );

      } catch (
        error
      ) {

        console.error(
          "[CampusConnect Planner syllabus scan]",
          error
        );


        setStatus(
          error instanceof
            Error
            ? error.message
            : "Unable to extract the syllabus."
        );

      } finally {

        setScanning(
          false
        );
      }
    };


  const regularSlots =
    useCallback(
      () => {

        if (
          !semesterStart ||
          !semesterEnd ||
          semesterStart >
            semesterEnd
        ) {
          return [];
        }


        let sourceEntries:
          TimetableEntry[] =
          timetable;


        /*
         * If the old timetable publication cannot be linked but
         * CampusConnect knows the real weekly allocation, faculty
         * confirms only the actual teaching weekdays.
         *
         * We do not invent weekdays.
         */

        if (
          !sourceEntries.length &&
          allocationWeeklyPeriods >
            0 &&
          fallbackDays.length
        ) {

          const selectedDays =
            [
              ...fallbackDays,
            ].sort(
              (
                first,
                second
              ) =>
                (
                  DAY_INDEX[
                    first
                  ] ??
                  99
                ) -
                (
                  DAY_INDEX[
                    second
                  ] ??
                  99
                )
            );


          const base =
            Math.floor(
              allocationWeeklyPeriods /
              selectedDays.length
            );


          const remainder =
            allocationWeeklyPeriods %
            selectedDays.length;


          const generatedEntries:
            TimetableEntry[] =
            [];


          selectedDays.forEach(
            (
              day,
              dayIndex
            ) => {

              const count =
                base +
                (
                  dayIndex <
                  remainder
                    ? 1
                    : 0
                );


              for (
                let periodIndex =
                  0;
                periodIndex <
                count;
                periodIndex +=
                  1
              ) {

                generatedEntries.push({
                  id:
                    `fallback-${day}-${periodIndex + 1}`,

                  batchId:
                    subject.batch_id,

                  batchSubjectId:
                    subject.id,

                  subjectName:
                    subject.subject_name,

                  subjectCode:
                    subject.subject_code,

                  facultyId:
                    subject.faculty_id,

                  facultyName:
                    subject.faculty_name,

                  dayOfWeek:
                    day,

                  periodOrder:
                    periodIndex +
                    1,

                  startTime:
                    "",

                  endTime:
                    "",

                  room:
                    "",

                  classType:
                    "Teaching Allocation",

                  subgroup:
                    "",
                });
              }
            }
          );


          sourceEntries =
            generatedEntries;
        }


        if (
          !sourceEntries.length
        ) {
          return [];
        }


        const byDay =
          new Map<
            number,
            TimetableEntry[]
          >();


        sourceEntries.forEach(
          entry => {

            const dayIndex =
              DAY_INDEX[
                entry.dayOfWeek
              ];


            if (
              dayIndex ===
              undefined
          ) {
              return;
            }


            const existing =
              byDay.get(
                dayIndex
              ) ||
              [];


            existing.push(
              entry
            );


            existing.sort(
              (
                first,
                second
              ) =>
                first.periodOrder -
                second.periodOrder
            );


            byDay.set(
              dayIndex,
              existing
            );
          }
        );


        const result:
          Array<
            Omit<
              ScheduleRow,
              | "lessonNumber"
              | "unitNumber"
              | "unitTitle"
              | "topicOrder"
              | "topicTitle"
              | "topicDescription"
            >
          > =
          [];


        const cursor =
          new Date(
            `${semesterStart}T00:00:00`
          );


        const endDate =
          new Date(
            `${semesterEnd}T00:00:00`
          );


        while (
          cursor <=
          endDate
        ) {

          const entries =
            byDay.get(
              cursor.getDay()
            ) ||
            [];


          entries.forEach(
            entry => {

              result.push({

                id:
                  `${isoDate(cursor)}-${entry.id}`,

                classDate:
                  isoDate(
                    cursor
                  ),

                dayOfWeek:
                  entry.dayOfWeek,

                periodOrder:
                  entry.periodOrder,

                startTime:
                  entry.startTime,

                endTime:
                  entry.endTime,

                room:
                  entry.room,

                classType:
                  entry.classType,

                extraClass:
                  false,
              });
            }
          );


          cursor.setDate(
            cursor.getDate() +
              1
          );
        }


        return result;
      },
      [
        semesterStart,
        semesterEnd,
        timetable,
        allocationWeeklyPeriods,
        fallbackDays,
        subject.batch_id,
        subject.id,
        subject.subject_name,
        subject.subject_code,
        subject.faculty_id,
        subject.faculty_name,
      ]
    );


  const generatePlan =
    () => {

      if (
        !draft ||
        !topics.length
      ) {

        setStatus(
          "Extract the syllabus first."
        );

        return;
      }


      if (
        !timetable.length &&
        !fallbackReady
      ) {

        setStatus(
          allocationWeeklyPeriods >
            0
            ? "Select the actual teaching day(s) first."
            : "CampusConnect could not find weekly teaching periods for this subject."
        );

        return;
      }


      if (
        !semesterStart ||
        !semesterEnd ||
        semesterStart >
          semesterEnd
      ) {

        setStatus(
          "Choose a valid semester start and end date."
        );

        return;
      }


      const timetableSlots =
        regularSlots();


      if (
        !timetableSlots.length
      ) {

        setStatus(
          "No teaching dates were found inside the selected semester dates."
        );

        return;
      }


      /*
       * The official syllabus workload is the source of truth.
       *
       * Example:
       *
       * (L:T:P) + SL (3:2:0) + 45 Hours/Sem
       *
       * semesterTarget = 45
       *
       * NOT:
       *
       * extractedTopics.length = 93 classes.
       */

      const semesterTarget =
        syllabusSemesterHours >
          0
          ? syllabusSemesterHours
          : Math.min(
              timetableSlots.length,
              Math.max(
                effectiveWeeklyPeriods,
                topics.length
              )
            );


      /*
       * Extra classes are additional teaching sessions.
       */

      /*
       * We first use actual timetable dates.
       */

      const regularTarget =
        Math.min(
          semesterTarget,
          timetableSlots.length
        );


      const selectedRegularSlots =
        timetableSlots.slice(
          0,
          regularTarget
        );


      /*
       * If the selected date range does not contain enough
       * timetable classes for the official semester hours,
       * only then should CampusConnect ask for an extension.
       */

      const shortage =
        Math.max(
          0,
          semesterTarget -
            timetableSlots.length
        );


      if (
        shortage >
        0
      ) {

        setSchedule(
          []
        );


        setStatus(
          `The official syllabus requires ${semesterTarget} teaching hours, but the selected semester dates contain only ${timetableSlots.length} timetable classes. Extend the semester end date to include ${shortage} more scheduled class${shortage === 1 ? "" : "es"}.`
        );

        return;
      }


      /*
       * Explicit extra classes are added after the official
       * semester teaching-hour target.
       */

      const extra =
        Array.from(
          {
            length:
              Math.max(
                0,
                extraClasses
              ),
          },
          (
            _,
            index
          ) => {

            const date =
              new Date(
                `${semesterEnd}T00:00:00`
              );


            date.setDate(
              date.getDate() +
                index +
                1
            );


            return {

              id:
                `extra-${index + 1}`,

              classDate:
                isoDate(
                  date
                ),

              dayOfWeek:
                date.toLocaleDateString(
                  "en-US",
                  {
                    weekday:
                      "long",
                  }
                ),

              periodOrder:
                null,

              startTime:
                "",

              endTime:
                "",

              room:
                "",

              classType:
                "Extra Class",

              extraClass:
                true,
            };
          }
        );


      const allSlots =
        [
          ...selectedRegularSlots,
          ...extra,
        ];


      /*
       * ------------------------------------------------------
       * DISTRIBUTE EVERY EXTRACTED SYLLABUS ITEM ACROSS THE
       * OFFICIAL NUMBER OF TEACHING SESSIONS.
       *
       * Example:
       *
       * 93 syllabus points
       * 45 Hours/Sem
       *
       * approximately:
       *
       * class 1 -> topic 1 + topic 2 + topic 3
       * class 2 -> topic 4 + topic 5
       * ...
       *
       * No syllabus item is lost.
       * No fake 93-class requirement is created.
       * ------------------------------------------------------
       */

      const groupedTopics:
        TopicInfo[][] =
        Array.from(
          {
            length:
              allSlots.length,
          },
          () => []
        );


      topics.forEach(
        (
          topic,
          topicIndex
        ) => {

          const classIndex =
            Math.min(
              allSlots.length -
                1,

              Math.floor(
                (
                  topicIndex *
                  allSlots.length
                ) /
                topics.length
              )
            );


          groupedTopics[
            classIndex
          ].push(
            topic
          );
        }
      );


      /*
       * If explicit extra classes were added only for revision,
       * some may naturally have no new syllabus points.
       */

      const lastTopic =
        topics[
          topics.length -
            1
        ];


      const generated:
        ScheduleRow[] =
        allSlots.map(
          (
            slot,
            index
          ) => {

            const group =
              groupedTopics[
                index
              ];


            const firstTopic =
              group[0] ||
              lastTopic;


            const combinedTitle =
              group.length
                ? group
                    .map(
                      topic =>
                        topic.topicTitle
                    )
                    .join(
                      " • "
                    )
                : "Revision / Buffer / Academic Adjustment";


            const combinedDescription =
              group.length
                ? group
                    .map(
                      topic =>
                        topic.topicDescription
                    )
                    .filter(
                      Boolean
                    )
                    .join(
                      " | "
                    )
                : "";


            const combinedUnitTitle =
              Array.from(
                new Set(
                  group.length
                    ? group.map(
                        topic =>
                          `Unit ${topic.unitNumber}: ${topic.unitTitle}`
                      )
                    : [
                        `Unit ${lastTopic.unitNumber}: ${lastTopic.unitTitle}`,
                      ]
                )
              ).join(
                " / "
              );


            return {

              ...slot,

              lessonNumber:
                index + 1,

              unitNumber:
                firstTopic.unitNumber,

              unitTitle:
                combinedUnitTitle,

              topicOrder:
                firstTopic.topicOrder,

              topicTitle:
                combinedTitle,

              topicDescription:
                combinedDescription,
            };
          }
        );


      setSchedule(
        generated
      );


      setStatus(
        syllabusSemesterHours >
          0
          ? `Planner generated ${generated.length} class${generated.length === 1 ? "" : "es"} using the official ${syllabusSemesterHours} Hours/Sem workload. ${topics.length} extracted syllabus items were distributed across the real timetable.`
          : `Planner generated ${generated.length} dated teaching classes from the available timetable.`
      );
    };


  const changeExtraDate =
    (
      rowId: string,
      value: string
    ) => {

      setSchedule(
        current =>
          current
            .map(
              row => {

                if (
                  row.id !==
                  rowId
                ) {
                  return row;
                }


                const date =
                  value
                    ? new Date(
                        `${value}T00:00:00`
                      )
                    : null;


                return {
                  ...row,

                  classDate:
                    value,

                  dayOfWeek:
                    date
                      ? date.toLocaleDateString(
                          "en-US",
                          {
                            weekday:
                              "long",
                          }
                        )
                      : "",
                };
              }
            )
            .sort(
              (
                first,
                second
              ) => {

                const dateCompare =
                  first.classDate.localeCompare(
                    second.classDate
                  );


                if (
                  dateCompare
                ) {
                  return dateCompare;
                }


                return (
                  (
                    first.periodOrder ??
                    999
                  ) -
                  (
                    second.periodOrder ??
                    999
                  )
                );
              }
            )
      );
    };


  const unitsForSave =
    () => {

      if (
        !draft ||
        !schedule.length
      ) {
        return [];
      }


      /*
       * IMPORTANT:
       *
       * The extracted syllabus may contain many syllabus items.
       *
       * Example:
       *   93 extracted items
       *   45 Hours/Sem
       *
       * Those 93 items are already combined into the 45 actual
       * teaching sessions inside schedule.
       *
       * The database planner therefore saves ONE planned topic
       * for each actual teaching session.
       *
       * This guarantees:
       *
       *   sum(plannedClasses) === schedule.length
       *
       * and prevents:
       *
       *   Allocated topic classes (94)
       *   do not equal available teaching classes (45)
       */

      const unitMap =
        new Map<
          number,
          {
            unitNumber: number;
            title: string;
            description: string;
            rows: ScheduleRow[];
          }
        >();


      schedule.forEach(
        row => {

          const existing =
            unitMap.get(
              row.unitNumber
            );


          if (
            existing
          ) {

            existing.rows.push(
              row
            );

            return;
          }


          const originalUnit =
            draft.units.find(
              unit =>
                unit.unitNumber ===
                row.unitNumber
            );


          unitMap.set(
            row.unitNumber,
            {
              unitNumber:
                row.unitNumber,

              title:
                clean(
                  originalUnit?.title ||
                  row.unitTitle ||
                  `Unit ${row.unitNumber}`
                ),

              description:
                clean(
                  originalUnit?.description ||
                  ""
                ),

              rows: [
                row,
              ],
            }
          );
        }
      );


      return Array.from(
        unitMap.values()
      )
        .sort(
          (
            first,
            second
          ) =>
            first.unitNumber -
            second.unitNumber
        )
        .map(
          unit => ({

            unitNumber:
              unit.unitNumber,

            title:
              unit.title,

            description:
              unit.description,

            topics:
              unit.rows
                .sort(
                  (
                    first,
                    second
                  ) =>
                    first.lessonNumber -
                    second.lessonNumber
                )
                .map(
                  (
                    row,
                    index
                  ) => ({

                    topicOrder:
                      index + 1,

                    title:
                      clean(
                        row.topicTitle
                      ) ||
                      `Teaching Session ${row.lessonNumber}`,

                    description:
                      clean(
                        row.topicDescription
                      ),

                    plannedClasses:
                      1,
                  })
                ),
          })
        );
    };

  const savePlan =
    async () => {

      if (
        !draft ||
        !schedule.length
      ) {

        setStatus(
          "Generate the teaching plan first."
        );

        return;
      }


      if (
        schedule.some(
          row =>
            !row.classDate
        )
      ) {

        setStatus(
          "Every class must have a date before saving."
        );

        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {

        setStatus(
          "CampusConnect is not connected to Supabase."
        );

        return;
      }


      setSaving(
        true
      );

      setStatus(
        "Saving syllabus plan…"
      );


      try {

        const {
          data:
            statusData,
          error:
            statusError,
        } =
          await client.rpc(
            "get_faculty_syllabus_apply_status",
            {
              p_batch_subject_id:
                subject.id,
            }
          );


        if (
          statusError
        ) {
          throw statusError;
        }


        const existing =
          (
            Array.isArray(
              statusData
            )
              ? statusData[
                  0
                ]
              : statusData
          ) as
            | Record<
                string,
                unknown
              >
            | null;


        if (
          existing?.hasProgress ===
          true
        ) {

          throw new Error(
            "This subject already contains Faculty Diary progress. CampusConnect blocked syllabus replacement to protect teaching history."
          );
        }


        let replaceExisting =
          false;


        if (
          existing
            ?.hasExistingSyllabus ===
          true
        ) {

          replaceExisting =
            window.confirm(
              "A syllabus plan already exists for this subject. Replace it with this new plan?"
            );


          if (
            !replaceExisting
          ) {

            setStatus(
              "Save cancelled."
            );

            return;
          }
        }


        const {
          error:
            applyError,
        } =
          await client.rpc(
            "apply_faculty_syllabus_plan",
            {
              p_batch_subject_id:
                subject.id,

              p_units:
                unitsForSave(),

              /*
               * apply_faculty_syllabus_plan validates:
               *
               * weekly_sessions × teaching_weeks
               * = total_planned_classes
               *
               * The dated calendar RPC below stores the real
               * timetable periods/week and semester weeks.
               *
               * Therefore this first atomic save uses the full
               * generated plan as one temporary capacity block.
               */
              p_weekly_sessions:
                schedule.length,

              p_teaching_weeks:
                1,

              p_total_planned_classes:
                schedule.length,

              p_replace_existing:
                replaceExisting,
            }
          );


        if (
          applyError
        ) {
          throw applyError;
        }


        const start =
          new Date(
            `${semesterStart}T00:00:00`
          );


        const end =
          new Date(
            `${semesterEnd}T00:00:00`
          );


        const weeks =
          Math.max(
            1,
            Math.ceil(
              (
                end.getTime() -
                start.getTime()
              ) /
                (
                  7 *
                  24 *
                  60 *
                  60 *
                  1000
                )
            ) +
              1
          );


        const {
          error:
            calendarError,
        } =
          await client.rpc(
            "save_faculty_syllabus_calendar_plan",
            {
              p_batch_subject_id:
                subject.id,

              p_start_date:
                semesterStart,

              p_end_date:
                semesterEnd,

              p_weekly_periods:
                Math.max(
                  1,
                  effectiveWeeklyPeriods
                ),

              p_teaching_weeks:
                weeks,

              p_rows:
                schedule.map(
                  row => ({
                    classDate:
                      row.classDate,

                    dayOfWeek:
                      row.dayOfWeek,

                    periodOrder:
                      row.periodOrder,

                    startTime:
                      row.startTime ||
                      null,

                    endTime:
                      row.endTime ||
                      null,

                    room:
                      row.room,

                    extraClass:
                      row.extraClass,

                    unitNumber:
                      row.unitNumber,

                    unitTitle:
                      row.unitTitle,

                    topicOrder:
                      row.topicOrder,

                    topicTitle:
                      row.topicTitle,

                    lessonNumber:
                      row.lessonNumber,
                  })
                ),
            }
          );


        if (
          calendarError
        ) {

          throw new Error(
            `Syllabus structure was saved, but the dated planner could not be saved: ${calendarError.message}`
          );
        }


        setStatus(
          `Saved ${schedule.length} planned classes successfully.`
        );


        try {
          await onApplied();
        } catch (
          refreshError
        ) {
          console.error(
            "[CampusConnect Planner refresh]",
            refreshError
          );
        }

      } catch (
        error
      ) {

        console.error(
          "[CampusConnect Planner save]",
          error
        );


        const saveError =
          error as {
            message?: string;
            details?: string;
            hint?: string;
            code?: string;
          };


        const saveMessage =
          saveError?.message ||
          saveError?.details ||
          (
            typeof error ===
              "string"
              ? error
              : ""
          ) ||
          "Unable to save the plan.";


        console.error(
          "[CampusConnect Planner save details]",
          {
            message:
              saveError?.message,
            details:
              saveError?.details,
            hint:
              saveError?.hint,
            code:
              saveError?.code,
          }
        );


        setStatus(
          saveMessage
        );

      } finally {

        setSaving(
          false
        );
      }
    };


  const exportData =
    () =>
      schedule.map(
        row => ({

          Date:
            row.classDate,

          Day:
            row.dayOfWeek,

          Period:
            row.extraClass
              ? "Extra"
              : row.periodOrder ??
                "",

          Time:
            row.startTime &&
            row.endTime
              ? `${row.startTime.slice(0, 5)} - ${row.endTime.slice(0, 5)}`
              : "",

          Room:
            row.room,

          Unit:
            `Unit ${row.unitNumber}: ${row.unitTitle}`,

          Lesson:
            row.topicTitle,

          Type:
            row.extraClass
              ? "Extra Class"
              : "Timetable Class",
        })
      );


  const exportBaseName =
    () =>
      `CampusConnect-${fileSlug(
        subject.subject_code ||
        subject.subject_name
      )}-Syllabus-Plan`;


  const downloadCsv =
    () => {

      if (
        !schedule.length
      ) {
        return;
      }


      const rows =
        exportData();


      const sheet =
        XLSX.utils.json_to_sheet(
          rows
        );


      const csv =
        [
          `CampusConnect Smart Syllabus Planner`,
          `Faculty Name,${JSON.stringify(subject.faculty_name || "Faculty")}`,
          `Subject,${JSON.stringify(subject.subject_name)}`,
          `Subject Code,${JSON.stringify(subject.subject_code)}`,
          `L:T:P,${JSON.stringify(
            syllabusWeeklyStructure
              ? `${syllabusWorkload.lectureHours}:${syllabusWorkload.tutorialHours}:${syllabusWorkload.practicalHours}`
              : ""
          )}`,
          `Hours/Sem,${syllabusSemesterHours || ""}`,
          "",
          XLSX.utils.sheet_to_csv(
            sheet
          ),
        ].join(
          "\n"
        );


      downloadBlob(
        new Blob(
          [
            "\uFEFF",
            csv,
          ],
          {
            type:
              "text/csv;charset=utf-8",
          }
        ),
        `${exportBaseName()}.csv`
      );
    };


  const downloadExcel =
    () => {

      if (
        !schedule.length
      ) {
        return;
      }


      const workbook =
        XLSX.utils.book_new();


      const className =
        batch
          ? [
              batch.batch_name,
              batch.section,
            ]
              .filter(Boolean)
              .join(" · ")
          : "Assigned batch";


      const rows =
        schedule.map(
          row => [
            row.lessonNumber,
            row.classDate,
            row.dayOfWeek,
            row.extraClass
              ? "Extra"
              : row.periodOrder ??
                "",
            row.startTime &&
            row.endTime
              ? `${row.startTime.slice(0, 5)} - ${row.endTime.slice(0, 5)}`
              : "",
            row.room,
            row.unitTitle,
            row.topicTitle,
            row.extraClass
              ? "Extra Class"
              : "Timetable Class",
          ]
        );


      const worksheet =
        XLSX.utils.aoa_to_sheet([
          [
            "CAMPUSCONNECT · SMART SYLLABUS PLANNER",
          ],

          [
            "Semester Teaching Plan",
          ],

          [],

          [
            "Faculty Name",
            subject.faculty_name ||
              "Faculty",
          ],

          [
            "Subject",
            subject.subject_name,
          ],

          [
            "Subject Code",
            subject.subject_code,
          ],

          [
            "Class",
            className,
          ],

          [
            "L : T : P",
            `${syllabusWorkload.lectureHours} : ${syllabusWorkload.tutorialHours} : ${syllabusWorkload.practicalHours}`,
          ],

          [
            "Hours / Semester",
            syllabusSemesterHours ||
              schedule.length,
          ],

          [
            "Periods / Week",
            effectiveWeeklyPeriods,
          ],

          [
            "Planned Classes",
            schedule.length,
          ],

          [],

          [
            "#",
            "Date",
            "Day",
            "Period",
            "Time",
            "Room",
            "Unit",
            "Planned Lesson",
            "Type",
          ],

          ...rows,
        ]);


      worksheet["!merges"] = [
        {
          s: {
            r: 0,
            c: 0,
          },
          e: {
            r: 0,
            c: 8,
          },
        },
        {
          s: {
            r: 1,
            c: 0,
          },
          e: {
            r: 1,
            c: 8,
          },
        },
      ];


      worksheet["!cols"] = [
        {
          wch: 6,
        },
        {
          wch: 14,
        },
        {
          wch: 12,
        },
        {
          wch: 10,
        },
        {
          wch: 18,
        },
        {
          wch: 13,
        },
        {
          wch: 38,
        },
        {
          wch: 65,
        },
        {
          wch: 16,
        },
      ];


      worksheet["!rows"] = [
        {
          hpt: 28,
        },
        {
          hpt: 22,
        },
      ];


      worksheet["!autofilter"] = {
        ref:
          `A13:I${13 + rows.length}`,
      };


      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Semester Plan"
      );


      workbook.Props = {
        Title:
          "CampusConnect Smart Syllabus Planner",

        Subject:
          subject.subject_name,

        Author:
          subject.faculty_name ||
          "CampusConnect",

        Company:
          "CampusConnect",

        Comments:
          "Generated using CampusConnect Faculty Smart Syllabus Planner",
      };


      XLSX.writeFile(
        workbook,
        `${exportBaseName()}.xlsx`
      );
    };

  const downloadPdf =
    async () => {

      if (
        !schedule.length
      ) {
        return;
      }


      const blob =
        await pdf(
          <PlannerPdf
            rows={
              schedule
            }
            subject={
              subject
            }
            batch={
              batch
            }
            syllabusWorkload={
              syllabusWorkload
            }
            semesterHours={
              syllabusSemesterHours
            }
            weeklyPeriods={
              effectiveWeeklyPeriods
            }
          />
        ).toBlob();


      downloadBlob(
        blob,
        `${exportBaseName()}.pdf`
      );
    };


  const downloadJpeg =
    () => {

      if (
        !schedule.length
      ) {
        return;
      }


      const width =
        1800;

      const headerHeight =
        360;

      const tableHeaderHeight =
        62;

      const rowHeight =
        86;

      const footerHeight =
        90;

      const height =
        headerHeight +
        tableHeaderHeight +
        schedule.length *
          rowHeight +
        footerHeight;


      const canvas =
        document.createElement(
          "canvas"
        );


      canvas.width =
        width;

      canvas.height =
        height;


      const ctx =
        canvas.getContext(
          "2d"
        );


      if (!ctx) {
        return;
      }


      const roundedRect =
        (
          x: number,
          y: number,
          w: number,
          h: number,
          radius: number
        ) => {

          ctx.beginPath();

          ctx.roundRect(
            x,
            y,
            w,
            h,
            radius
          );

          ctx.closePath();
        };


      const wrapText =
        (
          value: string,
          x: number,
          y: number,
          maxWidth: number,
          lineHeight: number,
          maxLines:
            number =
            2
        ) => {

          const words =
            String(
              value ||
              ""
            ).split(
              /\s+/
            );


          const lines:
            string[] =
            [];

          let line =
            "";


          words.forEach(
            word => {

              const test =
                line
                  ? `${line} ${word}`
                  : word;


              if (
                ctx.measureText(
                  test
                ).width >
                  maxWidth &&
                line
              ) {

                lines.push(
                  line
                );

                line =
                  word;

              } else {

                line =
                  test;
              }
            }
          );


          if (line) {
            lines.push(
              line
            );
          }


          const visible =
            lines.slice(
              0,
              maxLines
            );


          if (
            lines.length >
            maxLines &&
            visible.length
          ) {

            visible[
              visible.length -
                1
            ] =
              `${visible[
                visible.length -
                  1
              ].slice(
                0,
                -1
              )}…`;
          }


          visible.forEach(
            (
              item,
              index
            ) => {

              ctx.fillText(
                item,
                x,
                y +
                  index *
                    lineHeight
              );
            }
          );
        };


      ctx.fillStyle =
        "#f5f7fb";

      ctx.fillRect(
        0,
        0,
        width,
        height
      );


      const gradient =
        ctx.createLinearGradient(
          0,
          0,
          width,
          0
        );


      gradient.addColorStop(
        0,
        "#172544"
      );

      gradient.addColorStop(
        1,
        "#315fdf"
      );


      ctx.fillStyle =
        gradient;

      ctx.fillRect(
        0,
        0,
        width,
        245
      );


      ctx.fillStyle =
        "#ffffff";

      ctx.font =
        "700 24px Arial";

      ctx.fillText(
        "CAMPUSCONNECT",
        70,
        62
      );


      ctx.font =
        "700 48px Arial";

      ctx.fillText(
        "Semester Teaching Plan",
        70,
        132
      );


      ctx.fillStyle =
        "rgba(255,255,255,0.82)";

      ctx.font =
        "22px Arial";

      ctx.fillText(
        `${subject.subject_name} · ${subject.subject_code}`,
        70,
        176
      );


      ctx.font =
        "18px Arial";

      ctx.fillText(
        `Faculty: ${subject.faculty_name || "Faculty"}`,
        70,
        214
      );


      roundedRect(
        1410,
        48,
        310,
        52,
        26
      );

      ctx.fillStyle =
        "rgba(255,255,255,0.14)";

      ctx.fill();


      ctx.fillStyle =
        "#ffffff";

      ctx.font =
        "700 15px Arial";

      ctx.textAlign =
        "center";

      ctx.fillText(
        "SMART SYLLABUS PLANNER",
        1565,
        81
      );

      ctx.textAlign =
        "left";


      const cards =
        [
          [
            "L : T : P",
            `${syllabusWorkload.lectureHours} : ${syllabusWorkload.tutorialHours} : ${syllabusWorkload.practicalHours}`,
          ],

          [
            "HOURS / SEM",
            String(
              syllabusSemesterHours ||
              schedule.length
            ),
          ],

          [
            "PERIODS / WEEK",
            String(
              effectiveWeeklyPeriods
            ),
          ],

          [
            "PLANNED CLASSES",
            String(
              schedule.length
            ),
          ],
        ];


      const cardWidth =
        392;

      cards.forEach(
        (
          card,
          index
        ) => {

          const x =
            70 +
            index *
              (
                cardWidth +
                22
              );


          roundedRect(
            x,
            274,
            cardWidth,
            62,
            13
          );

          ctx.fillStyle =
            "#ffffff";

          ctx.fill();

          ctx.strokeStyle =
            "#dfe5ef";

          ctx.lineWidth =
            1;

          ctx.stroke();


          ctx.fillStyle =
            "#8a95a6";

          ctx.font =
            "700 12px Arial";

          ctx.fillText(
            card[0],
            x +
              17,
            297
          );


          ctx.fillStyle =
            "#25334b";

          ctx.font =
            "700 22px Arial";

          ctx.fillText(
            card[1],
            x +
              17,
            323
          );
        }
      );


      const columns =
        [
          {
            label:
              "DATE",
            x:
              70,
            width:
              205,
          },

          {
            label:
              "DAY",
            x:
              275,
            width:
              155,
          },

          {
            label:
              "PERIOD",
            x:
              430,
            width:
              125,
          },

          {
            label:
              "UNIT",
            x:
              555,
            width:
              390,
          },

          {
            label:
              "PLANNED LESSON",
            x:
              945,
            width:
              705,
          },

          {
            label:
              "TYPE",
            x:
              1650,
            width:
              90,
          },
        ];


      let y =
        headerHeight;


      roundedRect(
        70,
        y,
        1670,
        tableHeaderHeight,
        11
      );

      ctx.fillStyle =
        "#202f49";

      ctx.fill();


      ctx.fillStyle =
        "#ffffff";

      ctx.font =
        "700 14px Arial";


      columns.forEach(
        column => {

          ctx.fillText(
            column.label,
            column.x +
              12,
            y +
              38
          );
        }
      );


      y +=
        tableHeaderHeight;


      schedule.forEach(
        (
          row,
          index
        ) => {

          ctx.fillStyle =
            row.extraClass
              ? "#fff9e9"
              : index % 2
                ? "#fafbfd"
                : "#ffffff";


          ctx.fillRect(
            70,
            y,
            1670,
            rowHeight
          );


          ctx.strokeStyle =
            "#e6eaf0";

          ctx.beginPath();

          ctx.moveTo(
            70,
            y +
              rowHeight
          );

          ctx.lineTo(
            1740,
            y +
              rowHeight
          );

          ctx.stroke();


          ctx.fillStyle =
            "#26344a";

          ctx.font =
            "700 17px Arial";

          ctx.fillText(
            formatDate(
              row.classDate
            ),
            82,
            y +
              36
          );


          ctx.fillStyle =
            "#566277";

          ctx.font =
            "16px Arial";

          ctx.fillText(
            row.dayOfWeek,
            287,
            y +
              36
          );


          ctx.fillText(
            row.extraClass
              ? "Extra"
              : String(
                  row.periodOrder ??
                  "-"
                ),
            442,
            y +
              36
          );


          ctx.fillStyle =
            "#27364d";

          ctx.font =
            "700 15px Arial";

          wrapText(
            row.unitTitle,
            567,
            y +
              30,
            360,
            20,
            2
          );


          ctx.fillStyle =
            "#45546b";

          ctx.font =
            "15px Arial";

          wrapText(
            row.topicTitle,
            957,
            y +
              29,
            675,
            20,
            3
          );


          roundedRect(
            1662,
            y +
              23,
            65,
            27,
            14
          );


          ctx.fillStyle =
            row.extraClass
              ? "#fff0c7"
              : "#edf3ff";

          ctx.fill();


          ctx.fillStyle =
            row.extraClass
              ? "#8a620b"
              : "#315fdf";

          ctx.font =
            "700 11px Arial";

          ctx.textAlign =
            "center";

          ctx.fillText(
            row.extraClass
              ? "EXTRA"
              : "CLASS",
            1694,
            y +
              41
          );

          ctx.textAlign =
            "left";


          y +=
            rowHeight;
        }
      );


      ctx.fillStyle =
        "#f5f7fb";

      ctx.fillRect(
        0,
        height -
          footerHeight,
        width,
        footerHeight
      );


      ctx.strokeStyle =
        "#dfe4eb";

      ctx.beginPath();

      ctx.moveTo(
        70,
        height -
          footerHeight
      );

      ctx.lineTo(
        1740,
        height -
          footerHeight
      );

      ctx.stroke();


      ctx.fillStyle =
        "#758195";

      ctx.font =
        "14px Arial";

      ctx.fillText(
        `CampusConnect · ${subject.faculty_name || "Faculty"} · ${subject.subject_code}`,
        70,
        height -
          38
      );


      ctx.textAlign =
        "right";

      ctx.fillText(
        "Faculty Smart Syllabus Planner",
        1740,
        height -
          38
      );

      ctx.textAlign =
        "left";


      canvas.toBlob(
        blob => {

          if (!blob) {
            return;
          }


          downloadBlob(
            blob,
            `${exportBaseName()}.jpg`
          );
        },
        "image/jpeg",
        0.96
      );
    };

  return (

    <section
      className="ccMinimalPlanner"
    >

      <header
        className="ccPlannerHeader"
      >

        <div
          className="ccPlannerHeaderCopy"
        >

          <span
            className="ccPlannerEyebrow"
          >
            SMART SYLLABUS PLANNER
          </span>

          <h2>
            Turn your syllabus into a real teaching plan.
          </h2>

          <p>
            Upload the syllabus, let CampusConnect read your published timetable, then automatically distribute lessons across actual class days.
          </p>

        </div>


        <div
          className="ccPlannerSubjectCard"
        >

          <span>
            CURRENT SUBJECT
          </span>

          <strong>
            {subject.subject_name}
          </strong>

          <small>
            {subject.subject_code}

            {batch?.batch_name
              ? ` · ${batch.batch_name}`
              : ""}

            {batch?.section
              ? ` · ${batch.section}`
              : ""}
          </small>

        </div>

      </header>


      <div
        className="ccPlannerFlow"
      >

        <div
          className={
            draft
              ? "complete"
              : "active"
          }
        >
          <b>
            1
          </b>
          <span>
            Syllabus
          </span>
        </div>

        <i />

        <div
          className={
            schedule.length
              ? "complete"
              : draft
                ? "active"
                : ""
          }
        >
          <b>
            2
          </b>
          <span>
            Plan
          </span>
        </div>

        <i />

        <div
          className={
            schedule.length
              ? "active"
              : ""
          }
        >
          <b>
            3
          </b>
          <span>
            Save & Download
          </span>
        </div>

      </div>


      <section
        className="ccPlannerCard"
      >

        <div
          className="ccPlannerSectionTitle"
        >

          <div>

            <span>
              STEP 01
            </span>

            <h3>
              Add syllabus
            </h3>

            <p>
              Upload PDF, JPG, JPEG, PNG or WEBP directly from your device, or import from Google Drive.
            </p>

          </div>

        </div>


        <div
          className="ccPlannerSourceTabs"
        >

          <button
            type="button"
            className={
              sourceMode ===
              "upload"
                ? "active"
                : ""
            }
            onClick={
              () => {

                setSourceMode(
                  "upload"
                );

                setDriveUrl(
                  ""
                );
              }
            }
          >
            Upload file
          </button>


          <button
            type="button"
            className={
              sourceMode ===
              "drive"
                ? "active"
                : ""
            }
            onClick={
              () => {

                setSourceMode(
                  "drive"
                );

                setSyllabusFile(
                  null
                );

                if (
                  fileInputRef.current
                ) {
                  fileInputRef
                    .current
                    .value =
                    "";
                }
              }
            }
          >
            Google Drive
          </button>

        </div>


        {sourceMode ===
        "upload" ? (

          <div
            className="ccPlannerUpload"
          >

            <input
              ref={
                fileInputRef
              }
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={
                handleFile
              }
            />


            <button
              type="button"
              className="ccPlannerUploadBox"
              onClick={
                () =>
                  fileInputRef
                    .current
                    ?.click()
              }
            >

              <span
                className="ccPlannerUploadIcon"
              >
                ↑
              </span>

              <strong>
                {syllabusFile
                  ? syllabusFile.name
                  : "Choose syllabus file"}
              </strong>

              <small>
                PDF · JPG · JPEG · PNG · WEBP · Maximum 20 MB
              </small>

            </button>

          </div>

        ) : (

          <div
            className="ccPlannerDrive"
          >

            <input
              value={
                driveUrl
              }
              onChange={
                event => {

                  setDriveUrl(
                    event.target
                      .value
                  );

                  setDraft(
                    null
                  );

                  setSchedule(
                    []
                  );
                }
              }
              placeholder="Paste Google Drive / Docs / Slides / Sheets link"
            />

          </div>
        )}


        <div
          className="ccPlannerActionRow"
        >

          <button
            type="button"
            className="ccPlannerPrimary"
            disabled={
              scanning
            }
            onClick={
              () =>
                void extractSyllabus()
            }
          >
            {scanning
              ? "Extracting syllabus…"
              : "Extract syllabus"}
          </button>

        </div>


        {draft ? (

          <div
            className="ccPlannerSuccessStrip"
          >

            <div>
              <strong>
                {draft.units.length}
              </strong>
              <span>
                Units
              </span>
            </div>

            <div>
              <strong>
                {topics.length}
              </strong>
              <span>
                Lessons
              </span>
            </div>

            <p>
              {draft.documentTitle ||
                draft.detectedSubject ||
                "Syllabus extracted successfully"}
            </p>

          </div>

        ) : null}

      </section>


      <section
        className="ccPlannerCard"
      >

        <div
          className="ccPlannerSectionTitle ccPlannerTitleWithAction"
        >

          <div>

            <span>
              STEP 02
            </span>

            <h3>
              Published timetable
            </h3>

            <p>
              CampusConnect automatically reads this faculty member&apos;s real published periods.
            </p>

          </div>


          <button
            type="button"
            className="ccPlannerSecondary"
            disabled={
              timetableLoading
            }
            onClick={
              () =>
                void loadTimetable()
            }
          >
            {timetableLoading
              ? "Checking…"
              : "Refresh"}
          </button>

        </div>


        <div
          className="ccPlannerStats"
        >

          <article>

            <span>
              PERIODS / WEEK
            </span>

            <strong>
              {timetableLoading
                ? "—"
                : effectiveWeeklyPeriods}
            </strong>

            <small>
              {timetable.length
                ? uniqueTeachingDays.join(
                    " · "
                  )
                : allocationWeeklyPeriods > 0
                  ? (
                      fallbackDays.length
                        ? fallbackDays.join(
                            " · "
                          )
                        : "Select teaching day(s) below"
                    )
                  : "Waiting for timetable"}
            </small>

          </article>


          <article>

            <span>
              SYLLABUS ITEMS
            </span>

            <strong>
              {topics.length ||
                "—"}
            </strong>

            <small>
              {draft
                ? (
                    syllabusSemesterHours >
                    0
                      ? `${draft.units.length} unit(s) · ${syllabusSemesterHours} Hours/Sem`
                      : `${draft.units.length} unit(s)`
                  )
                : "Extract syllabus first"}
            </small>

          </article>


          <article>

            <span>
              EXTRA CLASSES
            </span>

            <strong>
              {extraClasses}
            </strong>

            <small>
              Optional catch-up classes
            </small>

          </article>

        </div>


        <div
          className={
            timetable.length
              ? "ccPlannerTimetableStatus success"
              : "ccPlannerTimetableStatus"
          }
        >

          <strong>
            {timetable.length
              ? `${timetable.length} published period${timetable.length === 1 ? "" : "s"} found`
              : timetableLoading
                ? "Reading timetable…"
                : allocationWeeklyPeriods > 0
                  ? `${allocationWeeklyPeriods} weekly period${allocationWeeklyPeriods === 1 ? "" : "s"} found`
                  : "Timetable needs attention"}
          </strong>

          <span>
            {timetableDiagnostic}
          </span>

        </div>


        {!timetableLoading &&
        !timetable.length &&
        allocationWeeklyPeriods >
          0 ? (

          <div
            className="ccPlannerFallback"
          >

            <div
              className="ccPlannerFallbackCopy"
            >

              <strong>
                Select your actual teaching day(s)
              </strong>

              <span>
                Your weekly allocation is available, but the old timetable record is not linked to this subject. Select only the day(s) on which you really teach this subject.
              </span>

            </div>


            <div
              className="ccPlannerDayPicker"
            >

              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map(
                day => {

                  const selected =
                    fallbackDays.includes(
                      day
                    );


                  return (

                    <button
                      key={
                        day
                      }
                      type="button"
                      className={
                        selected
                          ? "selected"
                          : ""
                      }
                      onClick={
                        () => {

                          setFallbackDays(
                            current =>
                              current.includes(
                                day
                              )
                                ? current.filter(
                                    item =>
                                      item !==
                                      day
                                  )
                                : [
                                    ...current,
                                    day,
                                  ]
                          );

                          setSchedule(
                            []
                          );
                        }
                      }
                    >
                      {day.slice(
                        0,
                        3
                      )}
                    </button>
                  );
                }
              )}

            </div>

          </div>

        ) : null}


        {timetable.length ? (

          <div
            className="ccPlannerMiniTimetable"
          >

            {timetable.map(
              item => (

                <div
                  key={
                    item.id
                  }
                >

                  <strong>
                    {item.dayOfWeek}
                  </strong>

                  <span>
                    Period{" "}
                    {item.periodOrder}
                  </span>

                  <small>
                    {item.startTime
                      ? item.startTime.slice(
                          0,
                          5
                        )
                      : ""}

                    {item.endTime
                      ? ` – ${item.endTime.slice(
                          0,
                          5
                        )}`
                      : ""}
                  </small>

                </div>
              )
            )}

          </div>

        ) : null}


        <div
          className="ccPlannerDateControls"
        >

          <label>

            <span>
              Semester starts
            </span>

            <input
              type="date"
              value={
                semesterStart
              }
              onChange={
                event => {

                  setSemesterStart(
                    event.target
                      .value
                  );

                  setSchedule(
                    []
                  );
                }
              }
            />

          </label>


          <label>

            <span>
              Semester ends
            </span>

            <input
              type="date"
              min={
                semesterStart
              }
              value={
                semesterEnd
              }
              onChange={
                event => {

                  setSemesterEnd(
                    event.target
                      .value
                  );

                  setSchedule(
                    []
                  );
                }
              }
            />

          </label>


          <label>

            <span>
              Extra classes
            </span>

            <input
              type="number"
              min="0"
              max="100"
              value={
                extraClasses
              }
              onChange={
                event => {

                  setExtraClasses(
                    Math.max(
                      0,
                      Math.min(
                        100,
                        Number(
                          event.target
                            .value
                        ) ||
                        0
                      )
                    )
                  );

                  setSchedule(
                    []
                  );
                }
              }
            />

          </label>


          <button
            type="button"
            className="ccPlannerPrimary"
            disabled={
              !draft ||
              (
                !timetable.length &&
                !fallbackReady
              )
            }
            onClick={
              generatePlan
            }
          >
            Generate planner
          </button>

        </div>

      </section>


      {schedule.length ? (

        <section
          className="ccPlannerCard"
        >

          <div
            className="ccPlannerSectionTitle ccPlannerTitleWithAction"
          >

            <div>

              <span>
                STEP 03
              </span>

              <h3>
                Teaching plan
              </h3>

              <p>
                {schedule.length} classes automatically distributed across the real timetable.
              </p>

            </div>


            <div
              className="ccPlannerDownloadButtons"
            >

              <button
                type="button"
                onClick={
                  () =>
                    void downloadPdf()
                }
              >
                PDF
              </button>

              <button
                type="button"
                onClick={
                  downloadJpeg
                }
              >
                JPEG
              </button>

              <button
                type="button"
                onClick={
                  downloadExcel
                }
              >
                Excel
              </button>

              <button
                type="button"
                onClick={
                  downloadCsv
                }
              >
                CSV
              </button>

            </div>

          </div>


          <details
            className="ccPlannerTeachingDetails"
            open
          >

            <summary
              className="ccPlannerTeachingToggle"
            >

              <div>

                <span
                  className="ccPlannerTeachingToggleIcon"
                >
                  ▾
                </span>

                <div>

                  <strong>
                    Teaching plan
                  </strong>

                  <small>
                    View or hide the complete date-wise plan
                  </small>

                </div>

              </div>


              <div
                className="ccPlannerTeachingToggleMeta"
              >

                <span>
                  {schedule.length} classes
                </span>

                <b>
                  Toggle
                </b>

              </div>

            </summary>


            <div
              className="ccPlannerTeachingBody"
            >

          <div
            className="ccPlannerTableWrap"
          >

            <table>

              <thead>

                <tr>

                  <th>
                    #
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Day
                  </th>

                  <th>
                    Period
                  </th>

                  <th>
                    Unit
                  </th>

                  <th>
                    Lesson
                  </th>

                  <th>
                    Type
                  </th>

                </tr>

              </thead>


              <tbody>

                {schedule.map(
                  row => (

                    <tr
                      key={
                        row.id
                      }
                      className={
                        row.extraClass
                          ? "extra"
                          : ""
                      }
                    >

                      <td>
                        {row.lessonNumber}
                      </td>


                      <td>

                        {row.extraClass ? (

                          <input
                            type="date"
                            value={
                              row.classDate
                            }
                            onChange={
                              event =>
                                changeExtraDate(
                                  row.id,
                                  event.target
                                    .value
                                )
                            }
                          />

                        ) : (
                          formatDate(
                            row.classDate
                          )
                        )}

                      </td>


                      <td>
                        {row.dayOfWeek}
                      </td>


                      <td>

                        {row.extraClass
                          ? "—"
                          : row.periodOrder}

                        {!row.extraClass &&
                        row.startTime ? (

                          <small>
                            {row.startTime.slice(
                              0,
                              5
                            )}

                            {row.endTime
                              ? ` – ${row.endTime.slice(
                                  0,
                                  5
                                )}`
                              : ""}
                          </small>

                        ) : null}

                      </td>


                      <td>

                        <small>
                          UNIT{" "}
                          {row.unitNumber}
                        </small>

                        <strong>
                          {row.unitTitle}
                        </strong>

                      </td>


                      <td>
                        {row.topicTitle}
                      </td>


                      <td>

                        <span
                          className={
                            row.extraClass
                              ? "ccPlannerBadge extra"
                              : "ccPlannerBadge"
                          }
                        >
                          {row.extraClass
                            ? "Extra"
                            : "Timetable"}
                        </span>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>


          <div
            className="ccPlannerSave"
          >

            <div>

              <strong>
                Ready to save
              </strong>

              <span>
                Save the syllabus structure and complete date-wise teaching plan to CampusConnect.
              </span>

            </div>


            <button
              type="button"
              className="ccPlannerPrimary"
              disabled={
                saving
              }
              onClick={
                () =>
                  void savePlan()
              }
            >
              {saving
                ? "Saving…"
                : "Save planner"}
            </button>

          </div>

            </div>

          </details>

        </section>

      ) : null}


      {message ? (

        <div
          className="ccPlannerMessage"
          role="status"
        >
          {message}
        </div>

      ) : null}

    </section>
  );
}
