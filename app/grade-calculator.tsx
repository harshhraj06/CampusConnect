"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type CalculatorMode = "SGPA" | "CGPA";

type SubjectRow = {
  id: string;
  subject: string;
  credits: string;
  grade: string;
};

type SemesterRow = {
  id: string;
  semester: string;
  sgpa: string;
  credits: string;
};

const gradePoints: Record<string, number> = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5,
  P: 4,
  F: 0,
};

function createSubject(
  subject = "",
  credits = "4",
  grade = "O"
): SubjectRow {
  return {
    id: crypto.randomUUID(),
    subject,
    credits,
    grade,
  };
}

function createSemester(
  semester = "",
  sgpa = "",
  credits = "20"
): SemesterRow {
  return {
    id: crypto.randomUUID(),
    semester,
    sgpa,
    credits,
  };
}

const initialSubjects = () => [
  createSubject("Mathematics", "4", "A+"),
  createSubject("Core Subject", "4", "A"),
  createSubject("Laboratory", "2", "O"),
  createSubject("Elective", "3", "B+"),
];

const initialSemesters = () => [
  createSemester("Semester 1"),
  createSemester("Semester 2"),
  createSemester("Semester 3"),
  createSemester("Semester 4"),
];

export function GradeCalculator() {
  const [open, setOpen] =
    useState(false);

  const [mode, setMode] =
    useState<CalculatorMode>("SGPA");

  const [subjects, setSubjects] =
    useState<SubjectRow[]>(
      initialSubjects
    );

  const [semesters, setSemesters] =
    useState<SemesterRow[]>(
      initialSemesters
    );

  const [result, setResult] =
    useState<number | null>(null);

  const [totalCredits, setTotalCredits] =
    useState<number | null>(null);

  useEffect(() => {
    const openCalculator = () => {
      setOpen(true);
    };

    window.addEventListener(
      "campus-open-grade-calculator",
      openCalculator
    );

    return () => {
      window.removeEventListener(
        "campus-open-grade-calculator",
        openCalculator
      );
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const closeOnEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        closeOnEscape
      );
    };
  }, [open]);

  const percentage =
    useMemo(() => {
      if (result === null) {
        return null;
      }

      /*
       * This is intentionally labelled as an estimate.
       * Different institutions / schemes can use different
       * conversion formulas.
       */
      return Math.max(
        0,
        (result - 0.75) * 10
      );
    }, [result]);

  const switchMode = (
    nextMode: CalculatorMode
  ) => {
    setMode(nextMode);
    setResult(null);
    setTotalCredits(null);
  };

  const calculateSgpa = () => {
    let credits = 0;
    let weightedPoints = 0;

    subjects.forEach(row => {
      const subjectCredits =
        Number(row.credits);

      if (
        !Number.isFinite(subjectCredits) ||
        subjectCredits <= 0
      ) {
        return;
      }

      const point =
        gradePoints[row.grade] ?? 0;

      credits += subjectCredits;

      weightedPoints +=
        subjectCredits * point;
    });

    if (!credits) {
      setResult(null);
      setTotalCredits(null);
      return;
    }

    setResult(
      weightedPoints / credits
    );

    setTotalCredits(credits);
  };

  const calculateCgpa = () => {
    let credits = 0;
    let weightedSgpa = 0;

    semesters.forEach(row => {
      const semesterCredits =
        Number(row.credits);

      const semesterSgpa =
        Number(row.sgpa);

      if (
        !Number.isFinite(
          semesterCredits
        ) ||
        semesterCredits <= 0 ||
        !Number.isFinite(
          semesterSgpa
        ) ||
        semesterSgpa < 0 ||
        semesterSgpa > 10
      ) {
        return;
      }

      credits += semesterCredits;

      weightedSgpa +=
        semesterCredits *
        semesterSgpa;
    });

    if (!credits) {
      setResult(null);
      setTotalCredits(null);
      return;
    }

    setResult(
      weightedSgpa / credits
    );

    setTotalCredits(credits);
  };

  const reset = () => {
    if (mode === "SGPA") {
      setSubjects(
        initialSubjects()
      );
    } else {
      setSemesters(
        initialSemesters()
      );
    }

    setResult(null);
    setTotalCredits(null);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="campusGradePage">
      <div className="campusGradeShell">

        <header className="campusGradeTopbar">

          <div className="campusGradeBrand">

            <span className="campusGradeLogo">
              CC
            </span>

            <div>
              <small>
                CAMPUSCONNECT · ACADEMICS
              </small>

              <h2>
                SGPA & CGPA Calculator
              </h2>
            </div>

          </div>

          <button
            type="button"
            className="campusGradeBack"
            onClick={() =>
              setOpen(false)
            }
          >
            ← Back to dashboard
          </button>

        </header>


        <section className="campusGradeHero">

          <div className="campusGradeHeroMain">

            <span>
              ACADEMIC PERFORMANCE
            </span>

            <h1>
              Calculate your academic
              performance with clarity.
            </h1>

            <p>
              Use subject credits and grades
              for semester SGPA, or use
              semester-wise SGPA and credits
              for cumulative CGPA.
            </p>

            <div className="campusGradeHeroTags">

              <span>
                No login data changed
              </span>

              <span>
                Available to every role
              </span>

              <span>
                Instant calculation
              </span>

            </div>

          </div>


          <aside className="campusGradeFormula">

            <div>
              <small>
                FORMULA
              </small>

              <strong>
                Σ(Credit × Grade Point)
                <br />
                ÷ ΣCredits
              </strong>
            </div>

            <div>
              <small>
                CAMPUSCONNECT SCALE
              </small>

              <strong>
                O = 10 · A+ = 9 · A = 8
              </strong>
            </div>

            <div>
              <small>
                SCORE RANGE
              </small>

              <strong>
                0.00 – 10.00
              </strong>
            </div>

          </aside>

        </section>


        <section className="campusGradeWorkspace">

          <main className="campusGradeCard campusGradeInputs">

            <header className="campusGradeSectionHead">

              <div>
                <span>
                  CAMPUSCONNECT CALCULATOR
                </span>

                <h3>
                  Academic inputs
                </h3>
              </div>


              <div
                className="campusGradeTabs"
                role="tablist"
              >

                <button
                  type="button"
                  className={
                    mode === "SGPA"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    switchMode(
                      "SGPA"
                    )
                  }
                >
                  SGPA
                </button>

                <button
                  type="button"
                  className={
                    mode === "CGPA"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    switchMode(
                      "CGPA"
                    )
                  }
                >
                  CGPA
                </button>

              </div>

            </header>


            {mode === "SGPA" ? (

              <div>

                <div className="campusGradeColumnLabels">
                  <span>SUBJECT</span>
                  <span>CREDITS</span>
                  <span>GRADE</span>
                  <span />
                </div>

                <div className="campusGradeRows">

                  {subjects.map(
                    row => (

                      <div
                        className="campusGradeRow"
                        key={row.id}
                      >

                        <input
                          value={
                            row.subject
                          }
                          placeholder="Subject name"
                          onChange={event =>
                            setSubjects(
                              current =>
                                current.map(
                                  item =>
                                    item.id ===
                                    row.id
                                      ? {
                                          ...item,
                                          subject:
                                            event
                                              .target
                                              .value,
                                        }
                                      : item
                                )
                            )
                          }
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={
                            row.credits
                          }
                          onChange={event =>
                            setSubjects(
                              current =>
                                current.map(
                                  item =>
                                    item.id ===
                                    row.id
                                      ? {
                                          ...item,
                                          credits:
                                            event
                                              .target
                                              .value,
                                        }
                                      : item
                                )
                            )
                          }
                        />

                        <select
                          value={
                            row.grade
                          }
                          onChange={event =>
                            setSubjects(
                              current =>
                                current.map(
                                  item =>
                                    item.id ===
                                    row.id
                                      ? {
                                          ...item,
                                          grade:
                                            event
                                              .target
                                              .value,
                                        }
                                      : item
                                )
                            )
                          }
                        >
                          {Object.keys(
                            gradePoints
                          ).map(grade => (
                            <option
                              key={grade}
                              value={grade}
                            >
                              {grade} ·{" "}
                              {
                                gradePoints[
                                  grade
                                ]
                              }
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="campusGradeDelete"
                          aria-label="Remove subject"
                          disabled={
                            subjects.length <=
                            1
                          }
                          onClick={() =>
                            setSubjects(
                              current =>
                                current.filter(
                                  item =>
                                    item.id !==
                                    row.id
                                )
                            )
                          }
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>


                <div className="campusGradeActions">

                  <button
                    type="button"
                    className="campusGradeSecondary"
                    onClick={() =>
                      setSubjects(
                        current => [
                          ...current,
                          createSubject(),
                        ]
                      )
                    }
                  >
                    + Add subject
                  </button>

                  <button
                    type="button"
                    className="campusGradePrimary"
                    onClick={
                      calculateSgpa
                    }
                  >
                    Calculate SGPA
                  </button>

                  <button
                    type="button"
                    className="campusGradeSecondary"
                    onClick={reset}
                  >
                    Reset
                  </button>

                </div>

              </div>

            ) : (

              <div>

                <div className="campusGradeSemesterLabels">
                  <span>SEMESTER</span>
                  <span>SGPA</span>
                  <span>CREDITS</span>
                  <span />
                </div>

                <div className="campusGradeRows">

                  {semesters.map(
                    row => (

                      <div
                        className="campusGradeSemesterRow"
                        key={row.id}
                      >

                        <input
                          value={
                            row.semester
                          }
                          placeholder="Semester"
                          onChange={event =>
                            setSemesters(
                              current =>
                                current.map(
                                  item =>
                                    item.id ===
                                    row.id
                                      ? {
                                          ...item,
                                          semester:
                                            event
                                              .target
                                              .value,
                                        }
                                      : item
                                )
                            )
                          }
                        />

                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.01"
                          value={
                            row.sgpa
                          }
                          placeholder="SGPA"
                          onChange={event =>
                            setSemesters(
                              current =>
                                current.map(
                                  item =>
                                    item.id ===
                                    row.id
                                      ? {
                                          ...item,
                                          sgpa:
                                            event
                                              .target
                                              .value,
                                        }
                                      : item
                                )
                            )
                          }
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={
                            row.credits
                          }
                          placeholder="Credits"
                          onChange={event =>
                            setSemesters(
                              current =>
                                current.map(
                                  item =>
                                    item.id ===
                                    row.id
                                      ? {
                                          ...item,
                                          credits:
                                            event
                                              .target
                                              .value,
                                        }
                                      : item
                                )
                            )
                          }
                        />

                        <button
                          type="button"
                          className="campusGradeDelete"
                          aria-label="Remove semester"
                          disabled={
                            semesters.length <=
                            1
                          }
                          onClick={() =>
                            setSemesters(
                              current =>
                                current.filter(
                                  item =>
                                    item.id !==
                                    row.id
                                )
                            )
                          }
                        >
                          ×
                        </button>

                      </div>

                    )
                  )}

                </div>


                <div className="campusGradeActions">

                  <button
                    type="button"
                    className="campusGradeSecondary"
                    onClick={() =>
                      setSemesters(
                        current => [
                          ...current,
                          createSemester(
                            `Semester ${
                              current.length +
                              1
                            }`
                          ),
                        ]
                      )
                    }
                  >
                    + Add semester
                  </button>

                  <button
                    type="button"
                    className="campusGradePrimary"
                    onClick={
                      calculateCgpa
                    }
                  >
                    Calculate CGPA
                  </button>

                  <button
                    type="button"
                    className="campusGradeSecondary"
                    onClick={reset}
                  >
                    Reset
                  </button>

                </div>

              </div>

            )}

          </main>


          <aside className="campusGradeSide">

            <section className="campusGradeCard">

              <header className="campusGradeSectionHead">

                <div>
                  <span>
                    LIVE RESULT
                  </span>

                  <h3>
                    Academic score
                  </h3>
                </div>

              </header>


              <div className="campusGradeResults">

                <article className="campusGradeMainResult">
                  <small>
                    {mode}
                  </small>

                  <strong>
                    {result === null
                      ? "—"
                      : result.toFixed(
                          2
                        )}
                  </strong>

                  <span>
                    out of 10.00
                  </span>
                </article>


                <div className="campusGradeMiniResults">

                  <article>
                    <small>
                      TOTAL CREDITS
                    </small>

                    <strong>
                      {totalCredits ===
                      null
                        ? "—"
                        : totalCredits.toFixed(
                            1
                          )}
                    </strong>
                  </article>

                  <article>
                    <small>
                      PERCENTAGE EST.
                    </small>

                    <strong>
                      {percentage === null
                        ? "—"
                        : `${percentage.toFixed(
                            1
                          )}%`}
                    </strong>
                  </article>

                </div>

              </div>

            </section>


            <section className="campusGradeCard campusGradeGuide">

              <span>
                HOW IT WORKS
              </span>

              <h3>
                Calculation guide
              </h3>

              <ol>
                <li>
                  Add every subject and its
                  credit value.
                </li>

                <li>
                  Select the grade obtained
                  in that subject.
                </li>

                <li>
                  CampusConnect multiplies
                  credits by grade points.
                </li>

                <li>
                  Total weighted points are
                  divided by total credits.
                </li>
              </ol>

              <p>
                Percentage conversion can
                differ across universities,
                schemes and regulations.
                The percentage shown here is
                therefore an estimate, while
                SGPA/CGPA uses the entered
                credits directly.
              </p>

            </section>

          </aside>

        </section>

      </div>
    </div>
  );
}

export function openGradeCalculator() {
  window.dispatchEvent(
    new CustomEvent(
      "campus-open-grade-calculator"
    )
  );
}
