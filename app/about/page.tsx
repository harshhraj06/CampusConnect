import { Breadcrumb, PublicLinks } from "../campus-seo-content";
import "../legal-document.css";
import { collegeName, contactEmails, foundingTeam, publicMetadata, publishedSocials } from "@/lib/campus-seo";

export const metadata = publicMetadata("/about");

export default function AboutPage() {
  return (
    <main className="ccLegalMain">
      <Breadcrumb path="/about" />
      <h1>About CampusConnect</h1>
      <p>CampusConnect brings college academics, campus updates, and placement preparation together in one platform.</p>
      <section aria-labelledby="founding-team">
        <h2 id="founding-team">Founding team</h2>
        <ul>{foundingTeam.map(person =>
          <li key={person.name}><strong>{person.name}</strong> · {person.role}</li>,
        )}</ul>
        <p>College: {collegeName}</p>
      </section>
      <section aria-labelledby="contact-campusconnect">
        <h2 id="contact-campusconnect">Contact</h2>
        <ul>{contactEmails.map(email => <li key={email}><a href={`mailto:${email}`}>{email}</a></li>)}</ul>
        {publishedSocials.length > 0 && (
          <ul>{publishedSocials.map(([label, url]) => <li key={label}><a href={url}>{label}</a></li>)}</ul>
        )}
      </section>
      <PublicLinks />
    </main>
  );
}
