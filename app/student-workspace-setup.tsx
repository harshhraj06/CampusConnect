"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  GraduationCap,
  Settings2,
  X,
} from "lucide-react";
import "./student-workspace-setup.css";

type SetupProfile = {
  name: string;
  email: string;
  department: string;
  year: string;
  skills: string;
  campus_uid?: string;
};

type SetupPreferences = {
  dismissed: boolean;
  timetableReviewed: boolean;
};

const DEFAULT_PREFERENCES: SetupPreferences = {
  dismissed: false,
  timetableReviewed: false,
};

export default function StudentWorkspaceSetup({
  profile,
  onOpen,
}: {
  profile: SetupProfile;
  onOpen: (view: "Profile" | "Academics") => void;
}) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);

  const account = profile.campus_uid || profile.email;
  const storageKey = `campusconnect-workspace-setup-v1:${account}`;

  useEffect(() => {
    setReady(false);
    setStorageUnavailable(false);

    let next = DEFAULT_PREFERENCES;

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");

      if (saved && typeof saved === "object") {
        next = {
          dismissed: saved.dismissed === true,
          timetableReviewed: saved.timetableReviewed === true,
        };
      }
    } catch {
      setStorageUnavailable(true);
    }

    setPreferences(next);
    setReady(true);
  }, [storageKey]);

  function update(patch: Partial<SetupPreferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);

    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStorageUnavailable(true);
    }
  }

  if (!ready || !account) return null;

  if (preferences.dismissed) {
    return (
      <div className="ccSetupRestore">
        <span>Workspace setup</span>
        <button
          type="button"
          onClick={() => update({ dismissed: false })}
        >
          <Settings2 size={15} aria-hidden="true" />
          Show checklist
        </button>
      </div>
    );
  }

  const basicProfileComplete =
    [profile.name, profile.department, profile.year].every(
      value => Boolean(value?.trim())
    ) && profile.name.trim().toLowerCase() !== "student";

  const steps = [
    {
      id: "profile",
      title: "Confirm your student details",
      text: "Keep your name, department and graduation year up to date.",
      complete: basicProfileComplete,
      target: "Profile" as const,
      action: "Review profile",
    },
    {
      id: "skills",
      title: "Build your career profile",
      text: "Add your skills so your profile reflects what you can bring to a team.",
      complete: Boolean(profile.skills?.trim()),
      target: "Profile" as const,
      action: "Add skills",
    },
    {
      id: "timetable",
      title: "Review your academic schedule",
      text: "Check your timetable, then mark this step reviewed when you are ready.",
      complete: preferences.timetableReviewed,
      target: "Academics" as const,
      action: "Open timetable",
    },
  ];

  const completed = steps.filter(step => step.complete).length;
  const showSteps = completed < steps.length || expanded;

  return (
    <section
      className="ccWorkspaceSetup"
      aria-labelledby="cc-setup-title"
    >
      <header className="ccSetupHeader">
        <div className="ccSetupHeading">
          <span className="ccSetupEmblem">
            <GraduationCap size={22} aria-hidden="true" />
          </span>

          <div>

            <h2 id="cc-setup-title">
              {completed === steps.length
                ? "Your workspace is ready"
                : "A thoughtful start to your campus journey"}
            </h2>
            <p>
              A few small steps to make CampusConnect work better for you.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="ccSetupDismiss"
          onClick={() => update({ dismissed: true })}
          aria-label="Hide setup checklist"
          title="Hide checklist; you can restore it below"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="ccSetupProgressRow">
        <span>
          <strong>{completed} of {steps.length}</strong> steps complete
        </span>

        <div
          className="ccSetupProgress"
          role="progressbar"
          aria-label="Workspace setup progress"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={completed}
        >
          <span
            style={{ width: `${completed / steps.length * 100}%` }}
          />
        </div>

        {completed === steps.length && (
          <button
            type="button"
            className="ccSetupToggle"
            aria-expanded={expanded}
            aria-controls="cc-setup-steps"
            onClick={() => setExpanded(value => !value)}
          >
            {expanded ? "Hide details" : "Review checklist"}
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      <ol
        className="ccSetupSteps"
        id="cc-setup-steps"
        hidden={!showSteps}
      >
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={step.complete ? "isComplete" : ""}
          >
            <span className="ccSetupStepNumber" aria-hidden="true">
              {step.complete
                ? <Check size={17} />
                : String(index + 1).padStart(2, "0")}
            </span>

            <div className="ccSetupStepCopy">
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <span className="ccSetupStepStatus">
                {step.complete ? "Complete" : "To do"}
              </span>
            </div>

            <div className="ccSetupStepActions">
              <button
                type="button"
                onClick={() => onOpen(step.target)}
              >
                {step.complete ? "Review" : step.action}
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>

              {step.id === "timetable" && (
                <button
                  type="button"
                  className="ccSetupMark"
                  onClick={() => update({
                    timetableReviewed: !preferences.timetableReviewed,
                  })}
                >
                  {preferences.timetableReviewed
                    ? "Undo reviewed"
                    : "Mark reviewed"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      <footer className="ccSetupFooter">
        <span>
          {storageUnavailable
            ? "Changes apply for this visit; this browser cannot save your setup preferences."
            : "Hide or revisit this checklist anytime. Your choice is saved on this device."}
        </span>

        <button
          type="button"
          onClick={() => window.dispatchEvent(
            new Event("campusconnect-open-cookie-settings")
          )}
        >
          Privacy preferences
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      </footer>
    </section>
  );
}
