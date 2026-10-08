"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./campusconnect-landing-v2.css";


type LandingRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


type CampusConnectLandingProps = {
  onEnter:
    (
      role:
        LandingRole
    ) => void;
};


const heroWords = [
  "college life.",
  "placements.",
  "collaboration.",
  "growth.",
];


const roles:
  Array<{
    role:
      LandingRole;

    title:
      string;

    description:
      string;

    short:
      string;
  }> = [
    {
      role:
        "Student",

      title:
        "Student",

      description:
        "Academics, placements and campus life",

      short:
        "ST",
    },

    {
      role:
        "Faculty",

      title:
        "Faculty",

      description:
        "Teaching and academic operations",

      short:
        "FC",
    },

    {
      role:
        "Placement Cell",

      title:
        "Placement",

      description:
        "Drives, applicants and recruitment",

      short:
        "PL",
    },

    {
      role:
        "Coordinator",

      title:
        "Coordinator",

      description:
        "Campus operations and scheduling",

      short:
        "CO",
    },

    {
      role:
        "Volunteer",

      title:
        "Volunteer",

      description:
        "Events and campus responsibilities",

      short:
        "VO",
    },

    {
      role:
        "Main Admin",

      title:
        "Admin",

      description:
        "Platform and access control",

      short:
        "AD",
    },
  ];


const features = [
  {
    number:
      "01",

    title:
      "Placement-ready profile",

    description:
      "Track drives, applications, opportunities and preparation from one professional student workspace.",

    symbol:
      "↗",
  },

  {
    number:
      "02",

    title:
      "Verified campus network",

    description:
      "Connect with classmates, seniors, alumni and mentors inside the same authenticated campus platform.",

    symbol:
      "◎",
  },

  {
    number:
      "03",

    title:
      "Resume & career tools",

    description:
      "Build your profile, improve your resume and keep career preparation connected to your campus identity.",

    symbol:
      "◇",
  },

  {
    number:
      "04",

    title:
      "Academics in control",

    description:
      "Timetable, attendance, assignments, notices and learning resources stay connected instead of scattered.",

    symbol:
      "▦",
  },
];


const workspaceItems = [
  {
    number:
      "I",

    title:
      "Student workspace",

    description:
      "Academics, placements, learning, events, network and everyday campus tools.",
  },

  {
    number:
      "II",

    title:
      "Faculty console",

    description:
      "Classes, attendance, assignments, academic planning and faculty operations.",
  },

  {
    number:
      "III",

    title:
      "Placement operations",

    description:
      "Recruitment drives, applicant workflows, opportunities and placement activity.",
  },

  {
    number:
      "IV",

    title:
      "Campus administration",

    description:
      "Role-aware controls for coordinators, volunteers and administrators.",
  },
];


const insideFeatures = [
  {
    title:
      "Placements",

    description:
      "Drives, opportunities and applications",
  },

  {
    title:
      "Learning",

    description:
      "Resources, notes and academic support",
  },

  {
    title:
      "Groups",

    description:
      "Role-aware campus communities",
  },

  {
    title:
      "Network",

    description:
      "Students, seniors, alumni and mentors",
  },
];


const codeExamples = [
  {
    label:
      "Placements",

    code:
`campus.placements({
  opportunities: 'connected',
  applications: 'tracked',
  profile: 'verified'
})`,
  },

  {
    label:
      "Academics",

    code:
`campus.academics({
  timetable: 'live',
  attendance: 'connected',
  assignments: 'organised'
})`,
  },

  {
    label:
      "Network",

    code:
`campus.network({
  students: true,
  alumni: true,
  mentors: true
})`,
  },
];


const securityItems = [
  {
    icon:
      "◇",

    title:
      "Role-based access",

    description:
      "Students, faculty and administrators see the tools appropriate to their role.",
  },

  {
    icon:
      "□",

    title:
      "Private student workspace",

    description:
      "Personal academic and student information stays inside authenticated workflows.",
  },

  {
    icon:
      "◎",

    title:
      "Verified campus identity",

    description:
      "Campus profiles and communities connect through one professional identity layer.",
  },

  {
    icon:
      "✓",

    title:
      "Connected operations",

    description:
      "Academic and campus workflows use the same CampusConnect system instead of disconnected tools.",
  },
];


