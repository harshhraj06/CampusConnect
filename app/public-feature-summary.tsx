import { PublicLinks } from "./campus-seo-content";
import "./legal-document.css";

export default function PublicFeatureSummary() {
  return (
    <section className="ccLegalMain" aria-labelledby="campusconnect-features">
      <h2 id="campusconnect-features">Your college workspace</h2>
      <h3>For students</h3>
      <p>Check attendance, find assignments and resources, follow campus announcements, and prepare for placements.</p>
      <h3>For faculty</h3>
      <p>Track classes, record attendance, share learning material, and review academic progress.</p>
      <h3>For the Placement Cell</h3>
      <p>Publish placement drives and coordinate student applications and preparation.</p>
      <h3>Do I need an account?</h3>
      <p>You can explore the public site without signing in. Sign in to access your campus workspace.</p>
      <PublicLinks />
    </section>
  );
}
