"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {getSupabaseClient} from "../lib/supabase";


type ResumeProfile = {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  year?: string;
  bio?: string;
  skills?: string;
  role?: string;
};


type ResumeProject = {
  id: string;
  title: string;
  technologies: string;
  description: string;
  github_url: string;
  live_url: string;
};


type ResumeExperience = {
  id: string;
  title: string;
  company: string;
  duration: string;
  description: string;
  company_url: string;
};


type ResumeAchievement = {
  id: string;
  title: string;
  issuer: string;
  achievement_date: string;
  description: string;
  proof_url: string;
  file_path: string | null;
};


type ResumeCertification = {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  credential_id: string;
  credential_url: string;
  file_path: string | null;
};


type ResumeLink = {
  id: string;
  label: string;
  url: string;
};


type ResumeSection =
  | "Personal"
  | "Summary"
  | "Education"
  | "Experience"
  | "Projects"
  | "Skills"
  | "Achievements"
  | "Certifications"
  | "Links";


const EMPTY_PROJECT = {
  title: "",
  technologies: "",
  description: "",
  github_url: "",
  live_url: "",
};


const EMPTY_EXPERIENCE = {
  title: "",
  company: "",
  duration: "",
  description: "",
  company_url: "",
};


const EMPTY_ACHIEVEMENT = {
  title: "",
  issuer: "",
  achievement_date: "",
  description: "",
  proof_url: "",
};


const EMPTY_CERTIFICATION = {
  name: "",
  issuer: "",
  issue_date: "",
  credential_id: "",
  credential_url: "",
};


const normalizeUrl = (value: string) => {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
};


const safeOpen = (value: string) => {
  const url = normalizeUrl(value);

  if (!url) {
    return;
  }

  window.open(
    url,
    "_blank",
    "noopener,noreferrer"
  );
};


