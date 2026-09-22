"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {createPortal} from "react-dom";

import {getSupabaseClient} from "../lib/supabase";

type NetworkProject = {
  id: string;
  title: string;
  description: string;
  tech_stack: string;
  project_url: string;
  github_url: string;
};

type NetworkAchievement = {
  id: string;
  title: string;
  issuer: string;
  achievement_type: string;
  issued_at?: string | null;
  credential_url: string;
  description: string;
};

type NetworkMutualConnection = {
  id: string;
  full_name: string;
  campus_uid: string;
  department: string;
  avatar_url?: string | null;
};

type NetworkConnectionStats = {
  connection_count: number;
  mutual_count: number;
};

type PublicNetworkProfile = {
  id: string;
  full_name: string;
  campus_uid: string;
  department: string;
  graduation_year: string;
  role: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  headline: string;
  bio: string;
  skills: string;
  location: string;
  semester: string;
  cgpa?: number | null;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  projects: NetworkProject[];
  achievements: NetworkAchievement[];
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word =>
        word.charAt(0).toUpperCase()
      )
      .join("") || "CC"
  );
}

export function NetworkProfileModal({
  userId,
  onClose,
  connectionStatus = "none",
  incomingRequest = false,
  busy = false,
  onConnect,
  onAccept,
  onIgnore,
  onMessage,
}: {
  userId: string;
  onClose: () => void;
  connectionStatus?: "none" | "pending" | "accepted" | "blocked";
  incomingRequest?: boolean;
  busy?: boolean;
  onConnect?: () => void | Promise<void>;
  onAccept?: () => void | Promise<void>;
  onIgnore?: () => void | Promise<void>;
  onMessage?: () => void;
}) {
  const [profile, setProfile] =
    useState<PublicNetworkProfile | null>(null);

  const [connectionStats, setConnectionStats] =
    useState<NetworkConnectionStats>({
      connection_count: 0,
      mutual_count: 0,
    });

  const [mutualConnections, setMutualConnections] =
    useState<NetworkMutualConnection[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mounted, setMounted] =
    useState(false);

  useEffect(() => {
    setMounted(true);

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        setError(
          "CampusConnect database connection is unavailable."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const {
        data,
        error: profileError,
      } = await client.rpc(
        "get_campus_public_profile",
        {
          target_user: userId,
        }
      );

      if (!active) {
        return;
      }

      if (profileError) {
        setError(
          profileError.message
        );
        setLoading(false);
        return;
      }

      const row =
        Array.isArray(data)
          ? data[0]
          : null;

      if (!row) {
        setError(
          "This CampusConnect profile is unavailable."
        );
        setLoading(false);
        return;
      }

      setProfile(
        row as PublicNetworkProfile
      );

      const [
        statsResult,
        mutualResult,
      ] = await Promise.all([
        client.rpc(
          "get_network_connection_stats",
          {
            target_user: userId,
          }
        ),

        client.rpc(
          "get_network_mutual_connections",
          {
            target_user: userId,
            result_limit: 6,
          }
        ),
      ]);

      if (!active) {
        return;
      }

      if (!statsResult.error) {
        const statsRow =
          Array.isArray(statsResult.data)
            ? statsResult.data[0]
            : null;

        if (statsRow) {
          setConnectionStats({
            connection_count:
              Number(
                statsRow.connection_count
              ) || 0,

            mutual_count:
              Number(
                statsRow.mutual_count
              ) || 0,
          });
        }
      }

      if (!mutualResult.error) {
        setMutualConnections(
          (
            mutualResult.data || []
          ) as NetworkMutualConnection[]
        );
      }

      setLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const onKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [onClose]);

  const skills =
    useMemo(
      () =>
        profile?.skills
          .split(",")
          .map(skill =>
            skill.trim()
          )
          .filter(Boolean) ||
        [],
      [profile]
    );

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="networkProfileScrim"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="networkProfileModal"
        role="dialog"
        aria-modal="true"
        aria-label="CampusConnect professional profile"
        onClick={event =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          className="networkProfileClose"
          onClick={onClose}
          aria-label="Close profile"
        >
          ×
        </button>

        {loading ? (
          <div className="networkProfileLoading">
            <div/>
            <b>
              Loading professional profile
            </b>
          </div>
        ) : error ? (
          <div className="networkProfileLoading">
            <span>!</span>
            <b>
              Profile unavailable
            </b>
            <p>{error}</p>
          </div>
        ) : profile ? (
          <>
            <div
              className={`networkProfileCover ${
                profile.cover_url
                  ? "hasImage"
                  : ""
              }`}
              style={
                profile.cover_url
                  ? {
                      backgroundImage:
                        `linear-gradient(180deg, rgba(13,35,63,.12), rgba(13,35,63,.5)), url("${profile.cover_url}")`,
                    }
                  : undefined
              }
            >
              <span>
                CAMPUSCONNECT
              </span>
            </div>

            <div className="networkProfileBody">
              <div className="networkProfileAvatarRow">
                <div className="networkProfileAvatar">
                  {profile.avatar_url ? (
                    <img
                      src={
                        profile.avatar_url
                      }
                      alt={`${profile.full_name} profile`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initials(
                      profile.full_name
                    )
                  )}
                </div>

                <span className="networkProfileVerified">
                  ✓ Verified
                </span>
              </div>

              <div className="networkProfileIdentity">
                <span>
                  {profile.role}
                </span>

                <h2>
                  {profile.full_name}
                </h2>

                {profile.headline && (
                  <strong className="networkProfileHeadline">
                    {profile.headline}
                  </strong>
                )}

                <p>
                  {profile.department ||
                    "CampusConnect member"}

                  {profile.graduation_year
                    ? ` · Class of ${profile.graduation_year}`
                    : ""}
                </p>

                <div className="networkProfileMeta">
                  {profile.location && (
                    <span>
                      ⌖ {profile.location}
                    </span>
                  )}

                  {profile.semester && (
                    <span>
                      Semester {profile.semester}
                    </span>
                  )}

                  {profile.cgpa !== null &&
                    profile.cgpa !== undefined && (
                      <span>
                        CGPA {profile.cgpa}
                      </span>
                    )}
                </div>

                {profile.campus_uid && (
                  <div className="networkProfileUid">
                    <small>
                      CAMPUSCONNECT ID
                    </small>

                    <b>
                      {
                        profile.campus_uid
                      }
                    </b>
                  </div>
                )}
              </div>

              <div className="networkProfileNetworkStats">
                <div>
                  <b>
                    {connectionStats.connection_count}
                  </b>

                  <span>
                    {connectionStats.connection_count === 1
                      ? "connection"
                      : "connections"}
                  </span>
                </div>

                {connectionStats.mutual_count > 0 && (
                  <>
                    <i/>

                    <div>
                      <b>
                        {connectionStats.mutual_count}
                      </b>

                      <span>
                        {connectionStats.mutual_count === 1
                          ? "mutual connection"
                          : "mutual connections"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="networkProfileActions">
                {connectionStatus === "accepted" ? (
                  <>
                    <button
                      type="button"
                      className="networkProfilePrimaryAction"
                      disabled={busy}
                      onClick={() =>
                        onMessage?.()
                      }
                    >
                      Message
                    </button>

                    <span className="networkProfileConnectedBadge">
                      ✓ Connected
                    </span>
                  </>
                ) : connectionStatus === "pending" &&
                  incomingRequest ? (
                  <>
                    <button
                      type="button"
                      className="networkProfilePrimaryAction"
                      disabled={busy}
                      onClick={() =>
                        void onAccept?.()
                      }
                    >
                      {busy ? "Working..." : "Accept"}
                    </button>

                    <button
                      type="button"
                      className="networkProfileSecondaryAction"
                      disabled={busy}
                      onClick={() =>
                        void onIgnore?.()
                      }
                    >
                      Ignore
                    </button>
                  </>
                ) : connectionStatus === "pending" ? (
                  <button
                    type="button"
                    className="networkProfilePendingAction"
                    disabled
                  >
                    ✓ Request sent
                  </button>
                ) : connectionStatus === "blocked" ? (
                  <button
                    type="button"
                    className="networkProfilePendingAction"
                    disabled
                  >
                    Connection unavailable
                  </button>
                ) : (
                  <button
                    type="button"
                    className="networkProfilePrimaryAction"
                    disabled={busy}
                    onClick={() =>
                      void onConnect?.()
                    }
                  >
                    {busy ? "Connecting..." : "+ Connect"}
                  </button>
                )}
              </div>

              {mutualConnections.length > 0 && (
                <section className="networkProfileSection networkProfileMutualSection">
                  <header>
                    <span>
                      MUTUAL CONNECTIONS
                    </span>

                    <h3>
                      People you both know
                    </h3>
                  </header>

                  <div className="networkProfileMutualList">
                    {mutualConnections.map(
                      person => (
                        <article
                          key={person.id}
                          className="networkProfileMutualPerson"
                        >
                          <div className="networkProfileMutualAvatar">
                            {person.avatar_url ? (
                              <img
                                src={person.avatar_url}
                                alt={`${person.full_name} profile`}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              initials(
                                person.full_name
                              )
                            )}
                          </div>

                          <div>
                            <b>
                              {person.full_name}
                            </b>

                            <span>
                              {person.department ||
                                "CampusConnect member"}
                            </span>

                            {person.campus_uid && (
                              <small>
                                {person.campus_uid}
                              </small>
                            )}
                          </div>
                        </article>
                      )
                    )}
                  </div>

                  {connectionStats.mutual_count >
                    mutualConnections.length && (
                    <small className="networkProfileMutualMore">
                      +
                      {connectionStats.mutual_count -
                        mutualConnections.length}{" "}
                      more mutual connection
                      {connectionStats.mutual_count -
                        mutualConnections.length ===
                      1
                        ? ""
                        : "s"}
                    </small>
                  )}
                </section>
              )}

              <section className="networkProfileSection">
                <header>
                  <span>ABOUT</span>
                  <h3>
                    Professional introduction
                  </h3>
                </header>

                <p>
                  {profile.bio ||
                    "No professional introduction has been added yet."}
                </p>
              </section>

              <section className="networkProfileSection">
                <header>
                  <span>
                    SKILLS & INTERESTS
                  </span>

                  <h3>
                    Professional strengths
                  </h3>
                </header>

                {skills.length ? (
                  <div className="networkProfileSkills">
                    {skills.map(
                      (
                        skill,
                        index
                      ) => (
                        <b
                          key={`${skill}-${index}`}
                        >
                          {skill}
                        </b>
                      )
                    )}
                  </div>
                ) : (
                  <p>
                    No skills have been added yet.
                  </p>
                )}
              </section>

              {profile.projects.length > 0 && (
                <section className="networkProfileSection">
                  <header>
                    <span>PROJECTS</span>

                    <h3>
                      Selected work
                    </h3>
                  </header>

                  <div className="networkProfileProjectGrid">
                    {profile.projects.map(
                      project => (
                        <article
                          className="networkProfileProject"
                          key={project.id}
                        >
                          <div className="networkProfileProjectTop">
                            <span>P</span>

                            <div>
                              <b>
                                {project.title}
                              </b>

                              {project.tech_stack && (
                                <small>
                                  {project.tech_stack}
                                </small>
                              )}
                            </div>
                          </div>

                          {project.description && (
                            <p>
                              {project.description}
                            </p>
                          )}

                          {(project.project_url ||
                            project.github_url) && (
                            <div className="networkProfileProjectLinks">
                              {project.project_url && (
                                <a
                                  href={project.project_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View project ↗
                                </a>
                              )}

                              {project.github_url && (
                                <a
                                  href={project.github_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  GitHub ↗
                                </a>
                              )}
                            </div>
                          )}
                        </article>
                      )
                    )}
                  </div>
                </section>
              )}

              {profile.achievements.length > 0 && (
                <section className="networkProfileSection">
                  <header>
                    <span>
                      ACHIEVEMENTS & CERTIFICATIONS
                    </span>

                    <h3>
                      Recognition
                    </h3>
                  </header>

                  <div className="networkProfileAchievementList">
                    {profile.achievements.map(
                      achievement => (
                        <article
                          className="networkProfileAchievement"
                          key={achievement.id}
                        >
                          <span>
                            {achievement.achievement_type ===
                            "Certification"
                              ? "C"
                              : "A"}
                          </span>

                          <div>
                            <b>
                              {achievement.title}
                            </b>

                            <small>
                              {[
                                achievement.issuer,
                                achievement.issued_at
                                  ? new Date(
                                      achievement.issued_at
                                    ).toLocaleDateString(
                                      undefined,
                                      {
                                        month: "short",
                                        year: "numeric",
                                      }
                                    )
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </small>

                            {achievement.description && (
                              <p>
                                {achievement.description}
                              </p>
                            )}

                            {achievement.credential_url && (
                              <a
                                href={
                                  achievement.credential_url
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                View credential ↗
                              </a>
                            )}
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </section>
              )}

              {(profile.linkedin_url ||
                profile.github_url ||
                profile.portfolio_url) && (
                <section className="networkProfileSection">
                  <header>
                    <span>PROFESSIONAL LINKS</span>

                    <h3>
                      Elsewhere on the web
                    </h3>
                  </header>

                  <div className="networkProfileExternalLinks">
                    {profile.linkedin_url && (
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>in</span>

                        <div>
                          <b>LinkedIn</b>
                          <small>
                            Professional profile
                          </small>
                        </div>

                        <strong>↗</strong>
                      </a>
                    )}

                    {profile.github_url && (
                      <a
                        href={profile.github_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>GH</span>

                        <div>
                          <b>GitHub</b>
                          <small>
                            Code and repositories
                          </small>
                        </div>

                        <strong>↗</strong>
                      </a>
                    )}

                    {profile.portfolio_url && (
                      <a
                        href={profile.portfolio_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>↗</span>

                        <div>
                          <b>Portfolio</b>
                          <small>
                            Projects and work
                          </small>
                        </div>

                        <strong>↗</strong>
                      </a>
                    )}
                  </div>
                </section>
              )}

              <div className="networkProfilePrivacy">
                <span>◇</span>

                <div>
                  <b>
                    Public CampusConnect profile
                  </b>

                  <p>
                    Private documents, phone numbers,
                    authentication data and account information
                    are not shown here.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>,
    document.body
  );
}
