"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {getSupabaseClient} from "../lib/supabase";

type PlacementOperationsProfile = {
  name: string;
  email: string;
  role: string;
};

type PlacementOperationsProps = {
  profile: PlacementOperationsProfile;
};

type Tab =
  | "Overview"
  | "Recruiters"
  | "Files"
  | "Interviews"
  | "Offers";

type RecruiterContact = {
  id: string;
  company_name: string;
  recruiter_name: string;
  designation: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  notes: string;
  created_at: string;
};

type PlacementFile = {
  id: string;
  title: string;
  company_name: string;
  category: string;
  file_name: string;
  file_path: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  is_verified: boolean;
  uploaded_by_name: string;
  created_at: string;
};

type PlacementInterview = {
  id: string;
  company_name: string;
  round_name: string;
  interview_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string;
  panel_members: string;
  notes: string;
  status: string;
  created_at: string;
};

type PlacementOffer = {
  id: string;
  student_name: string;
  company_name: string;
  role_title: string;
  package_lpa: number | null;
  offer_date: string | null;
  joining_date: string | null;
  status: string;
  notes: string;
  created_at: string;
};

const FILE_CATEGORIES = [
  "Job Description",
  "Shortlist",
  "Offer Letter",
  "Company Policy",
  "MoU",
  "Placement Report",
  "Student Verification",
  "Other",
];

const interviewStatuses = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
];

const offerStatuses = [
  "Pending",
  "Accepted",
  "Declined",
  "Joined",
];

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 KB";

  const mb = bytes / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join("");
}

