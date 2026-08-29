"use client";

import { useMemo, useState } from "react";

type Score = {
  subject: string;
  previous: number;
  latest: number;
};

const DEFAULT_SCORES: Score[] = [
  { subject: "Mathematics", previous: 72, latest: 81 },
  { subject: "Analog Communication", previous: 68, latest: 74 },
  { subject: "Digital Signal Processing", previous: 77, latest: 84 },
  { subject: "Microcontrollers", previous: 82, latest: 79 },
  { subject: "Electromagnetic Waves", previous: 61, latest: 66 },
];

export default function StudentPerformanceTracker() {
  const [open, setOpen] = useState(false);
  const [previousExam, setPreviousExam] = useState("CIE 1");
  const [latestExam, setLatestExam] = useState("CIE 2");
  const [scores, setScores] = useState<Score[]>(DEFAULT_SCORES);

  const analysis = useMemo(() => {
    if (!scores.length) {
      return {
        previousAverage: 0,
        latestAverage: 0,
        change: 0,
        weakest: null as Score | null,
        strongest: null as Score | null,
      };
    }

    const previousAverage =
      scores.reduce((sum, item) => sum + item.previous, 0) /
      scores.length;

    const latestAverage =
      scores.reduce((sum, item) => sum + item.latest, 0) /
      scores.length;

    const weakest = [...scores].sort(
      (a, b) => a.latest - b.latest
    )[0];

    const strongest = [...scores].sort(
      (a, b) => b.latest - a.latest
    )[0];

    return {
      previousAverage,
      latestAverage,
      change: latestAverage - previousAverage,
      weakest,
      strongest,
    };
  }, [scores]);

  function updateScore(
    index: number,
    key: keyof Score,
    value: string
  ) {
    setScores((current) =>
      current.map((item, i) => {
        if (i !== index) return item;

        if (key === "subject") {
          return {
            ...item,
            subject: value,
          };
        }

        return {
          ...item,
          [key]: Math.min(
            100,
            Math.max(0, Number(value) || 0)
          ),
        };
      })
    );
  }

  function addSubject() {
    setScores((current) => [
      ...current,
      {
        subject: "New Subject",
        previous: 0,
        latest: 0,
      },
    ]);
  }

  function removeSubject(index: number) {
    setScores((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  const weakest = analysis.weakest;
  const strongest = analysis.strongest;

  return (
    <>
      <button
        type="button"
        className="studentTrackerAcademicTool"
        onClick={() => setOpen(true)}
      >
        <div className="studentTrackerAcademicToolIcon">
          ↗
        </div>

        <div className="studentTrackerAcademicToolContent">
          <span>
            ACADEMIC PERFORMANCE
          </span>

          <h3>
            Student Performance Tracker
          </h3>

          <p>
            Compare previous and current exam scores,
            identify weak subjects and track your
            academic improvement.
          </p>
        </div>

        <div className="studentTrackerAcademicToolAction">
          Open tracker
          <b>→</b>
        </div>
      </button>

      {open && (
        <div className="studentTrackerOverlay">
          <div className="studentTrackerWorkspace">
            <header className="studentTrackerTopbar">
              <div>
                <span>STUDENT PERFORMANCE</span>

                <h2>Academic Progress Tracker</h2>

                <p>
                  Compare exams, analyse subject performance
                  and focus your study time where it matters.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="studentExamSelectors">
              <label>
                <span>Previous exam</span>

                <input
                  value={previousExam}
                  onChange={(event) =>
                    setPreviousExam(event.target.value)
                  }
                />
              </label>

              <div className="studentExamArrow">→</div>

              <label>
                <span>Latest exam</span>

                <input
                  value={latestExam}
                  onChange={(event) =>
                    setLatestExam(event.target.value)
                  }
                />
              </label>
            </div>

            <section className="studentTrackerSummaryGrid">
              <article>
                <small>PREVIOUS AVERAGE</small>
                <strong>
                  {analysis.previousAverage.toFixed(1)}%
                </strong>
                <span>{previousExam}</span>
              </article>

              <article>
                <small>LATEST AVERAGE</small>
                <strong>
                  {analysis.latestAverage.toFixed(1)}%
                </strong>
                <span>{latestExam}</span>
              </article>

              <article>
                <small>PERFORMANCE CHANGE</small>

                <strong
                  className={
                    analysis.change >= 0
                      ? "trackerPositive"
                      : "trackerNegative"
                  }
                >
                  {analysis.change >= 0 ? "+" : ""}
                  {analysis.change.toFixed(1)}
                </strong>

                <span>
                  {analysis.change >= 0
                    ? "Overall improvement"
                    : "Performance declined"}
                </span>
              </article>

              <article>
                <small>PRIORITY SUBJECT</small>

                <strong>
                  {weakest?.latest ?? 0}%
                </strong>

                <span>
                  {weakest?.subject ?? "No subjects"}
                </span>
              </article>
            </section>

            <div className="studentTrackerMainGrid">
              <section className="studentTrackerPanel">
                <div className="studentTrackerPanelHead">
                  <div>
                    <span>SUBJECT ANALYSIS</span>
                    <h3>Exam score comparison</h3>
                  </div>

                  <button
                    type="button"
                    onClick={addSubject}
                  >
                    + Add subject
                  </button>
                </div>

                <div className="studentScoreTable">
                  <div className="studentScoreHeader">
                    <span>Subject</span>
                    <span>{previousExam}</span>
                    <span>{latestExam}</span>
                    <span>Change</span>
                    <span />
                  </div>

                  {scores.map((item, index) => {
                    const difference =
                      item.latest - item.previous;

                    return (
                      <div
                        className="studentScoreEntry"
                        key={`${item.subject}-${index}`}
                      >
                        <input
                          value={item.subject}
                          onChange={(event) =>
                            updateScore(
                              index,
                              "subject",
                              event.target.value
                            )
                          }
                        />

                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.previous}
                          onChange={(event) =>
                            updateScore(
                              index,
                              "previous",
                              event.target.value
                            )
                          }
                        />

                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.latest}
                          onChange={(event) =>
                            updateScore(
                              index,
                              "latest",
                              event.target.value
                            )
                          }
                        />

                        <div>
                          <b
                            className={
                              difference >= 0
                                ? "trackerPositive"
                                : "trackerNegative"
                            }
                          >
                            {difference >= 0 ? "▲" : "▼"}{" "}
                            {Math.abs(difference)}
                          </b>

                          <div className="studentScoreProgress">
                            <i
                              style={{
                                width: `${item.latest}%`,
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeSubject(index)
                          }
                          aria-label={`Remove ${item.subject}`}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <aside className="studentTrackerRecommendations">
                <article className="studentRecommendationPriority">
                  <small>PRIORITY SIGNAL</small>

                  <h3>
                    {weakest && weakest.latest < 70
                      ? `You need to work harder in ${weakest.subject}.`
                      : `Keep improving ${weakest?.subject ?? "your subjects"}.`}
                  </h3>

                  <p>
                    {weakest
                      ? `${weakest.subject} is currently your lowest subject at ${weakest.latest}%. Give this subject more revision and practice time before the next exam.`
                      : "Add your subject marks to receive personalised guidance."}
                  </p>
                </article>

                <article>
                  <small>RECOMMENDED TARGET</small>

                  <h3>
                    Aim for{" "}
                    {weakest
                      ? Math.min(
                          100,
                          weakest.latest + 10
                        )
                      : 0}
                    %
                  </h3>

                  <p>
                    Improve the weakest subject by at least
                    10 marks in your next assessment.
                  </p>
                </article>

                <article className="studentRecommendationStrong">
                  <small>YOUR STRENGTH</small>

                  <h3>
                    {strongest?.subject ?? "—"}
                  </h3>

                  <p>
                    {strongest
                      ? `You currently score ${strongest.latest}% here. Maintain it with shorter revision sessions while giving more time to weaker subjects.`
                      : "Your strongest subject will appear here."}
                  </p>
                </article>

                <article>
                  <small>OVERALL TREND</small>

                  <h3>
                    {analysis.change > 0
                      ? "Performance improving"
                      : analysis.change < 0
                        ? "Needs recovery"
                        : "Performance stable"}
                  </h3>

                  <p>
                    {analysis.change > 0
                      ? `Your average improved by ${analysis.change.toFixed(1)} points. Continue the same revision strategy.`
                      : analysis.change < 0
                        ? `Your average dropped by ${Math.abs(analysis.change).toFixed(1)} points. Review mistakes from the latest exam before starting new topics.`
                        : "Your exam averages are unchanged. Focus on your weakest subject to create improvement."}
                  </p>
                </article>
              </aside>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
