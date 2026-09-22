"use client";

import {useEffect, useMemo, useState} from "react";

import {
  calculatePlacementMatch,
  type PlacementMatchProfile,
  type PlacementMatchResult,
} from "./placement-match";

import {getSupabaseClient} from "../lib/supabase";

export type PlacementJob = {
  id?: string;
  c: string;
  r: string;
  p: string;
  d: string;
  m: number;
  l: string;
  location: string;
  workMode: string;
  type: string;
  cgpa: string;
  branches: string[];
  skills: string[];
  about: string;
  rounds: string[];
  applications: number;
  posted: string;
};

type PlacementFilter = "Recommended" | "All drives" | "Saved";

type StudentPlacementsProps = {
  jobs: PlacementJob[];
  applied: string[];
  saved: string[];

  profile: PlacementMatchProfile & {
    email?: string;
  };

  apply: (company: string) => void;
  toggleSaved: (company: string) => void;
  onOpenApplications: () => void;
};

type AptitudeQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

const aptitudeQuestions: AptitudeQuestion[] = [
  {
    question: "A product price rises by 20% and then falls by 20%. What is the overall change?",
    options: ["No change", "4% decrease", "4% increase", "8% decrease"],
    answer: 1,
    explanation: "A price of 100 becomes 120, then 96. The final price is 4% lower.",
  },
  {
    question: "A can finish a task in 12 days and B in 18 days. How long will they take together?",
    options: ["6 days", "7.2 days", "8 days", "9 days"],
    answer: 1,
    explanation: "Their combined rate is 1/12 + 1/18 = 5/36, so the time is 36/5 days.",
  },
  {
    question: "Choose the next number in the sequence: 2, 6, 12, 20, 30, …",
    options: ["36", "40", "42", "44"],
    answer: 2,
    explanation: "The differences are 4, 6, 8 and 10; adding the next difference, 12, gives 42.",
  },
  {
    question: "A bag has 3 red and 2 blue balls. What is the probability of drawing 2 red balls without replacement?",
    options: ["1/5", "3/10", "2/5", "1/2"],
    answer: 1,
    explanation: "The probability is 3/5 × 2/4 = 6/20 = 3/10.",
  },
  {
    question: "All circuits are systems. Some systems are adaptive. Which statement is definitely true?",
    options: ["All circuits are systems", "All systems are circuits", "Some circuits are adaptive", "No circuit is adaptive"],
    answer: 0,
    explanation: "Only the original universal statement is guaranteed by the information given.",
  },
];

