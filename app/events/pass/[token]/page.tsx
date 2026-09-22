"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  QRCodeCanvas,
} from "qrcode.react";

import JsBarcode from "jsbarcode";

import {
  getSupabaseClient,
} from "../../../../lib/supabase";

import "./external-pass.css";


type ExternalPass = {
  success: boolean;

  pass_uid: string;
  event_id: string;

  event_title: string;
  event_date: string;
  event_end_date: string | null;

  venue: string;
  organizer: string;
  category: string;

  attendee_name: string;
  college_name: string;
  department: string;
  graduation_year: string;

  qr_token: string;
  barcode_token: string;
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

  error?: string;
};


const passLabels:
  Record<string, string> = {
    valid: "VALID PASS",
    upcoming: "UPCOMING",
    used: "CHECKED IN",
    expired: "EXPIRED",
    revoked: "REVOKED",
    cancelled: "CANCELLED",
    event_cancelled: "EVENT CANCELLED",
    unavailable: "UNAVAILABLE",
  };


function formatDate(
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
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(date);
}


function shortPassReference(
  value:
    string
    | null
    | undefined
) {
  if (!value) {
    return "CC-PASS";
  }

  return value
    .replace(
      /-/g,
      ""
    )
    .slice(
      0,
      16
    )
    .toUpperCase();
}


