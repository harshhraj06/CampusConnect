"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Document,
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

import {
  QRCodeCanvas,
} from "qrcode.react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import "./campus-seva-resolution-pass.css";


type ResolutionPass = {
  pass_id: string;
  request_id: string;
  request_number: string;
  requester_name: string;
  requester_role: string;
  department: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  request_status: string;
  resolution_note: string;
  approved_at: string | null;
  approved_name: string | null;
  approved_role: string | null;
  issued_at: string;
  expires_at: string;
  used_at: string | null;
  used_by_name: string | null;
  used_by_role: string | null;
  qr_token: string;
  qr_state:
    | "Ready"
    | "Used"
    | "Expired"
    | "Revoked";
};


type VerificationResult = {
  valid: boolean;
  verification_state: string;
  pass_id: string | null;
  request_id: string | null;
  request_number: string | null;
  requester_name: string | null;
  department: string | null;
  category: string | null;
  subject: string | null;
  approved_at: string | null;
  approved_name: string | null;
  approved_role: string | null;
  expires_at: string | null;
  used_at: string | null;
  used_by_name: string | null;
};


type ScannerController = {
  clear: () => Promise<void>;
};


const pdfStyles =
  StyleSheet.create({
    page: {
      padding: 34,
      color: "#342619",
      backgroundColor: "#f8eedb",
      fontFamily: "Helvetica",
      fontSize: 10,
      lineHeight: 1.5,
    },

    border: {
      minHeight: "100%",
      padding: 24,
      borderWidth: 2,
      borderColor: "#7a4b20",
    },

    header: {
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#c8a774",
    },

    eyebrow: {
      color: "#8b5a2b",
      fontSize: 8,
      letterSpacing: 2,
    },

    title: {
      marginTop: 7,
      color: "#352214",
      fontFamily: "Times-Roman",
      fontSize: 25,
    },

    subtitle: {
      marginTop: 4,
      color: "#6f604f",
      fontSize: 9,
    },

    identityRow: {
      display: "flex",
      flexDirection: "row",
      marginTop: 18,
    },

    identityBox: {
      width: "50%",
      padding: 11,
      borderWidth: 1,
      borderColor: "#d8c09a",
      backgroundColor: "#fffaf0",
    },

    label: {
      marginBottom: 4,
      color: "#8b6a42",
      fontSize: 7,
      letterSpacing: 1.3,
    },

    value: {
      color: "#342619",
      fontSize: 11,
    },

    section: {
      marginTop: 15,
      padding: 12,
      borderWidth: 1,
      borderColor: "#d9c5a5",
      backgroundColor: "#fffaf1",
    },

    sectionTitle: {
      marginBottom: 6,
      color: "#805126",
      fontSize: 8,
      letterSpacing: 1.4,
    },

    sectionText: {
      color: "#4f4336",
      fontSize: 10,
    },

    approvalRow: {
      display: "flex",
      flexDirection: "row",
      marginTop: 15,
    },

    approvalCopy: {
      width: "66%",
      paddingRight: 15,
    },

    qrBox: {
      width: "34%",
      alignItems: "center",
      padding: 10,
      borderWidth: 1,
      borderColor: "#bd9562",
      backgroundColor: "#ffffff",
    },

    qr: {
      width: 112,
      height: 112,
    },

    qrCaption: {
      marginTop: 6,
      color: "#6f5a42",
      fontSize: 7,
      textAlign: "center",
    },

    status: {
      marginTop: 12,
      padding: 9,
      color: "#ffffff",
      backgroundColor: "#315d49",
      fontSize: 9,
      textAlign: "center",
    },

    footer: {
      marginTop: 18,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: "#c8a774",
      color: "#7a6c5d",
      fontSize: 7,
      textAlign: "center",
    },
  });


function passDate(
  value: string | null
) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}


function passUid(
  value: string
) {
  return (
    "PASS-" +
    value
      .split("-")[0]
      .toUpperCase()
  );
}


