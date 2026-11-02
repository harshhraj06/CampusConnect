"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <section>
        <h1>Something went wrong</h1>
        <p>Please try again. If it keeps happening, contact support.</p>
        <button onClick={() => reset()} style={{ padding: "10px 20px", borderRadius: 8, border: 0, background: "#111827", color: "#fff", cursor: "pointer" }}>Try again</button>
      </section>
    </main>
  );
}
