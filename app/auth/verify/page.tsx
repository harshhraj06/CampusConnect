"use client";

import {
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  getSupabaseClient,
} from "../../../lib/supabase";

import "./verify.css";


type VerifyState =
  | "ready"
  | "verifying"
  | "success"
  | "error";


export default function EmailVerifyPage() {

  const [
    state,
    setState,
  ] = useState<VerifyState>(
    "ready"
  );

  const [
    message,
    setMessage,
  ] = useState(
    ""
  );


  const verificationData =
    useMemo(
      () => {

        if (
          typeof window ===
          "undefined"
        ) {
          return {
            tokenHash: "",
            type: "email",
          };
        }


        const params =
          new URLSearchParams(
            window.location.search
          );


        return {
          tokenHash:
            params.get(
              "token_hash"
            ) || "",

          type:
            params.get(
              "type"
            ) || "email",
        };

      },
      []
    );


  const verifyEmail =
    async () => {

      if (
        state ===
        "verifying"
      ) {
        return;
      }


      if (
        !verificationData
          .tokenHash
      ) {
        setState(
          "error"
        );

        setMessage(
          "This verification link is incomplete or invalid."
        );

        return;
      }


      const supabase =
        getSupabaseClient();


      if (
        !supabase
      ) {
        setState(
          "error"
        );

        setMessage(
          "CampusConnect authentication is currently unavailable."
        );

        return;
      }


      setState(
        "verifying"
      );

      setMessage(
        ""
      );


      try {

        const {
          error,
        } =
          await supabase.auth
            .verifyOtp({
              token_hash:
                verificationData
                  .tokenHash,

              type:
                "email",
            });


        if (
          error
        ) {
          throw error;
        }


        await supabase.auth
          .signOut();


        setState(
          "success"
        );


      } catch (
        error
      ) {

        setState(
          "error"
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify this email address."
        );

      }

    };


  return (
    <main className="ccVerifyPage">

      <section className="ccVerifyCard">

        <div className="ccVerifyBrand">
          <span>
            C
          </span>

          <strong>
            CampusConnect
          </strong>
        </div>


        {state ===
          "ready" && (
          <>

            <div className="ccVerifyIcon">
              ✉
            </div>

            <span className="ccVerifyEyebrow">
              EMAIL VERIFICATION
            </span>

            <h1>
              Verify your email
            </h1>

            <p>
              You're one step away from
              activating your CampusConnect
              account.
            </p>

            <p>
              Click the button below to
              securely verify your email
              address.
            </p>

            <button
              type="button"
              className="ccVerifyPrimary"
              onClick={() =>
                void verifyEmail()
              }
            >
              Verify my email
            </button>

          </>
        )}


        {state ===
          "verifying" && (
          <>

            <div className="ccVerifySpinner" />

            <span className="ccVerifyEyebrow">
              CAMPUSCONNECT
            </span>

            <h1>
              Verifying your email…
            </h1>

            <p>
              Please wait while we securely
              confirm your account.
            </p>

          </>
        )}


        {state ===
          "success" && (
          <>

            <div className="ccVerifySuccess">
              ✓
            </div>

            <span className="ccVerifyEyebrow">
              VERIFICATION COMPLETE
            </span>

            <h1>
              Email verified successfully
            </h1>

            <p>
              Your CampusConnect account is
              now verified and ready to use.
            </p>

            <div className="ccVerifyNotice">
              Go to CampusConnect and sign in
              using your email address and the
              password you created during
              registration.
            </div>

            <Link
              href="/login"
              className="ccVerifyPrimary ccVerifyLink"
            >
              Go to CampusConnect
            </Link>

          </>
        )}


        {state ===
          "error" && (
          <>

            <div className="ccVerifyError">
              !
            </div>

            <span className="ccVerifyEyebrow">
              VERIFICATION ERROR
            </span>

            <h1>
              We couldn't verify this link
            </h1>

            <p>
              {message}
            </p>

            <Link
              href="/login"
              className="ccVerifyPrimary ccVerifyLink"
            >
              Return to CampusConnect
            </Link>

          </>
        )}


        <footer>
          CAMPUSCONNECT · SECURE ACCOUNT VERIFICATION
        </footer>

      </section>

    </main>
  );
}