function ResolutionPassPdf({
  pass,
  qrImage,
}: {
  pass: ResolutionPass;
  qrImage: string;
}) {
  const fulfilmentPerson =
    pass.used_by_name
      ? `${pass.used_by_name} · ${
          pass.used_by_role ||
          "Campus staff"
        }`
      : "Pending office verification";

  return (
    <Document
      title={
        `CampusConnect Seva Pass — ${pass.request_number}`
      }
      author="CampusConnect"
      subject="Campus Seva Resolution Pass"
    >
      <Page
        size="A4"
        style={pdfStyles.page}
      >
        <View style={pdfStyles.border}>
          <View style={pdfStyles.header}>
            <Text style={pdfStyles.eyebrow}>
              RNS INSTITUTE OF TECHNOLOGY
            </Text>

            <Text style={pdfStyles.title}>
              CampusConnect Seva Resolution Pass
            </Text>

            <Text style={pdfStyles.subtitle}>
              Secure approval, office verification and
              fulfilment record
            </Text>
          </View>

          <View style={pdfStyles.identityRow}>
            <View style={pdfStyles.identityBox}>
              <Text style={pdfStyles.label}>
                REQUEST UID
              </Text>

              <Text style={pdfStyles.value}>
                {pass.request_number}
              </Text>
            </View>

            <View style={pdfStyles.identityBox}>
              <Text style={pdfStyles.label}>
                RESOLUTION PASS UID
              </Text>

              <Text style={pdfStyles.value}>
                {passUid(pass.pass_id)}
              </Text>
            </View>
          </View>

          <View style={pdfStyles.identityRow}>
            <View style={pdfStyles.identityBox}>
              <Text style={pdfStyles.label}>
                CAMPUS MEMBER
              </Text>

              <Text style={pdfStyles.value}>
                {pass.requester_name}
              </Text>

              <Text>
                {pass.requester_role}
                {" · "}
                {pass.department || "CampusConnect"}
              </Text>
            </View>

            <View style={pdfStyles.identityBox}>
              <Text style={pdfStyles.label}>
                SERVICE CATEGORY
              </Text>

              <Text style={pdfStyles.value}>
                {pass.category}
              </Text>

              <Text>
                Priority: {pass.priority}
              </Text>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>
              REQUEST SUBJECT
            </Text>

            <Text style={pdfStyles.sectionText}>
              {pass.subject}
            </Text>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>
              REQUEST DESCRIPTION
            </Text>

            <Text style={pdfStyles.sectionText}>
              {pass.description}
            </Text>
          </View>

          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>
              OFFICIAL DECISION / RESOLUTION NOTE
            </Text>

            <Text style={pdfStyles.sectionText}>
              {pass.resolution_note ||
                "Approved for office fulfilment."}
            </Text>
          </View>

          <View style={pdfStyles.approvalRow}>
            <View style={pdfStyles.approvalCopy}>
              <View style={pdfStyles.section}>
                <Text style={pdfStyles.sectionTitle}>
                  APPROVED BY
                </Text>

                <Text style={pdfStyles.value}>
                  {pass.approved_name ||
                    "Campus staff"}
                </Text>

                <Text>
                  {pass.approved_role ||
                    "CampusConnect"}
                </Text>

                <Text>
                  Approved: {passDate(
                    pass.approved_at
                  )}
                </Text>
              </View>

              <View style={pdfStyles.section}>
                <Text style={pdfStyles.sectionTitle}>
                  OFFICE FULFILMENT
                </Text>

                <Text style={pdfStyles.value}>
                  {fulfilmentPerson}
                </Text>

                <Text>
                  Fulfilled: {passDate(
                    pass.used_at
                  )}
                </Text>

                <Text>
                  Pass expires: {passDate(
                    pass.expires_at
                  )}
                </Text>
              </View>
            </View>

            <View style={pdfStyles.qrBox}>
              <PdfImage
                src={qrImage}
                style={pdfStyles.qr}
              />

              <Text style={pdfStyles.qrCaption}>
                Scan only through the authorized
                CampusConnect office scanner.
              </Text>
            </View>
          </View>

          <Text style={pdfStyles.status}>
            QR STATUS: {pass.qr_state.toUpperCase()}
          </Text>

          <Text style={pdfStyles.footer}>
            This digitally generated pass contains a
            signed one-time QR. Carry your college ID
            during office verification. Altered or
            expired passes will be rejected.
          </Text>
        </View>
      </Page>
    </Document>
  );
}