export function PlacementOperations({
  profile,
}: PlacementOperationsProps) {
  const [tab, setTab] =
    useState<Tab>("Overview");

  const [contacts, setContacts] =
    useState<RecruiterContact[]>([]);

  const [files, setFiles] =
    useState<PlacementFile[]>([]);

  const [interviews, setInterviews] =
    useState<PlacementInterview[]>([]);

  const [offers, setOffers] =
    useState<PlacementOffer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [status, setStatus] =
    useState("");

  const [contactFormOpen, setContactFormOpen] =
    useState(false);

  const [fileFormOpen, setFileFormOpen] =
    useState(false);

  const [interviewFormOpen, setInterviewFormOpen] =
    useState(false);

  const [offerFormOpen, setOfferFormOpen] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [contactForm, setContactForm] =
    useState({
      company_name: "",
      recruiter_name: "",
      designation: "",
      email: "",
      phone: "",
      linkedin_url: "",
      next_follow_up_at: "",
      notes: "",
    });

  const [fileForm, setFileForm] =
    useState({
      title: "",
      company_name: "",
      category: "Job Description",
    });

  const [interviewForm, setInterviewForm] =
    useState({
      company_name: "",
      round_name: "Interview",
      interview_date: "",
      start_time: "",
      end_time: "",
      venue: "",
      panel_members: "",
      notes: "",
    });

  const [offerForm, setOfferForm] =
    useState({
      student_name: "",
      company_name: "",
      role_title: "",
      package_lpa: "",
      offer_date: "",
      joining_date: "",
      notes: "",
    });

  const loadAll = async () => {
    const client =
      getSupabaseClient();

    if (!client) {
      setStatus(
        "Supabase is not configured."
      );
      setLoading(false);
      return;
    }

    setLoading(true);

    const [
      contactResult,
      fileResult,
      interviewResult,
      offerResult,
    ] =
      await Promise.all([
        client
          .from(
            "placement_recruiter_contacts"
          )
          .select("*")
          .order(
            "created_at",
            {ascending: false}
          ),

        client
          .from("placement_files")
          .select("*")
          .order(
            "created_at",
            {ascending: false}
          ),

        client
          .from("placement_interviews")
          .select("*")
          .order(
            "interview_date",
            {ascending: true}
          ),

        client
          .from("placement_offers")
          .select("*")
          .order(
            "created_at",
            {ascending: false}
          ),
      ]);

    const firstError =
      contactResult.error ||
      fileResult.error ||
      interviewResult.error ||
      offerResult.error;

    if (firstError) {
      setStatus(
        firstError.message
      );
    }

    if (!contactResult.error) {
      setContacts(
        (contactResult.data ||
          []) as RecruiterContact[]
      );
    }

    if (!fileResult.error) {
      setFiles(
        (fileResult.data ||
          []) as PlacementFile[]
      );
    }

    if (!interviewResult.error) {
      setInterviews(
        (interviewResult.data ||
          []) as PlacementInterview[]
      );
    }

    if (!offerResult.error) {
      setOffers(
        (offerResult.data ||
          []) as PlacementOffer[]
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const upcomingInterviews =
    useMemo(
      () =>
        interviews.filter(
          item =>
            item.status !== "Completed" &&
            item.status !== "Cancelled"
        ),
      [interviews]
    );

  const acceptedOffers =
    offers.filter(
      item =>
        item.status === "Accepted" ||
        item.status === "Joined"
    ).length;

  const totalPackage =
    offers.reduce(
      (sum, item) =>
        sum +
        (
          Number(
            item.package_lpa
          ) || 0
        ),
      0
    );

  const averagePackage =
    offers.length
      ? (
          totalPackage /
          offers.length
        ).toFixed(1)
      : "0.0";

  const createContact =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      const client =
        getSupabaseClient();

      if (!client) return;

      if (
        !contactForm
          .company_name
          .trim() ||
        !contactForm
          .recruiter_name
          .trim()
      ) {
        setStatus(
          "Company and recruiter name are required."
        );

        return;
      }

      const {data: auth} =
        await client.auth
          .getUser();

      if (!auth.user) {
        setStatus(
          "Sign in again."
        );
        return;
      }

      const {
        error,
      } =
        await client
          .from(
            "placement_recruiter_contacts"
          )
          .insert({
            company_name:
              contactForm.company_name.trim(),

            recruiter_name:
              contactForm.recruiter_name.trim(),

            designation:
              contactForm.designation.trim(),

            email:
              contactForm.email.trim(),

            phone:
              contactForm.phone.trim(),

            linkedin_url:
              contactForm.linkedin_url.trim() ||
              null,

            next_follow_up_at:
              contactForm.next_follow_up_at
                ? new Date(
                    contactForm.next_follow_up_at
                  ).toISOString()
                : null,

            notes:
              contactForm.notes.trim(),

            created_by:
              auth.user.id,

            created_by_name:
              profile.name,
          });

      if (error) {
        setStatus(
          error.message
        );
        return;
      }

      setContactForm({
        company_name: "",
        recruiter_name: "",
        designation: "",
        email: "",
        phone: "",
        linkedin_url: "",
        next_follow_up_at: "",
        notes: "",
      });

      setContactFormOpen(false);

      setStatus(
        "Recruiter contact added."
      );

      await loadAll();
    };

  const uploadPlacementFile =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (!selectedFile) {
        setStatus(
          "Choose a file first."
        );
        return;
      }

      if (
        !fileForm.title.trim()
      ) {
        setStatus(
          "Add a file title."
        );
        return;
      }

      if (
        selectedFile.size >
        15 * 1024 * 1024
      ) {
        setStatus(
          "Placement files must be 15 MB or smaller."
        );
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      const {data: auth} =
        await client.auth
          .getUser();

      if (!auth.user) {
        setStatus(
          "Sign in again."
        );
        return;
      }

      setUploading(true);

      const extension =
        selectedFile.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "";

      const safeName =
        selectedFile.name
          .replace(
            /[^a-zA-Z0-9._-]+/g,
            "-"
          );

      const path =
        `${auth.user.id}/` +
        `${Date.now()}-` +
        `${crypto.randomUUID()}-` +
        safeName;

      const {
        error: uploadError,
      } =
        await client.storage
          .from(
            "placement-files"
          )
          .upload(
            path,
            selectedFile,
            {
              upsert: false,
              contentType:
                selectedFile.type ||
                "application/octet-stream",
            }
          );

      if (uploadError) {
        setUploading(false);
        setStatus(
          uploadError.message
        );
        return;
      }

      const {
        error: databaseError,
      } =
        await client
          .from(
            "placement_files"
          )
          .insert({
            title:
              fileForm.title.trim(),

            company_name:
              fileForm.company_name.trim(),

            category:
              fileForm.category,

            file_name:
              selectedFile.name,

            file_path:
              path,

            file_type:
              extension,

            mime_type:
              selectedFile.type ||
              "application/octet-stream",

            file_size:
              selectedFile.size,

            uploaded_by:
              auth.user.id,

            uploaded_by_name:
              profile.name,
          });

      if (databaseError) {
        await client.storage
          .from(
            "placement-files"
          )
          .remove([path]);

        setUploading(false);

        setStatus(
          databaseError.message
        );

        return;
      }

      setSelectedFile(null);

      setFileForm({
        title: "",
        company_name: "",
        category:
          "Job Description",
      });

      setFileFormOpen(false);

      setUploading(false);

      setStatus(
        "Placement document uploaded securely."
      );

      await loadAll();
    };

  const openPlacementFile =
    async (
      item: PlacementFile
    ) => {
      const client =
        getSupabaseClient();

      if (!client) return;

      const {
        data,
        error,
      } =
        await client.storage
          .from(
            "placement-files"
          )
          .createSignedUrl(
            item.file_path,
            600
          );

      if (
        error ||
        !data?.signedUrl
      ) {
        setStatus(
          error?.message ||
            "Unable to open file."
        );

        return;
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    };

  const deletePlacementFile =
    async (
      item: PlacementFile
    ) => {
      if (
        !window.confirm(
          `Delete ${item.file_name}?`
        )
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      const storageResult =
        await client.storage
          .from(
            "placement-files"
          )
          .remove([
            item.file_path,
          ]);

      if (
        storageResult.error
      ) {
        setStatus(
          storageResult.error.message
        );
        return;
      }

      const {
        error,
      } =
        await client
          .from(
            "placement_files"
          )
          .delete()
          .eq(
            "id",
            item.id
          );

      if (error) {
        setStatus(
          error.message
        );
        return;
      }

      setStatus(
        "Placement file deleted."
      );

      await loadAll();
    };

  const createInterview =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      const client =
        getSupabaseClient();

      if (!client) return;

      if (
        !interviewForm.company_name.trim() ||
        !interviewForm.interview_date
      ) {
        setStatus(
          "Company and interview date are required."
        );

        return;
      }

      const {data: auth} =
        await client.auth
          .getUser();

      if (!auth.user) return;

      const {
        error,
      } =
        await client
          .from(
            "placement_interviews"
          )
          .insert({
            company_name:
              interviewForm.company_name.trim(),

            round_name:
              interviewForm.round_name.trim() ||
              "Interview",

            interview_date:
              interviewForm.interview_date,

            start_time:
              interviewForm.start_time ||
              null,

            end_time:
              interviewForm.end_time ||
              null,

            venue:
              interviewForm.venue.trim(),

            panel_members:
              interviewForm.panel_members.trim(),

            notes:
              interviewForm.notes.trim(),

            created_by:
              auth.user.id,

            created_by_name:
              profile.name,
          });

      if (error) {
        setStatus(
          error.message
        );
        return;
      }

      setInterviewForm({
        company_name: "",
        round_name:
          "Interview",
        interview_date: "",
        start_time: "",
        end_time: "",
        venue: "",
        panel_members: "",
        notes: "",
      });

      setInterviewFormOpen(
        false
      );

      setStatus(
        "Interview scheduled."
      );

      await loadAll();
    };

  const updateInterviewStatus =
    async (
      id: string,
      nextStatus: string
    ) => {
      const client =
        getSupabaseClient();

      if (!client) return;

      const {error} =
        await client
          .from(
            "placement_interviews"
          )
          .update({
            status:
              nextStatus,

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", id);

      if (error) {
        setStatus(
          error.message
        );
        return;
      }

      setInterviews(
        current =>
          current.map(
            item =>
              item.id === id
                ? {
                    ...item,
                    status:
                      nextStatus,
                  }
                : item
          )
      );

      setStatus(
        "Interview status updated."
      );
    };

  const createOffer =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      const client =
        getSupabaseClient();

      if (!client) return;

      if (
        !offerForm.student_name.trim() ||
        !offerForm.company_name.trim() ||
        !offerForm.role_title.trim()
      ) {
        setStatus(
          "Student, company and role are required."
        );
        return;
      }

      const {data: auth} =
        await client.auth
          .getUser();

      if (!auth.user) return;

      const {
        error,
      } =
        await client
          .from(
            "placement_offers"
          )
          .insert({
            student_name:
              offerForm.student_name.trim(),

            company_name:
              offerForm.company_name.trim(),

            role_title:
              offerForm.role_title.trim(),

            package_lpa:
              offerForm.package_lpa
                ? Number(
                    offerForm.package_lpa
                  )
                : null,

            offer_date:
              offerForm.offer_date ||
              null,

            joining_date:
              offerForm.joining_date ||
              null,

            notes:
              offerForm.notes.trim(),

            created_by:
              auth.user.id,

            created_by_name:
              profile.name,
          });

      if (error) {
        setStatus(
          error.message
        );
        return;
      }

      setOfferForm({
        student_name: "",
        company_name: "",
        role_title: "",
        package_lpa: "",
        offer_date: "",
        joining_date: "",
        notes: "",
      });

      setOfferFormOpen(false);

      setStatus(
        "Placement offer recorded."
      );

      await loadAll();
    };

  const updateOfferStatus =
    async (
      id: string,
      nextStatus: string
    ) => {
      const client =
        getSupabaseClient();

      if (!client) return;

      const {
        error,
      } =
        await client
          .from(
            "placement_offers"
          )
          .update({
            status:
              nextStatus,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            id
          );

      if (error) {
        setStatus(
          error.message
        );
        return;
      }

      setOffers(
        current =>
          current.map(
            item =>
              item.id === id
                ? {
                    ...item,
                    status:
                      nextStatus,
                  }
                : item
          )
      );

      setStatus(
        "Offer status updated."
      );
    };

  return (
    <div className="placementOps">

      <section className="placementOpsHero">

        <div>
          <span>
            CAMPUSCONNECT · PLACEMENT CELL
          </span>

          <h1>
            Recruitment operations
          </h1>

          <p>
            Run recruiter relationships, confidential placement
            documents, interview schedules and offer outcomes from
            one secure workspace.
          </p>
        </div>

        <aside>
          <small>
            PLACEMENT TEAM
          </small>

          <strong>
            {profile.name ||
              "Placement Cell"}
          </strong>

          <span>
            {profile.email}
          </span>

          <i>
            ● Operational
          </i>
        </aside>

      </section>

      <nav className="placementOpsTabs">
        {(
          [
            "Overview",
            "Recruiters",
            "Files",
            "Interviews",
            "Offers",
          ] as Tab[]
        ).map(item => (
          <button
            key={item}
            className={
              tab === item
                ? "active"
                : ""
            }
            onClick={() =>
              setTab(item)
            }
          >
            {item}
          </button>
        ))}
      </nav>

      {status && (
        <div className="placementOpsStatus">
          {status}
        </div>
      )}

      {tab === "Overview" && (
        <>
          <section className="placementOpsMetrics">

            <article>
              <small>
                RECRUITERS
              </small>
              <strong>
                {loading
                  ? "—"
                  : contacts.length}
              </strong>
              <span>
                Company relationships
              </span>
            </article>

            <article>
              <small>
                SECURE FILES
              </small>
              <strong>
                {loading
                  ? "—"
                  : files.length}
              </strong>
              <span>
                Placement documents
              </span>
            </article>

            <article>
              <small>
                UPCOMING INTERVIEWS
              </small>
              <strong>
                {loading
                  ? "—"
                  : upcomingInterviews.length}
              </strong>
              <span>
                Active interview activity
              </span>
            </article>

            <article>
              <small>
                ACCEPTED OFFERS
              </small>
              <strong>
                {loading
                  ? "—"
                  : acceptedOffers}
              </strong>
              <span>
                Avg package ₹{averagePackage} LPA
              </span>
            </article>

          </section>

          <section className="placementOpsGrid">

            <article className="placementOpsPanel">
              <header>
                <div>
                  <span>
                    RECRUITER CRM
                  </span>
                  <h2>
                    Recent recruiter contacts
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setTab(
                      "Recruiters"
                    )
                  }
                >
                  Manage →
                </button>
              </header>

              <div className="placementOpsList">
                {contacts
                  .slice(0, 4)
                  .map(item => (
                    <div
                      className="placementOpsContact"
                      key={item.id}
                    >
                      <i>
                        {initials(
                          item.company_name
                        )}
                      </i>

                      <div>
                        <strong>
                          {
                            item.company_name
                          }
                        </strong>

                        <span>
                          {
                            item.recruiter_name
                          }
                          {item.designation
                            ? ` · ${item.designation}`
                            : ""}
                        </span>
                      </div>

                      <small>
                        {item.next_follow_up_at
                          ? `Follow-up ${formatDate(
                              item.next_follow_up_at
                            )}`
                          : "No follow-up"}
                      </small>
                    </div>
                  ))}

                {!contacts.length &&
                  !loading && (
                    <div className="placementOpsEmpty">
                      No recruiter contacts yet.
                    </div>
                  )}
              </div>
            </article>

            <article className="placementOpsPanel">
              <header>
                <div>
                  <span>
                    INTERVIEW CONTROL
                  </span>
                  <h2>
                    Upcoming schedule
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setTab(
                      "Interviews"
                    )
                  }
                >
                  Schedule →
                </button>
              </header>

              <div className="placementOpsList">
                {upcomingInterviews
                  .slice(0, 4)
                  .map(item => (
                    <div
                      className="placementOpsInterview"
                      key={item.id}
                    >
                      <div>
                        <small>
                          {formatDate(
                            item.interview_date
                          )}
                        </small>

                        <strong>
                          {
                            item.company_name
                          }
                        </strong>

                        <span>
                          {
                            item.round_name
                          }
                          {item.venue
                            ? ` · ${item.venue}`
                            : ""}
                        </span>
                      </div>

                      <b>
                        {
                          item.status
                        }
                      </b>
                    </div>
                  ))}

                {!upcomingInterviews.length &&
                  !loading && (
                    <div className="placementOpsEmpty">
                      No interviews scheduled.
                    </div>
                  )}
              </div>
            </article>

          </section>
        </>
      )}

      {tab === "Recruiters" && (
        <section className="placementOpsPanel placementOpsFull">

          <header>
            <div>
              <span>
                RECRUITER RELATIONSHIP MANAGEMENT
              </span>

              <h2>
                Company contacts
              </h2>

              <p>
                Keep HR contacts, follow-ups, notes and recruiter
                relationships organized.
              </p>
            </div>

            <button
              className="placementOpsPrimary"
              onClick={() =>
                setContactFormOpen(
                  current =>
                    !current
                )
              }
            >
              {contactFormOpen
                ? "Close"
                : "+ Add recruiter"}
            </button>
          </header>

          {contactFormOpen && (
            <form
              className="placementOpsForm"
              onSubmit={
                createContact
              }
            >
              <div>
                <label>
                  Company
                  <input
                    value={
                      contactForm.company_name
                    }
                    onChange={event =>
                      setContactForm({
                        ...contactForm,
                        company_name:
                          event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Recruiter name
                  <input
                    value={
                      contactForm.recruiter_name
                    }
                    onChange={event =>
                      setContactForm({
                        ...contactForm,
                        recruiter_name:
                          event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Designation
                  <input
                    value={
                      contactForm.designation
                    }
                    onChange={event =>
                      setContactForm({
                        ...contactForm,
                        designation:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={
                      contactForm.email
                    }
                    onChange={event =>
                      setContactForm({
                        ...contactForm,
                        email:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Phone
                  <input
                    value={
                      contactForm.phone
                    }
                    onChange={event =>
                      setContactForm({
                        ...contactForm,
                        phone:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  LinkedIn URL
                  <input
                    value={
                      contactForm.linkedin_url
                    }
                    onChange={event =>
                      setContactForm({
                        ...contactForm,
                        linkedin_url:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Next follow-up
                  <input
                    type="datetime-local"
                    value={
                      contactForm.next_follow_up_at
                    }
                    onChange={event =>
                      setContactForm({
                        ...contactForm,
                        next_follow_up_at:
                          event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  value={
                    contactForm.notes
                  }
                  onChange={event =>
                    setContactForm({
                      ...contactForm,
                      notes:
                        event.target.value,
                    })
                  }
                />
              </label>

              <button
                className="placementOpsPrimary"
                type="submit"
              >
                Save recruiter
              </button>
            </form>
          )}

          <div className="placementOpsDirectory">
            {contacts.map(item => (
              <article
                key={item.id}
              >
                <i>
                  {initials(
                    item.company_name
                  )}
                </i>

                <div>
                  <span>
                    {
                      item.company_name
                    }
                  </span>

                  <h3>
                    {
                      item.recruiter_name
                    }
                  </h3>

                  <p>
                    {
                      item.designation ||
                      "Recruiter"
                    }
                  </p>

                  <small>
                    {item.email ||
                      "No email"}
                    {item.phone
                      ? ` · ${item.phone}`
                      : ""}
                  </small>

                  {item.notes && (
                    <blockquote>
                      {
                        item.notes
                      }
                    </blockquote>
                  )}
                </div>

                <aside>
                  <small>
                    NEXT FOLLOW-UP
                  </small>

                  <strong>
                    {formatDate(
                      item.next_follow_up_at
                    )}
                  </strong>
                </aside>
              </article>
            ))}
          </div>

        </section>
      )}

      {tab === "Files" && (
        <section className="placementOpsPanel placementOpsFull">

          <header>
            <div>
              <span>
                SECURE PLACEMENT VAULT
              </span>

              <h2>
                Placement documents
              </h2>

              <p>
                Store JDs, shortlists, policies, MoUs, reports and
                offer documents inside private Supabase storage.
              </p>
            </div>

            <button
              className="placementOpsPrimary"
              onClick={() =>
                setFileFormOpen(
                  current =>
                    !current
                )
              }
            >
              {fileFormOpen
                ? "Close"
                : "↑ Upload file"}
            </button>
          </header>

          {fileFormOpen && (
            <form
              className="placementOpsForm"
              onSubmit={
                uploadPlacementFile
              }
            >
              <div>
                <label>
                  Document title
                  <input
                    value={
                      fileForm.title
                    }
                    onChange={event =>
                      setFileForm({
                        ...fileForm,
                        title:
                          event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Company
                  <input
                    value={
                      fileForm.company_name
                    }
                    onChange={event =>
                      setFileForm({
                        ...fileForm,
                        company_name:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Category
                  <select
                    value={
                      fileForm.category
                    }
                    onChange={event =>
                      setFileForm({
                        ...fileForm,
                        category:
                          event.target.value,
                      })
                    }
                  >
                    {FILE_CATEGORIES.map(
                      category => (
                        <option
                          key={
                            category
                          }
                        >
                          {
                            category
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  File
                  <input
                    type="file"
                    onChange={(
                      event:
                        ChangeEvent<HTMLInputElement>
                    ) =>
                      setSelectedFile(
                        event.target
                          .files?.[0] ||
                          null
                      )
                    }
                    required
                  />
                </label>
              </div>

              <button
                className="placementOpsPrimary"
                type="submit"
                disabled={uploading}
              >
                {uploading
                  ? "Uploading..."
                  : "Upload securely"}
              </button>
            </form>
          )}

          <div className="placementOpsFiles">
            {files.map(item => (
              <article
                key={item.id}
              >
                <i>
                  {item.file_type
                    ?.slice(0, 4)
                    .toUpperCase() ||
                    "FILE"}
                </i>

                <div>
                  <small>
                    {
                      item.category
                    }
                  </small>

                  <h3>
                    {
                      item.title
                    }
                  </h3>

                  <p>
                    {
                      item.file_name
                    }
                  </p>

                  <span>
                    {item.company_name ||
                      "CampusConnect"}
                    {" · "}
                    {formatFileSize(
                      Number(
                        item.file_size
                      )
                    )}
                    {" · "}
                    {formatDate(
                      item.created_at
                    )}
                  </span>
                </div>

                <aside>
                  <button
                    onClick={() =>
                      void openPlacementFile(
                        item
                      )
                    }
                  >
                    View
                  </button>

                  <button
                    className="danger"
                    onClick={() =>
                      void deletePlacementFile(
                        item
                      )
                    }
                  >
                    Delete
                  </button>
                </aside>
              </article>
            ))}
          </div>

        </section>
      )}

      {tab === "Interviews" && (
        <section className="placementOpsPanel placementOpsFull">

          <header>
            <div>
              <span>
                INTERVIEW OPERATIONS
              </span>

              <h2>
                Interview schedule
              </h2>

              <p>
                Coordinate companies, panels, venues, interview
                rounds and live status.
              </p>
            </div>

            <button
              className="placementOpsPrimary"
              onClick={() =>
                setInterviewFormOpen(
                  current =>
                    !current
                )
              }
            >
              {interviewFormOpen
                ? "Close"
                : "+ Schedule interview"}
            </button>
          </header>

          {interviewFormOpen && (
            <form
              className="placementOpsForm"
              onSubmit={
                createInterview
              }
            >
              <div>
                <label>
                  Company
                  <input
                    value={
                      interviewForm.company_name
                    }
                    onChange={event =>
                      setInterviewForm({
                        ...interviewForm,
                        company_name:
                          event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Round
                  <input
                    value={
                      interviewForm.round_name
                    }
                    onChange={event =>
                      setInterviewForm({
                        ...interviewForm,
                        round_name:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Date
                  <input
                    type="date"
                    value={
                      interviewForm.interview_date
                    }
                    onChange={event =>
                      setInterviewForm({
                        ...interviewForm,
                        interview_date:
                          event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Start time
                  <input
                    type="time"
                    value={
                      interviewForm.start_time
                    }
                    onChange={event =>
                      setInterviewForm({
                        ...interviewForm,
                        start_time:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  End time
                  <input
                    type="time"
                    value={
                      interviewForm.end_time
                    }
                    onChange={event =>
                      setInterviewForm({
                        ...interviewForm,
                        end_time:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Venue
                  <input
                    value={
                      interviewForm.venue
                    }
                    onChange={event =>
                      setInterviewForm({
                        ...interviewForm,
                        venue:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Panel members
                  <input
                    value={
                      interviewForm.panel_members
                    }
                    onChange={event =>
                      setInterviewForm({
                        ...interviewForm,
                        panel_members:
                          event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  value={
                    interviewForm.notes
                  }
                  onChange={event =>
                    setInterviewForm({
                      ...interviewForm,
                      notes:
                        event.target.value,
                    })
                  }
                />
              </label>

              <button
                className="placementOpsPrimary"
                type="submit"
              >
                Schedule interview
              </button>
            </form>
          )}

          <div className="placementOpsTable">
            <div className="placementOpsTableHead">
              <span>Company</span>
              <span>Date</span>
              <span>Round</span>
              <span>Venue</span>
              <span>Status</span>
            </div>

            {interviews.map(item => (
              <div
                className="placementOpsTableRow"
                key={item.id}
              >
                <strong>
                  {
                    item.company_name
                  }
                </strong>

                <span>
                  {formatDate(
                    item.interview_date
                  )}
                  {item.start_time
                    ? ` · ${item.start_time.slice(
                        0,
                        5
                      )}`
                    : ""}
                </span>

                <span>
                  {
                    item.round_name
                  }
                </span>

                <span>
                  {item.venue ||
                    "Not set"}
                </span>

                <select
                  value={
                    item.status
                  }
                  onChange={event =>
                    void updateInterviewStatus(
                      item.id,
                      event.target.value
                    )
                  }
                >
                  {interviewStatuses.map(
                    option => (
                      <option
                        key={
                          option
                        }
                      >
                        {
                          option
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            ))}
          </div>

        </section>
      )}

      {tab === "Offers" && (
        <section className="placementOpsPanel placementOpsFull">

          <header>
            <div>
              <span>
                OFFER MANAGEMENT
              </span>

              <h2>
                Placement outcomes
              </h2>

              <p>
                Record selections, compensation, offer acceptance
                and joining status.
              </p>
            </div>

            <button
              className="placementOpsPrimary"
              onClick={() =>
                setOfferFormOpen(
                  current =>
                    !current
                )
              }
            >
              {offerFormOpen
                ? "Close"
                : "+ Record offer"}
            </button>
          </header>

          {offerFormOpen && (
            <form
              className="placementOpsForm"
              onSubmit={
                createOffer
              }
            >
              <div>
                <label>
                  Student name
                  <input
                    value={
                      offerForm.student_name
                    }
                    onChange={event =>
                      setOfferForm({
                        ...offerForm,
                        student_name:
                          event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Company
                  <input
                    value={
                      offerForm.company_name
                    }
                    onChange={event =>
                      setOfferForm({
                        ...offerForm,
                        company_name:
                          event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Role
                  <input
                    value={
                      offerForm.role_title
                    }
                    onChange={event =>
                      setOfferForm({
                        ...offerForm,
                        role_title:
                          event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Package LPA
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={
                      offerForm.package_lpa
                    }
                    onChange={event =>
                      setOfferForm({
                        ...offerForm,
                        package_lpa:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Offer date
                  <input
                    type="date"
                    value={
                      offerForm.offer_date
                    }
                    onChange={event =>
                      setOfferForm({
                        ...offerForm,
                        offer_date:
                          event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Joining date
                  <input
                    type="date"
                    value={
                      offerForm.joining_date
                    }
                    onChange={event =>
                      setOfferForm({
                        ...offerForm,
                        joining_date:
                          event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label>
                Notes
                <textarea
                  value={
                    offerForm.notes
                  }
                  onChange={event =>
                    setOfferForm({
                      ...offerForm,
                      notes:
                        event.target.value,
                    })
                  }
                />
              </label>

              <button
                className="placementOpsPrimary"
                type="submit"
              >
                Save offer
              </button>
            </form>
          )}

          <div className="placementOpsOffers">
            {offers.map(item => (
              <article
                key={item.id}
              >
                <div>
                  <span>
                    {
                      item.company_name
                    }
                  </span>

                  <h3>
                    {
                      item.student_name
                    }
                  </h3>

                  <p>
                    {
                      item.role_title
                    }
                  </p>
                </div>

                <div>
                  <small>
                    PACKAGE
                  </small>

                  <strong>
                    {item.package_lpa
                      ? `₹${item.package_lpa} LPA`
                      : "—"}
                  </strong>
                </div>

                <div>
                  <small>
                    OFFER DATE
                  </small>

                  <strong>
                    {formatDate(
                      item.offer_date
                    )}
                  </strong>
                </div>

                <select
                  value={
                    item.status
                  }
                  onChange={event =>
                    void updateOfferStatus(
                      item.id,
                      event.target.value
                    )
                  }
                >
                  {offerStatuses.map(
                    option => (
                      <option
                        key={
                          option
                        }
                      >
                        {
                          option
                        }
                      </option>
                    )
                  )}
                </select>
              </article>
            ))}
          </div>

        </section>
      )}

    </div>
  );
}
