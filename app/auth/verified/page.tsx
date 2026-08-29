"use client";

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


export default function
CampusConnectVerifiedPage() {

  const [
    state,
    setState,
  ] =
    useState<
      VerificationState
    >("checking");

  const [
    message,
    setMessage,
  ] =
    useState(
      "Confirming your CampusConnect email address…"
    );


  useEffect(
    () => {
      let active =
        true;

      const verify =
        async () => {
          const client =
            getSupabaseClient();

          if (
            !client
          ) {
            if (
              active
            ) {
              setState(
                "error"
              );

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
              window.location.hash
                .replace(
                  /^#/,
                  ""
                )
            );

          const providerError =
            url.searchParams
              .get(
                "error_description"
              ) ||
            hash.get(
              "error_description"
            );

          if (
            providerError
          ) {
            if (
              active
            ) {
              setState(
                "error"
              );

              setMessage(
                decodeURIComponent(
                  providerError
                )
              );
            }

            return;
          }


          try {
            const code =
              url.searchParams
                .get(
                  "code"
                );

            if (
              code
            ) {
              const {
                error,
              } =
                await client.auth
                  .exchangeCodeForSession(
                    code
                  );

              if (
                error
              ) {
                throw error;
              }
            }


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

              if (
                error
              ) {
                throw error;
              }
            }


            await new Promise(
              resolve =>
                window.setTimeout(
                  resolve,
                  300
                )
            );


            const {
              data: sessionData,
            } =
              await client.auth
                .getSession();

            const {
              data: userData,
            } =
              await client.auth
                .getUser();

            const user =
              userData.user ||
              sessionData.session
                ?.user ||
              null;

            const verified =
              Boolean(
                user &&
                (
                  user.email_confirmed_at ||
                  (
                    user as {
                      confirmed_at?: string;
                    }
                  ).confirmed_at
                )
              );


            if (
              !verified
            ) {
              throw new Error(
                "The verification link is missing, invalid or has expired. Open the latest verification email sent by CampusConnect."
              );
            }


            /*
             * Supabase may automatically create a session
             * after email confirmation. The requested flow
             * requires the student to sign in using their
             * registered password, so only the local
             * verification session is removed.
             */
            await client.auth
              .signOut({
                scope:
                  "local",
              });


            window.history
              .replaceState(
                {},
                document.title,
                "/auth/verified"
              );


            if (
              active
            ) {
              setState(
                "success"
              );

              setMessage(
                "Your email address has been verified successfully."
              );
            }

          } catch (
            error
          ) {
            console.error(
              "[CampusConnect verification]",
              error
            );

            if (
              active
            ) {
              setState(
                "error"
              );

              setMessage(
                error instanceof
                  Error
                  ? error.message
                  : "This verification link could not be confirmed."
              );
            }
          }
        };


      void verify();


      return () => {
        active =
          false;
      };
    },
    []
  );


  return (
    <main className="campusVerifiedPage">
      <div
        className="campusVerifiedAmbient campusVerifiedAmbientOne"
        aria-hidden="true"
      />

      <div
        className="campusVerifiedAmbient campusVerifiedAmbientTwo"
        aria-hidden="true"
      />

      <section className="campusVerifiedCard">
        <header className="campusVerifiedBrand">
          <img
            src="/campusconnect-logo.png"
            alt="CampusConnect"
          />

          <span>
            RNS INSTITUTE OF TECHNOLOGY
          </span>
        </header>

        <div
          className={
            `campusVerifiedSymbol ${state}`
          }
          aria-hidden="true"
        >
          {state ===
            "checking"
            ? (
              <i />
            )
            : state ===
              "success"
            ? "✓"
            : "!"}
        </div>

        {state ===
          "checking" ? (
          <>
            <span className="campusVerifiedEyebrow">
              VERIFYING ACCOUNT
            </span>

            <h1>
              Just a moment…
            </h1>

            <p>
              {message}
            </p>
          </>
        ) : state ===
          "success" ? (
          <>
            <span className="campusVerifiedEyebrow success">
              VERIFICATION SUCCESSFUL
            </span>

            <h1>
              Welcome to
              <br />
              CampusConnect.
            </h1>

            <p>
              {message}
            </p>

            <div className="campusVerifiedInstruction">
              <span>
                01
              </span>

              <div>
                <strong>
                  Continue to sign in
                </strong>

                <p>
                  Enter your registered college
                  email address and the password
                  you created during registration.
                </p>
              </div>
            </div>

            <a
              className="campusVerifiedPrimary"
              href="/"
            >
              Continue to CampusConnect
              <span>
                →
              </span>
            </a>

            <small className="campusVerifiedSecurity">
              <i />
              Your verified CampusConnect account
              is ready.
            </small>
          </>
        ) : (
          <>
            <span className="campusVerifiedEyebrow error">
              VERIFICATION INCOMPLETE
            </span>

            <h1>
              We couldn&apos;t verify this link.
            </h1>

            <p>
              {message}
            </p>

            <a
              className="campusVerifiedPrimary"
              href="/"
            >
              Return to CampusConnect
              <span>
                →
              </span>
            </a>

            <small className="campusVerifiedSecurity">
              Request a new verification email
              from the registration screen if
              this link has expired.
            </small>
          </>
        )}

        <footer className="campusVerifiedFooter">
          <span>
            CAMPUSCONNECT
          </span>

          <small>
            Verified campus identity
          </small>
        </footer>
      </section>
    </main>
  );
}