function extractPassToken(
  rawValue: string
) {
  const value =
    rawValue.trim();

  if (
    value.startsWith(
      "CC-SEVA|"
    )
  ) {
    return value.slice(
      "CC-SEVA|".length
    );
  }

  try {
    const url =
      new URL(value);

    return (
      url.searchParams.get(
        "token"
      ) || value
    );
  } catch {
    return value;
  }
}


export default function
CampusSevaResolutionPass({
  requestId,
  requestStatus,
  canFulfill,
  onFulfilled,
}: {
  requestId: string;
  requestStatus: string;
  canFulfill: boolean;
  onFulfilled: () => Promise<void>;
}) {
  const [
    pass,
    setPass,
  ] =
    useState<
      ResolutionPass | null
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
    message,
    setMessage,
  ] =
    useState("");

  const [
    downloading,
    setDownloading,
  ] =
    useState(false);

  const [
    scanning,
    setScanning,
  ] =
    useState(false);

  const [
    manualToken,
    setManualToken,
  ] =
    useState("");

  const [
    scannedToken,
    setScannedToken,
  ] =
    useState("");

  const [
    scanResult,
    setScanResult,
  ] =
    useState<
      VerificationResult | null
    >(null);

  const [
    fulfilling,
    setFulfilling,
  ] =
    useState(false);

  const qrCanvasRef =
    useRef<
      HTMLCanvasElement | null
    >(null);

  const scannerRef =
    useRef<
      ScannerController | null
    >(null);

  const scannerId =
    `campus-seva-reader-${requestId}`;


  const loadPass =
    useCallback(
      async () => {
        const client =
          getSupabaseClient();

        if (!client) {
          setError(
            "CampusConnect authentication is unavailable."
          );

          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");

        const {
          data,
          error: passError,
        } =
          await client.rpc(
            "get_campus_service_resolution_pass",
            {
              p_request_id:
                requestId,
            }
          ).maybeSingle();

        if (passError) {
          setError(
            passError.message
          );

          setPass(null);
        } else {
          setPass(
            data as
              ResolutionPass | null
          );
        }

        setLoading(false);
      },
      [
        requestId,
      ]
    );


  useEffect(
    () => {
      void loadPass();
    },
    [
      loadPass,
      requestStatus,
    ]
  );


  useEffect(
    () => {
      return () => {
        const scanner =
          scannerRef.current;

        scannerRef.current =
          null;

        if (scanner) {
          void scanner
            .clear()
            .catch(
              () => undefined
            );
        }
      };
    },
    []
  );


  const downloadPdf =
    async () => {
      if (
        !pass ||
        !qrCanvasRef.current
      ) {
        return;
      }

      setDownloading(true);
      setError("");
      setMessage("");

      try {
        const qrImage =
          qrCanvasRef.current
            .toDataURL(
              "image/png"
            );

        const blob =
          await pdf(
            <ResolutionPassPdf
              pass={pass}
              qrImage={qrImage}
            />
          ).toBlob();

        const blobUrl =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href =
          blobUrl;

        link.download =
          `${pass.request_number}-resolution-pass.pdf`;

        document.body
          .appendChild(
            link
          );

        link.click();
        link.remove();

        URL.revokeObjectURL(
          blobUrl
        );

        setMessage(
          "Resolution Pass PDF downloaded successfully."
        );
      } catch (
        pdfError
      ) {
        console.error(
          "[Campus Seva PDF]",
          pdfError
        );

        setError(
          pdfError instanceof
            Error
            ? pdfError.message
            : "The PDF could not be generated."
        );
      }

      setDownloading(false);
    };


  const verifyToken =
    useCallback(
      async (
        rawToken: string
      ) => {
        const token =
          extractPassToken(
            rawToken
          );

        if (!token) {
          setError(
            "Enter or scan a valid Seva QR."
          );

          return;
        }

        const client =
          getSupabaseClient();

        if (!client) {
          return;
        }

        setError("");
        setMessage(
          "Verifying secure QR…"
        );

        const {
          data,
          error:
            verificationError,
        } =
          await client.rpc(
            "verify_campus_service_resolution_pass",
            {
              p_token:
                token,
            }
          ).maybeSingle();

        if (
          verificationError
        ) {
          setError(
            verificationError.message
          );

          setMessage("");
          return;
        }

        const result =
          data as
            VerificationResult;

        setScannedToken(
          token
        );

        setScanResult(
          result
        );

        setManualToken(
          token
        );

        setMessage(
          result.valid
            ? `QR verified: ${result.verification_state}.`
            : "This QR is not a valid CampusConnect Seva pass."
        );
      },
      []
    );


  const stopScanner =
    async () => {
      const scanner =
        scannerRef.current;

      scannerRef.current =
        null;

      if (scanner) {
        await scanner
          .clear()
          .catch(
            () => undefined
          );
      }

      setScanning(false);
    };


  const startScanner =
    async () => {
      setError("");
      setMessage("");
      setScanning(true);

      await new Promise(
        resolve =>
          window.setTimeout(
            resolve,
            80
          )
      );

      try {
        const {
          Html5QrcodeScanner,
        } =
          await import(
            "html5-qrcode"
          );

        const scanner =
          new Html5QrcodeScanner(
            scannerId,
            {
              fps: 10,
              qrbox: {
                width: 230,
                height: 230,
              },
              rememberLastUsedCamera:
                true,
            },
            false
          );

        scannerRef.current =
          scanner;

        scanner.render(
          decodedText => {
            void (
              async () => {
                await stopScanner();

                await verifyToken(
                  decodedText
                );
              }
            )();
          },
          () => undefined
        );
      } catch (
        scannerError
      ) {
        console.error(
          "[Campus Seva scanner]",
          scannerError
        );

        setScanning(false);

        setError(
          "Camera scanner could not start. Use the manual token field instead."
        );
      }
    };


  const fulfilPass =
    async () => {
      if (
        !scannedToken ||
        !scanResult?.valid ||
        scanResult
          .verification_state !==
          "Ready"
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setFulfilling(true);
      setError("");
      setMessage("");

      const {
        error:
          fulfilError,
      } =
        await client.rpc(
          "fulfill_campus_service_resolution_pass",
          {
            p_token:
              scannedToken,
          }
        );

      if (fulfilError) {
        setError(
          fulfilError.message
        );
      } else {
        setMessage(
          "Service fulfilled successfully. The QR is now permanently marked as used."
        );

        await verifyToken(
          scannedToken
        );

        await loadPass();

        await onFulfilled();
      }

      setFulfilling(false);
    };


  if (loading) {
    return (
      <section className="sevaPassCard loading">
        Loading secure Resolution Pass…
      </section>
    );
  }


  if (!pass) {
    return (
      <section className="sevaPassCard unavailable">
        <strong>
          Resolution Pass unavailable
        </strong>

        <p>
          {error ||
            "Approve the request to issue its secure PDF and QR."}
        </p>
      </section>
    );
  }


  const qrPayload =
    `CC-SEVA|${pass.qr_token}`;

  const isReady =
    pass.qr_state ===
      "Ready";


  return (
    <section className="sevaPassCard">
      <header className="sevaPassHeader">
        <div>
          <span>
            CAMPUSCONNECT VERIFIED SERVICE
          </span>

          <h3>
            Seva Resolution Pass
          </h3>

          <p>
            Secure PDF and one-time office QR
            for this approved request.
          </p>
        </div>

        <strong
          data-state={
            pass.qr_state
          }
        >
          {pass.qr_state}
        </strong>
      </header>

      <div className="sevaPassIdentity">
        <div>
          <span>
            REQUEST UID
          </span>

          <strong>
            {pass.request_number}
          </strong>
        </div>

        <div>
          <span>
            PASS UID
          </span>

          <strong>
            {passUid(
              pass.pass_id
            )}
          </strong>
        </div>

        <div>
          <span>
            VALID UNTIL
          </span>

          <strong>
            {passDate(
              pass.expires_at
            )}
          </strong>
        </div>
      </div>

      <div className="sevaPassBody">
        <div className="sevaPassCopy">
          <span>
            OFFICIAL APPROVAL
          </span>

          <h4>
            {pass.subject}
          </h4>

          <p>
            {pass.resolution_note ||
              "Approved for office fulfilment."}
          </p>

          <dl>
            <div>
              <dt>
                Approved by
              </dt>

              <dd>
                {pass.approved_name ||
                  "Campus staff"}
                <small>
                  {pass.approved_role}
                </small>
              </dd>
            </div>

            <div>
              <dt>
                Approval date
              </dt>

              <dd>
                {passDate(
                  pass.approved_at
                )}
              </dd>
            </div>

            {pass.used_at && (
              <div>
                <dt>
                  Fulfilled by
                </dt>

                <dd>
                  {pass.used_by_name ||
                    "Campus staff"}
                  <small>
                    {pass.used_by_role}
                  </small>
                </dd>
              </div>
            )}
          </dl>

          <button
            type="button"
            className="sevaPassDownload"
            onClick={
              downloadPdf
            }
            disabled={
              downloading
            }
          >
            {downloading
              ? "Generating secure PDF…"
              : "Download Resolution Pass PDF ↓"}
          </button>
        </div>

        <div className="sevaPassQr">
          <QRCodeCanvas
            ref={qrCanvasRef}
            value={qrPayload}
            size={210}
            level="H"
            includeMargin
            bgColor="#fffaf0"
            fgColor="#332115"
          />

          <strong>
            One-time office QR
          </strong>

          <p>
            Carry this PDF and your college ID
            to the assigned office.
          </p>
        </div>
      </div>

      {message && (
        <p className="sevaPassMessage">
          {message}
        </p>
      )}

      {error && (
        <p className="sevaPassError">
          {error}
        </p>
      )}

      {canFulfill && (
        <section className="sevaScannerDesk">
          <header>
            <span>
              AUTHORIZED OFFICE DESK
            </span>

            <h4>
              Verify and fulfil pass
            </h4>

            <p>
              Scan the student&apos;s PDF only
              after checking their college ID.
            </p>
          </header>

          {!scanning ? (
            <button
              type="button"
              className="sevaScannerStart"
              onClick={
                startScanner
              }
            >
              Open camera scanner
            </button>
          ) : (
            <>
              <div
                id={scannerId}
                className="sevaScannerCamera"
              />

              <button
                type="button"
                className="sevaScannerStop"
                onClick={
                  stopScanner
                }
              >
                Stop scanner
              </button>
            </>
          )}

          <div className="sevaManualVerify">
            <input
              value={
                manualToken
              }
              onChange={
                event =>
                  setManualToken(
                    event.target
                      .value
                  )
              }
              placeholder="Paste QR token if the camera is unavailable"
            />

            <button
              type="button"
              onClick={() =>
                verifyToken(
                  manualToken
                )
              }
              disabled={
                !manualToken.trim()
              }
            >
              Verify
            </button>
          </div>

          {scanResult && (
            <article
              className="sevaVerificationResult"
              data-state={
                scanResult
                  .verification_state
              }
            >
              <span>
                {
                  scanResult.valid
                    ? "VERIFIED CAMPUSCONNECT RECORD"
                    : "INVALID RECORD"
                }
              </span>

              <h4>
                {
                  scanResult.request_number ||
                  "Unrecognized pass"
                }
              </h4>

              {scanResult.valid && (
                <>
                  <p>
                    <strong>
                      {
                        scanResult.requester_name
                      }
                    </strong>
                    {" · "}
                    {
                      scanResult.department ||
                      "CampusConnect"
                    }
                  </p>

                  <p>
                    {
                      scanResult.category
                    }
                    {" · "}
                    {
                      scanResult.subject
                    }
                  </p>

                  <b>
                    QR status:{" "}
                    {
                      scanResult
                        .verification_state
                    }
                  </b>
                </>
              )}

              {scanResult.valid &&
                scanResult
                  .verification_state ===
                  "Ready" && (
                <button
                  type="button"
                  onClick={
                    fulfilPass
                  }
                  disabled={
                    fulfilling
                  }
                >
                  {fulfilling
                    ? "Completing service…"
                    : "Confirm service fulfilled"}
                </button>
              )}
            </article>
          )}
        </section>
      )}

      {!isReady && (
        <footer className="sevaPassClosed">
          This QR cannot be used again because its
          current state is {pass.qr_state}.
        </footer>
      )}
    </section>
  );
}
