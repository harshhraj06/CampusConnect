"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import "./campus-seva-kendra.css";


type SevaRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


type SevaProfile = {
  name: string;
  role: SevaRole;
  department: string;
  email?: string;
};


type SevaRequest = {
  id: string;
  request_number: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  department: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assigned_role: string;
  assigned_to: string | null;
  assigned_name: string | null;
  resolution_note: string;
  due_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};


type SevaComment = {
  id: string;
  request_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
};


type SevaEvent = {
  id: string;
  request_id: string;
  actor_name: string;
  actor_role: string;
  event_type: string;
  message: string;
  created_at: string;
};


type SevaAttachment = {
  id: string;
  request_id: string;
  uploader_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number;
  created_at: string;
};


const categories = [
  "Bonafide Certificate",
  "Leave Request",
  "ID Card Correction",
  "Attendance Correction",
  "Placement Query",
  "Technical Complaint",
  "Campus Grievance",
  "Event Permission",
  "Other",
] as const;


const priorities = [
  "Low",
  "Normal",
  "High",
  "Urgent",
] as const;


const statuses = [
  "Pending",
  "Under Review",
  "Changes Required",
  "Approved",
  "Rejected",
  "Resolved",
] as const;


const serviceRoles = [
  "Faculty",
  "Placement Cell",
  "Coordinator",
  "Volunteer",
  "Main Admin",
] as const;


function formatSevaDate(
  value:
    string
    | null
) {
  if (
    !value
  ) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "numeric",
      month:
        "short",
      year:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}


function formatFileSize(
  value:
    number
) {
  if (
    value <
    1024
  ) {
    return `${value} B`;
  }

  if (
    value <
    1024 * 1024
  ) {
    return `${(
      value /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    value /
    (
      1024 *
      1024
    )
  ).toFixed(1)} MB`;
}


function sevaInitials(
  value:
    string
) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(
      0,
      2
    )
    .map(
      word =>
        word.charAt(0)
    )
    .join("")
    .toUpperCase() ||
    "CC";
}


