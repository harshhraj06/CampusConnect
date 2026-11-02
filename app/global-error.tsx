"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <section>
          <h1>CampusConnect hit an unexpected error</h1>
          <button onClick={() => reset()} style={{ padding: "10px 20px", borderRadius: 8, border: 0, background: "#111827", color: "#fff", cursor: "pointer" }}>Reload</button>
        </section>
      </body>
    </html>
  );
}