const campusMoments = [
  {
    quote:
      "Your classes, deadlines and campus priorities become visible before they become problems.",

    title:
      "Daily academic view",

    meta:
      "Student workspace",
  },

  {
    quote:
      "Placement preparation lives beside your profile, resume, opportunities and application activity.",

    title:
      "Career workspace",

    meta:
      "CampusConnect",
  },

  {
    quote:
      "Students and faculty work inside one platform while keeping their role-specific tools separate.",

    title:
      "Connected campus",

    meta:
      "Role-aware access",
  },

  {
    quote:
      "Campus information becomes easier to discover when academics, events and communication share one home.",

    title:
      "Campus life",

    meta:
      "One workspace",
  },
];


function AsciiSphere() {

  const canvasRef =
    useRef<
      HTMLCanvasElement
    >(null);


  useEffect(
    () => {

      const canvas =
        canvasRef.current;


      if (
        !canvas
      ) {
        return;
      }


      const context =
        canvas.getContext(
          "2d"
        );


      if (
        !context
      ) {
        return;
      }


      let animationFrame =
        0;


      let time =
        0;


      const chars =
        "·•○◌◇◆╱╲│─";


      const draw =
        () => {

          const rect =
            canvas.getBoundingClientRect();


          const dpr =
            Math.min(
              window.devicePixelRatio ||
                1,
              2
            );


          const width =
            Math.max(
              1,
              rect.width
            );


          const height =
            Math.max(
              1,
              rect.height
            );


          const pixelWidth =
            Math.round(
              width *
                dpr
            );


          const pixelHeight =
            Math.round(
              height *
                dpr
            );


          if (
            canvas.width !==
              pixelWidth ||
            canvas.height !==
              pixelHeight
          ) {

            canvas.width =
              pixelWidth;

            canvas.height =
              pixelHeight;
          }


          context.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
          );


          context.clearRect(
            0,
            0,
            width,
            height
          );


          const style =
            getComputedStyle(
              canvas
            );


          const color =
            style.color ||
              "#4b202a";


          context.fillStyle =
            color;


          context.textAlign =
            "center";


          context.textBaseline =
            "middle";


          const columns =
            Math.max(
              18,
              Math.floor(
                width /
                  22
              )
            );


          const rows =
            Math.max(
              14,
              Math.floor(
                height /
                  22
              )
            );


          const radius =
            Math.min(
              width,
              height
            ) *
            .39;


          const cx =
            width /
            2;


          const cy =
            height /
            2;


          context.font =
            `${Math.max(
              9,
              width /
                58
            )}px ui-monospace, SFMono-Regular, Menlo, monospace`;


          for (
            let row = 0;
            row <
              rows;
            row += 1
          ) {

            for (
              let column = 0;
              column <
                columns;
              column += 1
            ) {

              const x =
                (
                  column /
                  Math.max(
                    1,
                    columns -
                      1
                  ) -
                  .5
                ) *
                radius *
                2.35;


              const y =
                (
                  row /
                  Math.max(
                    1,
                    rows -
                      1
                  ) -
                  .5
                ) *
                radius *
                2.1;


              const normalized =
                (
                  x *
                  x
                ) /
                  (
                    radius *
                    radius
                  ) +
                (
                  y *
                  y
                ) /
                  (
                    radius *
                    radius
                  );


              if (
                normalized >
                1
              ) {
                continue;
              }


              const z =
                Math.sqrt(
                  Math.max(
                    0,
                    1 -
                      normalized
                  )
                );


              const longitude =
                Math.atan2(
                  x,
                  z *
                    radius
                ) +
                time;


              const latitude =
                y /
                radius;


              const wave =
                Math.sin(
                  longitude *
                    4 +
                    latitude *
                      6 +
                    time *
                      1.8
                );


              const index =
                Math.abs(
                  Math.floor(
                    (
                      wave +
                      z *
                        2
                    ) *
                      3.6
                  )
                ) %
                chars.length;


              const perspective =
                .76 +
                z *
                  .28;


              const px =
                cx +
                x *
                  perspective;


              const py =
                cy +
                y;


              context.globalAlpha =
                .12 +
                z *
                  .68;


              context.fillText(
                chars[
                  index
                ],
                px,
                py
              );
            }

          }


          context.globalAlpha =
            1;


          time +=
            .008;


          animationFrame =
            window.requestAnimationFrame(
              draw
            );
        };


      draw();


      return () => {

        window.cancelAnimationFrame(
          animationFrame
        );
      };

    },
    []
  );


  return (
    <canvas
      ref={
        canvasRef
      }
      className="ccLandingV2SphereCanvas"
      aria-hidden="true"
    />
  );
}


