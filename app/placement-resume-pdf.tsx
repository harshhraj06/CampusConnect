"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
  pdf,
} from "@react-pdf/renderer";

import {useState} from "react";
import {getSupabaseClient} from "../lib/supabase";


type ResumeData = {
  headline: string;
  summary: string;

  phone: string;
  location: string;

  college: string;
  degree: string;
  graduation_year: string;
  cgpa: string;

  skills: string;

  linkedin_url: string;
  github_url: string;
  instagram_url: string;
  portfolio_url: string;
  leetcode_url: string;
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
};


type ResumeCertification = {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  credential_id: string;
  credential_url: string;
};


type ResumeLink = {
  id: string;
  label: string;
  url: string;
};


type ResumePayload = {
  resume: ResumeData;

  projects: ResumeProject[];
  experience: ResumeExperience[];
  achievements: ResumeAchievement[];
  certifications: ResumeCertification[];
  links: ResumeLink[];
};


const styles = StyleSheet.create({

  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 38,

    fontFamily: "Helvetica",

    fontSize: 9,

    color: "#172238",

    lineHeight: 1.45,
  },


  header: {
    paddingBottom: 13,

    borderBottomWidth: 1,
    borderBottomColor: "#cfd8e3",

    marginBottom: 15,
  },


  name: {
    fontSize: 23,
    fontFamily: "Helvetica-Bold",

    color: "#111827",
  },


  headline: {
    marginTop: 4,

    fontSize: 11,

    color: "#315f9c",
  },


  contactRow: {
    marginTop: 8,

    flexDirection: "row",

    flexWrap: "wrap",

    gap: 8,
  },


  contact: {
    color: "#667085",

    fontSize: 8,
  },


  section: {
    marginTop: 13,
  },


  sectionTitle: {
    fontSize: 10,

    fontFamily: "Helvetica-Bold",

    letterSpacing: 1,

    color: "#245da8",

    borderBottomWidth: 0.6,
    borderBottomColor: "#dbe3ec",

    paddingBottom: 4,

    marginBottom: 7,
  },


  text: {
    fontSize: 9,

    color: "#344054",
  },


  row: {
    marginBottom: 9,
  },


  rowHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    gap: 12,
  },


  title: {
    fontSize: 10,

    fontFamily: "Helvetica-Bold",

    color: "#1d2939",
  },


  meta: {
    fontSize: 8,

    color: "#667085",
  },


  description: {
    marginTop: 3,

    color: "#475467",
  },


  chips: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap: 5,
  },


  chip: {
    paddingVertical: 4,

    paddingHorizontal: 6,

    borderRadius: 4,

    backgroundColor: "#edf3fb",

    color: "#245da8",

    fontSize: 8,
  },


  educationGrid: {
    flexDirection: "row",

    justifyContent: "space-between",

    gap: 12,
  },


  educationMain: {
    flexGrow: 1,
  },


  educationMeta: {
    textAlign: "right",

    color: "#475467",
  },


  link: {
    color: "#245da8",

    textDecoration: "none",

    fontSize: 8,
  },


  footer: {
    position: "absolute",

    left: 38,
    right: 38,
    bottom: 18,

    borderTopWidth: 0.5,
    borderTopColor: "#e1e6ec",

    paddingTop: 5,

    textAlign: "center",

    fontSize: 7,

    color: "#98a2b3",
  },

});


function splitSkills(value: string) {

  return value
    .split(/[,;\n|]/)
    .map(item =>
      item.trim()
    )
    .filter(Boolean);

}


function safeUrl(value: string) {

  const url =
    value.trim();

  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  return `https://${url}`;
}


