"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";


type Props = {
  marks: Array<
    Record<string, any>
  >;
};


type PreparedMark = {
  id: string;
  subject: string;
  code: string;
  assessment: string;
  score: number;
  maxScore: number;
  percent: number;
};


type SubjectGroup = {
  key: string;
  subject: string;
  code: string;
  records: PreparedMark[];
};


function prepareMarks(
  marks: Array<
    Record<string, any>
  >
): PreparedMark[] {

  return marks
    .map(
      (
        item,
        index
      ) => {

        const score =
          Number(
            item.marks
          );

        const maxScore =
          Number(
            item.max_marks
          );


        if (
          !Number.isFinite(
            score
          ) ||
          !Number.isFinite(
            maxScore
          ) ||
          maxScore <= 0
        ) {
          return null;
        }


        return {
          id:
            String(
              item.id ||
              index
            ),

          subject:
            String(
              item.subject_name ||
              "Subject"
            ),

          code:
            String(
              item.subject_code ||
              "—"
            ),

          assessment:
            String(
              item.assessment ||
              "Assessment"
            ),

          score,

          maxScore,

          percent:
            Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  score /
                    maxScore *
                    100
                )
              )
            ),
        };

      }
    )
    .filter(
      (
        item
      ):
        item is PreparedMark =>
        Boolean(
          item
        )
    );
}


function groupSubjects(
  marks: PreparedMark[]
): SubjectGroup[] {

  const groups =
    new Map<
      string,
      SubjectGroup
    >();


  for (
    const item
    of marks
  ) {

    const key =
      `${item.code}::${item.subject}`;


    const existing =
      groups.get(
        key
      );


    if (existing) {

      existing.records.push(
        item
      );

      continue;
    }


    groups.set(
      key,
      {
        key,
        subject:
          item.subject,

        code:
          item.code,

        records:
          [
            item,
          ],
      }
    );

  }


  return [
    ...groups.values(),
  ];
}


function performanceTone(
  percent: number
) {

  if (
    percent >=
    85
  ) {
    return {
      badge:
        "bg-emerald-300",

      bar:
        "bg-emerald-400",
    };
  }


  if (
    percent >=
    70
  ) {
    return {
      badge:
        "bg-yellow-300",

      bar:
        "bg-yellow-400",
    };
  }


  if (
    percent >=
    50
  ) {
    return {
      badge:
        "bg-orange-300",

      bar:
        "bg-orange-400",
    };
  }


  return {
    badge:
      "bg-red-300",

    bar:
      "bg-red-400",
  };
}


