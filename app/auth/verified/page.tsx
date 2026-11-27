"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "../../../lib/supabase";

import "./verified.css";


type VerificationState =
  | "checking"
  | "success"
  | "error";


export default function CampusConnectVerifiedPage() {
  const [
    state,
    setState,
  ] = useState<VerificationState>(
    "checking"
  );

  const [
    message,
    setMessage,
  ] = useState(
    "Securely verifying your email address…"
  );


  useEffect(
    () => {
      let active = true;

      const verify =
        async () => {
          const client =
            getSupabaseClient();

          if (!client) {
            if (active) {
              setState("error");

              setMessage(
                "CampusConnect authentication is currently unavailable."
              );
            }

            return;
          }


          const url =
            new URL(
              window.location.href
            );

          const hash =
            new URLSearchParams(
              window.location.hash.replace(
                /^#/,
                ""
              )
            );


          const providerError =
            url.searchParams.get(
              "error_description"
            ) ||
            hash.get(
              "error_description"
            );


          if (providerError) {
            if (active) {
              setState("error");

              setMessage(
                decodeURIComponent(
                  providerError
                )
              );
            }

            return;
          }


          try {
            const { error: initializationError } = await client.auth.initialize();
            if (initializationError) throw initializationError;

            const accessToken =
              hash.get(
                "access_token"
              );

            const refreshToken =
              hash.get(
                "refresh_token"
              );


            if (
              accessToken &&
              refreshToken
            ) {
              const {
                error,
              } =
                await client.auth
                  .setSession({
                    access_token:
                      accessToken,

                    refresh_token:
                      refreshToken,
                  });

              if (error) {
                throw error;
              }
            }


            const {
              data: sessionData,
            } =
              await client.auth
                .getSession();


            const { data: userData, error: userError } = await client.auth.getUser();
            const verified = !userError && sessionData.session && userData.user?.email_confirmed_at;

            if (!verified) {
              throw new Error(
                "This verification link is invalid, incomplete, or has expired. Please use the latest verification email sent by CampusConnect."
              );
            }


            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );


            if (!active) {
              return;
            }


            setState(
              "success"
            );

            setMessage(
              "Your email address has been verified successfully."
            );
            window.location.replace("/dashboard");

          } catch (error) {
            if (!active) {
              return;
            }

            setState(
              "error"
            );

            setMessage(
              error instanceof Error
                ? error.message
                : "Unable to verify your email address."
            );
          }
        };


      void verify();


      return () => {
        active = false;
      };
    },
    []
  );


  return (
    <main className="verifiedPage">

      <section className="verifiedCard">

        <div className="verifiedBrand">
          <div className="verifiedBrandMark">
            C
          </div>

          <div>
            <strong>
              CampusConnect
            </strong>

            <span>
              Secure account verification
            </span>
          </div>
        </div>


        {state ===
          "checking" && (
          <>

            <div
              className="verifiedSpinner"
              aria-hidden="true"
            />

            <span className="verifiedEyebrow">
              VERIFYING ACCOUNT
            </span>

            <h1>
              Confirming your email
            </h1>

            <p>
              {message}
            </p>

            <p className="verifiedMuted">
              Please keep this page open
              for a moment.
            </p>

          </>
        )}


        {state ===
          "success" && (
          <>

            <div
              className="verifiedSuccessIcon"
              aria-hidden="true"
            >
              ✓
            </div>

            <span className="verifiedEyebrow">
              VERIFICATION COMPLETE
            </span>

            <h1>
              Verification successful
            </h1>

            <p>
              {message}
            </p>


            <Link href="/dashboard">Open CampusConnect dashboard</Link>

          </>
        )}


        {state ===
          "error" && (
          <>

            <div
              className="verifiedErrorIcon"
              aria-hidden="true"
            >
              !
            </div>

            <span className="verifiedEyebrow">
              VERIFICATION ERROR
            </span>

            <h1>
              Unable to verify email
            </h1>

            <p>
              {message}
            </p>

            <div className="verifiedInstruction">
              <p>
                Request a new verification
                email from CampusConnect and
                use the latest link.
              </p>
            </div>

          </>
        )}


        <footer className="verifiedFooter">
          CAMPUSCONNECT · VERIFIED CAMPUS WORKSPACE
        </footer>

      </section>

    </main>
  );
}