export function StudentPlacements({
  jobs,
  applied,
  saved,
  profile,
  apply,
  toggleSaved,
  onOpenApplications,
}: StudentPlacementsProps) {
  const [filter, setFilter] = useState<PlacementFilter>("All drives");
  const [query, setQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<PlacementJob | null>(null);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [assessmentScore, setAssessmentScore] = useState<number | null>(null);

  const [matchProfile, setMatchProfile] =
    useState<PlacementMatchProfile>({
      department:
        profile.department || "",
      skills:
        profile.skills || "",
      cgpa:
        profile.cgpa ?? null,
      year:
        profile.year || "",
    });


  /*
   * Keep the placement intelligence profile synced with
   * the main CampusConnect profile.
   */
  useEffect(() => {
    setMatchProfile(current => ({
      ...current,
      department:
        profile.department ||
        current.department ||
        "",
      skills:
        profile.skills ||
        current.skills ||
        "",
      year:
        profile.year ||
        current.year ||
        "",
      cgpa:
        profile.cgpa ??
        current.cgpa ??
        null,
    }));
  }, [
    profile.department,
    profile.skills,
    profile.year,
    profile.cgpa,
  ]);


  /*
   * CGPA is academic eligibility data and should not be
   * guessed. Pull the verified value directly from profiles.
   */
  useEffect(() => {
    let active = true;

    const loadAcademicEligibility =
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          return;
        }

        const {
          data: auth,
        } =
          await client.auth
            .getUser();

        if (
          !auth.user ||
          !active
        ) {
          return;
        }

        const {
          data,
          error,
        } =
          await client
            .from("profiles")
            .select(
              "department,skills,cgpa,graduation_year"
            )
            .eq(
              "id",
              auth.user.id
            )
            .maybeSingle();

        if (
          error ||
          !data ||
          !active
        ) {
          if (error) {
            console.error(
              "[Placement Match] profile:",
              error
            );
          }

          return;
        }

        setMatchProfile(current => ({
          ...current,

          department:
            data.department ||
            current.department ||
            "",

          skills:
            data.skills ||
            current.skills ||
            "",

          cgpa:
            data.cgpa ??
            current.cgpa ??
            null,

          year:
            data.graduation_year ||
            current.year ||
            "",
        }));
      };

    void loadAcademicEligibility();

    return () => {
      active = false;
    };
  }, [
    profile.email,
  ]);


  const placementMatches =
    useMemo(
      () =>
        new Map(
          jobs.map(job => [
            job.c,
            calculatePlacementMatch(
              matchProfile,
              {
                branches:
                  job.branches,

                skills:
                  job.skills,

                cgpa:
                  job.cgpa,
              }
            ),
          ])
        ),
      [
        jobs,
        matchProfile,
      ]
    );


  const visibleJobs = useMemo(() => {
    const normalizedQuery =
      query
        .trim()
        .toLowerCase();

    return [...jobs]
      .filter(job => {
        const match =
          placementMatches.get(
            job.c
          );

        const matchesFilter =
          filter === "All drives" ||
          (
            filter ===
              "Recommended" &&
            Boolean(
              match &&
              match.eligible &&
              match.score >= 65
            )
          ) ||
          (
            filter === "Saved" &&
            saved.includes(
              job.c
            )
          );

        const searchable = [
          job.c,
          job.r,
          job.location,
          job.type,
          job.workMode,
          ...job.skills,
          ...job.branches,
        ]
          .join(" ")
          .toLowerCase();

        return (
          matchesFilter &&
          (
            !normalizedQuery ||
            searchable.includes(
              normalizedQuery
            )
          )
        );
      })
      .sort(
        (a, b) =>
          (
            placementMatches
              .get(b.c)
              ?.score || 0
          ) -
          (
            placementMatches
              .get(a.c)
              ?.score || 0
          )
      );
  }, [
    filter,
    jobs,
    query,
    saved,
    placementMatches,
  ]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedJob(null);
      setAssessmentOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (!selectedJob && !assessmentOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [assessmentOpen, selectedJob]);

  const readiness = assessmentScore === null ? 84 : Math.min(96, 84 + assessmentScore * 2);

  const openCareerAi = (
    mode:
      | "placement_coach"
      | "resume_analyzer"
      | "career_roadmap",
    prompt: string
  ) => {
    window.sessionStorage.setItem(
      "campusconnect-ai-intent",
      JSON.stringify({
        mode,
        prompt,
        createdAt: Date.now(),
      })
    );

    window.dispatchEvent(
      new CustomEvent(
        "campus-navigate",
        {
          detail: "My Campus",
        }
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return <div className="placementExperience">
    <section className="placementMain">
      <section className="placementCareerAiActions">
        <div>
          <span>CAREER INTELLIGENCE</span>
          <h3>Turn your real placement profile into action</h3>
          <p>Grounded in your applications, Resume Studio records and deterministic drive matches.</p>
        </div>

        <nav aria-label="Career AI actions">
          <button
            type="button"
            onClick={() => openCareerAi(
              "placement_coach",
              "Act as my CampusConnect Placement Coach. Review my real applications, Resume Studio readiness and current deterministic placement-drive matches. Give my current position, best supported opportunities, genuine gaps and no more than three next actions."
            )}
          >
            <i>P</i>
            <span><b>Placement Coach</b><small>Applications and matches</small></span>
            <strong>→</strong>
          </button>

          <button
            type="button"
            onClick={() => openCareerAi(
              "resume_analyzer",
              "Act as my CampusConnect Resume Analyzer. Review only my real Resume Studio content and deterministic resume signals. Identify supported strengths, missing sections and specific improvements without inventing ATS scores, metrics or experience."
            )}
          >
            <i>R</i>
            <span><b>Resume Analyzer</b><small>Evidence and gaps</small></span>
            <strong>→</strong>
          </button>

          <button
            type="button"
            onClick={() => openCareerAi(
              "career_roadmap",
              "Act as my CampusConnect Career Roadmap coach. Build a focused 30, 60 and 90-day recommendation using my actual profile, resume, application progress and current deterministic placement skill gaps."
            )}
          >
            <i>90</i>
            <span><b>Career Roadmap</b><small>30, 60 and 90 days</small></span>
            <strong>→</strong>
          </button>
        </nav>
      </section>

      <div className="placementToolbar">
        <div className="placementFilters" aria-label="Filter placement drives">
          {(["All drives", "Recommended", "Saved"] as PlacementFilter[]).map(item => <button
            className={filter === item ? "selected" : ""}
            onClick={() => setFilter(item)}
            aria-pressed={filter === item}
            key={item}
          >{item}{item === "Saved" && saved.length > 0 ? ` ${saved.length}` : ""}</button>)}
        </div>
        <label className="placementSearch">
          <span>⌕</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search role, company or skill" aria-label="Search placement drives"/>
          {query && <button onClick={() => setQuery("")} aria-label="Clear placement search">×</button>}
        </label>
      </div>

      <div className="placementResultMeta">
        <p><b>{visibleJobs.length} opportunities</b><span>Personalized using your ECE profile and skills</span></p>
        <span>Updated today</span>
      </div>

      {visibleJobs.length > 0 ? <div className="placementCards">
        {visibleJobs.map(job => {
          const isApplied =
            applied.includes(job.c);

          const isSaved =
            saved.includes(job.c);

          const match =
            placementMatches.get(
              job.c
            ) ||
            calculatePlacementMatch(
              matchProfile,
              job
            );

          const matchLabel =
            match.score >= 90
              ? "Excellent match"
              : match.score >= 80
                ? "Strong match"
                : match.score >= 65
                  ? "Good match"
                  : match.score >= 50
                    ? "Partial match"
                    : "Low match";

          return <article
            className={
              `placementCard placementMatch-${match.score >= 80 ? "strong" : match.score >= 65 ? "good" : "low"}`
            }
            key={job.c}
          >
            <div className="placementCardTop">
              <CompanyLogo label={job.l}/>
              <div className="placementCardBadges"><mark
                className={
                  match.eligible
                    ? "placementMatchBadge eligible"
                    : "placementMatchBadge ineligible"
                }
                title={matchLabel}
              >
                {match.score}% · {matchLabel}
              </mark><button
                className={isSaved ? "saved" : ""}
                onClick={() => toggleSaved(job.c)}
                aria-label={isSaved ? `Remove ${job.c} from saved jobs` : `Save ${job.c}`}
                aria-pressed={isSaved}
                title={isSaved ? "Remove saved job" : "Save job"}
              >{isSaved ? "★" : "☆"}</button></div>
            </div>
            <div className="placementCardTitle"><span>{job.posted}</span><h3>{job.r}</h3><p>{job.c}</p></div>
            <div className="placementTags"><span>{job.workMode}</span><span>{job.location}</span><span>{job.type}</span></div>
            <div className="placementDetails"><p><span>Package</span><b>{job.p}</b></p><p><span>Apply by</span><b>{job.d}</b></p></div>
            <p
              className={
                match.branchEligible &&
                match.cgpaEligible !== false
                  ? "placementEligibility placementEligibilityOk"
                  : "placementEligibility placementEligibilityRisk"
              }
            >
              <b>
                {!match.branchEligible
                  ? "Branch not eligible:"
                  : match.cgpaEligible === false
                    ? "CGPA not eligible:"
                    : match.cgpaEligible === null
                      ? "CGPA verification needed:"
                      : "Eligible:"}
              </b>{" "}

              {job.branches.length
                ? job.branches.join(", ")
                : "All branches"}

              {Number(job.cgpa) > 0
                ? ` · ${job.cgpa}+ CGPA`
                : ""}
            </p>

            {(match.matchedSkills.length > 0 ||
              match.missingSkills.length > 0) && (
              <div className="placementMatchSkills">
                {match.matchedSkills
                  .slice(0, 3)
                  .map(skill => (
                    <span
                      className="matched"
                      key={`matched-${skill}`}
                    >
                      ✓ {skill}
                    </span>
                  ))}

                {match.missingSkills
                  .slice(0, 2)
                  .map(skill => (
                    <span
                      className="missing"
                      key={`missing-${skill}`}
                    >
                      + {skill}
                    </span>
                  ))}
              </div>
            )}
            <div className="placementSkills">{job.skills.slice(0, 3).map(skill => <span key={skill}>{skill}</span>)}</div>
            <div className="placementActions">
              <button className="placementSecondary" onClick={() => setSelectedJob(job)}>View details</button>
              <button className="placementPrimary" disabled={isApplied} onClick={() => apply(job.c)}>{isApplied ? "✓ Applied" : "Quick apply →"}</button>
            </div>
          </article>;
        })}
      </div> : <div className="placementEmpty">
        <i>{filter === "Saved" ? "☆" : "⌕"}</i>
        <h3>{filter === "Saved" ? "No saved opportunities yet" : "No matching drives found"}</h3>
        <p>{filter === "Saved" ? "Save roles you want to compare or apply to later." : "Try another company, role, branch or skill."}</p>
        <button onClick={() => {setFilter("All drives"); setQuery("");}}>Explore all drives</button>
      </div>}
    </section>

    <aside className="placementJourney">
      <div className="journeyHeader"><span>YOUR READINESS</span><b>{readiness}<small>/100</small></b></div>
      <div className="journeyProgress"><i style={{width: `${readiness}%`}}/></div>
      <p>Strong profile. Complete your aptitude check and keep high-match applications moving.</p>
      <div className="journeyStats"><span><b>{applied.length}</b><small>Applied</small></span><span><b>{saved.length}</b><small>Saved</small></span><span><b>{
        jobs.filter(job => {
          const match =
            placementMatches.get(
              job.c
            );

          return Boolean(
            match &&
            match.eligible &&
            match.score >= 80
          );
        }).length
      }</b><small>Best matches</small></span></div>
      <div className="journeyChecklist">
        <span className="done"><i>✓</i><b>Resume completed<small>ATS score verified</small></b></span>
        <span className="done"><i>✓</i><b>Eligibility verified<small>Academic data ready</small></b></span>
        <span className={assessmentScore === null ? "" : "done"}><i>{assessmentScore === null ? "3" : "✓"}</i><b>Mock aptitude test<small>{assessmentScore === null ? "5 questions · 6 minutes" : `${assessmentScore}/5 correct · completed`}</small></b></span>
        <span><i>4</i><b>Mock interview<small>Available after aptitude</small></b></span>
      </div>
      <button className="journeyPractice" onClick={() => setAssessmentOpen(true)}>{assessmentScore === null ? "Start practice test" : "Retake practice test"}<span>→</span></button>
      <button className="journeyApplications" onClick={onOpenApplications}>Open application tracker <span>↗</span></button>
      <small className="journeyPrivacy">Your responses stay private to your profile.</small>
    </aside>

    {selectedJob && <JobDetailDrawer
      job={selectedJob}
      match={
        placementMatches.get(
          selectedJob.c
        ) ||
        calculatePlacementMatch(
          matchProfile,
          selectedJob
        )
      }
      applied={
        Boolean(
          selectedJob.id &&
          applied.includes(
            selectedJob.id
          )
        )
      }
      saved={saved.includes(selectedJob.c)}
      onApply={() => apply(selectedJob.c)}
      onSave={() => toggleSaved(selectedJob.c)}
      onClose={() => setSelectedJob(null)}
    />}
    {assessmentOpen && <AptitudeAssessment
      previousScore={assessmentScore}
      onComplete={setAssessmentScore}
      onClose={() => setAssessmentOpen(false)}
    />}
  </div>;
}

function JobDetailDrawer({
  job,
  match,
  applied,
  saved,
  onApply,
  onSave,
  onClose,
}: {
  job: PlacementJob;
  match: PlacementMatchResult;
  applied: boolean;
  saved: boolean;
  onApply: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return <div className="placementOverlay" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="jobDrawer" role="dialog" aria-modal="true" aria-labelledby="job-detail-title">
      <div className="jobDrawerHead">
        <CompanyLogo label={job.l}/>
        <div><span>{job.posted} · {job.applications} applicants</span><h2 id="job-detail-title">{job.r}</h2><p>{job.c} · {job.location}</p></div>
        <button onClick={onClose} aria-label="Close job details">×</button>
      </div>
      <div className="jobDrawerBody">
        <div className="jobDrawerHighlights"><p><span>Compensation</span><b>{job.p}</b></p><p><span>Deadline</span><b>{job.d}</b></p><p><span>Work setup</span><b>{job.workMode}</b></p></div>
        <div
          className={
            `jobMatchBanner ${
              match.eligible
                ? "verified"
                : "warning"
            }`
          }
        >
          <b>
            {match.score}% profile match
          </b>

          <span>
            {!match.branchEligible
              ? "Your department is not listed for this recruitment drive."
              : match.cgpaEligible === false
                ? "Your current CGPA is below this drive's minimum requirement."
                : match.cgpaEligible === null
                  ? "Branch verified. Add or verify your CGPA for complete eligibility."
                  : match.matchedSkills.length === job.skills.length
                    ? "Your branch, CGPA and listed skills align with this opportunity."
                    : `${match.matchedSkills.length} of ${job.skills.length} listed skills currently match your profile.`}
          </span>
        </div>
        <section><h3>About the opportunity</h3><p>{job.about}</p></section>
        <section>
          <h3>
            Skills recruiters are looking for
          </h3>

          <div className="jobDrawerSkills">
            {job.skills.map(skill => {
              const matched =
                match.matchedSkills
                  .some(
                    item =>
                      item.toLowerCase() ===
                      skill.toLowerCase()
                  );

              return (
                <span
                  className={
                    matched
                      ? "skillMatched"
                      : "skillMissing"
                  }
                  key={skill}
                >
                  {matched
                    ? "✓"
                    : "+"}{" "}
                  {skill}
                </span>
              );
            })}
          </div>

          {match.missingSkills.length > 0 && (
            <p className="jobSkillRecommendation">
              Improve this match by adding experience in{" "}
              <b>
                {match.missingSkills
                  .slice(0, 3)
                  .join(", ")}
              </b>.
            </p>
          )}
        </section>
        <section><h3>Selection process</h3><ol className="jobRounds">{job.rounds.map((round, index) => <li key={round}><i>{index + 1}</i><span><b>{round}</b><small>{index === 0 ? "Campus shortlisting begins after the deadline" : "Schedule shared with selected students"}</small></span></li>)}</ol></section>
        <div
          className={
            `jobEligibilityBox ${
              match.branchEligible &&
              match.cgpaEligible !== false
                ? "verified"
                : "notEligible"
            }`
          }
        >
          <span>
            {!match.branchEligible ||
            match.cgpaEligible === false
              ? "!"
              : match.cgpaEligible === null
                ? "?"
                : "✓"}
          </span>

          <p>
            <b>
              {!match.branchEligible
                ? "Department eligibility not met"
                : match.cgpaEligible === false
                  ? "CGPA eligibility not met"
                  : match.cgpaEligible === null
                    ? "CGPA verification required"
                    : "Eligibility criteria verified"}
            </b>

            <small>
              {match.reasons.join(" ")}
            </small>
          </p>
        </div>
      </div>
      <footer className="jobDrawerFooter"><button className={saved ? "saved" : ""} onClick={onSave}>{saved ? "★ Saved" : "☆ Save for later"}</button><button disabled={applied} onClick={onApply}>{applied ? "✓ Application submitted" : "Quick apply →"}</button></footer>
    </section>
  </div>;
}

function AptitudeAssessment({previousScore, onComplete, onClose}: {
  previousScore: number | null;
  onComplete: (score: number) => void;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => aptitudeQuestions.map(() => -1));
  const [submitted, setSubmitted] = useState(false);
  const [startingScore] = useState(previousScore);
  const answeredCount = answers.filter(answer => answer >= 0).length;
  const score = answers.reduce((total, answer, index) => total + (answer === aptitudeQuestions[index].answer ? 1 : 0), 0);
  const question = aptitudeQuestions[current];

  const chooseAnswer = (answer: number) => {
    setAnswers(currentAnswers => currentAnswers.map((value, index) => index === current ? answer : value));
  };

  const submit = () => {
    if (answeredCount !== aptitudeQuestions.length) return;
    setSubmitted(true);
    onComplete(score);
  };

  return <div className="assessmentOverlay" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="aptitudeModal" role="dialog" aria-modal="true" aria-labelledby="aptitude-title">
      <header>
        <div><span>PLACEMENT PRACTICE</span><h2 id="aptitude-title">{submitted ? "Assessment result" : "Quick aptitude check"}</h2></div>
        <button onClick={onClose} aria-label="Close aptitude assessment">×</button>
      </header>
      {!submitted ? <>
        <div className="assessmentMeta"><p>Question {current + 1} of {aptitudeQuestions.length}</p><span>{answeredCount} answered · Approx. 6 min</span></div>
        <div className="assessmentProgress"><i style={{width: `${answeredCount / aptitudeQuestions.length * 100}%`}}/></div>
        <div className="assessmentQuestion">
          <span>APTITUDE · SINGLE CHOICE</span>
          <h3>{question.question}</h3>
          <div className="assessmentOptions">{question.options.map((option, index) => <button className={answers[current] === index ? "selected" : ""} onClick={() => chooseAnswer(index)} aria-pressed={answers[current] === index} key={option}><i>{String.fromCharCode(65 + index)}</i><span>{option}</span><b>{answers[current] === index ? "✓" : ""}</b></button>)}</div>
        </div>
        <footer className="assessmentFooter">
          <button onClick={() => setCurrent(value => Math.max(0, value - 1))} disabled={current === 0}>← Previous</button>
          <span>{answers.map((answer, index) => <button className={`${index === current ? "active" : ""} ${answer >= 0 ? "answered" : ""}`} onClick={() => setCurrent(index)} aria-label={`Go to question ${index + 1}`} key={index}>{index + 1}</button>)}</span>
          {current < aptitudeQuestions.length - 1
            ? <button onClick={() => setCurrent(value => Math.min(aptitudeQuestions.length - 1, value + 1))}>Next →</button>
            : <button className="submit" onClick={submit} disabled={answeredCount !== aptitudeQuestions.length}>Submit test</button>}
        </footer>
        {current === aptitudeQuestions.length - 1 && answeredCount !== aptitudeQuestions.length && <p className="assessmentHint">Answer all {aptitudeQuestions.length} questions to submit your result.</p>}
      </> : <div className="assessmentResult">
        <div className={`resultScore ${score >= 4 ? "excellent" : score >= 3 ? "good" : "practice"}`}><span>{score >= 4 ? "Excellent work" : score >= 3 ? "Good foundation" : "Keep practising"}</span><b>{score}<small>/{aptitudeQuestions.length}</small></b><p>{score >= 4 ? "You are ready for common campus aptitude rounds." : score >= 3 ? "One focused revision can make you test-ready." : "Review the explanations below and try once more."}</p></div>
        <div className="resultBreakdown"><h3>Answer review</h3>{aptitudeQuestions.map((item, index) => <div className={answers[index] === item.answer ? "correct" : "incorrect"} key={item.question}><i>{answers[index] === item.answer ? "✓" : "!"}</i><p><b>Question {index + 1} · {answers[index] === item.answer ? "Correct" : `Correct answer: ${item.options[item.answer]}`}</b><small>{item.explanation}</small></p></div>)}</div>
        <footer className="resultActions"><button onClick={onClose}>Close result</button><button onClick={() => {setAnswers(aptitudeQuestions.map(() => -1)); setCurrent(0); setSubmitted(false);}}>Try again →</button></footer>
        {startingScore !== null && <small className="previousScore">Previous attempt: {startingScore}/{aptitudeQuestions.length}</small>}
      </div>}
    </section>
  </div>;
}

function CompanyLogo({label}: {label: string}) {
  return <i className="placementCompanyLogo" aria-hidden="true">{label}</i>;
}