export default function AcademicMarksReferenceDashboard({
  marks,
}: Props) {

  const prepared =
    useMemo(
      () =>
        prepareMarks(
          marks
        ),
      [
        marks,
      ]
    );


  const subjects =
    useMemo(
      () =>
        groupSubjects(
          prepared
        ),
      [
        prepared,
      ]
    );


  const [
    openSubject,
    setOpenSubject,
  ] =
    useState<
      string | null
    >(
      null
    );


  const toggleSubject =
    (
      key: string
    ) => {

      setOpenSubject(
        current =>
          current ===
          key
            ? null
            : key
      );

    };


  return (
    <section className="w-full min-w-0 bg-white px-3 py-5 md:px-6 md:py-8">

      <div className="w-full border-[3px] border-black bg-white p-5 md:p-7 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

        <header className="flex flex-col gap-4 border-b-[3px] border-black pb-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
              Published Records
            </span>


            <h1 className="m-0 text-3xl font-black uppercase tracking-[-0.04em] text-black md:text-4xl">
              Assessment Records
            </h1>

          </div>


          <div className="inline-flex self-start border-[3px] border-black bg-yellow-400 px-4 py-2 text-xs font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:self-auto">

            {
              prepared.length
            }

            {" "}

            {
              prepared.length ===
              1
                ? "Record"
                : "Records"
            }

          </div>

        </header>


        {subjects.length ? (

          <div className="mt-6 grid gap-4">

            {subjects.map(
              (
                subject,
                index
              ) => {

                const expanded =
                  openSubject ===
                  subject.key;


                return (
                  <motion.article
                    key={
                      subject.key
                    }
                    initial={{
                      opacity:
                        0,

                      y:
                        14,
                    }}
                    animate={{
                      opacity:
                        1,

                      y:
                        0,
                    }}
                    transition={{
                      duration:
                        .3,

                      delay:
                        index *
                        .05,
                    }}
                    className="overflow-hidden border-[3px] border-black bg-white"
                  >

                    <button
                      type="button"
                      onClick={() =>
                        toggleSubject(
                          subject.key
                        )
                      }
                      aria-expanded={
                        expanded
                      }
                      className="group flex w-full items-center justify-between gap-5 bg-white p-5 text-left transition-colors hover:bg-zinc-50 md:p-6"
                    >

                      <div className="min-w-0">

                        <span className="mb-3 inline-flex border-[2px] border-black bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-black">
                          {
                            subject.code
                          }
                        </span>


                        <h2 className="m-0 break-words text-xl font-black uppercase tracking-[-0.025em] text-black md:text-2xl">
                          {
                            subject.subject
                          }
                        </h2>


                        <small className="mt-2 block text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">

                          {
                            subject.records
                              .length
                          }

                          {" "}

                          {
                            subject.records
                              .length ===
                            1
                              ? "Assessment"
                              : "Assessments"
                          }

                        </small>

                      </div>


                      <motion.span
                        animate={{
                          rotate:
                            expanded
                              ? 45
                              : 0,
                        }}
                        transition={{
                          duration:
                            .2,
                        }}
                        className="grid h-11 w-11 flex-none place-items-center border-[3px] border-black bg-yellow-400 text-2xl font-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                      >
                        +
                      </motion.span>

                    </button>


                    <AnimatePresence
                      initial={
                        false
                      }
                    >

                      {expanded && (

                        <motion.div
                          initial={{
                            height:
                              0,

                            opacity:
                              0,
                          }}
                          animate={{
                            height:
                              "auto",

                            opacity:
                              1,
                          }}
                          exit={{
                            height:
                              0,

                            opacity:
                              0,
                          }}
                          transition={{
                            duration:
                              .3,

                            ease:
                              [
                                .22,
                                1,
                                .36,
                                1,
                              ],
                          }}
                          className="overflow-hidden"
                        >

                          <div className="border-t-[3px] border-black bg-zinc-50 p-4 md:p-6">

                            <div className="grid gap-4">

                              {subject.records.map(
                                (
                                  record,
                                  recordIndex
                                ) => {

                                  const tone =
                                    performanceTone(
                                      record.percent
                                    );


                                  return (
                                    <motion.div
                                      key={
                                        record.id
                                      }
                                      initial={{
                                        opacity:
                                          0,

                                        y:
                                          12,
                                      }}
                                      animate={{
                                        opacity:
                                          1,

                                        y:
                                          0,
                                      }}
                                      transition={{
                                        duration:
                                          .3,

                                        delay:
                                          recordIndex *
                                          .06,
                                      }}
                                      className="border-[3px] border-black bg-white p-4 md:p-5"
                                    >

                                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                                        <div>

                                          <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">
                                            Assessment
                                          </span>


                                          <strong className="block text-base font-black text-black md:text-lg">
                                            {
                                              record.assessment
                                            }
                                          </strong>

                                        </div>


                                        <div className="sm:text-right">

                                          <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">
                                            Marks
                                          </span>


                                          <strong className="text-2xl font-black text-black">

                                            {
                                              record.score
                                            }

                                            <span className="px-1 text-zinc-400">
                                              /
                                            </span>

                                            {
                                              record.maxScore
                                            }

                                          </strong>

                                        </div>

                                      </div>


                                      <div className="mt-6">

                                        <div className="mb-3 flex items-center justify-between gap-4">

                                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                                            Performance
                                          </span>


                                          <span
                                            className={`border-[3px] border-black px-3 py-1 text-sm font-black text-black ${tone.badge}`}
                                          >
                                            {
                                              record.percent
                                            }%
                                          </span>

                                        </div>


                                        <div className="h-8 w-full overflow-hidden border-[3px] border-black bg-white">

                                          <motion.div
                                            initial={{
                                              width:
                                                0,
                                            }}
                                            animate={{
                                              width:
                                                `${record.percent}%`,
                                            }}
                                            transition={{
                                              duration:
                                                .8,

                                              delay:
                                                .08 +
                                                recordIndex *
                                                .08,

                                              ease:
                                                [
                                                  .22,
                                                  1,
                                                  .36,
                                                  1,
                                                ],
                                            }}
                                            className={`relative h-full border-r-[3px] border-black ${tone.bar}`}
                                          >

                                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:5px_5px]" />

                                          </motion.div>

                                        </div>

                                      </div>

                                    </motion.div>
                                  );

                                }
                              )}

                            </div>

                          </div>

                        </motion.div>

                      )}

                    </AnimatePresence>

                  </motion.article>
                );

              }
            )}

          </div>

        ) : (

          <div className="mt-6 border-[3px] border-dashed border-black/30 p-10 text-center">

            <strong className="text-sm font-black uppercase tracking-[0.1em] text-zinc-500">
              No published marks available
            </strong>

          </div>

        )}

      </div>

    </section>
  );
}
