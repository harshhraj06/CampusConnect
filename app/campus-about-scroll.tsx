"use client";

import {
  useEffect,
  useState,
} from "react";

import "./campus-about-scroll.css";


type CampusAboutScrollProps = {
  viewerName?: string;
  viewerRole?: string;
};


const platformRoles = [
  [
    "Students",
    "Academics, attendance, assignments, placements, communities and AI guidance.",
  ],
  [
    "Faculty",
    "Teaching workflows, resources, mentoring and academic signals.",
  ],
  [
    "Placement Cell",
    "Recruitment drives, applications, readiness and recruiter operations.",
  ],
  [
    "Coordinators",
    "Events, announcements, communities and campus coordination.",
  ],
  [
    "Volunteers",
    "Assigned event work, attendee support and activity execution.",
  ],
  [
    "Administrators",
    "Identity verification, governance, permissions and platform oversight.",
  ],
] as const;


const principles = [
  {
    number: "01",
    title: "One connected campus",
    text:
      "Campus information should not remain scattered across unrelated chats, sheets and portals.",
  },
  {
    number: "02",
    title: "Role-aware by design",
    text:
      "Every person sees the tools and information relevant to their responsibilities.",
  },
  {
    number: "03",
    title: "Real campus intelligence",
    text:
      "CampusConnect uses authenticated institutional records instead of disconnected demo information.",
  },
  {
    number: "04",
    title: "Privacy before convenience",
    text:
      "Role-based access and secure data policies protect campus identities and records.",
  },
] as const;