export default function CampusConnectLanding({
  onEnter,
}: CampusConnectLandingProps) {

  const [
    selectedRole,
    setSelectedRole,
  ] =
    useState<
      LandingRole
    >(
      "Student"
    );


  const [
    wordIndex,
    setWordIndex,
  ] =
    useState(
      0
    );


  const [
    scrolled,
    setScrolled,
  ] =
    useState(
      false
    );


  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(
      false
    );


  const [
    codeIndex,
    setCodeIndex,
  ] =
    useState(
      0
    );


  const [
    copied,
    setCopied,
  ] =
    useState(
      false
    );


  const [
    momentIndex,
    setMomentIndex,
  ] =
    useState(
      0
    );


  useEffect(
    () => {

      const timer =
        window.setInterval(
          () => {

            setWordIndex(
              current =>
                (
                  current +
                  1
                ) %
                heroWords.length
            );
          },
          2600
        );


      return () =>
        window.clearInterval(
          timer
        );

    },
    []
  );


  useEffect(
    () => {

      const timer =
        window.setInterval(
          () => {

            setMomentIndex(
              current =>
                (
                  current +
                  1
                ) %
                campusMoments.length
            );
          },
          5200
        );


      return () =>
        window.clearInterval(
          timer
        );

    },
    []
  );


  useEffect(
    () => {

      const handleScroll =
        () => {

          setScrolled(
            window.scrollY >
              18
          );
        };


      handleScroll();


      window.addEventListener(
        "scroll",
        handleScroll,
        {
          passive:
            true,
        }
      );


      return () =>
        window.removeEventListener(
          "scroll",
          handleScroll
        );

    },
    []
  );


  useEffect(
    () => {

      const items =
        Array.from(
          document.querySelectorAll(
            ".ccLandingV2Reveal"
          )
        );


      if (
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
      ) {

        items.forEach(
          item =>
            item.classList.add(
              "isVisible"
            )
        );

        return;
      }


      const observer =
        new IntersectionObserver(
          entries => {

            entries.forEach(
              entry => {

                if (
                  entry.isIntersecting
                ) {

                  entry.target.classList.add(
                    "isVisible"
                  );

                  observer.unobserve(
                    entry.target
                  );
                }
              }
            );

          },
          {
            threshold:
              .12,
          }
        );


      items.forEach(
        item =>
          observer.observe(
            item
          )
      );


      return () =>
        observer.disconnect();

    },
    []
  );


  const enter =
    () => {

      onEnter(
        selectedRole
      );
  };


  const scrollTo =
    (
      target:
        string
    ) => {

      setMobileOpen(
        false
      );


      document
        .querySelector(
          target
        )
        ?.scrollIntoView({
          behavior:
            "smooth",
          block:
            "start",
        });
  };


  const copyCode =
    async () => {

      try {

        await navigator
          .clipboard
          .writeText(
            codeExamples[
              codeIndex
            ].code
          );


        setCopied(
          true
        );


        window.setTimeout(
          () =>
            setCopied(
              false
            ),
          1600
        );

      } catch {

        setCopied(
          false
        );
      }
    };


  return (
    <main className="ccLandingV2">

      <header
        className={
          scrolled ||
          mobileOpen
            ? "ccLandingV2Nav isScrolled"
            : "ccLandingV2Nav"
        }
      >

        <div className="ccLandingV2NavInner">

          <button
            type="button"
            className="ccLandingV2LogoButton"
            onClick={
              () =>
                window.scrollTo({
                  top:
                    0,

                  behavior:
                    "smooth",
                })
            }
            aria-label="CampusConnect home"
          >

            <img
              src="/branding/campusconnect-logo.webp"
              alt="CampusConnect Pro"
            />

          </button>


          <nav className="ccLandingV2DesktopLinks">

            <button
              type="button"
              onClick={
                () =>
                  scrollTo(
                    "#features"
                  )
              }
            >
              About
            </button>


            <button
              type="button"
              onClick={
                () =>
                  scrollTo(
                    "#how-it-works"
                  )
              }
            >
              Why use it
            </button>


            <button
              type="button"
              onClick={
                () =>
                  scrollTo(
                    "#inside"
                  )
              }
            >
              Inside
            </button>

          </nav>


          <div className="ccLandingV2NavActions">

            <button
              type="button"
              className="ccLandingV2NavTextButton"
              onClick={
                () =>
                  scrollTo(
                    "#features"
                  )
              }
            >
              Explore
            </button>


            <button
              type="button"
              className="ccLandingV2NavPrimary"
              onClick={
                enter
              }
            >
              Enter dashboard
            </button>

          </div>


          <button
            type="button"
            className="ccLandingV2MenuButton"
            onClick={
              () =>
                setMobileOpen(
                  current =>
                    !current
                )
            }
            aria-label="Toggle navigation"
            aria-expanded={
              mobileOpen
            }
          >
            <span />
            <span />
          </button>

        </div>

      </header>


      <div
        className={
          mobileOpen
            ? "ccLandingV2MobileMenu isOpen"
            : "ccLandingV2MobileMenu"
        }
      >

        <div>

          <button
            type="button"
            onClick={
              () =>
                scrollTo(
                  "#features"
                )
            }
          >
            About
          </button>


          <button
            type="button"
            onClick={
              () =>
                scrollTo(
                  "#how-it-works"
                )
            }
          >
            Why use it
          </button>


          <button
            type="button"
            onClick={
              () =>
                scrollTo(
                  "#inside"
                )
            }
          >
            Inside
          </button>

        </div>


        <button
          type="button"
          className="ccLandingV2MobileEnter"
          onClick={
            enter
          }
        >
          Enter as {selectedRole}
        </button>

      </div>


      <section className="ccLandingV2Hero">

        <div className="ccLandingV2HeroGrid" />


        <div className="ccLandingV2Sphere">
          <AsciiSphere />
        </div>


        <div className="ccLandingV2Container ccLandingV2HeroContainer">

          <div className="ccLandingV2Eyebrow">
            <span />
            Campus success platform
          </div>


          <h1>

            <span>
              One professional
            </span>

            <span>
              dashboard for{" "}

              <em
                key={
                  wordIndex
                }
              >
                {heroWords[
                  wordIndex
                ]}
              </em>
            </span>

          </h1>


          <div className="ccLandingV2HeroBottom">

            <div>

              <p>
                CampusConnect brings academics,
                placements, learning, campus life
                and verified student networking
                into one connected workspace.
              </p>


              <div className="ccLandingV2HeroActions">

                <button
                  type="button"
                  className="ccLandingV2PrimaryButton"
                  onClick={
                    enter
                  }
                >
                  Enter as {selectedRole}

                  <span>
                    →
                  </span>
                </button>


                <button
                  type="button"
                  className="ccLandingV2SecondaryButton"
                  onClick={
                    () =>
                      scrollTo(
                        "#features"
                      )
                  }
                >
                  See why it matters
                </button>

              </div>

            </div>


            <div className="ccLandingV2RoleBox">

              <div className="ccLandingV2RoleBoxHeader">

                <span>
                  CHOOSE WORKSPACE
                </span>

                <small>
                  01 / 06
                </small>

              </div>


              <div className="ccLandingV2Roles">

                {roles.map(
                  item => (

                    <button
                      type="button"
                      key={
                        item.role
                      }
                      className={
                        selectedRole ===
                        item.role
                          ? "selected"
                          : ""
                      }
                      onClick={
                        () =>
                          setSelectedRole(
                            item.role
                          )
                      }
                    >

                      <i>
                        {
                          item.short
                        }
                      </i>

                      <span>

                        <strong>
                          {
                            item.title
                          }
                        </strong>

                        <small>
                          {
                            item.description
                          }
                        </small>

                      </span>

                    </button>

                  )
                )}

              </div>

            </div>

          </div>

        </div>


        <div className="ccLandingV2Marquee">

          <div>

            {[
              "LIVE PLACEMENT OPERATIONS",
              "PRIVATE STUDENT WORKSPACE",
              "VERIFIED CAMPUS DIRECTORY",
              "ROLE-BASED ACCESS",
              "CONNECTED ACADEMICS",
              "CAMPUS AI",
            ].map(
              item => (

                <span
                  key={
                    item
                  }
                >
                  <i />
                  {item}
                </span>

              )
            )}

            {[
              "LIVE PLACEMENT OPERATIONS",
              "PRIVATE STUDENT WORKSPACE",
              "VERIFIED CAMPUS DIRECTORY",
              "ROLE-BASED ACCESS",
              "CONNECTED ACADEMICS",
              "CAMPUS AI",
            ].map(
              item => (

                <span
                  key={
                    `copy-${item}`
                  }
                  aria-hidden="true"
                >
                  <i />
                  {item}
                </span>

              )
            )}

          </div>

        </div>

      </section>


      <section
        id="features"
        className="ccLandingV2Section"
      >

        <div className="ccLandingV2Container">

          <div className="ccLandingV2SectionHead ccLandingV2Reveal">

            <div>

              <div className="ccLandingV2Eyebrow">
                <span />
                Why CampusConnect
              </div>

              <h2>
                One campus.
                <br />
                Less fragmentation.
              </h2>

            </div>


            <p>
              Important student work should not
              live across separate chats,
              spreadsheets, portals and notices.
              CampusConnect brings those workflows
              together without making every role
              look the same.
            </p>

          </div>


          <div className="ccLandingV2FeatureGrid">

            {features.map(
              feature => (

                <article
                  key={
                    feature.number
                  }
                  className="ccLandingV2Feature ccLandingV2Reveal"
                >

                  <header>

                    <span>
                      {
                        feature.number
                      }
                    </span>

                    <i>
                      {
                        feature.symbol
                      }
                    </i>

                  </header>


                  <div className="ccLandingV2FeatureVisual">

                    <span />

                    <span />

                    <span />

                    <span />

                  </div>


                  <h3>
                    {
                      feature.title
                    }
                  </h3>

                  <p>
                    {
                      feature.description
                    }
                  </p>

                </article>

              )
            )}

          </div>

        </div>

      </section>


      <section
        id="how-it-works"
        className="ccLandingV2Section ccLandingV2Workspaces"
      >

        <div className="ccLandingV2Container">

          <div className="ccLandingV2SectionHead ccLandingV2Reveal">

            <div>

              <div className="ccLandingV2Eyebrow">
                <span />
                Role-aware by design
              </div>

              <h2>
                One platform.
                <br />
                Different workspaces.
              </h2>

            </div>


            <p>
              The student dashboard should feel
              different from faculty or placement
              operations, while all of them remain
              part of the same CampusConnect
              ecosystem.
            </p>

          </div>


          <div className="ccLandingV2WorkspaceList">

            {workspaceItems.map(
              item => (

                <article
                  key={
                    item.number
                  }
                  className="ccLandingV2Reveal"
                >

                  <span>
                    {
                      item.number
                    }
                  </span>

                  <h3>
                    {
                      item.title
                    }
                  </h3>

                  <p>
                    {
                      item.description
                    }
                  </p>

                  <i>
                    →
                  </i>

                </article>

              )
            )}

          </div>

        </div>

      </section>


      <section className="ccLandingV2Section ccLandingV2CapabilitySection">

        <div className="ccLandingV2Container">

          <div className="ccLandingV2CapabilityShell ccLandingV2Reveal">

            <div className="ccLandingV2CapabilityCopy">

              <div className="ccLandingV2Eyebrow light">
                <span />
                Connected campus infrastructure
              </div>


              <h2>
                Everything important
                stays connected.
              </h2>


              <p>
                CampusConnect connects academics,
                opportunities, communication and
                campus operations without turning
                the experience into a crowded
                collection of disconnected tools.
              </p>

            </div>


            <div className="ccLandingV2CapabilityMap">

              {[
                [
                  "Placements",
                  "Opportunities and applications",
                ],

                [
                  "Learning",
                  "Resources and academic support",
                ],

                [
                  "Campus Life",
                  "Events and communities",
                ],

                [
                  "Network",
                  "Students, alumni and mentors",
                ],

                [
                  "Resume",
                  "Profile and career readiness",
                ],

                [
                  "Academics",
                  "Timetable and attendance",
                ],
              ].map(
                (
                  [
                    title,
                    description,
                  ],
                  index
                ) => (

                  <article
                    key={
                      title
                    }
                  >

                    <span>
                      {String(
                        index +
                          1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <div>

                      <strong>
                        {
                          title
                        }
                      </strong>

                      <small>
                        {
                          description
                        }
                      </small>

                    </div>

                  </article>

                )
              )}

            </div>

          </div>

        </div>

      </section>


      <section
        id="inside"
        className="ccLandingV2Section"
      >

        <div className="ccLandingV2Container ccLandingV2InsideGrid">

          <div className="ccLandingV2InsideCopy ccLandingV2Reveal">

            <div className="ccLandingV2Eyebrow">
              <span />
              What is inside
            </div>


            <h2>
              A complete
              <br />
              campus workspace.
            </h2>


            <p>
              Move between placements,
              networking, academics, learning,
              events and campus operations
              without leaving the same
              professional product experience.
            </p>


            <div className="ccLandingV2InsideFeatures">

              {insideFeatures.map(
                feature => (

                  <article
                    key={
                      feature.title
                    }
                  >

                    <strong>
                      {
                        feature.title
                      }
                    </strong>

                    <small>
                      {
                        feature.description
                      }
                    </small>

                  </article>

                )
              )}

            </div>

          </div>


          <div className="ccLandingV2CodeWindow ccLandingV2Reveal">

            <header>

              <div>

                {codeExamples.map(
                  (
                    item,
                    index
                  ) => (

                    <button
                      type="button"
                      key={
                        item.label
                      }
                      className={
                        codeIndex ===
                        index
                          ? "selected"
                          : ""
                      }
                      onClick={
                        () =>
                          setCodeIndex(
                            index
                          )
                      }
                    >
                      {
                        item.label
                      }
                    </button>

                  )
                )}

              </div>


              <button
                type="button"
                className="ccLandingV2CopyButton"
                onClick={
                  copyCode
                }
              >
                {copied
                  ? "Copied"
                  : "Copy"}
              </button>

            </header>


            <pre
              key={
                codeIndex
              }
            >
              {
                codeExamples[
                  codeIndex
                ].code
              }
            </pre>


            <footer>

              <span>
                campusconnect
              </span>

              <span>
                authenticated workspace
              </span>

            </footer>

          </div>

        </div>

      </section>


      <section
        id="security"
        className="ccLandingV2Section ccLandingV2Security"
      >

        <div className="ccLandingV2Container ccLandingV2SecurityGrid">

          <div className="ccLandingV2SecurityCopy ccLandingV2Reveal">

            <div className="ccLandingV2Eyebrow">
              <span />
              Security
            </div>


            <h2>
              Private and
              <br />
              secure by role.
            </h2>


            <p>
              Every campus role has different
              responsibilities. CampusConnect
              keeps those workflows connected
              while respecting role boundaries.
            </p>


            <div className="ccLandingV2RoleTags">

              {roles.map(
                role => (

                  <span
                    key={
                      role.role
                    }
                  >
                    {
                      role.title
                    }
                  </span>

                )
              )}

            </div>

          </div>


          <div className="ccLandingV2SecurityList">

            {securityItems.map(
              item => (

                <article
                  key={
                    item.title
                  }
                  className="ccLandingV2Reveal"
                >

                  <i>
                    {
                      item.icon
                    }
                  </i>

                  <div>

                    <h3>
                      {
                        item.title
                      }
                    </h3>

                    <p>
                      {
                        item.description
                      }
                    </p>

                  </div>

                </article>

              )
            )}

          </div>

        </div>

      </section>


      <section className="ccLandingV2Section ccLandingV2Moments">

        <div className="ccLandingV2Container">

          <div className="ccLandingV2MomentHeader">

            <span>
              A DAY ON CAMPUS
            </span>

            <i />

            <small>
              {String(
                momentIndex +
                  1
              ).padStart(
                2,
                "0"
              )}
              {" / "}
              {String(
                campusMoments.length
              ).padStart(
                2,
                "0"
              )}
            </small>

          </div>


          <div className="ccLandingV2MomentGrid">

            <div
              className="ccLandingV2MomentQuote"
              key={
                momentIndex
              }
            >

              <blockquote>
                “{
                  campusMoments[
                    momentIndex
                  ].quote
                }”
              </blockquote>


              <div>

                <span>
                  {campusMoments[
                    momentIndex
                  ].title.charAt(
                    0
                  )}
                </span>

                <p>

                  <strong>
                    {
                      campusMoments[
                        momentIndex
                      ].title
                    }
                  </strong>

                  <small>
                    {
                      campusMoments[
                        momentIndex
                      ].meta
                    }
                  </small>

                </p>

              </div>

            </div>


            <aside>

              <span>
                HIGHLIGHT
              </span>

              <strong>
                {
                  campusMoments[
                    momentIndex
                  ].title
                }
              </strong>


              <div>

                {campusMoments.map(
                  (
                    _,
                    index
                  ) => (

                    <button
                      type="button"
                      key={
                        index
                      }
                      className={
                        momentIndex ===
                        index
                          ? "selected"
                          : ""
                      }
                      onClick={
                        () =>
                          setMomentIndex(
                            index
                          )
                      }
                      aria-label={
                        `Show highlight ${
                          index +
                          1
                        }`
                      }
                    />

                  )
                )}

              </div>

            </aside>

          </div>

        </div>


        <div className="ccLandingV2PeopleMarquee">

          <div>

            {[
              "Students",
              "Faculty",
              "Placement Cell",
              "Coordinators",
              "Volunteers",
              "Administration",
              "Alumni",
              "Mentors",
              "Students",
              "Faculty",
              "Placement Cell",
              "Coordinators",
              "Volunteers",
              "Administration",
              "Alumni",
              "Mentors",
            ].map(
              (
                item,
                index
              ) => (

                <span
                  key={
                    `${item}-${index}`
                  }
                >
                  {item}
                </span>

              )
            )}

          </div>

        </div>

      </section>


      <section className="ccLandingV2Section ccLandingV2CtaSection">

        <div className="ccLandingV2Container">

          <div className="ccLandingV2Cta ccLandingV2Reveal">

            <div>

              <div className="ccLandingV2Eyebrow">
                <span />
                CampusConnect Pro
              </div>


              <h2>
                Ready to enter
                <br />
                your workspace?
              </h2>


              <p>
                Academics, placements, campus
                life and communication inside
                one connected experience.
              </p>


              <div className="ccLandingV2HeroActions">

                <button
                  type="button"
                  className="ccLandingV2PrimaryButton"
                  onClick={
                    enter
                  }
                >
                  Enter as {selectedRole}

                  <span>
                    →
                  </span>
                </button>


                <button
                  type="button"
                  className="ccLandingV2SecondaryButton"
                  onClick={
                    () =>
                      window.scrollTo({
                        top:
                          0,

                        behavior:
                          "smooth",
                      })
                  }
                >
                  Back to top
                </button>

              </div>

            </div>


            <div className="ccLandingV2CtaOrb">

              <span />

              <span />

              <span />

              <i>
                C
              </i>

            </div>

          </div>

        </div>

      </section>


      <footer className="ccLandingV2Footer">

        <div className="ccLandingV2Container">

          <div className="ccLandingV2FooterTop">

            <div className="ccLandingV2FooterBrand">

              <img
                src="/branding/campusconnect-logo.webp"
                alt="CampusConnect Pro"
              />

              <p>
                One professional platform
                for connected campus life,
                academics and growth.
              </p>

            </div>


            <div>

              <strong>
                Product
              </strong>

              <button
                type="button"
                onClick={
                  () =>
                    scrollTo(
                      "#features"
                    )
                }
              >
                Why use it
              </button>

              <button
                type="button"
                onClick={
                  () =>
                    scrollTo(
                      "#how-it-works"
                    )
                }
              >
                Workspaces
              </button>

            </div>


            <div>

              <strong>
                Inside
              </strong>

              <button
                type="button"
                onClick={
                  () =>
                    scrollTo(
                      "#inside"
                    )
                }
              >
                CampusConnect
              </button>

              <button
                type="button"
                onClick={
                  enter
                }
              >
                Enter dashboard
              </button>

            </div>


            <div>

              <strong>
                Platform
              </strong>

              <button
                type="button"
                onClick={
                  () =>
                    scrollTo(
                      "#security"
                    )
                }
              >
                Security
              </button>

              <span>
                CampusConnect Pro
              </span>

            </div>

          </div>


          <div className="ccLandingV2FooterBottom">

            <span>
              © 2026 CampusConnect
            </span>

            <span>
              <i />
              Campus platform
            </span>

          </div>

        </div>

      </footer>

    </main>
  );
}
