"use client";

import {
  useEffect,
  useState,
} from "react";

import "./cookie-consent.css";

type ConsentChoice =
  | "essential"
  | "all";

const STORAGE_KEY =
  "campusconnect-cookie-consent-v1";

export default function CookieConsent() {
  const [
    visible,
    setVisible,
  ] = useState(false);

  const [
    detailsOpen,
    setDetailsOpen,
  ] = useState(false);

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (
      saved !== "essential" &&
      saved !== "all"
    ) {
      setVisible(true);
    }

    const reopen = () => {
      setVisible(true);
      setDetailsOpen(true);
    };

    window.addEventListener(
      "campusconnect-open-cookie-settings",
      reopen
    );

    return () => {
      window.removeEventListener(
        "campusconnect-open-cookie-settings",
        reopen
      );
    };
  }, []);

  function closePanel() {
    setVisible(false);
    setDetailsOpen(false);
  }

  function saveChoice(
    choice: ConsentChoice
  ) {
    window.localStorage.setItem(
      STORAGE_KEY,
      choice
    );

    window.dispatchEvent(
      new CustomEvent(
        "campusconnect-cookie-consent-changed",
        {
          detail: {
            choice,
          },
        }
      )
    );

    setVisible(false);
    setDetailsOpen(false);
  }

  if (!visible) {
    return (
      <button
        type="button"
        className="ccCookieSettingsButton"
        onClick={() => {
          setVisible(true);
          setDetailsOpen(true);
        }}
        aria-label="Open cookie settings"
      >
        Privacy
      </button>
    );
  }

  return (
    <>
      <div
        className="ccCookieBackdrop"
        aria-hidden="true"
      />

      <section
        className="ccCookieBanner"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-cookie-title"
        aria-describedby="cc-cookie-description"
      >
        <button
          type="button"
          className="ccCookieClose"
          onClick={closePanel}
          aria-label="Close privacy choices"
          title="Close"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="ccCookieHeader">
          <div>
            <span>
              PRIVACY
            </span>

            <h2 id="cc-cookie-title">
              Your privacy choices
            </h2>
          </div>

          <img
            src="/campusconnect-logo-ui.webp"
            alt=""
            aria-hidden="true"
          />
        </div>

        <p
          id="cc-cookie-description"
          className="ccCookieDescription"
        >
          CampusConnect uses essential
          authentication and security storage
          needed for the platform to work.
          Optional analytics are currently not
          loaded unless they are added in the
          future and you choose to allow them.
        </p>

        <button
          type="button"
          className="ccCookieDetailsToggle"
          aria-expanded={detailsOpen}
          onClick={() =>
            setDetailsOpen(
              (current) =>
                !current
            )
          }
        >
          {detailsOpen
            ? "Hide details"
            : "Manage choices"}
        </button>

        {detailsOpen ? (
          <div className="ccCookieCategories">
            <div className="ccCookieCategory">
              <div>
                <strong>
                  Essential
                </strong>

                <p>
                  Authentication, security,
                  session continuity and core
                  platform functionality.
                </p>
              </div>

              <span>
                Always on
              </span>
            </div>

            <div className="ccCookieCategory">
              <div>
                <strong>
                  Analytics
                </strong>

                <p>
                  Optional performance and
                  usage measurement. No
                  analytics provider is
                  currently loaded by this
                  consent component.
                </p>
              </div>

              <span>
                Optional
              </span>
            </div>
          </div>
        ) : null}

        <div className="ccCookieActions">
          <button
            type="button"
            className="ccCookieSecondary"
            onClick={() =>
              saveChoice(
                "essential"
              )
            }
          >
            Essential only
          </button>

          <button
            type="button"
            className="ccCookiePrimary"
            onClick={() =>
              saveChoice(
                "all"
              )
            }
          >
            Allow optional
          </button>
        </div>

        <small>
          You can change this choice later
          using the Privacy button.
        </small>
      </section>
    </>
  );
}
