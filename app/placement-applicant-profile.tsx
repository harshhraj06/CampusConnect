"use client";

import {useEffect, useState} from "react";
import {getSupabaseClient} from "../lib/supabase";
import {PlacementResumePdfButton} from "./placement-resume-pdf";

type ApplicantProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  graduation_year: string;
  semester: string;
  usn: string;
  cgpa: number | null;
  skills: string;
  bio: string;
  headline: string;
  location: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  avatar_url: string | null;
};

type PlacementApplication = {
  id: string;
  student_id: string;
  student_name: string;
  company: string;
  role_title: string;
  status: string;
  applied_at: string;
  next_step: string;
};

export function PlacementApplicantProfile({
  application,
  onClose,
}: {
  application: PlacementApplication;
  onClose: () => void;
}) {
  const [student, setStudent] =
    useState<ApplicantProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    const loadStudent = async () => {
      setLoading(true);
      setError("");

      const client = getSupabaseClient();

      if (!client) {
        setError("Supabase is not connected.");
        setLoading(false);
        return;
      }

      const {data, error} = await client
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone,
          department,
          graduation_year,
          semester,
          usn,
          cgpa,
          skills,
          bio,
          headline,
          location,
          linkedin_url,
          github_url,
          portfolio_url,
          avatar_url
        `)
        .eq("id", application.student_id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(
          "[Placement Applicant] profile:",
          error
        );

        setError(error.message);
        setLoading(false);
        return;
      }

      setStudent(
        (data || null) as ApplicantProfile | null
      );

      setLoading(false);
    };

    void loadStudent();

    return () => {
      active = false;
    };
  }, [application.student_id]);

  const initials =
    (
      student?.full_name ||
      application.student_name ||
      "Student"
    )
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part =>
        part.charAt(0).toUpperCase()
      )
      .join("");

  const skills =
    String(student?.skills || "")
      .split(/[,;\n|]/)
      .map(skill => skill.trim())
      .filter(Boolean);

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(date);
  };

  return (
    <div
      className="placementApplicantOverlay"
      role="presentation"
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="placementApplicantDrawer"
        role="dialog"
        aria-modal="true"
      >
        <header className="placementApplicantHeader">
          <div className="placementApplicantIdentity">
            <div className="placementApplicantAvatar">
              {initials}
            </div>

            <div>
              <span>
                PLACEMENT CANDIDATE
              </span>

              <h2>
                {student?.full_name ||
                  application.student_name}
              </h2>

              <p>
                {student?.usn ||
                  "USN not available"}

                {" · "}

                {student?.department ||
                  "Department not set"}

                {" · "}

                {student?.graduation_year ||
                  "Graduation year not set"}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="placementApplicantClose"
            onClick={onClose}
            aria-label="Close applicant profile"
          >
            ×
          </button>
        </header>

        {loading ? (
          <div className="placementApplicantLoading">
            Loading verified student profile…
          </div>
        ) : error ? (
          <div className="placementApplicantError">
            {error}
          </div>
        ) : (
          <>
            <section className="placementApplicantSummary">
              <article>
                <small>CGPA</small>
                <strong>
                  {student?.cgpa ??
                    "Not added"}
                </strong>
              </article>

              <article>
                <small>
                  APPLICATION STATUS
                </small>
                <strong>
                  {application.status}
                </strong>
              </article>

              <article>
                <small>COMPANY</small>
                <strong>
                  {application.company}
                </strong>
              </article>

              <article>
                <small>ROLE</small>
                <strong>
                  {application.role_title}
                </strong>
              </article>
            </section>

            <section className="placementApplicantSection">
              <header>
                <span>CONTACT</span>
                <h3>Student information</h3>
              </header>

              <div className="placementApplicantInfoGrid">
                <article>
                  <small>Email</small>
                  <strong>
                    {student?.email ||
                      "Not available"}
                  </strong>
                </article>

                <article>
                  <small>Phone</small>
                  <strong>
                    {student?.phone ||
                      "Not available"}
                  </strong>
                </article>

                <article>
                  <small>Department</small>
                  <strong>
                    {student?.department ||
                      "Not set"}
                  </strong>
                </article>

                <article>
                  <small>Semester</small>
                  <strong>
                    {student?.semester ||
                      "Not set"}
                  </strong>
                </article>

                <article>
                  <small>USN</small>
                  <strong>
                    {student?.usn ||
                      "Not set"}
                  </strong>
                </article>

                <article>
                  <small>Location</small>
                  <strong>
                    {student?.location ||
                      "Not set"}
                  </strong>
                </article>
              </div>
            </section>

            <section className="placementApplicantSection">
              <header>
                <span>PROFILE</span>
                <h3>
                  Candidate summary
                </h3>
              </header>

              {student?.headline && (
                <strong className="placementApplicantHeadline">
                  {student.headline}
                </strong>
              )}

              <p className="placementApplicantBio">
                {student?.bio ||
                  "The student has not added a profile summary yet."}
              </p>

              {skills.length > 0 ? (
                <div className="placementApplicantSkills">
                  {skills.map(skill => (
                    <span key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="placementApplicantMuted">
                  No skills added yet.
                </p>
              )}
            </section>

            <section className="placementApplicantSection">
              <header>
                <span>APPLICATION</span>
                <h3>
                  Recruitment progress
                </h3>
              </header>

              <div className="placementApplicantInfoGrid">
                <article>
                  <small>Applied on</small>
                  <strong>
                    {formatDate(
                      application.applied_at
                    )}
                  </strong>
                </article>

                <article>
                  <small>Current stage</small>
                  <strong>
                    {application.status}
                  </strong>
                </article>

                <article>
                  <small>Next step</small>
                  <strong>
                    {application.next_step ||
                      "Awaiting review"}
                  </strong>
                </article>

                <article>
                  <small>Eligibility</small>
                  <strong>
                    Verified profile
                  </strong>
                </article>
              </div>
            </section>

            <section className="placementApplicantSection">
              <header>
                <span>PROFESSIONAL LINKS</span>
                <h3>
                  Candidate presence
                </h3>
              </header>

              <div className="placementApplicantLinks">
                {student?.linkedin_url && (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        student.linkedin_url,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    LinkedIn ↗
                  </button>
                )}

                {student?.github_url && (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        student.github_url,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    GitHub ↗
                  </button>
                )}

                {student?.portfolio_url && (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        student.portfolio_url,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    Portfolio ↗
                  </button>
                )}

                {!student?.linkedin_url &&
                  !student?.github_url &&
                  !student?.portfolio_url && (
                    <span>
                      No professional links added.
                    </span>
                  )}
              </div>
            </section>

            <section className="placementApplicantResume">
              <div>
                <span>
                  VERIFIED RESUME
                </span>

                <h3>
                  Student resume
                </h3>

                <p>
                  Open the student's latest
                  CampusConnect resume and
                  placement profile.
                </p>
              </div>

              <PlacementResumePdfButton
                studentId={application.student_id}
                studentName={
                  student?.full_name ||
                  application.student_name ||
                  "Student"
                }
                studentEmail={
                  student?.email || ""
                }
              />
            </section>
          </>
        )}
      </section>
    </div>
  );
}
