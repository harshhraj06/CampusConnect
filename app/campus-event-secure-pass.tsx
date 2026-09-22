"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  QRCodeSVG,
} from "qrcode.react";

import {
  getSupabaseClient,
} from "../lib/supabase";


type SecureEventPassData = {
  success: boolean;

  pass_uid: string;
  registration_id: string;
  event_id: string;

  event_title: string;
  event_date: string;
  event_end_date: string | null;

  venue: string;
  organizer: string;

  student_name: string;
  department: string;
  graduation_year: string;

  qr_token: string;
  manual_code: string;

  pass_state:
    | "valid"
    | "upcoming"
    | "used"
    | "expired"
    | "revoked"
    | "cancelled"
    | "event_cancelled"
    | "unavailable";

  valid_from: string;
  valid_until: string;

  checked_in: boolean;
  checked_in_at: string | null;
};


const passStateLabels:
  Record<string, string> = {
    valid:
      "Valid for entry",

    upcoming:
      "Check-in not open",

    used:
      "Already checked in",

    expired:
      "Pass expired",

    revoked:
      "Pass revoked",

    cancelled:
      "Registration cancelled",

    event_cancelled:
      "Event cancelled",

    unavailable:
      "Pass unavailable",
  };


function formatEventPassDate(
  value:
    string
    | null
    | undefined
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(date);
}


function formatEventPassDateShort(
  value:
    string
    | null
    | undefined
) {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday:
        "short",

      day:
        "numeric",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(date);
}


function formatEventPassTime(
  value:
    string
    | null
    | undefined
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      hour:
        "numeric",

      minute:
        "2-digit",
    }
  ).format(date);
}