export function
CampusSevaKendra({
  profile,
}: {
  profile:
    SevaProfile;
}) {
  const [
    requests,
    setRequests,
  ] =
    useState<
      SevaRequest[]
    >([]);

  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    activeDesk,
    setActiveDesk,
  ] =
    useState<
      "mine" |
      "queue"
    >(
      profile.role ===
        "Student"
        ? "mine"
        : "queue"
    );

  const [
    searchTerm,
    setSearchTerm,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("All");

  const [
    createOpen,
    setCreateOpen,
  ] =
    useState(false);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    category,
    setCategory,
  ] =
    useState<
      typeof categories[number]
    >(
      "Bonafide Certificate"
    );

  const [
    subject,
    setSubject,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    priority,
    setPriority,
  ] =
    useState<
      typeof priorities[number]
    >("Normal");

  const [
    attachment,
    setAttachment,
  ] =
    useState<
      File |
      null
    >(null);

  const [
    comments,
    setComments,
  ] =
    useState<
      SevaComment[]
    >([]);

  const [
    events,
    setEvents,
  ] =
    useState<
      SevaEvent[]
    >([]);

  const [
    attachments,
    setAttachments,
  ] =
    useState<
      SevaAttachment[]
    >([]);

  const [
    commentBody,
    setCommentBody,
  ] =
    useState("");

  const [
    statusDraft,
    setStatusDraft,
  ] =
    useState("Pending");

  const [
    resolutionDraft,
    setResolutionDraft,
  ] =
    useState("");

  const [
    routeDraft,
    setRouteDraft,
  ] =
    useState("Coordinator");


  const isStaff =
    profile.role !==
      "Student";


  const selectedRequest =
    useMemo(
      () =>
        requests.find(
          request =>
            request.id ===
            selectedId
        ) ||
        null,
      [
        requests,
        selectedId,
      ]
    );


  const loadRequests =
    useCallback(
      async (
        quiet =
          false
      ) => {
        const client =
          getSupabaseClient();

        if (
          !client
        ) {
          setError(
            "Supabase is not configured."
          );

          setLoading(
            false
          );

          return;
        }

        if (
          !quiet
        ) {
          setLoading(
            true
          );
        }

        const {
          data:
            authData,
        } =
          await client.auth
            .getUser();

        const user =
          authData.user;

        if (
          !user
        ) {
          setError(
            "Your session has expired. Sign in again."
          );

          setLoading(
            false
          );

          return;
        }

        setCurrentUserId(
          user.id
        );

        const {
          data,
          error:
            requestError,
        } =
          await client
            .from(
              "campus_service_requests"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        if (
          requestError
        ) {
          console.error(
            "[Campus Seva Kendra]",
            requestError
          );

          setError(
            requestError.message
          );
        } else {
          setRequests(
            (
              data ||
              []
            ) as
              SevaRequest[]
          );

          setError("");
        }

        setLoading(
          false
        );
      },
      []
    );


  const loadDetails =
    useCallback(
      async (
        requestId:
          string
      ) => {
        const client =
          getSupabaseClient();

        if (
          !client
        ) {
          return;
        }

        const [
          commentResult,
          eventResult,
          attachmentResult,
        ] =
          await Promise.all([
            client
              .from(
                "campus_service_comments"
              )
              .select("*")
              .eq(
                "request_id",
                requestId
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              ),

            client
              .from(
                "campus_service_events"
              )
              .select("*")
              .eq(
                "request_id",
                requestId
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              ),

            client
              .from(
                "campus_service_attachments"
              )
              .select("*")
              .eq(
                "request_id",
                requestId
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              ),
          ]);

        setComments(
          (
            commentResult.data ||
            []
          ) as
            SevaComment[]
        );

        setEvents(
          (
            eventResult.data ||
            []
          ) as
            SevaEvent[]
        );

        setAttachments(
          (
            attachmentResult.data ||
            []
          ) as
            SevaAttachment[]
        );
      },
      []
    );


  useEffect(
    () => {
      void loadRequests();
    },
    [
      loadRequests,
    ]
  );


  useEffect(
    () => {
      const client =
        getSupabaseClient();

      if (
        !client
      ) {
        return;
      }

      const channel =
        client.channel(
          `campus-seva-${
            currentUserId ||
            "session"
          }`
        )
          .on(
            "postgres_changes",
            {
              event:
                "*",
              schema:
                "public",
              table:
                "campus_service_requests",
            },
            () => {
              void loadRequests(
                true
              );
            }
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",
              schema:
                "public",
              table:
                "campus_service_comments",
            },
            () => {
              if (
                selectedId
              ) {
                void loadDetails(
                  selectedId
                );
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",
              schema:
                "public",
              table:
                "campus_service_events",
            },
            () => {
              if (
                selectedId
              ) {
                void loadDetails(
                  selectedId
                );
              }
            }
          )
          .subscribe();

      return () => {
        void client
          .removeChannel(
            channel
          );
      };
    },
    [
      currentUserId,
      loadDetails,
      loadRequests,
      selectedId,
    ]
  );


  const openRequest =
    (
      request:
        SevaRequest
    ) => {
      setSelectedId(
        request.id
      );

      setStatusDraft(
        request.status
      );

      setResolutionDraft(
        request.resolution_note ||
        ""
      );

      setRouteDraft(
        request.assigned_role
      );

      setCommentBody("");

      void loadDetails(
        request.id
      );
    };


  const visibleRequests =
    useMemo(
      () => {
        const query =
          searchTerm
            .trim()
            .toLowerCase();

        return requests.filter(
          request => {
            const correctDesk =
              activeDesk ===
                "mine"
                ? request.requester_id ===
                  currentUserId
                : request.requester_id !==
                    currentUserId;

            const correctStatus =
              statusFilter ===
                "All" ||
              request.status ===
                statusFilter;

            const searchable =
              `${request.request_number} ${request.category} ${request.subject} ${request.requester_name} ${request.department}`
                .toLowerCase();

            return (
              correctDesk &&
              correctStatus &&
              (
                !query ||
                searchable.includes(
                  query
                )
              )
            );
          }
        );
      },
      [
        activeDesk,
        currentUserId,
        requests,
        searchTerm,
        statusFilter,
      ]
    );


  const myRequests =
    requests.filter(
      request =>
        request.requester_id ===
        currentUserId
    );

  const pendingCount =
    requests.filter(
      request =>
        ![
          "Approved",
          "Rejected",
          "Resolved",
        ].includes(
          request.status
        )
    ).length;

  const completedCount =
    requests.filter(
      request =>
        [
          "Approved",
          "Resolved",
        ].includes(
          request.status
        )
    ).length;

  const urgentCount =
    requests.filter(
      request =>
        request.priority ===
          "Urgent" &&
        ![
          "Approved",
          "Rejected",
          "Resolved",
        ].includes(
          request.status
        )
    ).length;


  const createRequest =
    async (
      event:
        FormEvent
    ) => {
      event.preventDefault();

      const cleanSubject =
        subject.trim();

      const cleanDescription =
        description.trim();

      if (
        cleanSubject.length <
          4 ||
        cleanDescription.length <
          10
      ) {
        setError(
          "Add a clear subject and description before submitting."
        );

        return;
      }

      if (
        attachment &&
        attachment.size >
          10 *
          1024 *
          1024
      ) {
        setError(
          "The attachment must be 10 MB or smaller."
        );

        return;
      }

      const client =
        getSupabaseClient();

      if (
        !client
      ) {
        setError(
          "Supabase is not configured."
        );

        return;
      }

      setSaving(
        true
      );

      setError("");
      setMessage("");

      try {
        const {
          data:
            authData,
          error:
            authError,
        } =
          await client.auth
            .getUser();

        if (
          authError ||
          !authData.user
        ) {
          throw new Error(
            "Your session has expired. Sign in again."
          );
        }

        const user =
          authData.user;

        const {
          data:
            created,
          error:
            createError,
        } =
          await client
            .rpc(
              "submit_campus_service_request",
              {
                p_requester_name:
                  profile.name ||
                  user.email
                    ?.split("@")[0] ||
                  "Campus member",
                p_department:
                  profile.department ||
                  "",
                p_category:
                  category,
                p_subject:
                  cleanSubject,
                p_description:
                  cleanDescription,
                p_priority:
                  priority,
              }
            )
            .single();

        if (
          createError ||
          !created
        ) {
          throw new Error(
            createError?.message ||
            "The request could not be created."
          );
        }

        const createdRequest =
          created as
            SevaRequest;

        if (
          attachment
        ) {
          const safeName =
            attachment.name
              .replace(
                /[^a-zA-Z0-9._-]/g,
                "-"
              )
              .slice(
                0,
                120
              );

          const storagePath =
            `${createdRequest.id}/${user.id}/${Date.now()}-${safeName}`;

          const {
            error:
              uploadError,
          } =
            await client.storage
              .from(
                "campus-service-attachments"
              )
              .upload(
                storagePath,
                attachment,
                {
                  upsert:
                    false,
                  contentType:
                    attachment.type ||
                    undefined,
                }
              );

          if (
            uploadError
          ) {
            throw new Error(
              `Request created, but the attachment failed: ${uploadError.message}`
            );
          }

          const {
            error:
              recordError,
          } =
            await client
              .from(
                "campus_service_attachments"
              )
              .insert({
                request_id:
                  createdRequest.id,
                uploader_id:
                  user.id,
                file_name:
                  attachment.name,
                storage_path:
                  storagePath,
                mime_type:
                  attachment.type ||
                  null,
                file_size:
                  attachment.size,
              });

          if (
            recordError
          ) {
            await client.storage
              .from(
                "campus-service-attachments"
              )
              .remove([
                storagePath,
              ]);

            throw new Error(
              `Request created, but attachment registration failed: ${recordError.message}`
            );
          }
        }

        setSubject("");
        setDescription("");
        setPriority(
          "Normal"
        );
        setCategory(
          "Bonafide Certificate"
        );
        setAttachment(
          null
        );
        setCreateOpen(
          false
        );
        setActiveDesk(
          "mine"
        );

        setMessage(
          `Patra ${createdRequest.request_number} submitted successfully.`
        );

        await loadRequests(
          true
        );

        openRequest(
          createdRequest
        );
      } catch (
        requestError
      ) {
        console.error(
          "[Campus Seva create]",
          requestError
        );

        setError(
          requestError instanceof
            Error
            ? requestError.message
            : "The request could not be submitted."
        );
      } finally {
        setSaving(
          false
        );
      }
    };


  const addComment =
    async (
      event:
        FormEvent
    ) => {
      event.preventDefault();

      if (
        !selectedRequest ||
        !commentBody.trim()
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (
        !client
      ) {
        return;
      }

      setSaving(
        true
      );

      const {
        data:
          authData,
      } =
        await client.auth
          .getUser();

      if (
        !authData.user
      ) {
        setSaving(
          false
        );

        return;
      }

      const {
        error:
          commentError,
      } =
        await client
          .from(
            "campus_service_comments"
          )
          .insert({
            request_id:
              selectedRequest.id,
            author_id:
              authData.user.id,
            author_name:
              profile.name ||
              "Campus member",
            author_role:
              profile.role,
            body:
              commentBody.trim(),
          });

      if (
        commentError
      ) {
        setError(
          commentError.message
        );
      } else {
        setCommentBody("");

        await loadDetails(
          selectedRequest.id
        );
      }

      setSaving(
        false
      );
    };


  const claimRequest =
    async () => {
      if (
        !selectedRequest
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (
        !client
      ) {
        return;
      }

      setSaving(
        true
      );

      const {
        data:
          authData,
      } =
        await client.auth
          .getUser();

      if (
        !authData.user
      ) {
        setSaving(
          false
        );

        return;
      }

      const {
        error:
          claimError,
      } =
        await client
          .from(
            "campus_service_requests"
          )
          .update({
            assigned_to:
              authData.user.id,
            assigned_name:
              profile.name ||
              "Campus staff",
            status:
              selectedRequest.status ===
                "Pending"
                ? "Under Review"
                : selectedRequest.status,
          })
          .eq(
            "id",
            selectedRequest.id
          );

      if (
        claimError
      ) {
        setError(
          claimError.message
        );
      } else {
        setMessage(
          "The request is now assigned to you."
        );

        await loadRequests(
          true
        );

        await loadDetails(
          selectedRequest.id
        );
      }

      setSaving(
        false
      );
    };


  const saveStaffDecision =
    async () => {
      if (
        !selectedRequest
      ) {
        return;
      }

      if (
        [
          "Approved",
          "Rejected",
          "Resolved",
          "Changes Required",
        ].includes(
          statusDraft
        ) &&
        resolutionDraft
          .trim()
          .length <
          5
      ) {
        setError(
          "Add a clear decision or resolution note."
        );

        return;
      }

      const client =
        getSupabaseClient();

      if (
        !client
      ) {
        return;
      }

      setSaving(
        true
      );

      const patch:
        Record<
          string,
          unknown
        > = {
          status:
            statusDraft,
          resolution_note:
            resolutionDraft.trim(),
        };

      if (
        profile.role ===
          "Main Admin" &&
        routeDraft !==
          selectedRequest.assigned_role
      ) {
        patch.assigned_role =
          routeDraft;

        patch.assigned_to =
          null;

        patch.assigned_name =
          null;
      }

      const {
        error:
          updateError,
      } =
        await client
          .from(
            "campus_service_requests"
          )
          .update(
            patch
          )
          .eq(
            "id",
            selectedRequest.id
          );

      if (
        updateError
      ) {
        setError(
          updateError.message
        );
      } else {
        setMessage(
          "Request decision saved successfully."
        );

        await loadRequests(
          true
        );

        await loadDetails(
          selectedRequest.id
        );
      }

      setSaving(
        false
      );
    };


  const openAttachment =
    async (
      item:
        SevaAttachment
    ) => {
      const client =
        getSupabaseClient();

      if (
        !client
      ) {
        return;
      }

      const {
        data,
        error:
          signedError,
      } =
        await client.storage
          .from(
            "campus-service-attachments"
          )
          .createSignedUrl(
            item.storage_path,
            120
          );

      if (
        signedError ||
        !data?.signedUrl
      ) {
        setError(
          signedError?.message ||
          "The attachment could not be opened."
        );

        return;
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    };


  const canProcess =
    Boolean(
      selectedRequest &&
      isStaff &&
      selectedRequest.requester_id !==
        currentUserId &&
      (
        profile.role ===
          "Main Admin" ||
        selectedRequest.assigned_to ===
          currentUserId ||
        (
          !selectedRequest.assigned_to &&
          selectedRequest.assigned_role ===
            profile.role
        )
      )
    );


  return (
    <section className="campusSeva">
      <header className="campusSevaHero">
        <div className="campusSevaHeroSeal">
          <span>सेवा</span>
          <small>CC</small>
        </div>

        <div className="campusSevaHeroCopy">
          <span>
            CAMPUS SERVICE &amp; RESOLUTION DESK
          </span>

          <h2>
            Campus Seva Kendra
          </h2>

          <p>
            Submit an official digital Patra,
            follow every action and receive a
            verified response from the correct
            campus authority.
          </p>

          <div>
            <i />
            Live role-based service workflow
          </div>
        </div>

        <button
          type="button"
          className="campusSevaCreate"
          onClick={() => {
            setCreateOpen(
              true
            );

            setError("");
          }}
        >
          <i>＋</i>

          <span>
            Write new Patra
            <small>
              Submit a campus request
            </small>
          </span>
        </button>
      </header>

      {(message ||
        error) && (
        <div
          className={
            `campusSevaMessage ${
              error
                ? "error"
                : "success"
            }`
          }
        >
          <span>
            {error
              ? "!"
              : "✓"}
          </span>

          <p>
            {error ||
              message}
          </p>

          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
            }}
          >
            ×
          </button>
        </div>
      )}

      <section className="campusSevaMetrics">
        <article>
          <span>
            TOTAL PATRA
          </span>

          <strong>
            {requests.length}
          </strong>

          <p>
            Requests visible to your role
          </p>
        </article>

        <article>
          <span>
            IN PROGRESS
          </span>

          <strong>
            {pendingCount}
          </strong>

          <p>
            Awaiting campus action
          </p>
        </article>

        <article>
          <span>
            COMPLETED
          </span>

          <strong>
            {completedCount}
          </strong>

          <p>
            Approved or resolved
          </p>
        </article>

        <article>
          <span>
            URGENT SIGNALS
          </span>

          <strong>
            {urgentCount}
          </strong>

          <p>
            High-priority attention
          </p>
        </article>
      </section>

      <section className="campusSevaWorkspace">
        <header className="campusSevaToolbar">
          <div className="campusSevaTabs">
            <button
              type="button"
              className={
                activeDesk ===
                  "mine"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveDesk(
                  "mine"
                )
              }
            >
              My Patra
              <span>
                {myRequests.length}
              </span>
            </button>

            {isStaff && (
              <button
                type="button"
                className={
                  activeDesk ===
                    "queue"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveDesk(
                    "queue"
                  )
                }
              >
                Action desk
                <span>
                  {
                    requests.filter(
                      request =>
                        request.requester_id !==
                        currentUserId
                    ).length
                  }
                </span>
              </button>
            )}
          </div>

          <div className="campusSevaFilters">
            <label>
              <span>⌕</span>

              <input
                value={
                  searchTerm
                }
                onChange={
                  event =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                }
                placeholder="Search Patra number, subject or person"
              />
            </label>

            <select
              value={
                statusFilter
              }
              onChange={
                event =>
                  setStatusFilter(
                    event.target
                      .value
                  )
              }
            >
              <option value="All">
                All statuses
              </option>

              {statuses.map(
                item => (
                  <option
                    value={item}
                    key={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <button
              type="button"
              className="campusSevaRefresh"
              onClick={() =>
                void loadRequests()
              }
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {loading ? (
          <div className="campusSevaEmpty">
            <i className="loading">
              ◌
            </i>

            <h3>
              Restoring the service desk…
            </h3>

            <p>
              Loading authorized requests from
              CampusConnect.
            </p>
          </div>
        ) : visibleRequests.length ===
          0 ? (
          <div className="campusSevaEmpty">
            <i>पत्र</i>

            <h3>
              No Patra found
            </h3>

            <p>
              {activeDesk ===
                "mine"
                ? "You have not submitted a request matching these filters."
                : "There are no requests currently assigned to your role."}
            </p>

            {activeDesk ===
              "mine" && (
              <button
                type="button"
                onClick={() =>
                  setCreateOpen(
                    true
                  )
                }
              >
                Write your first Patra
              </button>
            )}
          </div>
        ) : (
          <div className="campusSevaList">
            {visibleRequests.map(
              request => (
                <button
                  type="button"
                  className="campusSevaRequest"
                  onClick={() =>
                    openRequest(
                      request
                    )
                  }
                  key={
                    request.id
                  }
                >
                  <div className="campusSevaRequestMark">
                    {sevaInitials(
                      request
                        .requester_name
                    )}
                  </div>

                  <div className="campusSevaRequestCopy">
                    <div>
                      <span>
                        {
                          request.request_number
                        }
                      </span>

                      <em
                        data-priority={
                          request.priority
                        }
                      >
                        {
                          request.priority
                        }
                      </em>
                    </div>

                    <h3>
                      {
                        request.subject
                      }
                    </h3>

                    <p>
                      {
                        request.category
                      }
                      {" · "}
                      {
                        request.requester_name
                      }
                      {" · "}
                      {
                        request.department ||
                        request.requester_role
                      }
                    </p>
                  </div>

                  <div className="campusSevaRequestRoute">
                    <span>
                      ROUTED TO
                    </span>

                    <strong>
                      {
                        request.assigned_name ||
                        request.assigned_role
                      }
                    </strong>

                    <small>
                      {formatSevaDate(
                        request.created_at
                      )}
                    </small>
                  </div>

                  <div
                    className="campusSevaStatus"
                    data-status={
                      request.status
                    }
                  >
                    <i />

                    {
                      request.status
                    }
                  </div>

                  <span className="campusSevaArrow">
                    →
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </section>

      {createOpen && (
        <div className="campusSevaLayer">
          <button
            type="button"
            className="campusSevaBackdrop"
            aria-label="Close request form"
            onClick={() =>
              !saving &&
              setCreateOpen(
                false
              )
            }
          />

          <form
            className="campusSevaForm"
            onSubmit={
              createRequest
            }
          >
            <header>
              <div className="campusSevaFormSeal">
                पत्र
              </div>

              <div>
                <span>
                  NEW OFFICIAL REQUEST
                </span>

                <h2>
                  Write a digital Patra
                </h2>

                <p>
                  The request will automatically
                  reach the appropriate campus
                  authority.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !saving &&
                  setCreateOpen(
                    false
                  )
                }
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div className="campusSevaFormGrid">
              <label>
                <span>
                  SERVICE CATEGORY
                </span>

                <select
                  value={
                    category
                  }
                  onChange={
                    event =>
                      setCategory(
                        event.target
                          .value as
                          typeof category
                      )
                  }
                >
                  {categories.map(
                    item => (
                      <option
                        value={item}
                        key={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span>
                  PRIORITY
                </span>

                <select
                  value={
                    priority
                  }
                  onChange={
                    event =>
                      setPriority(
                        event.target
                          .value as
                          typeof priority
                      )
                  }
                >
                  {priorities.map(
                    item => (
                      <option
                        value={item}
                        key={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="wide">
                <span>
                  SUBJECT
                </span>

                <input
                  value={
                    subject
                  }
                  onChange={
                    event =>
                      setSubject(
                        event.target
                          .value
                      )
                  }
                  maxLength={
                    160
                  }
                  required
                  placeholder="Briefly explain what you need"
                />
              </label>

              <label className="wide">
                <span>
                  DESCRIPTION
                </span>

                <textarea
                  value={
                    description
                  }
                  onChange={
                    event =>
                      setDescription(
                        event.target
                          .value
                      )
                  }
                  maxLength={
                    5000
                  }
                  required
                  placeholder="Provide the relevant details, dates and expected resolution…"
                />

                <small>
                  {
                    description.length
                  }
                  /5000
                </small>
              </label>

              <label className="wide campusSevaUpload">
                <span>
                  SUPPORTING DOCUMENT
                </span>

                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                  onChange={
                    event =>
                      setAttachment(
                        event.target
                          .files?.[0] ||
                        null
                      )
                  }
                />

                <div>
                  <i>⇧</i>

                  <strong>
                    {attachment
                      ? attachment.name
                      : "Choose a supporting document"}
                  </strong>

                  <small>
                    PDF, image or document · maximum 10 MB
                  </small>
                </div>
              </label>
            </div>

            <footer>
              <button
                type="button"
                onClick={() =>
                  setCreateOpen(
                    false
                  )
                }
                disabled={
                  saving
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving
                }
              >
                {saving
                  ? "Submitting Patra…"
                  : "Submit official Patra →"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {selectedRequest && (
        <div className="campusSevaLayer">
          <button
            type="button"
            className="campusSevaBackdrop"
            aria-label="Close request details"
            onClick={() =>
              setSelectedId(
                null
              )
            }
          />

          <article className="campusSevaDetail">
            <header className="campusSevaDetailHeader">
              <div>
                <span>
                  {
                    selectedRequest.request_number
                  }
                </span>

                <h2>
                  {
                    selectedRequest.subject
                  }
                </h2>

                <p>
                  {
                    selectedRequest.category
                  }
                  {" · "}
                  Submitted{" "}
                  {formatSevaDate(
                    selectedRequest.created_at
                  )}
                </p>
              </div>

              <div
                className="campusSevaStatus"
                data-status={
                  selectedRequest.status
                }
              >
                <i />

                {
                  selectedRequest.status
                }
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedId(
                    null
                  )
                }
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div className="campusSevaDetailBody">
              <div className="campusSevaDetailMain">
                <section className="campusSevaDescription">
                  <span>
                    REQUEST DESCRIPTION
                  </span>

                  <p>
                    {
                      selectedRequest.description
                    }
                  </p>
                </section>

                <section className="campusSevaFacts">
                  <div>
                    <span>
                      REQUESTED BY
                    </span>

                    <strong>
                      {
                        selectedRequest.requester_name
                      }
                    </strong>

                    <small>
                      {
                        selectedRequest.requester_role
                      }
                      {" · "}
                      {
                        selectedRequest.department ||
                        "CampusConnect"
                      }
                    </small>
                  </div>

                  <div>
                    <span>
                      SERVICE OWNER
                    </span>

                    <strong>
                      {
                        selectedRequest.assigned_name ||
                        selectedRequest.assigned_role
                      }
                    </strong>

                    <small>
                      {
                        selectedRequest.assigned_to
                          ? "Claimed request"
                          : "Awaiting staff claim"
                      }
                    </small>
                  </div>

                  <div>
                    <span>
                      PRIORITY
                    </span>

                    <strong>
                      {
                        selectedRequest.priority
                      }
                    </strong>

                    <small>
                      Updated{" "}
                      {formatSevaDate(
                        selectedRequest.updated_at
                      )}
                    </small>
                  </div>
                </section>

                {attachments.length >
                  0 && (
                  <section className="campusSevaAttachments">
                    <header>
                      <span>
                        ATTACHMENTS
                      </span>

                      <small>
                        {
                          attachments.length
                        }{" "}
                        file
                        {
                          attachments.length ===
                            1
                            ? ""
                            : "s"
                        }
                      </small>
                    </header>

                    {attachments.map(
                      item => (
                        <button
                          type="button"
                          onClick={() =>
                            void openAttachment(
                              item
                            )
                          }
                          key={
                            item.id
                          }
                        >
                          <i>▤</i>

                          <span>
                            <strong>
                              {
                                item.file_name
                              }
                            </strong>

                            <small>
                              {formatFileSize(
                                item.file_size
                              )}
                            </small>
                          </span>

                          <b>Open ↗</b>
                        </button>
                      )
                    )}
                  </section>
                )}

                {selectedRequest.resolution_note && (
                  <section className="campusSevaResolution">
                    <span>
                      OFFICIAL RESPONSE
                    </span>

                    <p>
                      {
                        selectedRequest.resolution_note
                      }
                    </p>
                  </section>
                )}

                <section className="campusSevaConversation">
                  <header>
                    <span>
                      REQUEST CONVERSATION
                    </span>

                    <small>
                      {
                        comments.length
                      }{" "}
                      messages
                    </small>
                  </header>

                  {comments.length ===
                    0 ? (
                    <div className="campusSevaNoComments">
                      No comments have been added yet.
                    </div>
                  ) : (
                    comments.map(
                      item => (
                        <div
                          className="campusSevaComment"
                          key={
                            item.id
                          }
                        >
                          <i>
                            {sevaInitials(
                              item.author_name
                            )}
                          </i>

                          <div>
                            <header>
                              <strong>
                                {
                                  item.author_name
                                }
                              </strong>

                              <span>
                                {
                                  item.author_role
                                }
                              </span>

                              <small>
                                {formatSevaDate(
                                  item.created_at
                                )}
                              </small>
                            </header>

                            <p>
                              {
                                item.body
                              }
                            </p>
                          </div>
                        </div>
                      )
                    )
                  )}

                  <form
                    onSubmit={
                      addComment
                    }
                  >
                    <textarea
                      value={
                        commentBody
                      }
                      onChange={
                        event =>
                          setCommentBody(
                            event.target
                              .value
                          )
                      }
                      maxLength={
                        2000
                      }
                      placeholder="Write a clear message or provide requested information…"
                    />

                    <button
                      type="submit"
                      disabled={
                        saving ||
                        !commentBody.trim()
                      }
                    >
                      Send message →
                    </button>
                  </form>
                </section>
              </div>

              <aside className="campusSevaTimeline">
                <header>
                  <span>
                    AUDIT TIMELINE
                  </span>

                  <h3>
                    Request journey
                  </h3>
                </header>

                {events.map(
                  item => (
                    <div
                      className="campusSevaTimelineItem"
                      key={
                        item.id
                      }
                    >
                      <i />

                      <div>
                        <strong>
                          {
                            item.message
                          }
                        </strong>

                        <p>
                          {
                            item.actor_name
                          }
                          {" · "}
                          {
                            item.actor_role
                          }
                        </p>

                        <small>
                          {formatSevaDate(
                            item.created_at
                          )}
                        </small>
                      </div>
                    </div>
                  )
                )}

                {canProcess && (
                  <section className="campusSevaStaffDesk">
                    <span>
                      AUTHORIZED ACTION DESK
                    </span>

                    {!selectedRequest.assigned_to && (
                      <button
                        type="button"
                        className="campusSevaClaim"
                        onClick={
                          claimRequest
                        }
                        disabled={
                          saving
                        }
                      >
                        Claim this request
                      </button>
                    )}

                    <label>
                      <span>
                        STATUS
                      </span>

                      <select
                        value={
                          statusDraft
                        }
                        onChange={
                          event =>
                            setStatusDraft(
                              event.target
                                .value
                            )
                        }
                      >
                        {statuses.map(
                          item => (
                            <option
                              value={item}
                              key={item}
                            >
                              {item}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    {profile.role ===
                      "Main Admin" && (
                      <label>
                        <span>
                          ROUTE TO
                        </span>

                        <select
                          value={
                            routeDraft
                          }
                          onChange={
                            event =>
                              setRouteDraft(
                                event.target
                                  .value
                              )
                          }
                        >
                          {serviceRoles.map(
                            item => (
                              <option
                                value={item}
                                key={item}
                              >
                                {item}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                    )}

                    <label>
                      <span>
                        DECISION / RESOLUTION NOTE
                      </span>

                      <textarea
                        value={
                          resolutionDraft
                        }
                        onChange={
                          event =>
                            setResolutionDraft(
                              event.target
                                .value
                            )
                        }
                        maxLength={
                          3000
                        }
                        placeholder="Explain the decision, requested changes or completed resolution…"
                      />
                    </label>

                    <button
                      type="button"
                      className="campusSevaSaveDecision"
                      onClick={
                        saveStaffDecision
                      }
                      disabled={
                        saving
                      }
                    >
                      {saving
                        ? "Saving…"
                        : "Save official decision"}
                    </button>
                  </section>
                )}
              </aside>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
