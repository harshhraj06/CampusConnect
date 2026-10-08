import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at 75% 20%, rgba(181,145,48,.13), transparent 28rem), #f7f8f6",
        color: "#17201d",
      }}
    >
      <section
        style={{
          width: "min(620px, 100%)",
          textAlign: "center",
        }}
      >
        <img
          src="/campusconnect-logo-ui.webp"
          alt="CampusConnect Pro"
          style={{
            width: "min(210px, 60vw)",
            height: "auto",
            marginBottom: "44px",
          }}
        />

        <p
          style={{
            margin: 0,
            color: "#8b7222",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: ".16em",
          }}
        >
          ERROR 404
        </p>

        <h1
          style={{
            margin: "14px 0",
            fontSize: "clamp(42px, 8vw, 76px)",
            lineHeight: .98,
            letterSpacing: "-.055em",
          }}
        >
          This page left campus.
        </h1>

        <p
          style={{
            maxWidth: "500px",
            margin: "0 auto 30px",
            color: "#65706b",
            fontSize: "16px",
            lineHeight: 1.7,
          }}
        >
          The page you requested does not exist or may have moved.
          Return to CampusConnect and continue from there.
        </p>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "44px",
            borderRadius: "999px",
            background: "#1d2d27",
            padding: "0 20px",
            color: "#fff",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 800,
          }}
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