export function CampusAboutScroll({
  viewerName = "Campus member",
  viewerRole = "Campus user",
}: CampusAboutScrollProps) {
  const [
    open,
    setOpen,
  ] =
    useState(false);


  useEffect(
    () => {
      const closeWithEscape =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            setOpen(false);
          }
        };

      window.addEventListener(
        "keydown",
        closeWithEscape
      );

      return () => {
        window.removeEventListener(
          "keydown",
          closeWithEscape
        );
      };
    },
    []
  );


  return (
    <section
      className={
        `campusAboutExperience ${
          open
            ? "isOpen"
            : "isClosed"
        }`
      }
    >
      <div
        className="campusAboutAmbient"
        aria-hidden="true"
      >
        <span>✦</span>
        <span>✦</span>
        <span>✦</span>
      </div>

      <header className="campusAboutIntro">
        <span>
          THE CAMPUSCONNECT CHRONICLE
        </span>

        <h2>
          Discover the story behind
          <br />
          CampusConnect.
        </h2>

        <p>
          Open the ancient Patra to read
          about the platform, its mission
          and the developer who built it.
        </p>
      </header>

      {!open ? (
        <button
          type="button"
          className="campusPatraClosed"
          onClick={() =>
            setOpen(true)
          }
          aria-expanded="false"
          aria-controls="campusconnect-about-patra"
        >
          <span
            className="campusPatraClosedHandle left"
            aria-hidden="true"
          />

          <span className="campusPatraClosedPaper">
            <small>
              AN OFFICIAL CAMPUSCONNECT PATRA
            </small>

            <strong>
              About CampusConnect
            </strong>

            <em>
              Click to open the chronicle
            </em>
          </span>

          <span
            className="campusPatraClosedHandle right"
            aria-hidden="true"
          />
        </button>
      ) : (
        <div
          id="campusconnect-about-patra"
          className="campusPatraOpen"
          role="region"
          aria-label="About CampusConnect"
        >
          <div
            className="campusPatraRoll campusPatraTop"
            aria-hidden="true"
          >
            <i />
            <span />
            <i />
          </div>

          <article className="campusPatraPaper">
            <button
              type="button"
              className="campusPatraClose"
              onClick={() =>
                setOpen(false)
              }
              aria-label="Close the CampusConnect Patra"
              title="Close Patra"
            >
              ×
            </button>

            <div
              className="campusPatraWatermark"
              aria-hidden="true"
            >
              CC
            </div>

            <header className="campusPatraHeader">
              <span>
                ESTABLISHED · 2026
              </span>

              <div
                className="campusPatraSeal"
                aria-hidden="true"
              >
                <b>CC</b>
                <small>PRO</small>
              </div>

              <p>
                RNS INSTITUTE OF TECHNOLOGY
              </p>

              <h2>
                CampusConnect
              </h2>

              <strong>
                One campus. Every role.
                One connected experience.
              </strong>
            </header>

            <div
              className="campusPatraDivider"
              aria-hidden="true"
            >
              <span />
              <b>✦</b>
              <span />
            </div>

            <section className="campusPatraOpening">
              <span>
                OUR PURPOSE
              </span>

              <h3>
                A personal operating system
                for campus life.
              </h3>

              <p className="campusPatraDropcap">
                CampusConnect is a unified
                digital campus platform
                created to bring academics,
                placements, communication,
                communities, verified
                identities and intelligent
                assistance into one dependable
                workspace. It replaces
                fragmented workflows with a
                role-aware experience built
                around real campus records.
              </p>
            </section>

            <blockquote className="campusPatraQuote">
              “Technology should make campus
              life clearer, more connected and
              more useful—not add another
              disconnected portal.”
            </blockquote>

            <section className="campusPatraSection">
              <header>
                <span>
                  WHO CAMPUSCONNECT SERVES
                </span>

                <h3>
                  One institution, six
                  connected workspaces.
                </h3>
              </header>

              <div className="campusPatraRoleGrid">
                {platformRoles.map(
                  (
                    [
                      title,
                      text,
                    ],
                    index
                  ) => (
                    <div key={title}>
                      <i>
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </i>

                      <strong>
                        {title}
                      </strong>

                      <p>
                        {text}
                      </p>
                    </div>
                  )
                )}
              </div>
            </section>

            <section className="campusPatraSection">
              <header>
                <span>
                  THE FOUNDATION
                </span>

                <h3>
                  Principles behind the
                  platform.
                </h3>
              </header>

              <div className="campusPatraPrinciples">
                {principles.map(
                  item => (
                    <div key={item.number}>
                      <span>
                        {item.number}
                      </span>

                      <div>
                        <strong>
                          {item.title}
                        </strong>

                        <p>
                          {item.text}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            <section className="campusPatraDeveloper">
              <div
                className="campusPatraDeveloperMark"
                aria-hidden="true"
              >
                HR
              </div>

              <div className="campusPatraDeveloperCopy">
                <span>
                  FOUNDER &amp; DEVELOPER
                </span>

                <h3>
                  Harsh Raj
                </h3>

                <strong>
                  B.Tech · Electronics and
                  Communication Engineering
                </strong>

                <p>
                  CampusConnect was conceived,
                  designed and developed by
                  Harsh Raj at RNS Institute
                  of Technology. The platform
                  combines full-stack software
                  engineering, campus workflow
                  design and applied AI to
                  create a practical system
                  for students and
                  institutional teams.
                </p>

                <div className="campusPatraDeveloperTags">
                  <span>
                    Product Design
                  </span>

                  <span>
                    Full-Stack Engineering
                  </span>

                  <span>
                    Campus AI
                  </span>

                  <span>
                    Supabase Architecture
                  </span>
                </div>
              </div>
            </section>

            <section className="campusPatraTechnology">
              <div>
                <span>
                  BUILT WITH
                </span>

                <h3>
                  Modern engineering beneath
                  an ancient identity.
                </h3>
              </div>

              <ul>
                <li>
                  React &amp; TypeScript
                </li>

                <li>
                  Vite &amp; vinext
                </li>

                <li>
                  Supabase &amp; PostgreSQL
                </li>

                <li>
                  Role-based access control
                </li>

                <li>
                  Cloudflare deployment
                </li>

                <li>
                  Campus AI intelligence
                </li>
              </ul>
            </section>

            <footer className="campusPatraFooter">
              <div>
                <span>
                  YOU ARE VIEWING AS
                </span>

                <strong>
                  {viewerName ||
                    "Campus member"}
                  {" · "}
                  {viewerRole}
                </strong>
              </div>

              <div className="campusPatraSignature">
                <span>
                  Designed &amp; developed by
                </span>

                <strong>
                  Harsh Raj
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
              >
                Roll up the Patra ↑
              </button>
            </footer>
          </article>

          <div
            className="campusPatraRoll campusPatraBottom"
            aria-hidden="true"
          >
            <i />
            <span />
            <i />
          </div>
        </div>
      )}
    </section>
  );
}
