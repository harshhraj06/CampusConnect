"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "../../../lib/supabase";

import "./verify-otp.css";


type VerificationState =
  | "ready"
  | "verifying"
  | "success"
  | "error";


const OTP_LENGTH = 8;


function maskEmail(
  email: string
) {
  const [
    local = "",
    domain = "",
  ] = email.split("@");

  if (!domain) {
    return email;
  }

  if (local.length <= 2) {
    return `${local[0] || ""}••••@${domain}`;
  }

  return `${local.slice(0, 2)}${"•".repeat(
    Math.max(
      4,
      local.length - 2
    )
  )}@${domain}`;
}


export default function VerifyOtpPage() {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    token,
    setToken,
  ] = useState("");

  const [
    state,
    setState,
  ] =
    useState<VerificationState>(
      "ready"
    );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(60);

  const [
    resending,
    setResending,
  ] = useState(false);

  const [
    redirectSeconds,
    setRedirectSeconds,
  ] = useState(2);

  const inputRef =
    useRef<HTMLInputElement>(
      null
    );


  useEffect(
    () => {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const emailFromUrl =
        params
          .get("email")
          ?.trim() || "";

      const stored =
        window.sessionStorage
          .getItem(
            "campusconnect_pending_verification_email"
          )
          ?.trim() || "";

      const pendingEmail =
        emailFromUrl || stored;


      if (pendingEmail) {
        setEmail(
          pendingEmail
        );

        window.sessionStorage
          .setItem(
            "campusconnect_pending_verification_email",
            pendingEmail
          );
      }


      window.setTimeout(
        () => {
          inputRef.current
            ?.focus();
        },
        180
      );
    },
    []
  );


  useEffect(
    () => {
      if (
        resendSeconds <= 0
      ) {
        return;
      }

      const timer =
        window.setInterval(
          () => {
            setResendSeconds(
              current =>
                Math.max(
                  0,
                  current - 1
                )
            );
          },
          1000
        );

      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    [resendSeconds]
  );


  useEffect(
    () => {
      if (
        state !== "success"
      ) {
        return;
      }


      setRedirectSeconds(2);


      const countdown =
        window.setInterval(
          () => {
            setRedirectSeconds(
              current =>
                Math.max(
                  0,
                  current - 1
                )
            );
          },
          1000
        );


      const redirect =
        window.setTimeout(
          () => {
            window.location.replace(
              "/login"
            );
          },
          2200
        );


      return () => {
        window.clearInterval(
          countdown
        );

        window.clearTimeout(
          redirect
        );
      };
    },
    [state]
  );


  const handleTokenChange = (
    value: string
  ) => {
    const digits =
      value
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          OTP_LENGTH
        );

    setToken(
      digits
    );

    if (
      state === "error"
    ) {
      setState(
        "ready"
      );

      setMessage("");
    }
  };


  const verify =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      const cleanEmail =
        email.trim();

      const cleanToken =
        token.replace(
          /\D/g,
          ""
        );


      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          cleanEmail
        )
      ) {
        setState(
          "error"
        );

        setMessage(
          "Enter the email address used during registration."
        );

        return;
      }


      if (
        cleanToken.length !==
        OTP_LENGTH
      ) {
        setState(
          "error"
        );

        setMessage(
          `Enter the complete ${OTP_LENGTH}-digit verification code.`
        );

        return;
      }


      const supabase =
        getSupabaseClient();


      if (!supabase) {
        setState(
          "error"
        );

        setMessage(
          "CampusConnect authentication is temporarily unavailable."
        );

        return;
      }


      setState(
        "verifying"
      );

      setMessage("");


      try {
        const {
          error,
        } =
          await supabase.auth
            .verifyOtp({
              email:
                cleanEmail,

              token:
                cleanToken,

              type:
                "signup",
            });


        if (error) {
          throw error;
        }


        await supabase.auth
          .signOut();


        window.sessionStorage
          .removeItem(
            "campusconnect_pending_verification_email"
          );


        setToken("");

        setMessage(
          "Your CampusConnect account has been verified."
        );

        setState(
          "success"
        );

      } catch (error) {
        setState(
          "error"
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "The verification code is invalid or has expired."
        );
      }
    };


  const resend =
    async () => {
      if (
        resendSeconds > 0 ||
        resending
      ) {
        return;
      }


      const cleanEmail =
        email.trim();


      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          cleanEmail
        )
      ) {
        setState(
          "error"
        );

        setMessage(
          "Enter your registration email first."
        );

        return;
      }


      const supabase =
        getSupabaseClient();


      if (!supabase) {
        setState(
          "error"
        );

        setMessage(
          "CampusConnect authentication is temporarily unavailable."
        );

        return;
      }


      setResending(true);

      setMessage("");


      try {
        const {
          error,
        } =
          await supabase.auth
            .resend({
              type:
                "signup",

              email:
                cleanEmail,
            });


        if (error) {
          throw error;
        }


        setState(
          "ready"
        );

        setToken("");

        setResendSeconds(
          60
        );

        setMessage(
          "A new verification code has been sent."
        );


        window.setTimeout(
          () => {
            inputRef.current
              ?.focus();
          },
          100
        );

      } catch (error) {
        setState(
          "error"
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to resend the verification code."
        );

      } finally {
        setResending(
          false
        );
      }
    };


  if (
    state === "success"
  ) {
    return (
      <main className="ccOtpPage">

        <div className="ccOtpAmbient ccOtpAmbientOne" />
        <div className="ccOtpAmbient ccOtpAmbientTwo" />


        <section className="ccOtpSuccessCard">

          <div className="ccOtpLogoWrap">
            <img
              src="/campusconnect-logo-ui.webp"
              alt="CampusConnect"
              width="250"
              height="88"
              className="ccOtpLogo"
            />
          </div>


          <div className="ccOtpSuccessRing">

            <div className="ccOtpSuccessCheck">
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 12.5L9.4 17L19 7"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

          </div>


          <span className="ccOtpKicker">
            IDENTITY VERIFIED
          </span>


          <h1>
            You're verified.
          </h1>


          <p className="ccOtpSuccessLead">
            Your email address has been
            successfully verified and your
            CampusConnect account is ready.
          </p>


          <div className="ccOtpSuccessNotice">

            <div className="ccOtpNoticeIcon">
              ✓
            </div>

            <div>
              <strong>
                Verification complete
              </strong>

              <span>
                Redirecting you securely to
                CampusConnect sign in.
              </span>
            </div>

          </div>


          <div className="ccOtpRedirectStatus">

            <span className="ccOtpMiniSpinner" />

            <span>
              Opening CampusConnect in{" "}
              {redirectSeconds}
              s
            </span>

          </div>


          <div className="ccOtpProgress">
            <span />
          </div>


          <footer className="ccOtpFooter">
            SECURE CAMPUS IDENTITY
            · CAMPUSCONNECT
          </footer>

        </section>

      </main>
    );
  }


  return (
    <main className="ccOtpPage">

      <div className="ccOtpAmbient ccOtpAmbientOne" />
      <div className="ccOtpAmbient ccOtpAmbientTwo" />


      <section className="ccOtpCard">

        <header className="ccOtpHeader">

          <img
            src="/campusconnect-logo-ui.webp"
            alt="CampusConnect"
            width="245"
            height="86"
            className="ccOtpLogo"
          />

          <div className="ccOtpSecureBadge">
            <span className="ccOtpSecureDot" />
            Secure verification
          </div>

        </header>


        <div className="ccOtpDivider" />


        <section className="ccOtpContent">

          <div className="ccOtpIcon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.7"
              />

              <path
                d="M4.5 7L12 12.5L19.5 7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>


          <span className="ccOtpKicker">
            EMAIL VERIFICATION
          </span>


          <h1>
            Verify your account
          </h1>


          <p className="ccOtpLead">
            Enter the one-time verification
            code we sent to your registered
            email address.
          </p>


          {email ? (
            <div className="ccOtpEmailPill">

              <span className="ccOtpEmailDot" />

              <span>
                {maskEmail(
                  email
                )}
              </span>

            </div>
          ) : null}


          <form
            onSubmit={verify}
            className="ccOtpForm"
          >

            {!email && (
              <div className="ccOtpField">

                <label
                  htmlFor="otp-email"
                >
                  Email address
                </label>

                <input
                  id="otp-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={
                    event =>
                      setEmail(
                        event.target
                          .value
                      )
                  }
                  placeholder="you@example.com"
                  required
                />

              </div>
            )}


            <div className="ccOtpField">

              <div className="ccOtpLabelRow">

                <label
                  htmlFor="otp-code"
                >
                  Verification code
                </label>

                <span>
                  {token.length}/
                  {OTP_LENGTH}
                </span>

              </div>


              <div className="ccOtpInputWrap">

                <input
                  ref={inputRef}
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={
                    OTP_LENGTH
                  }
                  value={token}
                  onChange={
                    event =>
                      handleTokenChange(
                        event.target
                          .value
                      )
                  }
                  placeholder="00000000"
                  aria-label={`${OTP_LENGTH} digit verification code`}
                  className="ccOtpCodeInput"
                  required
                />

              </div>

            </div>


            {message && (
              <div
                className={
                  state === "error"
                    ? "ccOtpMessage ccOtpMessageError"
                    : "ccOtpMessage ccOtpMessageSuccess"
                }
              >
                <span>
                  {state ===
                  "error"
                    ? "!"
                    : "✓"}
                </span>

                <p>
                  {message}
                </p>
              </div>
            )}


            <button
              type="submit"
              className="ccOtpPrimary"
              disabled={
                state ===
                  "verifying" ||
                token.length !==
                  OTP_LENGTH
              }
            >
              {state ===
              "verifying" ? (
                <>
                  <span className="ccOtpButtonSpinner" />
                  Verifying account
                </>
              ) : (
                <>
                  Verify account

                  <span aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </button>

          </form>


          <div className="ccOtpResend">

            <span>
              Didn't receive your code?
            </span>

            <button
              type="button"
              onClick={
                () =>
                  void resend()
              }
              disabled={
                resendSeconds > 0 ||
                resending
              }
            >
              {resending
                ? "Sending…"
                : resendSeconds >
                    0
                  ? `Resend in ${resendSeconds}s`
                  : "Resend code"}
            </button>

          </div>


          <div className="ccOtpTrust">

            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 3L19 6V11C19 15.5 16.3 19 12 21C7.7 19 5 15.5 5 11V6L12 3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />

              <path
                d="M9 12L11 14L15 10"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <span>
              Never share your verification
              code with anyone.
            </span>

          </div>

        </section>


        <footer className="ccOtpFooter">
          SECURE CAMPUS IDENTITY
          · CAMPUSCONNECT
        </footer>

      </section>

    </main>
  );
}