export function ResumeStudio({
  profile,
}: {
  profile: ResumeProfile;
}) {

  const [activeSection, setActiveSection] =
    useState<ResumeSection>(
      "Personal"
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const [template, setTemplate] =
    useState<
      "Modern" |
      "Classic" |
      "Minimal"
    >("Modern");


  const [resume, setResume] =
    useState({
      headline:
        profile.department
          ? `${profile.department} Engineering Student`
          : "Engineering Student",

      summary:
        profile.bio || "",

      phone:
        profile.phone || "",

      location:
        "Bengaluru, Karnataka",

      college:
        "RNS Institute of Technology",

      degree:
        profile.department
          ? `B.Tech · ${profile.department}`
          : "B.Tech",

      graduation_year:
        profile.year || "",

      cgpa: "",

      skills:
        profile.skills || "",

      linkedin_url: "",
      github_url: "",
      instagram_url: "",
      portfolio_url: "",
      leetcode_url: "",
    });


  const [projects, setProjects] =
    useState<ResumeProject[]>([]);

  const [experience, setExperience] =
    useState<ResumeExperience[]>([]);

  const [achievements, setAchievements] =
    useState<ResumeAchievement[]>([]);

  const [certifications, setCertifications] =
    useState<ResumeCertification[]>([]);

  const [customLinks, setCustomLinks] =
    useState<ResumeLink[]>([]);


  const [projectForm, setProjectForm] =
    useState(EMPTY_PROJECT);

  const [
    experienceForm,
    setExperienceForm,
  ] =
    useState(EMPTY_EXPERIENCE);

  const [
    achievementForm,
    setAchievementForm,
  ] =
    useState(EMPTY_ACHIEVEMENT);

  const [
    certificationForm,
    setCertificationForm,
  ] =
    useState(EMPTY_CERTIFICATION);

  const [customLinkForm, setCustomLinkForm] =
    useState({
      label: "",
      url: "",
    });


  const updateResume =
    (
      key: keyof typeof resume,
      value: string
    ) => {

      setResume(
        current => ({
          ...current,
          [key]: value,
        })
      );
    };


  const loadResume =
    async () => {

      const client =
        getSupabaseClient();

      if (!client) {
        setStatus(
          "CampusConnect is not connected to Supabase."
        );

        setLoading(false);

        return;
      }


      setLoading(true);

      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        setLoading(false);
        return;
      }


      const userId =
        auth.user.id;


      const [
        resumeResult,
        projectsResult,
        experienceResult,
        achievementsResult,
        certificationsResult,
        linksResult,
      ] =
        await Promise.all([

          client
            .from(
              "student_resumes"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            )
            .maybeSingle(),

          client
            .from(
              "resume_projects"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            )
            .order(
              "display_order"
            ),

          client
            .from(
              "resume_experience"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            )
            .order(
              "display_order"
            ),

          client
            .from(
              "resume_achievements"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            )
            .order(
              "display_order"
            ),

          client
            .from(
              "resume_certifications"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            )
            .order(
              "display_order"
            ),

          client
            .from(
              "resume_custom_links"
            )
            .select("*")
            .eq(
              "user_id",
              userId
            )
            .order(
              "display_order"
            ),
        ]);


      if (
        resumeResult.data
      ) {

        const row =
          resumeResult.data;

        setResume({
          headline:
            row.headline || "",

          summary:
            row.summary || "",

          phone:
            row.phone ||
            profile.phone ||
            "",

          location:
            row.location || "",

          college:
            row.college ||
            "RNS Institute of Technology",

          degree:
            row.degree || "",

          graduation_year:
            row.graduation_year ||
            profile.year ||
            "",

          cgpa:
            row.cgpa || "",

          skills:
            row.skills ||
            profile.skills ||
            "",

          linkedin_url:
            row.linkedin_url || "",

          github_url:
            row.github_url || "",

          instagram_url:
            row.instagram_url || "",

          portfolio_url:
            row.portfolio_url || "",

          leetcode_url:
            row.leetcode_url || "",
        });


        if (
          ["Modern","Classic","Minimal"]
            .includes(
              row.template
            )
        ) {
          setTemplate(
            row.template
          );
        }
      }


      setProjects(
        (
          projectsResult.data ||
          []
        ) as ResumeProject[]
      );

      setExperience(
        (
          experienceResult.data ||
          []
        ) as ResumeExperience[]
      );

      setAchievements(
        (
          achievementsResult.data ||
          []
        ) as ResumeAchievement[]
      );

      setCertifications(
        (
          certificationsResult.data ||
          []
        ) as ResumeCertification[]
      );

      setCustomLinks(
        (
          linksResult.data ||
          []
        ) as ResumeLink[]
      );


      setLoading(false);
    };


  useEffect(
    () => {
      void loadResume();
    },
    []
  );


  const saveResume =
    async () => {

      const client =
        getSupabaseClient();

      if (!client) {
        setStatus(
          "CampusConnect is not connected to Supabase."
        );
        return;
      }


      setSaving(true);
      setStatus("");


      try {

        const {
          data: auth,
          error: authError,
        } =
          await client.auth
            .getUser();


        if (
          authError ||
          !auth.user
        ) {
          setStatus(
            "Your session has expired. Please sign in again."
          );
          return;
        }


        const payload = {
          user_id:
            auth.user.id,

          headline:
            resume.headline,

          summary:
            resume.summary,

          phone:
            resume.phone,

          location:
            resume.location,

          college:
            resume.college,

          degree:
            resume.degree,

          graduation_year:
            resume.graduation_year,

          cgpa:
            resume.cgpa,

          skills:
            resume.skills,

          linkedin_url:
            resume.linkedin_url,

          github_url:
            resume.github_url,

          instagram_url:
            resume.instagram_url,

          portfolio_url:
            resume.portfolio_url,

          leetcode_url:
            resume.leetcode_url,

          template,

          updated_at:
            new Date()
              .toISOString(),
        };


        const {
          data: savedRow,
          error: saveError,
        } =
          await client
            .from(
              "student_resumes"
            )
            .upsert(
              payload,
              {
                onConflict:
                  "user_id",
              }
            )
            .select("*")
            .single();


        if (
          saveError ||
          !savedRow
        ) {
          console.error(
            "[Resume Studio] Save failed:",
            saveError
          );

          setStatus(
            saveError?.message ||
            "Resume could not be saved."
          );

          return;
        }


        /*
         * IMPORTANT:
         * Use the exact row returned by Supabase.
         * This guarantees the UI reflects persisted data,
         * not only temporary React state.
         */
        setResume({
          headline:
            savedRow.headline ||
            "",

          summary:
            savedRow.summary ||
            "",

          phone:
            savedRow.phone ||
            "",

          location:
            savedRow.location ||
            "",

          college:
            savedRow.college ||
            "",

          degree:
            savedRow.degree ||
            "",

          graduation_year:
            savedRow.graduation_year ||
            "",

          cgpa:
            savedRow.cgpa ||
            "",

          skills:
            savedRow.skills ||
            "",

          linkedin_url:
            savedRow.linkedin_url ||
            "",

          github_url:
            savedRow.github_url ||
            "",

          instagram_url:
            savedRow.instagram_url ||
            "",

          portfolio_url:
            savedRow.portfolio_url ||
            "",

          leetcode_url:
            savedRow.leetcode_url ||
            "",
        });


        if (
          savedRow.template ===
            "Modern" ||
          savedRow.template ===
            "Classic" ||
          savedRow.template ===
            "Minimal"
        ) {
          setTemplate(
            savedRow.template
          );
        }


        /*
         * Read the row back once.
         * If the write somehow was not persisted,
         * Save Resume must not falsely report success.
         */
        const {
          data: verifiedRow,
          error: verifyError,
        } =
          await client
            .from(
              "student_resumes"
            )
            .select(
              "id,user_id,updated_at"
            )
            .eq(
              "user_id",
              auth.user.id
            )
            .single();


        if (
          verifyError ||
          !verifiedRow
        ) {
          console.error(
            "[Resume Studio] Save verification failed:",
            verifyError
          );

          setStatus(
            "Resume was submitted but could not be verified. Please try again."
          );

          return;
        }


        setStatus(
          "Resume saved successfully."
        );

      } catch (error) {

        console.error(
          "[Resume Studio] Unexpected save error:",
          error
        );

        setStatus(
          "Unable to save your resume right now."
        );

      } finally {

        setSaving(false);

      }
    };


  const addProject =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();

      if (
        !projectForm.title.trim()
      ) {
        return;
      }


      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        return;
      }


      const {
        data,
        error,
      } =
        await client
          .from(
            "resume_projects"
          )
          .insert({
            user_id:
              auth.user.id,

            ...projectForm,

            display_order:
              projects.length,
          })
          .select()
          .single();


      if (error) {
        return setStatus(
          error.message
        );
      }


      setProjects(
        current => [
          ...current,
          data as ResumeProject,
        ]
      );

      setProjectForm(
        EMPTY_PROJECT
      );
    };


  const addExperience =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();

      if (
        !experienceForm.title.trim()
      ) {
        return;
      }


      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        return;
      }


      const {
        data,
        error,
      } =
        await client
          .from(
            "resume_experience"
          )
          .insert({
            user_id:
              auth.user.id,

            ...experienceForm,

            display_order:
              experience.length,
          })
          .select()
          .single();


      if (error) {
        return setStatus(
          error.message
        );
      }


      setExperience(
        current => [
          ...current,
          data as ResumeExperience,
        ]
      );

      setExperienceForm(
        EMPTY_EXPERIENCE
      );
    };


  const uploadResumeProof =
    async (
      file: File,
      folder: string
    ) => {

      const client =
        getSupabaseClient();

      if (!client) {
        throw new Error(
          "Supabase is unavailable."
        );
      }


      if (
        file.size >
        5 * 1024 * 1024
      ) {
        throw new Error(
          "File must be smaller than 5 MB."
        );
      }


      const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];


      if (
        !allowed.includes(
          file.type
        )
      ) {
        throw new Error(
          "Use PDF, JPG, PNG or WebP."
        );
      }


      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        throw new Error(
          "Sign in again."
        );
      }


      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "pdf";


      const path =
        `${auth.user.id}/resume/${folder}/` +
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;


      const {
        error,
      } =
        await client.storage
          .from(
            "campus-documents"
          )
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                file.type,
            }
          );


      if (error) {
        throw error;
      }


      return path;
    };


  const openPrivateFile =
    async (
      path:
        string | null
    ) => {

      if (!path) {
        return;
      }


      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      const {
        data,
        error,
      } =
        await client.storage
          .from(
            "campus-documents"
          )
          .createSignedUrl(
            path,
            60 * 10
          );


      if (error) {
        return setStatus(
          error.message
        );
      }


      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    };


  const addAchievement =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();

      if (
        !achievementForm.title
          .trim()
      ) {
        return;
      }


      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        return;
      }


      const {
        data,
        error,
      } =
        await client
          .from(
            "resume_achievements"
          )
          .insert({
            user_id:
              auth.user.id,

            ...achievementForm,

            display_order:
              achievements.length,
          })
          .select()
          .single();


      if (error) {
        return setStatus(
          error.message
        );
      }


      setAchievements(
        current => [
          ...current,
          data as ResumeAchievement,
        ]
      );


      setAchievementForm(
        EMPTY_ACHIEVEMENT
      );
    };


  const addCertification =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();

      if (
        !certificationForm.name
          .trim()
      ) {
        return;
      }


      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        return;
      }


      const {
        data,
        error,
      } =
        await client
          .from(
            "resume_certifications"
          )
          .insert({
            user_id:
              auth.user.id,

            ...certificationForm,

            display_order:
              certifications.length,
          })
          .select()
          .single();


      if (error) {
        return setStatus(
          error.message
        );
      }


      setCertifications(
        current => [
          ...current,
          data as ResumeCertification,
        ]
      );


      setCertificationForm(
        EMPTY_CERTIFICATION
      );
    };


  const attachAchievementFile =
    async (
      item:
        ResumeAchievement,
      file: File
    ) => {

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      setUploading(true);


      try {

        const path =
          await uploadResumeProof(
            file,
            "achievements"
          );


        const {
          error,
        } =
          await client
            .from(
              "resume_achievements"
            )
            .update({
              file_path:
                path,

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              item.id
            );


        if (error) {
          throw error;
        }


        setAchievements(
          current =>
            current.map(
              row =>
                row.id ===
                item.id
                  ? {
                      ...row,
                      file_path:
                        path,
                    }
                  : row
            )
        );


        setStatus(
          "Achievement proof uploaded."
        );

      } catch (error) {

        setStatus(
          error instanceof Error
            ? error.message
            : "Upload failed."
        );

      } finally {

        setUploading(false);
      }
    };


  const attachCertificateFile =
    async (
      item:
        ResumeCertification,
      file: File
    ) => {

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      setUploading(true);


      try {

        const path =
          await uploadResumeProof(
            file,
            "certificates"
          );


        const {
          error,
        } =
          await client
            .from(
              "resume_certifications"
            )
            .update({
              file_path:
                path,

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              item.id
            );


        if (error) {
          throw error;
        }


        setCertifications(
          current =>
            current.map(
              row =>
                row.id ===
                item.id
                  ? {
                      ...row,
                      file_path:
                        path,
                    }
                  : row
            )
        );


        setStatus(
          "Certificate uploaded."
        );

      } catch (error) {

        setStatus(
          error instanceof Error
            ? error.message
            : "Upload failed."
        );

      } finally {

        setUploading(false);
      }
    };


  const addCustomLink =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();


      if (
        !customLinkForm.label.trim() ||
        !customLinkForm.url.trim()
      ) {
        return;
      }


      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      const {
        data: auth,
      } =
        await client.auth
          .getUser();

      if (!auth.user) {
        return;
      }


      const {
        data,
        error,
      } =
        await client
          .from(
            "resume_custom_links"
          )
          .insert({
            user_id:
              auth.user.id,

            label:
              customLinkForm.label
                .trim(),

            url:
              normalizeUrl(
                customLinkForm.url
              ),

            display_order:
              customLinks.length,
          })
          .select()
          .single();


      if (error) {
        return setStatus(
          error.message
        );
      }


      setCustomLinks(
        current => [
          ...current,
          data as ResumeLink,
        ]
      );


      setCustomLinkForm({
        label: "",
        url: "",
      });
    };


  const deleteRow =
    async (
      table: string,
      id: string,
      setter:
        React.Dispatch<
          React.SetStateAction<any[]>
        >
    ) => {

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      const {
        error,
      } =
        await client
          .from(table)
          .delete()
          .eq(
            "id",
            id
          );


      if (error) {
        return setStatus(
          error.message
        );
      }


      setter(
        current =>
          current.filter(
            row =>
              row.id !== id
          )
      );
    };


  const atsScore =
    useMemo(
      () => {

        let total = 0;

        if (
          profile.name &&
          profile.email &&
          resume.phone
        ) {
          total += 12;
        }

        if (
          resume.headline.length >= 8
        ) {
          total += 6;
        }

        if (
          resume.summary.length >= 70
        ) {
          total += 12;
        }

        if (
          resume.degree &&
          resume.graduation_year
        ) {
          total += 10;
        }

        if (
          resume.cgpa
        ) {
          total += 4;
        }

        const skillCount =
          resume.skills
            .split(",")
            .map(
              value =>
                value.trim()
            )
            .filter(Boolean)
            .length;

        total +=
          Math.min(
            12,
            skillCount * 2
          );

        total +=
          Math.min(
            18,
            projects.length * 9
          );

        total +=
          Math.min(
            8,
            experience.length * 8
          );

        total +=
          Math.min(
            8,
            certifications.length * 4
          );

        total +=
          Math.min(
            5,
            achievements.length * 3
          );

        if (
          resume.linkedin_url
        ) {
          total += 2;
        }

        if (
          resume.github_url
        ) {
          total += 3;
        }

        return Math.min(
          100,
          total
        );

      },
      [
        profile,
        resume,
        projects,
        experience,
        achievements,
        certifications,
      ]
    );


  const sectionState: Record<
    ResumeSection,
    boolean
  > = {
    Personal:
      Boolean(
        profile.name &&
        profile.email &&
        resume.phone
      ),

    Summary:
      resume.summary.length >= 70,

    Education:
      Boolean(
        resume.degree &&
        resume.graduation_year
      ),

    Experience:
      experience.length > 0,

    Projects:
      projects.length > 0,

    Skills:
      Boolean(
        resume.skills.trim()
      ),

    Achievements:
      achievements.length > 0,

    Certifications:
      certifications.length > 0,

    Links:
      Boolean(
        resume.linkedin_url ||
        resume.github_url ||
        resume.portfolio_url ||
        customLinks.length
      ),
  };


  if (loading) {
    return (
      <div className="resumeWorkspace">
        <div className="resumeLoading">
          Loading Resume Studio...
        </div>
      </div>
    );
  }


  const sections =
    Object.keys(
      sectionState
    ) as ResumeSection[];


  return (
    <div className="resumeWorkspace">

      <section className="resumeHero">

        <div>
          <span>
            CAMPUSCONNECT RESUME STUDIO
          </span>

          <h1>
            Build a resume recruiters can actually use.
          </h1>

          <p>
            Create your placement-ready profile, attach verified
            achievements, showcase real projects and keep every
            professional link in one live resume.
          </p>

          <div className="resumeHeroMeta">
            <b>
              ATS {atsScore}/100
            </b>

            <b>
              {projects.length} projects
            </b>

            <b>
              {certifications.length} certifications
            </b>

            <b>
              Auto saved to cloud
            </b>
          </div>
        </div>


        <div className="resumeHeroScore">

          <small>
            ATS READINESS
          </small>

          <strong>
            {atsScore}
          </strong>

          <span>
            /100
          </span>

          <div>
            <i
              style={{
                width:
                  `${atsScore}%`,
              }}
            />
          </div>

          <p>
            Score is calculated from actual resume content,
            projects, skills, links and achievements.
          </p>

        </div>

      </section>


      {status && (
        <div className="resumeStatus">
          {status}
        </div>
      )}


      <section className="resumeStudioLayout">

        <aside className="resumeStudioSidebar">

          <div className="resumeSidebarHeading">
            <span>
              RESUME SECTIONS
            </span>

            <h2>
              Build your profile
            </h2>
          </div>


          <nav className="resumeSectionNav">

            {sections.map(
              section => (

                <button
                  key={
                    section
                  }
                  type="button"
                  className={
                    activeSection ===
                    section
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveSection(
                      section
                    )
                  }
                >

                  <i
                    className={
                      sectionState[
                        section
                      ]
                        ? "complete"
                        : ""
                    }
                  >
                    {
                      sectionState[
                        section
                      ]
                        ? "✓"
                        : "○"
                    }
                  </i>

                  <span>
                    {section}
                  </span>

                </button>

              )
            )}

          </nav>


          <section className="resumeTemplateBox">

            <small>
              TEMPLATE
            </small>

            <div>

              {[
                "Modern",
                "Classic",
                "Minimal",
              ].map(
                item => (

                  <button
                    type="button"
                    key={
                      item
                    }
                    className={
                      template ===
                      item
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setTemplate(
                        item as
                          | "Modern"
                          | "Classic"
                          | "Minimal"
                      )
                    }
                  >
                    {item}
                  </button>

                )
              )}

            </div>

          </section>


          <button
            type="button"
            className="resumeSaveButton"
            disabled={
              saving
            }
            onClick={() =>
              void saveResume()
            }
          >
            {
              saving
                ? "Saving..."
                : "Save resume"
            }
          </button>

        </aside>


        <main className="resumeStudioEditor">

          <section className="resumeEditorCard">

            <header className="resumeEditorHeading">

              <span>
                EDITOR
              </span>

              <h2>
                {activeSection}
              </h2>

              <p>
                Changes appear instantly in the resume preview.
              </p>

            </header>


            {activeSection ===
              "Personal" && (

              <div className="resumeEditorGrid">

                <label>
                  <span>
                    Full name
                  </span>

                  <input
                    value={
                      profile.name ||
                      ""
                    }
                    disabled
                  />
                </label>


                <label>
                  <span>
                    Email
                  </span>

                  <input
                    value={
                      profile.email ||
                      ""
                    }
                    disabled
                  />
                </label>


                <label>
                  <span>
                    Phone
                  </span>

                  <input
                    value={
                      resume.phone
                    }
                    onChange={
                      event =>
                        updateResume(
                          "phone",
                          event.target.value
                        )
                    }
                  />
                </label>


                <label>
                  <span>
                    Location
                  </span>

                  <input
                    value={
                      resume.location
                    }
                    onChange={
                      event =>
                        updateResume(
                          "location",
                          event.target.value
                        )
                    }
                  />
                </label>


                <label className="resumeFieldFull">
                  <span>
                    Professional headline
                  </span>

                  <input
                    value={
                      resume.headline
                    }
                    onChange={
                      event =>
                        updateResume(
                          "headline",
                          event.target.value
                        )
                    }
                    placeholder="ECE student · Embedded Systems · IoT"
                  />
                </label>

              </div>

            )}


            {activeSection ===
              "Summary" && (

              <label className="resumeLongField">

                <span>
                  Professional summary
                </span>

                <textarea
                  value={
                    resume.summary
                  }
                  onChange={
                    event =>
                      updateResume(
                        "summary",
                        event.target.value
                      )
                  }
                  placeholder="Write 3–4 lines about your engineering interests, strengths, projects and career direction..."
                />

                <small>
                  {
                    resume.summary
                      .length
                  } characters
                </small>

              </label>

            )}


            {activeSection ===
              "Education" && (

              <div className="resumeEditorGrid">

                <label className="resumeFieldFull">
                  <span>
                    College
                  </span>

                  <input
                    value={
                      resume.college
                    }
                    onChange={
                      event =>
                        updateResume(
                          "college",
                          event.target.value
                        )
                    }
                  />
                </label>


                <label>
                  <span>
                    Degree
                  </span>

                  <input
                    value={
                      resume.degree
                    }
                    onChange={
                      event =>
                        updateResume(
                          "degree",
                          event.target.value
                        )
                    }
                  />
                </label>


                <label>
                  <span>
                    Graduation year
                  </span>

                  <input
                    value={
                      resume.graduation_year
                    }
                    onChange={
                      event =>
                        updateResume(
                          "graduation_year",
                          event.target.value
                        )
                    }
                  />
                </label>


                <label>
                  <span>
                    CGPA
                  </span>

                  <input
                    value={
                      resume.cgpa
                    }
                    onChange={
                      event =>
                        updateResume(
                          "cgpa",
                          event.target.value
                        )
                    }
                    placeholder="8.6 / 10"
                  />
                </label>

              </div>

            )}


            {activeSection ===
              "Skills" && (

              <label className="resumeLongField">

                <span>
                  Skills
                </span>

                <textarea
                  value={
                    resume.skills
                  }
                  onChange={
                    event =>
                      updateResume(
                        "skills",
                        event.target.value
                      )
                  }
                  placeholder="Java, Python, React, FastAPI, SQL, Embedded Systems, ESP32..."
                />

                <small>
                  Separate skills using commas.
                </small>

              </label>

            )}


            {activeSection ===
              "Projects" && (

              <>

                <form
                  className="resumeDynamicForm"
                  onSubmit={
                    addProject
                  }
                >

                  <div className="resumeEditorGrid">

                    <label>
                      <span>
                        Project title
                      </span>

                      <input
                        value={
                          projectForm.title
                        }
                        onChange={
                          event =>
                            setProjectForm({
                              ...projectForm,
                              title:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Technologies
                      </span>

                      <input
                        value={
                          projectForm.technologies
                        }
                        onChange={
                          event =>
                            setProjectForm({
                              ...projectForm,
                              technologies:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        GitHub repository
                      </span>

                      <input
                        value={
                          projectForm.github_url
                        }
                        onChange={
                          event =>
                            setProjectForm({
                              ...projectForm,
                              github_url:
                                event.target.value,
                            })
                        }
                        placeholder="github.com/..."
                      />
                    </label>


                    <label>
                      <span>
                        Live project
                      </span>

                      <input
                        value={
                          projectForm.live_url
                        }
                        onChange={
                          event =>
                            setProjectForm({
                              ...projectForm,
                              live_url:
                                event.target.value,
                            })
                        }
                        placeholder="https://..."
                      />
                    </label>


                    <label className="resumeFieldFull">
                      <span>
                        Impact / description
                      </span>

                      <textarea
                        value={
                          projectForm.description
                        }
                        onChange={
                          event =>
                            setProjectForm({
                              ...projectForm,
                              description:
                                event.target.value,
                            })
                        }
                      />
                    </label>

                  </div>


                  <button className="resumeAddButton">
                    + Add project
                  </button>

                </form>


                <ResumeRecords>

                  {projects.map(
                    item => (

                      <ResumeRecord
                        key={
                          item.id
                        }
                        title={
                          item.title
                        }
                        meta={
                          item.technologies
                        }
                        text={
                          item.description
                        }
                        onDelete={() =>
                          void deleteRow(
                            "resume_projects",
                            item.id,
                            setProjects
                          )
                        }
                      >

                        {item.github_url && (
                          <button
                            type="button"
                            onClick={() =>
                              safeOpen(
                                item.github_url
                              )
                            }
                          >
                            GitHub ↗
                          </button>
                        )}


                        {item.live_url && (
                          <button
                            type="button"
                            onClick={() =>
                              safeOpen(
                                item.live_url
                              )
                            }
                          >
                            Live demo ↗
                          </button>
                        )}

                      </ResumeRecord>

                    )
                  )}

                </ResumeRecords>

              </>

            )}


            {activeSection ===
              "Experience" && (

              <>

                <form
                  className="resumeDynamicForm"
                  onSubmit={
                    addExperience
                  }
                >

                  <div className="resumeEditorGrid">

                    <label>
                      <span>
                        Role
                      </span>

                      <input
                        value={
                          experienceForm.title
                        }
                        onChange={
                          event =>
                            setExperienceForm({
                              ...experienceForm,
                              title:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Company / organisation
                      </span>

                      <input
                        value={
                          experienceForm.company
                        }
                        onChange={
                          event =>
                            setExperienceForm({
                              ...experienceForm,
                              company:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Duration
                      </span>

                      <input
                        value={
                          experienceForm.duration
                        }
                        onChange={
                          event =>
                            setExperienceForm({
                              ...experienceForm,
                              duration:
                                event.target.value,
                            })
                        }
                        placeholder="Jun 2026 – Aug 2026"
                      />
                    </label>


                    <label>
                      <span>
                        Organisation link
                      </span>

                      <input
                        value={
                          experienceForm.company_url
                        }
                        onChange={
                          event =>
                            setExperienceForm({
                              ...experienceForm,
                              company_url:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label className="resumeFieldFull">
                      <span>
                        Description
                      </span>

                      <textarea
                        value={
                          experienceForm.description
                        }
                        onChange={
                          event =>
                            setExperienceForm({
                              ...experienceForm,
                              description:
                                event.target.value,
                            })
                        }
                      />
                    </label>

                  </div>


                  <button className="resumeAddButton">
                    + Add experience
                  </button>

                </form>


                <ResumeRecords>

                  {experience.map(
                    item => (

                      <ResumeRecord
                        key={
                          item.id
                        }
                        title={
                          item.title
                        }
                        meta={
                          `${item.company} · ${item.duration}`
                        }
                        text={
                          item.description
                        }
                        onDelete={() =>
                          void deleteRow(
                            "resume_experience",
                            item.id,
                            setExperience
                          )
                        }
                      >

                        {item.company_url && (
                          <button
                            type="button"
                            onClick={() =>
                              safeOpen(
                                item.company_url
                              )
                            }
                          >
                            Organisation ↗
                          </button>
                        )}

                      </ResumeRecord>

                    )
                  )}

                </ResumeRecords>

              </>

            )}


            {activeSection ===
              "Achievements" && (

              <>

                <form
                  className="resumeDynamicForm"
                  onSubmit={
                    addAchievement
                  }
                >

                  <div className="resumeEditorGrid">

                    <label>
                      <span>
                        Achievement
                      </span>

                      <input
                        value={
                          achievementForm.title
                        }
                        onChange={
                          event =>
                            setAchievementForm({
                              ...achievementForm,
                              title:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Organisation
                      </span>

                      <input
                        value={
                          achievementForm.issuer
                        }
                        onChange={
                          event =>
                            setAchievementForm({
                              ...achievementForm,
                              issuer:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Date
                      </span>

                      <input
                        type="month"
                        value={
                          achievementForm.achievement_date
                        }
                        onChange={
                          event =>
                            setAchievementForm({
                              ...achievementForm,
                              achievement_date:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Proof link
                      </span>

                      <input
                        value={
                          achievementForm.proof_url
                        }
                        onChange={
                          event =>
                            setAchievementForm({
                              ...achievementForm,
                              proof_url:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label className="resumeFieldFull">
                      <span>
                        Description
                      </span>

                      <textarea
                        value={
                          achievementForm.description
                        }
                        onChange={
                          event =>
                            setAchievementForm({
                              ...achievementForm,
                              description:
                                event.target.value,
                            })
                        }
                      />
                    </label>

                  </div>


                  <button className="resumeAddButton">
                    + Add achievement
                  </button>

                </form>


                <ResumeRecords>

                  {achievements.map(
                    item => (

                      <ResumeRecord
                        key={
                          item.id
                        }
                        title={
                          item.title
                        }
                        meta={
                          item.issuer
                        }
                        text={
                          item.description
                        }
                        onDelete={() =>
                          void deleteRow(
                            "resume_achievements",
                            item.id,
                            setAchievements
                          )
                        }
                      >

                        {item.proof_url && (
                          <button
                            type="button"
                            onClick={() =>
                              safeOpen(
                                item.proof_url
                              )
                            }
                          >
                            Proof link ↗
                          </button>
                        )}


                        {item.file_path && (
                          <button
                            type="button"
                            onClick={() =>
                              void openPrivateFile(
                                item.file_path
                              )
                            }
                          >
                            View proof
                          </button>
                        )}


                        <label className="resumeUploadSmall">

                          {
                            uploading
                              ? "Uploading..."
                              : item.file_path
                              ? "Replace file"
                              : "Upload proof"
                          }

                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={
                              event => {

                                const file =
                                  event.target
                                    .files?.[0];

                                if (file) {
                                  void attachAchievementFile(
                                    item,
                                    file
                                  );
                                }
                              }
                            }
                          />

                        </label>

                      </ResumeRecord>

                    )
                  )}

                </ResumeRecords>

              </>

            )}


            {activeSection ===
              "Certifications" && (

              <>

                <form
                  className="resumeDynamicForm"
                  onSubmit={
                    addCertification
                  }
                >

                  <div className="resumeEditorGrid">

                    <label>
                      <span>
                        Certification
                      </span>

                      <input
                        value={
                          certificationForm.name
                        }
                        onChange={
                          event =>
                            setCertificationForm({
                              ...certificationForm,
                              name:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Issuer
                      </span>

                      <input
                        value={
                          certificationForm.issuer
                        }
                        onChange={
                          event =>
                            setCertificationForm({
                              ...certificationForm,
                              issuer:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Issue date
                      </span>

                      <input
                        type="month"
                        value={
                          certificationForm.issue_date
                        }
                        onChange={
                          event =>
                            setCertificationForm({
                              ...certificationForm,
                              issue_date:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label>
                      <span>
                        Credential ID
                      </span>

                      <input
                        value={
                          certificationForm.credential_id
                        }
                        onChange={
                          event =>
                            setCertificationForm({
                              ...certificationForm,
                              credential_id:
                                event.target.value,
                            })
                        }
                      />
                    </label>


                    <label className="resumeFieldFull">
                      <span>
                        Verification link
                      </span>

                      <input
                        value={
                          certificationForm.credential_url
                        }
                        onChange={
                          event =>
                            setCertificationForm({
                              ...certificationForm,
                              credential_url:
                                event.target.value,
                            })
                        }
                        placeholder="https://..."
                      />
                    </label>

                  </div>


                  <button className="resumeAddButton">
                    + Add certification
                  </button>

                </form>


                <ResumeRecords>

                  {certifications.map(
                    item => (

                      <ResumeRecord
                        key={
                          item.id
                        }
                        title={
                          item.name
                        }
                        meta={
                          item.issuer
                        }
                        text={
                          item.credential_id
                            ? `Credential ID: ${item.credential_id}`
                            : ""
                        }
                        onDelete={() =>
                          void deleteRow(
                            "resume_certifications",
                            item.id,
                            setCertifications
                          )
                        }
                      >

                        {item.credential_url && (
                          <button
                            type="button"
                            onClick={() =>
                              safeOpen(
                                item.credential_url
                              )
                            }
                          >
                            Verify ↗
                          </button>
                        )}


                        {item.file_path && (
                          <button
                            type="button"
                            onClick={() =>
                              void openPrivateFile(
                                item.file_path
                              )
                            }
                          >
                            View certificate
                          </button>
                        )}


                        <label className="resumeUploadSmall">

                          {
                            item.file_path
                              ? "Replace certificate"
                              : "Upload certificate"
                          }

                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={
                              event => {

                                const file =
                                  event.target
                                    .files?.[0];

                                if (file) {
                                  void attachCertificateFile(
                                    item,
                                    file
                                  );
                                }
                              }
                            }
                          />

                        </label>

                      </ResumeRecord>

                    )
                  )}

                </ResumeRecords>

              </>

            )}


            {activeSection ===
              "Links" && (

              <>

                <div className="resumeEditorGrid">

                  <ResumeLinkInput
                    label="LinkedIn"
                    value={
                      resume.linkedin_url
                    }
                    placeholder="linkedin.com/in/..."
                    onChange={
                      value =>
                        updateResume(
                          "linkedin_url",
                          value
                        )
                    }
                  />


                  <ResumeLinkInput
                    label="GitHub"
                    value={
                      resume.github_url
                    }
                    placeholder="github.com/..."
                    onChange={
                      value =>
                        updateResume(
                          "github_url",
                          value
                        )
                    }
                  />


                  <ResumeLinkInput
                    label="Instagram"
                    value={
                      resume.instagram_url
                    }
                    placeholder="instagram.com/..."
                    onChange={
                      value =>
                        updateResume(
                          "instagram_url",
                          value
                        )
                    }
                  />


                  <ResumeLinkInput
                    label="Portfolio"
                    value={
                      resume.portfolio_url
                    }
                    placeholder="yourportfolio.com"
                    onChange={
                      value =>
                        updateResume(
                          "portfolio_url",
                          value
                        )
                    }
                  />


                  <ResumeLinkInput
                    label="LeetCode"
                    value={
                      resume.leetcode_url
                    }
                    placeholder="leetcode.com/u/..."
                    onChange={
                      value =>
                        updateResume(
                          "leetcode_url",
                          value
                        )
                    }
                  />

                </div>


                <section className="resumeCustomLinks">

                  <header>
                    <span>
                      CUSTOM LINKS
                    </span>

                    <h3>
                      Add anything relevant
                    </h3>
                  </header>


                  <form
                    onSubmit={
                      addCustomLink
                    }
                  >

                    <input
                      placeholder="Label — HackerRank"
                      value={
                        customLinkForm.label
                      }
                      onChange={
                        event =>
                          setCustomLinkForm({
                            ...customLinkForm,
                            label:
                              event.target.value,
                          })
                      }
                    />

                    <input
                      placeholder="https://..."
                      value={
                        customLinkForm.url
                      }
                      onChange={
                        event =>
                          setCustomLinkForm({
                            ...customLinkForm,
                            url:
                              event.target.value,
                          })
                      }
                    />

                    <button>
                      + Add
                    </button>

                  </form>


                  {customLinks.map(
                    item => (

                      <div
                        className="resumeCustomLinkRow"
                        key={
                          item.id
                        }
                      >

                        <button
                          type="button"
                          onClick={() =>
                            safeOpen(
                              item.url
                            )
                          }
                        >
                          <strong>
                            {item.label}
                          </strong>

                          <span>
                            {
                              item.url
                            }
                          </span>
                        </button>


                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            void deleteRow(
                              "resume_custom_links",
                              item.id,
                              setCustomLinks
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    )
                  )}

                </section>

              </>

            )}

          </section>

        </main>


        <aside className="resumePreviewColumn">

          <header className="resumePreviewHeader">

            <div>
              <span>
                LIVE DOCUMENT
              </span>

              <h2>
                Resume preview
              </h2>
            </div>


            <button
              type="button"
              onClick={() =>
                window.print()
              }
            >
              Export PDF
            </button>

          </header>


          <article
            className={
              `resumePaper resume${template}`
            }
          >

            <header className="resumePaperHeader">

              <div>
                <h1>
                  {
                    profile.name ||
                    "Your Name"
                  }
                </h1>

                <h2>
                  {
                    resume.headline
                  }
                </h2>
              </div>


              <div className="resumeContact">

                {profile.email && (
                  <button
                    type="button"
                    onClick={() =>
                      window.location.href =
                        `mailto:${profile.email}`
                    }
                  >
                    {
                      profile.email
                    }
                  </button>
                )}


                {resume.phone && (
                  <a
                    href={
                      `tel:${resume.phone}`
                    }
                  >
                    {
                      resume.phone
                    }
                  </a>
                )}


                <span>
                  {
                    resume.location
                  }
                </span>

              </div>

            </header>


            <div className="resumeSocialLine">

              {[
                [
                  "LinkedIn",
                  resume.linkedin_url,
                ],
                [
                  "GitHub",
                  resume.github_url,
                ],
                [
                  "Portfolio",
                  resume.portfolio_url,
                ],
                [
                  "LeetCode",
                  resume.leetcode_url,
                ],
              ]
                .filter(
                  item =>
                    item[1]
                )
                .map(
                  item => (
                    <button
                      type="button"
                      key={
                        item[0]
                      }
                      onClick={() =>
                        safeOpen(
                          item[1]
                        )
                      }
                    >
                      {item[0]}
                    </button>
                  )
                )}

            </div>


            {resume.summary && (
              <ResumePreviewSection
                title="Profile"
              >
                <p>
                  {
                    resume.summary
                  }
                </p>
              </ResumePreviewSection>
            )}


            <ResumePreviewSection
              title="Education"
            >

              <strong>
                {
                  resume.college
                }
              </strong>

              <p>
                {
                  resume.degree
                }
                {
                  resume.graduation_year
                    ? ` · ${resume.graduation_year}`
                    : ""
                }
                {
                  resume.cgpa
                    ? ` · CGPA ${resume.cgpa}`
                    : ""
                }
              </p>

            </ResumePreviewSection>


            {experience.length > 0 && (
              <ResumePreviewSection
                title="Experience"
              >

                {experience.map(
                  item => (

                    <ResumePreviewEntry
                      key={
                        item.id
                      }
                      title={
                        item.title
                      }
                      meta={
                        `${item.company} · ${item.duration}`
                      }
                      text={
                        item.description
                      }
                    />

                  )
                )}

              </ResumePreviewSection>
            )}


            {projects.length > 0 && (
              <ResumePreviewSection
                title="Projects"
              >

                {projects.map(
                  item => (

                    <ResumePreviewEntry
                      key={
                        item.id
                      }
                      title={
                        item.title
                      }
                      meta={
                        item.technologies
                      }
                      text={
                        item.description
                      }
                    />

                  )
                )}

              </ResumePreviewSection>
            )}


            {resume.skills && (
              <ResumePreviewSection
                title="Technical Skills"
              >

                <div className="resumeSkillList">

                  {
                    resume.skills
                      .split(",")
                      .map(
                        value =>
                          value.trim()
                      )
                      .filter(Boolean)
                      .map(
                        skill => (
                          <span
                            key={
                              skill
                            }
                          >
                            {skill}
                          </span>
                        )
                      )
                  }

                </div>

              </ResumePreviewSection>
            )}


            {certifications.length > 0 && (
              <ResumePreviewSection
                title="Certifications"
              >

                {certifications.map(
                  item => (

                    <ResumePreviewEntry
                      key={
                        item.id
                      }
                      title={
                        item.name
                      }
                      meta={
                        item.issuer
                      }
                      text={
                        item.credential_id
                          ? `Credential ${item.credential_id}`
                          : ""
                      }
                    />

                  )
                )}

              </ResumePreviewSection>
            )}


            {achievements.length > 0 && (
              <ResumePreviewSection
                title="Achievements"
              >

                {achievements.map(
                  item => (

                    <ResumePreviewEntry
                      key={
                        item.id
                      }
                      title={
                        item.title
                      }
                      meta={
                        item.issuer
                      }
                      text={
                        item.description
                      }
                    />

                  )
                )}

              </ResumePreviewSection>
            )}


            {customLinks.length > 0 && (
              <ResumePreviewSection
                title="Additional Links"
              >

                <div className="resumePreviewLinks">

                  {customLinks.map(
                    item => (

                      <button
                        type="button"
                        key={
                          item.id
                        }
                        onClick={() =>
                          safeOpen(
                            item.url
                          )
                        }
                      >
                        {
                          item.label
                        }
                      </button>

                    )
                  )}

                </div>

              </ResumePreviewSection>
            )}

          </article>

        </aside>

      </section>

    </div>
  );
}


function ResumeRecords({
  children,
}: {
  children:
    React.ReactNode;
}) {

  return (
    <div className="resumeRecordList">
      {children}
    </div>
  );
}


function ResumeRecord({
  title,
  meta,
  text,
  children,
  onDelete,
}: {
  title: string;
  meta?: string;
  text?: string;
  children?:
    React.ReactNode;
  onDelete:
    () => void;
}) {

  return (
    <article className="resumeRecord">

      <div>

        <strong>
          {title}
        </strong>

        {meta && (
          <small>
            {meta}
          </small>
        )}

        {text && (
          <p>
            {text}
          </p>
        )}

      </div>


      <footer>

        {children}

        <button
          type="button"
          className="danger"
          onClick={
            onDelete
          }
        >
          Delete
        </button>

      </footer>

    </article>
  );
}


function ResumeLinkInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange:
    (value: string) => void;
}) {

  return (
    <label>

      <span>
        {label}
      </span>

      <div className="resumeLinkInput">

        <input
          value={
            value
          }
          placeholder={
            placeholder
          }
          onChange={
            event =>
              onChange(
                event.target.value
              )
          }
        />

        <button
          type="button"
          disabled={
            !value.trim()
          }
          onClick={() =>
            safeOpen(
              value
            )
          }
        >
          ↗
        </button>

      </div>

    </label>
  );
}


function ResumePreviewSection({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {

  return (
    <section className="resumePreviewSection">

      <h3>
        {title}
      </h3>

      {children}

    </section>
  );
}


function ResumePreviewEntry({
  title,
  meta,
  text,
}: {
  title: string;
  meta?: string;
  text?: string;
}) {

  return (
    <div className="resumePreviewEntry">

      <div>

        <strong>
          {title}
        </strong>

        {meta && (
          <span>
            {meta}
          </span>
        )}

      </div>

      {text && (
        <p>
          {text}
        </p>
      )}

    </div>
  );
}