export default function
CampusEventSecurePass({
  eventId,
  refreshKey,
  eventBannerUrl,
  eventCategory,
}: {
  eventId: string;

  refreshKey?: string;

  eventBannerUrl?:
    string
    | null;

  eventCategory?:
    string
    | null;
}) {
  const [
    pass,
    setPass,
  ] =
    useState<
      SecureEventPassData
      | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    actionMessage,
    setActionMessage,
  ] =
    useState("");


  useEffect(() => {
    let active = true;

    const loadPass =
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          setError(
            "CampusConnect is not connected to Supabase."
          );

          setLoading(false);

          return;
        }

        setLoading(true);
        setError("");

        const {
          data,
          error:
            passError,
        } =
          await client.rpc(
            "get_my_event_pass",
            {
              p_event_id:
                eventId,
            }
          );

        if (!active) {
          return;
        }

        if (passError) {
          setError(
            passError.message
          );

          setLoading(false);

          return;
        }

        const result =
          data as
            SecureEventPassData;

        if (
          !result ||
          !result.success
        ) {
          setError(
            "Unable to generate your secure event pass."
          );

          setLoading(false);

          return;
        }

        setPass(result);

        setLoading(false);
      };

    void loadPass();

    return () => {
      active = false;
    };
  }, [
    eventId,
    refreshKey,
  ]);


  if (loading) {
    return (
      <div className="ccPassLoading">
        <i />

        <div>
          <strong>
            Preparing secure pass
          </strong>

          <span>
            Verifying your event registration…
          </span>
        </div>
      </div>
    );
  }


  if (
    error ||
    !pass
  ) {
    return (
      <div className="ccPassError">
        <strong>
          Pass unavailable
        </strong>

        <p>
          {error ||
            "Unable to load this event pass."}
        </p>
      </div>
    );
  }


  const disabled =
    [
      "expired",
      "revoked",
      "cancelled",
      "event_cancelled",
      "unavailable",
    ].includes(
      pass.pass_state
    );


  const initials =
    pass.student_name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        word =>
          word
            .charAt(0)
            .toUpperCase()
      )
      .join("") ||
    "CC";


  const copyPassUid =
    async () => {
      try {
        await navigator
          .clipboard
          .writeText(
            pass.pass_uid
          );

        setActionMessage(
          "Pass UID copied."
        );
      } catch {
        setActionMessage(
          "Unable to copy Pass UID."
        );
      }
    };


  const printPass =
    () => {
      const source =
        document.getElementById(
          `cc-secure-pass-${pass.registration_id}`
        );

      if (!source) {
        setActionMessage(
          "Unable to prepare the event pass."
        );

        return;
      }

      document
        .getElementById(
          "campus-event-print-root"
        )
        ?.remove();

      const printRoot =
        document.createElement(
          "div"
        );

      printRoot.id =
        "campus-event-print-root";

      const clone =
        source.cloneNode(
          true
        ) as HTMLElement;

      clone
        .querySelector(
          ".ccPassActions"
        )
        ?.remove();

      clone
        .querySelector(
          ".ccPassActionMessage"
        )
        ?.remove();

      printRoot.appendChild(
        clone
      );

      document.body.appendChild(
        printRoot
      );

      const cleanup =
        () => {
          printRoot.remove();

          document.body
            .classList
            .remove(
              "campusEventPrintMode"
            );

          window
            .removeEventListener(
              "afterprint",
              cleanup
            );
        };

      document.body
        .classList
        .add(
          "campusEventPrintMode"
        );

      window
        .addEventListener(
          "afterprint",
          cleanup
        );

      window.setTimeout(
        () => {
          window.print();
        },
        150
      );
    };


  return (
    <article
      id={`cc-secure-pass-${pass.registration_id}`}
      className="ccSecurePass"
      data-pass-state={
        pass.pass_state
      }
    >
      <header className="ccPassHeader">
        <div className="ccPassBrand">
          <div className="ccPassBrandMark">
            CC
          </div>

          <div>
            <span>
              CAMPUSCONNECT
            </span>

            <strong>
              Verified Event Pass
            </strong>
          </div>
        </div>

        <div
          className="ccPassStatus"
          data-state={
            pass.pass_state
          }
        >
          <i>
            {pass.checked_in
              ? "✓"
              : "●"}
          </i>

          <div>
            <strong>
              {
                pass.checked_in
                  ? "CHECKED IN"
                  : pass.pass_state ===
                      "valid"
                    ? "VALID PASS"
                    : pass.pass_state ===
                        "upcoming"
                      ? "VALID PASS"
                      : passStateLabels[
                          pass.pass_state
                        ]
              }
            </strong>

            <small>
              {
                passStateLabels[
                  pass.pass_state
                ]
              }
            </small>
          </div>
        </div>
      </header>


      <section
        className={
          eventBannerUrl
            ? "ccPassHero"
            : "ccPassHero ccPassHeroFallback"
        }
      >
        {eventBannerUrl && (
          <img
            src={
              eventBannerUrl
            }
            alt={
              `${pass.event_title} banner`
            }
          />
        )}

        <div className="ccPassHeroShade" />

        <div className="ccPassHeroContent">
          <span>
            {
              eventCategory ||
              "CAMPUS EVENT"
            }
          </span>

          <h2>
            {
              pass.event_title
            }
          </h2>

          <p>
            {
              pass.organizer
                ? `Hosted by ${pass.organizer}`
                : "Official CampusConnect Event"
            }
          </p>
        </div>
      </section>


      <div className="ccPassBody">
        <main className="ccPassInformation">
          <section className="ccPassAttendee">
            <div className="ccPassAvatar">
              {
                initials
              }
            </div>

            <div>
              <span>
                REGISTERED ATTENDEE
              </span>

              <h3>
                {
                  pass.student_name
                }
              </h3>

              <p>
                {
                  pass.department ||
                  "CampusConnect"
                }

                {" · "}

                {
                  pass.graduation_year ||
                  "Student"
                }
              </p>
            </div>
          </section>


          <div className="ccPassRule" />


          <section className="ccPassInfoGrid">
            <div className="ccPassInfoCard">
              <i>
                ◷
              </i>

              <div>
                <small>
                  DATE & TIME
                </small>

                <strong>
                  {
                    formatEventPassDateShort(
                      pass.event_date
                    )
                  }
                </strong>

                <span>
                  {
                    formatEventPassTime(
                      pass.event_date
                    )
                  }

                  {pass.event_end_date
                    ? ` – ${formatEventPassTime(
                        pass.event_end_date
                      )}`
                    : ""}
                </span>
              </div>
            </div>


            <div className="ccPassInfoCard">
              <i>
                ◎
              </i>

              <div>
                <small>
                  VENUE
                </small>

                <strong>
                  {
                    pass.venue ||
                    "Venue to be announced"
                  }
                </strong>

                <span>
                  Campus event location
                </span>
              </div>
            </div>


            <div className="ccPassInfoCard">
              <i>
                ◇
              </i>

              <div>
                <small>
                  ORGANIZER
                </small>

                <strong>
                  {
                    pass.organizer ||
                    "CampusConnect"
                  }
                </strong>

                <span>
                  Official event organizer
                </span>
              </div>
            </div>


            <div className="ccPassInfoCard">
              <i>
                #
              </i>

              <div>
                <small>
                  PASS UID
                </small>

                <strong className="ccPassUid">
                  {
                    pass.pass_uid
                  }
                </strong>

                <span>
                  Unique attendee reference
                </span>
              </div>
            </div>
          </section>


          <section className="ccPassVerified">
            <i>
              ✓
            </i>

            <div>
              <strong>
                Identity verified through CampusConnect
              </strong>

              <span>
                This digital pass is linked to your
                CampusConnect registration and cannot
                be transferred.
              </span>
            </div>
          </section>


          <section className="ccPassValidityWindow">
            <div>
              <small>
                CHECK-IN OPENS
              </small>

              <strong>
                {
                  formatEventPassDate(
                    pass.valid_from
                  )
                }
              </strong>
            </div>

            <div>
              <small>
                PASS EXPIRES
              </small>

              <strong>
                {
                  formatEventPassDate(
                    pass.valid_until
                  )
                }
              </strong>
            </div>
          </section>


          {pass.checked_in && (
            <section className="ccPassChecked">
              <strong>
                ✓ Entry verified
              </strong>

              <span>
                Checked in{" "}
                {
                  formatEventPassDate(
                    pass.checked_in_at
                  )
                }
              </span>
            </section>
          )}
        </main>


        <aside className="ccPassQrSide">
          {disabled ? (
            <div className="ccPassUnavailable">
              <i>
                !
              </i>

              <strong>
                {
                  passStateLabels[
                    pass.pass_state
                  ]
                }
              </strong>

              <span>
                This pass cannot currently
                be used for entry.
              </span>
            </div>
          ) : (
            <>
              <div className="ccPassQrHeading">
                <span>
                  ENTRY QR
                </span>

                <small>
                  Scan at check-in
                </small>
              </div>


              <div className="ccPassQrBox">
                <QRCodeSVG
                  value={
                    pass.qr_token
                  }
                  size={
                    205
                  }
                  level="Q"
                  includeMargin
                  aria-label="Secure CampusConnect event QR"
                />
              </div>


              <strong className="ccPassQrCaption">
                Present this QR at entry
              </strong>


              {pass.pass_state !==
                "used" && (
                <section className="ccPassManual">
                  <span>
                    OR ENTER CODE MANUALLY
                  </span>

                  <strong>
                    {
                      pass.manual_code
                    }
                  </strong>

                  <small>
                    Use this code if camera
                    scanning is unavailable.
                  </small>
                </section>
              )}
            </>
          )}
        </aside>
      </div>


      <footer className="ccPassFooter">
        <div className="ccPassFooterVerified">
          <i>
            ✓
          </i>

          <div>
            <strong>
              VERIFIED BY CAMPUSCONNECT
            </strong>

            <span>
              Secure · Verified · Single Attendee
            </span>
          </div>
        </div>


        <div className="ccPassActions">
          <button
            type="button"
            onClick={() => {
              void copyPassUid();
            }}
          >
            <span>
              ⧉
            </span>

            Copy Pass UID
          </button>


          <button
            type="button"
            className="primary"
            onClick={
              printPass
            }
          >
            <span>
              ↓
            </span>

            Print / Save PDF
          </button>
        </div>
      </footer>


      {actionMessage && (
        <div className="ccPassActionMessage">
          {
            actionMessage
          }
        </div>
      )}
    </article>
  );
}
