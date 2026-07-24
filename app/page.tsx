/**
 * Placeholder landing page.
 *
 * The real role switcher (Nurse / Doctor / Student / Clusters) is frontend
 * work and is not built yet. This page just confirms the app boots and lists
 * the API surface the frontend will be built against.
 */
const ROUTES = [
  ["POST", "/api/intake", "Nurse logs a visit onto the twin"],
  ["POST", "/api/refer", "Issue a scoped, time-boxed referral token"],
  ["POST", "/api/doctor/history", "Receiving doctor reads the scoped history"],
  ["POST", "/api/interactions/check", "Check a new drug against existing meds"],
  ["POST", "/api/summary", "Plain-language summary of the latest visit"],
  ["GET", "/api/clusters/mock", "Phase 2 preview — mocked cluster data"],
];

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>CareBridge OAU</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Backend is up. Frontend not built yet.
      </p>

      <h2 style={{ fontSize: "1rem", marginTop: "2rem" }}>API routes</h2>
      <ul style={{ lineHeight: 1.8, paddingLeft: "1.1rem" }}>
        {ROUTES.map(([method, path, description]) => (
          <li key={path}>
            <code>
              {method} {path}
            </code>
            <br />
            <span style={{ color: "#666", fontSize: "0.9rem" }}>{description}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
