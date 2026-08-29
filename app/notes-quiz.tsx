"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import "./notes-quiz.css";


type QuizDifficulty =
  | "foundation"
  | "balanced"
  | "challenge";

type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  evidence: string;
};

type GroundedQuiz = {
  title: string;
  sourceTitle: string;
  coverageNote: string;
  questions: QuizQuestion[];
};

type QuizApiResponse = {
  ok?: boolean;
  quiz?: GroundedQuiz;
  error?: string;
};


export function NotesQuiz({
  sourceId,
  sourceTitle,
  onOpenLearning,
}: {
  sourceId: string;
  sourceTitle: string;
  onOpenLearning: () => void;
}) {
  const [questionCount, setQuestionCount] =
    useState<5 | 10>(5);

  const [difficulty, setDifficulty] =
    useState<QuizDifficulty>("balanced");

  const [quiz, setQuiz] =
    useState<GroundedQuiz | null>(null);

  const [answers, setAnswers] =
    useState<Record<string, number>>({});

  const [submitted, setSubmitted] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [status, setStatus] =
    useState("");


  useEffect(() => {
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);
    setStatus("");
  }, [sourceId]);


  const answeredCount =
    Object.keys(answers).length;

  const score = useMemo(
    () =>
      quiz?.questions.reduce(
        (total, question) =>
          total +
          (answers[question.id] ===
          question.correctIndex
            ? 1
            : 0),
        0
      ) || 0,
    [answers, quiz]
  );


  async function generateQuiz() {
    if (!sourceId || loading) {
      return;
    }

    const client = getSupabaseClient();

    if (!client) {
      setStatus(
        "CampusConnect is not connected."
      );
      return;
    }

    const {data} =
      await client.auth.getSession();

    const accessToken =
      data.session?.access_token;

    if (!accessToken) {
      setStatus(
        "Your session expired. Sign in again."
      );
      return;
    }

    setLoading(true);
    setStatus("");
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);

    try {
      const response = await fetch(
        "/api/ai/quiz",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            sourceId,
            questionCount,
            difficulty,
          }),
        }
      );

      const result =
        await response.json() as
          QuizApiResponse;

      if (
        !response.ok ||
        !result.ok ||
        !result.quiz
      ) {
        throw new Error(
          result.error ||
          "Campus AI could not generate this quiz."
        );
      }

      setQuiz(result.quiz);

    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Quiz generation is temporarily unavailable."
      );

    } finally {
      setLoading(false);
    }
  }


  function submitQuiz() {
    if (
      !quiz ||
      answeredCount !==
        quiz.questions.length
    ) {
      setStatus(
        "Answer every question before submitting."
      );
      return;
    }

    setSubmitted(true);
    setStatus("");
  }


  function retakeQuiz() {
    setAnswers({});
    setSubmitted(false);
    setStatus("");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  if (!sourceId) {
    return (
      <section className="notesQuizEmpty">
        <div>Q</div>
        <span>GROUNDED QUIZ GENERATOR</span>
        <h3>Choose an AI-ready learning resource</h3>
        <p>
          Quizzes are generated only from indexed excerpts
          available through your authenticated account.
        </p>
        <button
          type="button"
          onClick={onOpenLearning}
        >
          Open Learning Library
        </button>
      </section>
    );
  }


  if (!quiz) {
    return (
      <section className="notesQuizSetup">
        <div className="notesQuizSetupMark">Q</div>
        <span>GROUNDED QUIZ GENERATOR</span>
        <h3>Create a quiz from your real resource</h3>
        <p>
          Questions, answers and explanations will use only
          indexed excerpts retrieved through Supabase RLS.
        </p>

        <div className="notesQuizSource">
          <i>AI</i>
          <span>
            <small>SELECTED RESOURCE</small>
            <b>{sourceTitle || "Indexed learning resource"}</b>
          </span>
          <button
            type="button"
            onClick={onOpenLearning}
          >
            Change
          </button>
        </div>

        <div className="notesQuizControls">
          <fieldset>
            <legend>QUESTIONS</legend>
            <div>
              {[5, 10].map(count => (
                <button
                  type="button"
                  key={count}
                  className={
                    questionCount === count
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setQuestionCount(
                      count as 5 | 10
                    )
                  }
                >
                  {count}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>DIFFICULTY</legend>
            <div>
              {([
                ["foundation", "Foundation"],
                ["balanced", "Balanced"],
                ["challenge", "Challenge"],
              ] as const).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={
                    difficulty === value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setDifficulty(value)
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {status && (
          <p className="notesQuizStatus" role="status">
            {status}
          </p>
        )}

        <button
          type="button"
          className="notesQuizGenerate"
          disabled={loading}
          onClick={() => void generateQuiz()}
        >
          {loading
            ? "Retrieving excerpts and generating…"
            : "Generate grounded quiz"}
        </button>

        <small className="notesQuizPrivacy">
          ◆ Authenticated resource access · Missing content is not invented
        </small>
      </section>
    );
  }


  return (
    <section className="notesQuizWorkspace">
      <header className="notesQuizHeader">
        <div>
          <span>AI-GENERATED FROM INDEXED EXCERPTS</span>
          <h3>{quiz.title}</h3>
          <p>{quiz.sourceTitle}</p>
        </div>

        <div>
          <small>PROGRESS</small>
          <b>
            {answeredCount}/{quiz.questions.length}
          </b>
        </div>
      </header>

      <div className="notesQuizProgress">
        <i
          style={{
            width:
              `${(answeredCount / quiz.questions.length) * 100}%`,
          }}
        />
      </div>

      {submitted && (
        <div className="notesQuizResult" role="status">
          <span>QUIZ COMPLETE</span>
          <strong>
            {score}/{quiz.questions.length}
          </strong>
          <p>
            {score === quiz.questions.length
              ? "Excellent — every answer is supported."
              : "Review the grounded explanations below before retaking."}
          </p>
        </div>
      )}

      <div className="notesQuizQuestions">
        {quiz.questions.map((question, questionIndex) => {
          const selected = answers[question.id];
          const isCorrect =
            selected === question.correctIndex;

          return (
            <article
              key={question.id}
              className="notesQuizQuestion"
            >
              <header>
                <span>
                  QUESTION {questionIndex + 1}
                </span>
                {submitted && (
                  <b className={isCorrect ? "correct" : "wrong"}>
                    {isCorrect ? "Correct" : "Review"}
                  </b>
                )}
              </header>

              <h4>{question.prompt}</h4>

              <div className="notesQuizOptions">
                {question.options.map((option, optionIndex) => {
                  const chosen = selected === optionIndex;
                  const correct =
                    question.correctIndex === optionIndex;

                  const stateClass =
                    submitted && correct
                      ? "correct"
                      : submitted && chosen
                      ? "wrong"
                      : chosen
                      ? "selected"
                      : "";

                  return (
                    <button
                      type="button"
                      key={`${question.id}-${optionIndex}`}
                      className={stateClass}
                      disabled={submitted}
                      onClick={() => {
                        setAnswers(current => ({
                          ...current,
                          [question.id]: optionIndex,
                        }));
                        setStatus("");
                      }}
                    >
                      <i>
                        {String.fromCharCode(65 + optionIndex)}
                      </i>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div className="notesQuizExplanation">
                  <span>GROUNDED EXPLANATION</span>
                  <p>{question.explanation}</p>
                  {question.evidence && (
                    <small>{question.evidence}</small>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {status && (
        <p className="notesQuizStatus" role="status">
          {status}
        </p>
      )}

      <footer className="notesQuizFooter">
        {!submitted ? (
          <button
            type="button"
            className="primary"
            disabled={
              answeredCount !== quiz.questions.length
            }
            onClick={submitQuiz}
          >
            Submit quiz
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            onClick={retakeQuiz}
          >
            Retake quiz
          </button>
        )}

        <button
          type="button"
          onClick={() => void generateQuiz()}
          disabled={loading}
        >
          Generate another
        </button>
      </footer>

      <p className="notesQuizCoverage">
        {quiz.coverageNote}
      </p>
    </section>
  );
}