function ResumePdfDocument({
  studentName,
  studentEmail,
  payload,
}: {
  studentName: string;
  studentEmail?: string;
  payload: ResumePayload;
}) {

  const {
    resume,
    projects,
    experience,
    achievements,
    certifications,
    links,
  } =
    payload;


  const skills =
    splitSkills(
      resume.skills
    );


  const socialLinks = [

    {
      label:
        "LinkedIn",

      url:
        resume.linkedin_url,
    },

    {
      label:
        "GitHub",

      url:
        resume.github_url,
    },

    {
      label:
        "Portfolio",

      url:
        resume.portfolio_url,
    },

    {
      label:
        "LeetCode",

      url:
        resume.leetcode_url,
    },

    ...links.map(
      item => ({
        label:
          item.label,

        url:
          item.url,
      })
    ),

  ].filter(
    item =>
      item.url?.trim()
  );


  return (
    <Document
      title={`${studentName} Resume`}
      author={studentName}
      subject="CampusConnect Student Resume"
    >

      <Page
        size="A4"
        style={styles.page}
      >

        <View
          style={styles.header}
        >

          <Text
            style={styles.name}
          >
            {studentName}
          </Text>


          {resume.headline && (
            <Text
              style={styles.headline}
            >
              {resume.headline}
            </Text>
          )}


          <View
            style={styles.contactRow}
          >

            {studentEmail && (
              <Text
                style={styles.contact}
              >
                {studentEmail}
              </Text>
            )}


            {resume.phone && (
              <Text
                style={styles.contact}
              >
                {resume.phone}
              </Text>
            )}


            {resume.location && (
              <Text
                style={styles.contact}
              >
                {resume.location}
              </Text>
            )}

          </View>

        </View>


        {resume.summary && (

          <View
            style={styles.section}
          >

            <Text
              style={styles.sectionTitle}
            >
              PROFILE
            </Text>


            <Text
              style={styles.text}
            >
              {resume.summary}
            </Text>

          </View>

        )}


        <View
          style={styles.section}
        >

          <Text
            style={styles.sectionTitle}
          >
            EDUCATION
          </Text>


          <View
            style={styles.educationGrid}
          >

            <View
              style={styles.educationMain}
            >

              <Text
                style={styles.title}
              >
                {
                  resume.college ||
                  "RNS Institute of Technology"
                }
              </Text>


              {resume.degree && (

                <Text
                  style={styles.description}
                >
                  {resume.degree}
                </Text>

              )}

            </View>


            <View>

              {resume.graduation_year && (

                <Text
                  style={styles.educationMeta}
                >
                  {resume.graduation_year}
                </Text>

              )}


              {resume.cgpa && (

                <Text
                  style={styles.educationMeta}
                >
                  CGPA {resume.cgpa}
                </Text>

              )}

            </View>

          </View>

        </View>


        {skills.length > 0 && (

          <View
            style={styles.section}
          >

            <Text
              style={styles.sectionTitle}
            >
              SKILLS
            </Text>


            <View
              style={styles.chips}
            >

              {skills.map(
                skill => (

                  <Text
                    key={skill}
                    style={styles.chip}
                  >
                    {skill}
                  </Text>

                )
              )}

            </View>

          </View>

        )}


        {experience.length > 0 && (

          <View
            style={styles.section}
          >

            <Text
              style={styles.sectionTitle}
            >
              EXPERIENCE
            </Text>


            {experience.map(
              item => (

                <View
                  key={item.id}
                  style={styles.row}
                >

                  <View
                    style={styles.rowHeader}
                  >

                    <Text
                      style={styles.title}
                    >
                      {item.title}
                      {
                        item.company
                          ? ` · ${item.company}`
                          : ""
                      }
                    </Text>


                    {item.duration && (

                      <Text
                        style={styles.meta}
                      >
                        {item.duration}
                      </Text>

                    )}

                  </View>


                  {item.description && (

                    <Text
                      style={styles.description}
                    >
                      {item.description}
                    </Text>

                  )}

                </View>

              )
            )}

          </View>

        )}


        {projects.length > 0 && (

          <View
            style={styles.section}
          >

            <Text
              style={styles.sectionTitle}
            >
              PROJECTS
            </Text>


            {projects.map(
              item => (

                <View
                  key={item.id}
                  style={styles.row}
                >

                  <Text
                    style={styles.title}
                  >
                    {item.title}
                  </Text>


                  {item.technologies && (

                    <Text
                      style={styles.meta}
                    >
                      {item.technologies}
                    </Text>

                  )}


                  {item.description && (

                    <Text
                      style={styles.description}
                    >
                      {item.description}
                    </Text>

                  )}

                </View>

              )
            )}

          </View>

        )}


        {certifications.length > 0 && (

          <View
            style={styles.section}
          >

            <Text
              style={styles.sectionTitle}
            >
              CERTIFICATIONS
            </Text>


            {certifications.map(
              item => (

                <View
                  key={item.id}
                  style={styles.row}
                >

                  <Text
                    style={styles.title}
                  >
                    {item.name}
                  </Text>


                  <Text
                    style={styles.meta}
                  >
                    {
                      [
                        item.issuer,
                        item.issue_date,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    }
                  </Text>

                </View>

              )
            )}

          </View>

        )}


        {achievements.length > 0 && (

          <View
            style={styles.section}
          >

            <Text
              style={styles.sectionTitle}
            >
              ACHIEVEMENTS
            </Text>


            {achievements.map(
              item => (

                <View
                  key={item.id}
                  style={styles.row}
                >

                  <Text
                    style={styles.title}
                  >
                    {item.title}
                  </Text>


                  <Text
                    style={styles.meta}
                  >
                    {
                      [
                        item.issuer,
                        item.achievement_date,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    }
                  </Text>


                  {item.description && (

                    <Text
                      style={styles.description}
                    >
                      {item.description}
                    </Text>

                  )}

                </View>

              )
            )}

          </View>

        )}


        {socialLinks.length > 0 && (

          <View
            style={styles.section}
          >

            <Text
              style={styles.sectionTitle}
            >
              LINKS
            </Text>


            {socialLinks.map(
              item => (

                <Link
                  key={`${item.label}-${item.url}`}
                  src={safeUrl(item.url)}
                  style={styles.link}
                >
                  {item.label}: {item.url}
                </Link>

              )
            )}

          </View>

        )}


        <Text
          style={styles.footer}
        >
          Read-only resume generated securely by CampusConnect
        </Text>

      </Page>

    </Document>
  );
}



export function PlacementResumePdfButton({
  studentId,
  studentName,
  studentEmail,
}: {
  studentId: string;
  studentName: string;
  studentEmail?: string;
}) {

  const [
    loading,
    setLoading,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const openPdf =
    async () => {

      if (
        !studentId ||
        loading
      ) {
        return;
      }


      const client =
        getSupabaseClient();


      if (!client) {

        setError(
          "Supabase is not connected."
        );

        return;
      }


      setLoading(true);
      setError("");


      try {

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
                studentId
              )
              .maybeSingle(),

            client
              .from(
                "resume_projects"
              )
              .select("*")
              .eq(
                "user_id",
                studentId
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
                studentId
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
                studentId
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
                studentId
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
                studentId
              )
              .order(
                "display_order"
              ),

          ]);


        const firstError =
          resumeResult.error ||
          projectsResult.error ||
          experienceResult.error ||
          achievementsResult.error ||
          certificationsResult.error ||
          linksResult.error;


        if (firstError) {
          throw firstError;
        }


        if (!resumeResult.data) {

          throw new Error(
            "This student has not created a resume yet."
          );

        }


        const payload:
          ResumePayload =
        {
          resume:
            resumeResult.data as ResumeData,

          projects:
            (
              projectsResult.data ||
              []
            ) as ResumeProject[],

          experience:
            (
              experienceResult.data ||
              []
            ) as ResumeExperience[],

          achievements:
            (
              achievementsResult.data ||
              []
            ) as ResumeAchievement[],

          certifications:
            (
              certificationsResult.data ||
              []
            ) as ResumeCertification[],

          links:
            (
              linksResult.data ||
              []
            ) as ResumeLink[],
        };


        const blob =
          await pdf(

            <ResumePdfDocument
              studentName={
                studentName ||
                "Student"
              }

              studentEmail={
                studentEmail
              }

              payload={
                payload
              }
            />

          ).toBlob();


        const url =
          URL.createObjectURL(
            blob
          );


        const pdfWindow =
          window.open(
            url,
            "_blank",
            "noopener,noreferrer"
          );


        if (!pdfWindow) {

          URL.revokeObjectURL(
            url
          );

          throw new Error(
            "Allow pop-ups to open the resume PDF."
          );

        }


        /*
         * Keep the blob alive while the browser PDF
         * viewer loads it.
         */

        window.setTimeout(
          () => {
            URL.revokeObjectURL(
              url
            );
          },
          60_000
        );


      } catch (cause) {

        console.error(
          "[Placement Resume PDF]",
          cause
        );


        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to generate resume PDF."
        );

      } finally {

        setLoading(false);
      }

    };


  return (
    <div
      className="placementResumePdfAction"
    >

      <button
        type="button"
        onClick={() =>
          void openPdf()
        }
        disabled={
          loading ||
          !studentId
        }
      >

        {
          loading
            ? "Generating PDF..."
            : "View PDF"
        }

      </button>


      {error && (
        <small>
          {error}
        </small>
      )}

    </div>
  );
}
