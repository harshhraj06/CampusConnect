"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {getSupabaseClient} from "../lib/supabase";

import "./college-id-scanner.css";

type VerifiedCollegeId = {
  student_id: string;
  full_name: string;
  usn: string;
  campus_uid: string;
  department: string;
  graduation_year: string;
  avatar_url: string | null;
  role: string;
  verified: boolean;
};

export default function CollegeIdScanner() {
  const [manualCode, setManualCode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [student, setStudent] =
    useState<VerifiedCollegeId | null>(
      null
    );

  const [cameraActive, setCameraActive] =
    useState(false);


  const scannerRef =
    useRef<{
      stop: () => Promise<void>;
      clear: () => void;
    } | null>(null);

  const scannerLockRef =
    useRef(false);

  const normalizeBarcode = (
    value: string
  ) =>
    value
      .trim()
      .replace(/\s+/g, "");

  const stopScanner =
    useCallback(
      async () => {
        const scanner =
          scannerRef.current;

        if (!scanner) {
          setCameraActive(false);
          return;
        }

        try {
          await scanner.stop();
        } catch {
          // Scanner may already be stopped.
        }

        try {
          await scanner.clear();
        } catch {
          // Ignore cleanup failure.
        }

        scannerRef.current =
          null;

        scannerLockRef.current =
          false;

        setCameraActive(false);
      },
      []
    );

  const verifyBarcode =
    useCallback(
      async (
        rawValue:
          string
      ) => {
        const code =
          normalizeBarcode(
            rawValue
          );

        if (!code) {
          setError(
            "Scan or enter a college ID barcode."
          );

          return;
        }

        const client =
          getSupabaseClient();

        if (!client) {
          setError(
            "CampusConnect authentication is unavailable."
          );

          return;
        }

        setLoading(true);
        setError("");
        setMessage("");
        setStudent(null);

        const {
          data,
          error:
            verifyError,
        } =
          await client.rpc(
            "verify_college_id_barcode",
            {
              p_barcode_value:
                code,
            }
          );

        if (verifyError) {
          setError(
            verifyError.message
          );

          setLoading(false);
          return;
        }

        const result =
          Array.isArray(data)
            ? data[0]
            : data;

        if (!result) {
          setError(
            "No verified CampusConnect student matches this college ID barcode."
          );

          setLoading(false);
          return;
        }

        setStudent(
          result as
            VerifiedCollegeId
        );

        setManualCode(
          code
        );

        setMessage(
          "Official college identity verified."
        );

        setLoading(false);
      },
      []
    );

  const startScanner =
    async () => {
      if (
        cameraActive ||
        scannerRef.current
      ) {
        return;
      }

      setError("");
      setMessage("");
      setStudent(null);

      try {
        const {
          Html5Qrcode,
        } =
          await import(
            "html5-qrcode"
          );

        const scanner =
          new Html5Qrcode(
            "college-id-camera-reader"
          );

        scannerRef.current =
          scanner;

        const cameras =
          await Html5Qrcode
            .getCameras();

        if (
          !cameras.length
        ) {
          throw new Error(
            "No camera was found on this device."
          );
        }

        const preferredCamera =
          cameras.find(
            camera =>
              /back|rear|environment/i.test(
                camera.label
              )
          ) ||
          cameras[0];

        await scanner.start(
          preferredCamera.id,
          {
            fps: 12,
            qrbox: {
              width: 320,
              height: 130,
            },
            aspectRatio:
              1.7777778,
          },
          async decodedText => {
            if (
              scannerLockRef
                .current
            ) {
              return;
            }

            scannerLockRef.current =
              true;

            const code =
              normalizeBarcode(
                decodedText
              );

            setManualCode(
              code
            );

            await stopScanner();

            await verifyBarcode(
              code
            );
          },
          () => {
            // Continuous scan misses are expected.
          }
        );

        setCameraActive(
          true
        );
      } catch (
        scanError
      ) {
        scannerRef.current =
          null;

        scannerLockRef.current =
          false;

        setCameraActive(
          false
        );

        setError(
          scanError instanceof
            Error
            ? scanError.message
            : "Unable to start camera scanner."
        );
      }
    };

  useEffect(
    () => {
      return () => {
        void stopScanner();
      };
    },
    [stopScanner]
  );

  return (
    <section className="collegeIdWorkspace">
      <header className="collegeIdHero">
        <div>
          <span>
            OFFICIAL COLLEGE ID
          </span>

          <h2>
            Scan physical RNSIT ID
          </h2>

          <p>
            Scan the barcode printed on a physical college ID card to verify the student identity stored in CampusConnect.
          </p>
        </div>

        <div className="collegeIdHeroBadge">
          <strong>
            RNSIT
          </strong>

          <small>
            Identity verification
          </small>
        </div>
      </header>

      <div className="collegeIdGrid">
        <section className="collegeIdScannerCard">
          <div className="collegeIdScannerHeader">
            <div>
              <span>
                BARCODE SCANNER
              </span>

              <h3>
                Verify student
              </h3>
            </div>

            <span
              className={
                cameraActive
                  ? "collegeIdLiveBadge active"
                  : "collegeIdLiveBadge"
              }
            >
              {cameraActive
                ? "CAMERA LIVE"
                : "READY"}
            </span>
          </div>

          <div
            id="college-id-camera-reader"
            className="collegeIdCamera"
          />

          <div className="collegeIdScannerActions">
            {!cameraActive ? (
              <button
                type="button"
                className="collegeIdPrimary"
                onClick={
                  startScanner
                }
              >
                Start camera scanner
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  void stopScanner()
                }
              >
                Stop camera
              </button>
            )}
          </div>

          <div className="collegeIdDivider">
            <span>
              OR
            </span>
          </div>

          <label className="collegeIdManual">
            <span>
              BARCODE / ID VALUE
            </span>

            <input
              value={
                manualCode
              }
              onChange={
                event =>
                  setManualCode(
                    event.target
                      .value
                  )
              }
              onKeyDown={
                event => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    void verifyBarcode(
                      manualCode
                    );
                  }
                }
              }
              placeholder="Scan barcode or enter value"
              autoComplete="off"
            />
          </label>

          <div className="collegeIdButtonRow">
            <button
              type="button"
              className="collegeIdPrimary"
              disabled={
                loading
              }
              onClick={() =>
                void verifyBarcode(
                  manualCode
                )
              }
            >
              {loading
                ? "Checking…"
                : "Verify ID"}
            </button>


          </div>



          {error && (
            <p
              className="collegeIdError"
              role="alert"
            >
              {error}
            </p>
          )}

          {message && (
            <p className="collegeIdSuccess">
              {message}
            </p>
          )}
        </section>

        <section className="collegeIdResult">
          {!student ? (
            <div className="collegeIdEmpty">
              <div className="collegeIdEmptyIcon">
                ▥
              </div>

              <strong>
                No ID scanned yet
              </strong>

              <p>
                Scan a physical RNSIT student ID barcode to display the verified digital identity.
              </p>
            </div>
          ) : (
            <article className="digitalCollegeId">
              <div className="digitalCollegeIdTop">
                <div className="digitalCollegeIdBrand">
                  <div className="digitalCollegeIdSeal">
                    RNS
                  </div>

                  <div>
                    <strong>
                      RNSIT
                    </strong>

                    <span>
                      Autonomous Institution
                    </span>

                    <small>
                      Bengaluru
                    </small>
                  </div>
                </div>

                <span className="digitalCollegeIdStudent">
                  Student
                </span>
              </div>

              <div className="digitalCollegeIdPhotoWrap">
                {student.avatar_url ? (
                  <img
                    src={
                      student.avatar_url
                    }
                    alt={`${student.full_name} profile`}
                    className="digitalCollegeIdPhoto"
                  />
                ) : (
                  <div className="digitalCollegeIdPhotoFallback">
                    {student.full_name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map(
                        word =>
                          word[0]
                      )
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="digitalCollegeIdIdentity">
                <h3>
                  {
                    student.full_name
                  }
                </h3>

                <strong>
                  USN:{" "}
                  {student.usn ||
                    "Not available"}
                </strong>
              </div>

              <div className="digitalCollegeIdFacts">
                <div>
                  <span>
                    DEPARTMENT
                  </span>

                  <strong>
                    {student.department ||
                      "Not set"}
                  </strong>
                </div>

                <div>
                  <span>
                    GRADUATION YEAR
                  </span>

                  <strong>
                    {student.graduation_year ||
                      "Not set"}
                  </strong>
                </div>

                <div>
                  <span>
                    CAMPUS UID
                  </span>

                  <strong>
                    {student.campus_uid ||
                      "Not assigned"}
                  </strong>
                </div>
              </div>

              <div className="digitalCollegeIdVerified">
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    VERIFIED STUDENT
                  </strong>

                  <small>
                    CampusConnect authenticated college record
                  </small>
                </div>
              </div>

              <footer className="digitalCollegeIdFooter">
                <strong>
                  DEPT. OF{" "}
                  {student.department ||
                    "RNSIT"}
                </strong>
              </footer>
            </article>
          )}
        </section>
      </div>
    </section>
  );
}
