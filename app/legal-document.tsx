import Link from "next/link";
import { LegalLinks } from "@/components/ui/legal-links";
import LegalEditor from "./legal-editor";
import type { LegalDocumentContent } from "@/lib/legal-content";
import "./legal-document.css";

export default function LegalDocument({
  kind,
  content,
}: {
  kind: "privacy" | "terms";
  content: LegalDocumentContent;
}) {
  const { title, introduction, sections } = content;
  return (
    <div className="ccLegalPage">
      <header className="ccLegalHeader">
        <Link href="/" aria-label="CampusConnect home">
          <img
            src="/campusconnect-logo-ui.webp"
            alt="CampusConnect"
            width="160"
            height="52"
          />
        </Link>
        <Link href="/">
          Back to CampusConnect <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <main id="main-content" className="ccLegalMain">
        <div className="ccLegalHero">
          <span className="ccLegalEyebrow">CampusConnect · Policies</span>
          <h1>{title}</h1>
          <p>{introduction}</p>
          <div className="ccLegalDocumentNav">
            <Link
              href="/privacy"
              aria-current={kind === "privacy" ? "page" : undefined}
            >
              Privacy policy
            </Link>
            <Link
              href="/terms"
              aria-current={kind === "terms" ? "page" : undefined}
            >
              Terms of use
            </Link>
          </div>
          <LegalEditor slug={kind} />
        </div>

        <div className="ccLegalLayout">
          <nav className="ccLegalContents" aria-label="On this page">
            <strong>On this page</strong>
            {sections.map((section, index) => (
              <a href={`#${section.id}`} key={section.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
            ))}
          </nav>

          <article className="ccLegalArticle" aria-label={title}>
            {sections.map((section, index) => (
              <section id={section.id} key={section.id}>
                <span className="ccLegalSectionNumber">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2>{section.title}</h2>
                  {section.blocks.map((block, blockIndex) => {
                    const nextBlock = section.blocks[blockIndex + 1];
                    const previousBlock = section.blocks[blockIndex - 1];
                    if (block.type === "paragraph" && nextBlock?.type === "link") {
                      return <p key={`${section.id}-${blockIndex}`}>{block.text}<a href={nextBlock.url} rel={nextBlock.url.startsWith("http") ? "noopener noreferrer" : undefined}>{nextBlock.label}</a></p>;
                    }
                    if (block.type === "link" && previousBlock?.type === "paragraph") return null;
                    if (block.type === "list") {
                      return <ul key={`${section.id}-${blockIndex}`}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}-${item}`}>{item}</li>)}</ul>;
                    }
                    if (block.type === "link") {
                      return <p key={`${section.id}-${blockIndex}`}>{block.prefix && `${block.prefix} `}<a href={block.url} rel={block.url.startsWith("http") ? "noopener noreferrer" : undefined}>{block.label}</a></p>;
                    }
                    if (block.type === "heading") {
                      return <h3 key={`${section.id}-${blockIndex}`}>{block.text}</h3>;
                    }
                    return <p key={`${section.id}-${blockIndex}`}>{block.text}</p>;
                  })}
                </div>
              </section>
            ))}

            <aside className="ccLegalHelp">
              <h2>Questions or concerns?</h2>
              <p>
                Contact your institution’s CampusConnect administrator or use
                Seva Kendra in your dashboard. Include the relevant feature and
                your concern, and avoid sharing passwords or confidential
                documents in your initial message.
              </p>
              <Link href="/">
                Return to CampusConnect <span aria-hidden="true">→</span>
              </Link>
            </aside>
          </article>
        </div>
      </main>

      <footer className="ccLegalFooter">
        <span>
          © {new Date().getFullYear()} CampusConnect. All rights reserved.
        </span>
        <LegalLinks />
      </footer>
    </div>
  );
}
