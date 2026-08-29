"use client";

import {
  useEffect,
  useState,
  type KeyboardEvent,
} from "react";

import {getSupabaseClient} from "../lib/supabase";

type Recruiter = {
  id: string;
  company_name: string;
  logo_url: string | null;
  website_url: string | null;
  industry: string;
  hiring_roles: string;
  highest_package: string;
  students_selected: number;
  placement_year: string;
};

export function MyCampusRecruiterPreview({
  onOpenCampusLife,
}: {
  onOpenCampusLife: () => void;
}) {
  const [recruiters, setRecruiters] =
    useState<Recruiter[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadFailed, setLoadFailed] =
    useState(false);

  useEffect(() => {
    let active = true;

    const loadRecruiters = async () => {
      const client = getSupabaseClient();

      if (!client) {
        if (active) {
          setLoadFailed(true);
          setLoading(false);
        }

        return;
      }

      const {data, error} = await client
        .from("campus_recruiters")
        .select(
          "id,company_name,logo_url,website_url,industry,hiring_roles,highest_package,students_selected,placement_year"
        )
        .order("is_featured", {
          ascending: false,
        })
        .order("display_order", {
          ascending: true,
        })
        .limit(12);

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          "My Campus recruiter preview load error:",
          error
        );

        setLoadFailed(true);
      } else {
        setRecruiters(
          (data || []) as Recruiter[]
        );
      }

      setLoading(false);
    };

    void loadRecruiters();

    return () => {
      active = false;
    };
  }, []);

  const openRecruiter = (
    recruiter: Recruiter
  ) => {
    if (!recruiter.website_url) {
      return;
    }

    window.open(
      recruiter.website_url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const openWithKeyboard = (
    event: KeyboardEvent<HTMLElement>,
    recruiter: Recruiter
  ) => {
    if (
      recruiter.website_url &&
      (
        event.key === "Enter" ||
        event.key === " "
      )
    ) {
      event.preventDefault();
      openRecruiter(recruiter);
    }
  };

  return (
    <section
      className="campusRecruiterShowcase myCampusRecruiterPreview"
      aria-labelledby="my-campus-recruiters-title"
    >
      <div
        className="campusRecruiterGlow campusRecruiterGlowOne"
      />

      <div
        className="campusRecruiterGlow campusRecruiterGlowTwo"
      />

      <header className="campusRecruiterHeader">
        <div>
          <span>PLACEMENT NETWORK</span>

          <h2 id="my-campus-recruiters-title">
            Top recruiters
          </h2>

          <p>
            Companies that hire, mentor and build
            careers from our campus.
          </p>
        </div>

        <div className="campusRecruiterControls">
          <button
            type="button"
            className="campusRecruiterAdd"
            onClick={onOpenCampusLife}
          >
            Open Campus Life
          </button>
        </div>
      </header>

      {loading ? (
        <div
          className="campusRecruiterEmpty"
          aria-live="polite"
        >
          <div>
            <span>CC</span>
          </div>

          <h3>Loading recruiters…</h3>

          <p>
            Reading the current placement network
            from CampusConnect.
          </p>
        </div>
      ) : loadFailed ? (
        <div
          className="campusRecruiterEmpty"
          role="status"
        >
          <div>
            <span>!</span>
          </div>

          <h3>Placement network unavailable</h3>

          <p>
            Recruiters could not be loaded from
            CampusConnect right now.
          </p>
        </div>
      ) : recruiters.length ? (
        <div className="campusRecruiterViewport">
          <div className="campusRecruiterTrack">
            {recruiters.map(recruiter => (
              <article
                className={
                  recruiter.website_url
                    ? "campusRecruiterCard clickable"
                    : "campusRecruiterCard"
                }
                key={recruiter.id}
                role={
                  recruiter.website_url
                    ? "link"
                    : undefined
                }
                tabIndex={
                  recruiter.website_url
                    ? 0
                    : undefined
                }
                onClick={() =>
                  openRecruiter(recruiter)
                }
                onKeyDown={event =>
                  openWithKeyboard(
                    event,
                    recruiter
                  )
                }
              >
                <div className="campusRecruiterLogo">
                  {recruiter.logo_url ? (
                    <img
                      src={recruiter.logo_url}
                      alt={`${recruiter.company_name} logo`}
                    />
                  ) : (
                    <strong>
                      {recruiter.company_name
                        .split(" ")
                        .slice(0, 2)
                        .map(word => word[0])
                        .join("")
                        .toUpperCase()}
                    </strong>
                  )}
                </div>

                <div className="campusRecruiterInfo">
                  <span>
                    {recruiter.industry ||
                      "Campus recruiter"}
                  </span>

                  <h3>
                    {recruiter.company_name}
                  </h3>

                  {recruiter.hiring_roles && (
                    <p>
                      {recruiter.hiring_roles}
                    </p>
                  )}

                  <div className="campusRecruiterStats">
                    {recruiter.highest_package && (
                      <div>
                        <b>
                          {recruiter.highest_package}
                        </b>

                        <small>
                          Highest package
                        </small>
                      </div>
                    )}

                    <div>
                      <b>
                        {recruiter.students_selected}
                      </b>

                      <small>
                        Students selected
                      </small>
                    </div>
                  </div>

                  <div className="campusRecruiterFooter">
                    {recruiter.website_url ? (
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          openRecruiter(recruiter);
                        }}
                      >
                        Visit company ↗
                      </button>
                    ) : (
                      <span>
                        {recruiter.placement_year ||
                          "Campus hiring"}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="campusRecruiterEmpty">
          <div>
            <span>CC</span>
          </div>

          <h3>No recruiters published yet</h3>

          <p>
            Verified companies will appear here
            after they are added to CampusConnect.
          </p>
        </div>
      )}
    </section>
  );
}
