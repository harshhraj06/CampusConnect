"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import "./cookie-consent.css";
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  saveCookieConsentChoice,
  type CookieConsentChoice,
} from "./cookie-preferences";

export default function CookieConsent() {
  const panelRef = useRef<HTMLElement>(null);
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
        COOKIE_CONSENT_STORAGE_KEY
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

    const onPreferenceSaved = () => {
      setVisible(false);
      setDetailsOpen(false);
    };

    window.addEventListener(
      "campusconnect-open-cookie-settings",
      reopen
    );
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, onPreferenceSaved);

    return () => {
      window.removeEventListener(
        "campusconnect-open-cookie-settings",
        reopen
      );
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, onPreferenceSaved);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const panel = panelRef.current;
    panel?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVisible(false);
        setDetailsOpen(false);
      }
      if (event.key !== "Tab" || !panel) return;

      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex="0"]'
        )
      );
      const first = controls[0];
      const last = controls[controls.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === panel)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [visible]);

  function closePanel() {
    setVisible(false);
    setDetailsOpen(false);
  }

  function saveChoice(
    choice: CookieConsentChoice
  ) {
    saveCookieConsentChoice(choice);

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
        ref={panelRef}
        tabIndex={-1}
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
              Your privacy, your choice
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
          Essential storage keeps your account secure and
          your campus workspace working. Optional analytics
          are not currently enabled. Choose the preference
          you are comfortable with.
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
                  Your preference for optional usage measurement.
                  This panel does not currently load an analytics service.
                </p>
              </div>

              <span>
                Not active
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
            Allow optional analytics
          </button>
        </div>

        <small>
          Your preference is saved on this device. Change it
          anytime from Privacy preferences in the footer.
        </small>
        <nav className="ccCookiePolicyLinks" aria-label="Privacy information">
          <Link href="/privacy" onClick={closePanel}>Read privacy policy</Link>
          <Link href="/terms" onClick={closePanel}>Terms of use</Link>
        </nav>
      </section>
    </>
  );
}
