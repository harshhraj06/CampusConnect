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
      "Valid · Check-in not open",
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


export default function
CampusEventSecurePass({
  eventId,
  refreshKey,
}: {
  eventId: string;
  refreshKey?: string;
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
      <div className="eventPassLoading">
        <i />

        <span>
          <strong>
            Preparing secure pass
          </strong>

          <small>
            Verifying your event registration…
          </small>
        </span>
      </div>
    );
  }


  if (
    error ||
    !pass
  ) {
    return (
      <div className="eventPassError">
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


  return (
    <div
      className="eventPassCard secureEventPassCard"
      data-pass-state={
        pass.pass_state
      }
    >
      <div className="eventPassQrColumn">
        {disabled ? (
          <div className="eventPassUnavailable">
            <span>!</span>

            <strong>
              {
                passStateLabels[
                  pass.pass_state
                ]
              }
            </strong>

            <small>
              This pass cannot be used for entry.
            </small>
          </div>
        ) : (
          <>
            <div className="eventPassQr">
              <QRCodeSVG
                value={
                  pass.qr_token
                }
                size={190}
                level="Q"
                includeMargin
                aria-label="Secure event entry QR code"
              />
            </div>

            {pass.pass_state !==
              "used" && (
              <div className="eventPassManualCode">
                <small>
                  CAMERA UNAVAILABLE?
                </small>

                <strong>
                  {
                    pass.manual_code
                  }
                </strong>

                <span>
                  Enter this code at the check-in desk
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="eventPassIdentity">
        <div className="eventPassSecurityLine">
          <span>
            VERIFIED CAMPUSCONNECT PASS
          </span>

          <b
            data-state={
              pass.pass_state
            }
          >
            {
              passStateLabels[
                pass.pass_state
              ] ||
              "Event pass"
            }
          </b>
        </div>

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

        <div className="eventPassMetaGrid">
          <div>
            <small>
              EVENT
            </small>

            <strong>
              {
                pass.event_title
              }
            </strong>
          </div>

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
          </div>

          <div>
            <small>
              EVENT DATE
            </small>

            <strong>
              {formatEventPassDate(
                pass.event_date
              )}
            </strong>
          </div>

          <div>
            <small>
              PASS UID
            </small>

            <strong className="eventPassUid">
              {
                pass.pass_uid
              }
            </strong>
          </div>
        </div>

        <div className="eventPassValidity">
          <span>
            <small>
              CHECK-IN OPENS
            </small>

            <strong>
              {formatEventPassDate(
                pass.valid_from
              )}
            </strong>
          </span>

          <span>
            <small>
              PASS EXPIRES
            </small>

            <strong>
              {formatEventPassDate(
                pass.valid_until
              )}
            </strong>
          </span>
        </div>

        {pass.checked_in && (
          <div className="eventPassCheckedIn">
            <strong>
              ✓ Entry verified
            </strong>

            <span>
              Checked in{" "}
              {formatEventPassDate(
                pass.checked_in_at
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