export default function ExternalEventPassPage() {
  const params =
    useParams();

  const tokenParam =
    params?.token;

  const token =
    typeof tokenParam ===
      "string"
      ? tokenParam
      : Array.isArray(
          tokenParam
        )
      ? tokenParam[0] || ""
      : "";


  const barcodeRef =
    useRef<HTMLCanvasElement | null>(
      null
    );


  const [pass, setPass] =
    useState<ExternalPass | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    const loadPass =
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          setError(
            "CampusConnect pass service is unavailable."
          );

          setLoading(false);

          return;
        }


        try {
          const {
            data,
            error:
              rpcError,
          } =
            await client.rpc(
              "get_external_event_pass",
              {
                p_claim_token:
                  token,
              }
            );


          if (rpcError) {
            throw rpcError;
          }


          const result =
            data as
              ExternalPass;


          if (
            !result ||
            !result.success
          ) {
            throw new Error(
              result?.error ||
                "This event pass is unavailable."
            );
          }


          setPass(
            result
          );

        } catch (
          err
        ) {
          setError(
            err instanceof
              Error
              ? err.message
              : "Unable to load event pass."
          );
        } finally {
          setLoading(
            false
          );
        }
      };


    if (token) {
      void loadPass();
    } else {
      setError(
        "Invalid event pass."
      );

      setLoading(
        false
      );
    }
  }, [token]);


  useEffect(() => {
    if (
      !pass?.barcode_token ||
      !barcodeRef.current
    ) {
      return;
    }


    JsBarcode(
      barcodeRef.current,
      pass.barcode_token,
      {
        format:
          "CODE128",

        displayValue:
          false,

        width:
          2,

        height:
          60,

        margin:
          4,

        lineColor:
          "#1d1712",

        background:
          "#fffaf3",
      }
    );

  }, [pass]);


  if (loading) {
    return (
      <main className="eventCredentialScreen">
        <div className="eventCredentialLoading">
          Preparing secure event pass…
        </div>
      </main>
    );
  }


  if (
    error ||
    !pass
  ) {
    return (
      <main className="eventCredentialScreen">

        <div className="eventCredentialError">

          <div className="eventCredentialErrorLogo">
            CC
          </div>

          <h1>
            Pass unavailable
          </h1>

          <p>
            {error}
          </p>

        </div>

      </main>
    );
  }


  const initials =
    pass.attendee_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(
        0,
        2
      )
      .map(name =>
        name
          .charAt(0)
          .toUpperCase()
      )
      .join("") ||
    "CC";


  return (
    <main className="eventCredentialScreen">

      <div className="eventCredentialToolbar">

        <div>
          <strong>
            CampusConnect
          </strong>

          <span>
            Secure External Event Credential
          </span>
        </div>


        <button
          type="button"
          onClick={() =>
            window.print()
          }
        >
          Print / Save PDF
        </button>

      </div>


      <article className="eventCredentialPaper">


        {/* ===================================================
            TOP HEADER
            =================================================== */}

        <header className="eventCredentialTop">

          <div className="eventCredentialBrand">

            <div className="eventCredentialBrandLogo">
              CC
            </div>

            <div>
              <small>
                CAMPUSCONNECT
              </small>

              <strong>
                Verified Event Pass
              </strong>
            </div>

          </div>


          <div
            className={
              `eventCredentialStatus eventCredentialStatus-${pass.pass_state}`
            }
          >

            <span />

            <div>
              <strong>
                {passLabels[
                  pass.pass_state
                ] ||
                  "EVENT PASS"}
              </strong>

              <small>
                {pass.checked_in
                  ? "Entry recorded"
                  : "Check-in at open"}
              </small>
            </div>

          </div>

        </header>



        {/* ===================================================
            HERO
            =================================================== */}

        <section className="eventCredentialHero">

          <div className="eventCredentialHeroOverlay" />

          <div className="eventCredentialHeroContent">

            <span className="eventCredentialCategory">
              {pass.category ||
                "Campus Event"}
            </span>

            <h1>
              {pass.event_title}
            </h1>

            <p>
              Connect • Create • Celebrate
            </p>

            <small>
              Hosted by{" "}
              {pass.organizer ||
                "CampusConnect"}
            </small>

          </div>

        </section>



        {/* ===================================================
            BODY
            =================================================== */}

        <section className="eventCredentialBody">


          {/* LEFT SIDE */}

          <div className="eventCredentialMain">


            <section className="eventCredentialPerson">

              <div className="eventCredentialAvatar">
                {initials}
              </div>

              <div>

                <small>
                  REGISTERED ATTENDEE
                </small>

                <h2>
                  {pass.attendee_name}
                </h2>

                <p>
                  {pass.department ||
                    "Department"}
                  {" · "}
                  {pass.graduation_year ||
                    "Student"}
                </p>

                <span>
                  {pass.college_name}
                </span>

              </div>

            </section>



            <section className="eventCredentialInfoGrid">


              <div className="eventCredentialInfoCard">

                <span className="eventCredentialIcon">
                  ◷
                </span>

                <div>
                  <small>
                    DATE & TIME
                  </small>

                  <strong>
                    {formatDate(
                      pass.event_date
                    )}
                  </strong>

                  <p>
                    Event schedule
                  </p>
                </div>

              </div>



              <div className="eventCredentialInfoCard">

                <span className="eventCredentialIcon">
                  ◉
                </span>

                <div>
                  <small>
                    VENUE
                  </small>

                  <strong>
                    {pass.venue ||
                      "To be announced"}
                  </strong>

                  <p>
                    Event location
                  </p>
                </div>

              </div>



              <div className="eventCredentialInfoCard">

                <span className="eventCredentialIcon">
                  ◇
                </span>

                <div>
                  <small>
                    ORGANIZER
                  </small>

                  <strong>
                    {pass.organizer ||
                      "CampusConnect"}
                  </strong>

                  <p>
                    Official event organizer
                  </p>
                </div>

              </div>



              <div className="eventCredentialInfoCard">

                <span className="eventCredentialIcon">
                  #
                </span>

                <div>
                  <small>
                    PASS UID
                  </small>

                  <strong className="eventCredentialUid">
                    {shortPassReference(
                      pass.pass_uid
                    )}
                  </strong>

                  <p>
                    Unique attendee reference
                  </p>
                </div>

              </div>

            </section>



            <section className="eventCredentialVerified">

              <div>
                ✓
              </div>

              <p>
                <strong>
                  Registration verified through CampusConnect
                </strong>

                <span>
                  This digital pass is linked to one
                  confirmed external registration and
                  cannot be transferred.
                </span>
              </p>

            </section>



            <section className="eventCredentialValidity">

              <div>
                <small>
                  CHECK-IN OPENS
                </small>

                <strong>
                  {formatDate(
                    pass.valid_from
                  )}
                </strong>
              </div>


              <div>
                <small>
                  PASS EXPIRES
                </small>

                <strong>
                  {formatDate(
                    pass.valid_until
                  )}
                </strong>
              </div>

            </section>

          </div>



          {/* RIGHT SIDE */}

          <aside className="eventCredentialEntry">

            <section className="eventCredentialQrBlock">

              <small>
                ENTRY QR
              </small>

              <span>
                Scan at check-in
              </span>


              <div className="eventCredentialQrFrame">

                <QRCodeCanvas
                  value={
                    pass.qr_token
                  }
                  size={270}
                  level="H"
                  marginSize={2}
                  bgColor="#fffaf3"
                  fgColor="#17120e"
                />

              </div>


              <strong>
                Present this QR at entry
              </strong>

            </section>



            <div className="eventCredentialSeparator" />



            <section className="eventCredentialManual">

              <small>
                OR ENTER CODE MANUALLY
              </small>

              <strong>
                {pass.manual_code}
              </strong>

              <p>
                Use this code if camera
                scanning is unavailable.
              </p>

            </section>



            <section className="eventCredentialBarcode">

              <small>
                BARCODE ENTRY
              </small>

              <div>
                <canvas
                  ref={
                    barcodeRef
                  }
                />
              </div>

              <p>
                Compatible with fixed
                Code-128 gate scanners.
              </p>

            </section>

          </aside>

        </section>



        {/* ===================================================
            FOOTER
            =================================================== */}

        <footer className="eventCredentialFooter">

          <div className="eventCredentialSeal">
            ✓
          </div>

          <div>
            <strong>
              VERIFIED BY CAMPUSCONNECT
            </strong>

            <span>
              Secure • Verified • Single Attendee
            </span>
          </div>

        </footer>

      </article>

    </main>
  );
}
