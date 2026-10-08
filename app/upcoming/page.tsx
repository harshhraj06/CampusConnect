import type { Metadata } from "next";
import Link from "next/link";
import "./upcoming.css";

export const metadata: Metadata = {
  title: "Upcoming Features",
  description:
    "See what CampusConnect Pro is improving, building and exploring next.",
  alternates: {
    canonical:
      "/upcoming",
  },
  openGraph: {
    title:
      "Upcoming Features | CampusConnect Pro",
    description:
      "A transparent view of improvements, planned capabilities and product directions for CampusConnect Pro.",
    url:
      "/upcoming",
    images: [
      {
        url:
          "/og.png",
        width:
          1200,
        height:
          630,
        alt:
          "CampusConnect Pro upcoming features",
      },
    ],
  },
};

const developing = [
  {
    title:
      "Security & Privacy",
    text:
      "Continuing access-control hardening, safer APIs and tighter protection for campus data.",
  },
  {
    title:
      "Performance",
    text:
      "Faster loading, lighter images and reduced client-side work across major CampusConnect workflows.",
  },
  {
    title:
      "Mobile Experience",
    text:
      "Improved layouts and interactions for phones, tablets and smaller laptop screens.",
  },
];

const planned = [
  {
    title:
      "Smarter Campus AI",
    text:
      "More useful campus-aware assistance while keeping authenticated data access controlled.",
  },
  {
    title:
      "Faculty Automation",
    text:
      "Additional tools that reduce repetitive academic and administrative work for faculty.",
  },
  {
    title:
      "Campus Navigation",
    text:
      "A richer campus-map experience for discovering blocks, services and useful destinations.",
  },
];

const exploring = [
  {
    title:
      "More Integrations",
    text:
      "Exploring carefully scoped integrations that reduce duplicate work across campus systems.",
  },
  {
    title:
      "Deeper Analytics",
    text:
      "Exploring clearer academic and operational insights without exposing unnecessary personal data.",
  },
];

function FeatureCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="upcomingCard">
      <div
        className="upcomingCardMark"
        aria-hidden="true"
      />
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export default function UpcomingPage() {
  return (
    <main className="upcomingPage">
      <header className="upcomingTopbar">
        <Link
          href="/"
          className="upcomingBrand"
          aria-label="CampusConnect Pro home"
        >
          <img
            src="/campusconnect-logo-ui.webp"
            alt="CampusConnect Pro"
          />
        </Link>

        <Link
          href="/"
          className="upcomingHome"
        >
          Back to CampusConnect
        </Link>
      </header>

      <section className="upcomingHero">
        <span className="upcomingEyebrow">
          PRODUCT ROADMAP
        </span>

        <h1>
          Building what makes campus work simpler.
        </h1>

        <p>
          A transparent view of the areas we are improving,
          planning and exploring next. Roadmap items may change
          as CampusConnect Pro evolves.
        </p>

        <div className="upcomingStatusRow">
          <span>
            <i className="statusDeveloping" />
            In development
          </span>
          <span>
            <i className="statusPlanned" />
            Planned
          </span>
          <span>
            <i className="statusExploring" />
            Exploring
          </span>
        </div>
      </section>

      <section
        className="upcomingSection"
        aria-labelledby="developing-title"
      >
        <div className="upcomingSectionHeading">
          <span>01</span>
          <div>
            <p>IN DEVELOPMENT</p>
            <h2 id="developing-title">
              Improvements being worked on
            </h2>
          </div>
        </div>

        <div className="upcomingGrid">
          {developing.map((feature) => (
            <FeatureCard
              key={feature.title}
              {...feature}
            />
          ))}
        </div>
      </section>

      <section
        className="upcomingSection"
        aria-labelledby="planned-title"
      >
        <div className="upcomingSectionHeading">
          <span>02</span>
          <div>
            <p>PLANNED</p>
            <h2 id="planned-title">
              Capabilities on the roadmap
            </h2>
          </div>
        </div>

        <div className="upcomingGrid">
          {planned.map((feature) => (
            <FeatureCard
              key={feature.title}
              {...feature}
            />
          ))}
        </div>
      </section>

      <section
        className="upcomingSection"
        aria-labelledby="exploring-title"
      >
        <div className="upcomingSectionHeading">
          <span>03</span>
          <div>
            <p>EXPLORING</p>
            <h2 id="exploring-title">
              Ideas under consideration
            </h2>
          </div>
        </div>

        <div className="upcomingGrid upcomingGridTwo">
          {exploring.map((feature) => (
            <FeatureCard
              key={feature.title}
              {...feature}
            />
          ))}
        </div>
      </section>

      <section className="upcomingNotice">
        <strong>
          No fake launch dates.
        </strong>
        <p>
          Features listed here describe product direction,
          not guaranteed release dates or commitments.
        </p>
      </section>
    </main>
  );
}
