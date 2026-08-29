"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import "./campus-magazine.css";


type Role =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


type Profile = {
  name: string;
  role: Role;
  department?: string;
};


type Issue = {
  id: string;
  title: string;
  subtitle: string;
  edition_label: string;
  status:
    | "Draft"
    | "Published"
    | "Archived";
  published_at: string | null;
  created_at: string;
};


type MagazinePage = {
  id: string;
  issue_id: string;
  page_number: number;
  photo_url: string | null;
  photo_path: string | null;
  headline: string;
  description: string;
  caption: string;
};


type MagazineMedia = {
  id: string;
  page_id: string;
  photo_url: string;
  photo_path: string;
  position: number;
  caption: string;
};


type Props = {
  profile: Profile;
};


const editorRoles:
  Role[] = [
    "Placement Cell",
    "Coordinator",
    "Volunteer",
    "Main Admin",
  ];


const emptyIssue = {
  title: "",
  subtitle: "",
  edition: "",
};


const emptyStory = {
  headline: "",
  description: "",
  caption: "",
};


function safeFileName(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9.]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(
      0,
      80
    );
}


function splitStory(
  description: string
) {
  const normalized =
    description.trim();

  if (
    !normalized
  ) {
    return [
      "This editorial story is being prepared by the campus magazine team.",
      "",
    ];
  }

  const paragraphs =
    normalized
      .split(
        /\n\s*\n/
      )
      .filter(Boolean);

  if (
    paragraphs.length >
    1
  ) {
    const middle =
      Math.ceil(
        paragraphs.length /
        2
      );

    return [
      paragraphs
        .slice(
          0,
          middle
        )
        .join("\n\n"),

      paragraphs
        .slice(
          middle
        )
        .join("\n\n"),
    ];
  }

  const words =
    normalized.split(
      /\s+/
    );

  if (
    words.length <
    45
  ) {
    return [
      normalized,
      "",
    ];
  }

  const middle =
    Math.ceil(
      words.length /
      2
    );

  return [
    words
      .slice(
        0,
        middle
      )
      .join(" "),

    words
      .slice(
        middle
      )
      .join(" "),
  ];
}


export function CampusMagazine({
  profile,
}: Props) {

  const canEdit =
    editorRoles.includes(
      profile.role
    );

  const [
    issues,
    setIssues,
  ] =
    useState<Issue[]>([]);

  const [
    selectedIssueId,
    setSelectedIssueId,
  ] =
    useState("");

  const [
    pages,
    setPages,
  ] =
    useState<
      MagazinePage[]
    >([]);

  const [
    media,
    setMedia,
  ] =
    useState<
      MagazineMedia[]
    >([]);

  const [
    activeIndex,
    setActiveIndex,
  ] =
    useState(0);

  const [
    turning,
    setTurning,
  ] =
    useState<
      "" |
      "next" |
      "previous"
    >("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    status,
    setStatus,
  ] =
    useState("");

  const [
    editingIssue,
    setEditingIssue,
  ] =
    useState(false);

  const [
    editingIssueId,
    setEditingIssueId,
  ] =
    useState("");

  const [
    issueForm,
    setIssueForm,
  ] =
    useState(
      emptyIssue
    );

  const [
    savingIssue,
    setSavingIssue,
  ] =
    useState(false);

  const [
    editingPage,
    setEditingPage,
  ] =
    useState(false);

  const [
    storyForm,
    setStoryForm,
  ] =
    useState(
      emptyStory
    );

  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState<File[]>([]);

  const [
    savingPage,
    setSavingPage,
  ] =
    useState(false);


  const selectedIssue =
    useMemo(
      () =>
        issues.find(
          issue =>
            issue.id ===
            selectedIssueId
        ) ||
        null,
      [
        issues,
        selectedIssueId,
      ]
    );


  const activePage =
    pages[
      activeIndex
    ] ||
    null;


  const activeMedia =
    useMemo(
      () =>
        media
          .filter(
            item =>
              item.page_id ===
              activePage?.id
          )
          .sort(
            (
              first,
              second
            ) =>
              first.position -
              second.position
          ),
      [
        media,
        activePage,
      ]
    );


  const [
    leftStory,
    rightStory,
  ] =
    splitStory(
      activePage
        ?.description ||
      ""
    );


  async function loadIssues() {
    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      setStatus(
        "CampusConnect data connection is unavailable."
      );

      setLoading(
        false
      );
      return;
    }

    const {
      data,
      error,
    } =
      await client
        .from(
          "campus_magazine_issues"
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
      error
    ) {
      setStatus(
        error.message
      );

      setIssues([]);
    } else {
      const rows =
        (
          data ||
          []
        ) as Issue[];

      setIssues(
        rows
      );

      setSelectedIssueId(
        current =>
          current &&
          rows.some(
            issue =>
              issue.id ===
              current
          )
            ? current
            : rows[0]?.id ||
              ""
      );
    }

    setLoading(
      false
    );
  }


  async function loadContent(
    issueId: string
  ) {
    if (
      !issueId
    ) {
      setPages([]);
      setMedia([]);
      return;
    }

    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      return;
    }

    const {
      data:
        pageRows,
      error:
        pageError,
    } =
      await client
        .from(
          "campus_magazine_pages"
        )
        .select("*")
        .eq(
          "issue_id",
          issueId
        )
        .order(
          "page_number",
          {
            ascending:
              true,
          }
        );

    if (
      pageError
    ) {
      setStatus(
        pageError.message
      );

      setPages([]);
      setMedia([]);
      return;
    }

    const nextPages =
      (
        pageRows ||
        []
      ) as MagazinePage[];

    setPages(
      nextPages
    );

    setActiveIndex(
      current =>
        Math.min(
          current,
          Math.max(
            0,
            nextPages.length -
            1
          )
        )
    );

    if (
      nextPages.length ===
      0
    ) {
      setMedia([]);
      return;
    }

    const {
      data:
        mediaRows,
      error:
        mediaError,
    } =
      await client
        .from(
          "campus_magazine_page_media"
        )
        .select("*")
        .in(
          "page_id",
          nextPages.map(
            page =>
              page.id
          )
        )
        .order(
          "position",
          {
            ascending:
              true,
          }
        );

    if (
      mediaError
    ) {
      setStatus(
        mediaError.message
      );

      setMedia([]);
      return;
    }

    setMedia(
      (
        mediaRows ||
        []
      ) as MagazineMedia[]
    );
  }


  useEffect(
    () => {
      void loadIssues();
    },
    []
  );


  useEffect(
    () => {
      setActiveIndex(0);
      setEditingPage(false);
      setSelectedFiles([]);

      void loadContent(
        selectedIssueId
      );
    },
    [selectedIssueId]
  );


  function turnPage(
    direction:
      | "next"
      | "previous"
  ) {
    if (
      turning ||
      editingPage
    ) {
      return;
    }

    const nextIndex =
      direction ===
        "next"
        ? activeIndex + 1
        : activeIndex - 1;

    if (
      nextIndex < 0 ||
      nextIndex >=
        pages.length
    ) {
      return;
    }

    setTurning(
      direction
    );

    window.setTimeout(
      () => {
        setActiveIndex(
          nextIndex
        );
      },
      360
    );

    window.setTimeout(
      () => {
        setTurning("");
      },
      780
    );
  }


  function newIssue() {
    setEditingIssueId("");
    setIssueForm(
      emptyIssue
    );

    setEditingIssue(
      true
    );
  }


  function editIssue() {
    if (
      !selectedIssue
    ) {
      return;
    }

    setEditingIssueId(
      selectedIssue.id
    );

    setIssueForm({
      title:
        selectedIssue.title,
      subtitle:
        selectedIssue.subtitle,
      edition:
        selectedIssue.edition_label,
    });

    setEditingIssue(
      true
    );
  }


  async function saveIssue(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const client =
      getSupabaseClient();

    if (
      !client
    ) {
      return;
    }

    setSavingIssue(
      true
    );

    const payload = {
      title:
        issueForm.title
          .trim(),
      subtitle:
        issueForm.subtitle
          .trim(),
      edition_label:
        issueForm.edition
          .trim(),
    };

    if (
      editingIssueId
    ) {
      const {
        data,
        error,
      } =
        await client
          .from(
            "campus_magazine_issues"
          )
          .update(
            payload
          )
          .eq(
            "id",
            editingIssueId
          )
          .select("*")
          .single();

      if (
        error
      ) {
        setStatus(
          error.message
        );

        setSavingIssue(
          false
        );
        return;
      }

      setIssues(
        current =>
          current.map(
            issue =>
              issue.id ===
              editingIssueId
                ? data as Issue
                : issue
          )
      );
    } else {
      const {
        data,
        error,
      } =
        await client
          .from(
            "campus_magazine_issues"
          )
          .insert({
            ...payload,
            status:
              "Draft",
          })
          .select("*")
          .single();

      if (
        error
      ) {
        setStatus(
          error.message
        );

        setSavingIssue(
          false
        );
        return;
      }

      const created =
        data as Issue;

      setIssues(
        current => [
          created,
          ...current,
        ]
      );

      setSelectedIssueId(
        created.id
      );
    }

    setEditingIssue(
      false
    );

    setSavingIssue(
      false
    );

    setStatus(
      "Magazine edition saved."
    );
  }


  async function togglePublication() {
    if (
      !selectedIssue
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

    const nextStatus =
      selectedIssue.status ===
        "Published"
        ? "Draft"
        : "Published";

    const {
      data,
      error,
    } =
      await client
        .from(
          "campus_magazine_issues"
        )
        .update({
          status:
            nextStatus,
        })
        .eq(
          "id",
          selectedIssue.id
        )
        .select("*")
        .single();

    if (
      error
    ) {
      setStatus(
        error.message
      );
      return;
    }

    setIssues(
      current =>
        current.map(
          issue =>
            issue.id ===
            selectedIssue.id
              ? data as Issue
              : issue
        )
    );

    setStatus(
      nextStatus ===
        "Published"
        ? "Magazine published."
        : "Magazine returned to draft."
    );
  }


  async function addSpread() {
    if (
      !selectedIssue
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

    const nextNumber =
      pages.reduce(
        (
          maximum,
          page
        ) =>
          Math.max(
            maximum,
            page.page_number
          ),
        0
      ) +
      1;

    const {
      data,
      error,
    } =
      await client
        .from(
          "campus_magazine_pages"
        )
        .insert({
          issue_id:
            selectedIssue.id,
          page_number:
            nextNumber,
        })
        .select("*")
        .single();

    if (
      error
    ) {
      setStatus(
        error.message
      );
      return;
    }

    const created =
      data as MagazinePage;

    setPages(
      current => [
        ...current,
        created,
      ]
    );

    setActiveIndex(
      pages.length
    );

    setStoryForm(
      emptyStory
    );

    setSelectedFiles([]);

    setEditingPage(
      true
    );
  }


  function editSpread() {
    if (
      !activePage
    ) {
      return;
    }

    setStoryForm({
      headline:
        activePage.headline,
      description:
        activePage.description,
      caption:
        activePage.caption,
    });

    setSelectedFiles([]);

    setEditingPage(
      true
    );
  }


  function choosePhotos(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const files =
      Array.from(
        event.target.files ||
        []
      );

    const valid =
      files.filter(
        file =>
          file.type
            .startsWith(
              "image/"
            ) &&
          file.size <=
            8 *
            1024 *
            1024
      );

    const remaining =
      Math.max(
        0,
        8 -
        activeMedia.length
      );

    if (
      valid.length >
      remaining
    ) {
      setStatus(
        `This spread can contain up to 8 photographs. ${remaining} spaces remain.`
      );
    }

    setSelectedFiles(
      valid.slice(
        0,
        remaining
      )
    );
  }


  async function saveSpread(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !activePage ||
      !selectedIssue
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

    setSavingPage(
      true
    );

    const uploaded:
      {
        path: string;
        url: string;
        file: File;
      }[] = [];

    for (
      const file of
      selectedFiles
    ) {
      const path =
        `${selectedIssue.id}/` +
        `${activePage.id}/` +
        `${crypto.randomUUID()}-` +
        `${
          safeFileName(
            file.name
          ) ||
          "campus-photo.jpg"
        }`;

      const {
        error,
      } =
        await client.storage
          .from(
            "campus-magazine"
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

      if (
        error
      ) {
        if (
          uploaded.length
        ) {
          await client.storage
            .from(
              "campus-magazine"
            )
            .remove(
              uploaded.map(
                item =>
                  item.path
              )
            );
        }

        setStatus(
          error.message
        );

        setSavingPage(
          false
        );
        return;
      }

      const url =
        client.storage
          .from(
            "campus-magazine"
          )
          .getPublicUrl(
            path
          )
          .data
          .publicUrl;

      uploaded.push({
        path,
        url,
        file,
      });
    }

    const {
      data:
        savedPage,
      error:
        pageError,
    } =
      await client
        .from(
          "campus_magazine_pages"
        )
        .update({
          headline:
            storyForm.headline
              .trim(),
          description:
            storyForm.description
              .trim(),
          caption:
            storyForm.caption
              .trim(),
          photo_url:
            activePage.photo_url ||
            uploaded[0]?.url ||
            null,
          photo_path:
            activePage.photo_path ||
            uploaded[0]?.path ||
            null,
        })
        .eq(
          "id",
          activePage.id
        )
        .select("*")
        .single();

    if (
      pageError
    ) {
      if (
        uploaded.length
      ) {
        await client.storage
          .from(
            "campus-magazine"
          )
          .remove(
            uploaded.map(
              item =>
                item.path
            )
          );
      }

      setStatus(
        pageError.message
      );

      setSavingPage(
        false
      );
      return;
    }

    let insertedMedia:
      MagazineMedia[] = [];

    if (
      uploaded.length
    ) {
      const startPosition =
        activeMedia.length +
        1;

      const {
        data,
        error,
      } =
        await client
          .from(
            "campus_magazine_page_media"
          )
          .insert(
            uploaded.map(
              (
                item,
                index
              ) => ({
                page_id:
                  activePage.id,
                photo_url:
                  item.url,
                photo_path:
                  item.path,
                position:
                  startPosition +
                  index,
                caption:
                  index === 0
                    ? storyForm.caption
                        .trim()
                    : "",
              })
            )
          )
          .select("*");

      if (
        error
      ) {
        await client.storage
          .from(
            "campus-magazine"
          )
          .remove(
            uploaded.map(
              item =>
                item.path
            )
          );

        setStatus(
          error.message
        );

        setSavingPage(
          false
        );
        return;
      }

      insertedMedia =
        (
          data ||
          []
        ) as MagazineMedia[];
    }

    setPages(
      current =>
        current.map(
          page =>
            page.id ===
            activePage.id
              ? savedPage as
                MagazinePage
              : page
        )
    );

    setMedia(
      current => [
        ...current,
        ...insertedMedia,
      ]
    );

    setSelectedFiles([]);

    setEditingPage(
      false
    );

    setSavingPage(
      false
    );

    setStatus(
      "Editorial spread saved."
    );
  }


  async function removePhoto(
    item: MagazineMedia
  ) {
    if (
      !window.confirm(
        "Remove this photograph from the spread?"
      )
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (
      !client ||
      !activePage
    ) {
      return;
    }

    const {
      error,
    } =
      await client
        .from(
          "campus_magazine_page_media"
        )
        .delete()
        .eq(
          "id",
          item.id
        );

    if (
      error
    ) {
      setStatus(
        error.message
      );
      return;
    }

    await client.storage
      .from(
        "campus-magazine"
      )
      .remove([
        item.photo_path,
      ]);

    const remaining =
      activeMedia.filter(
        mediaItem =>
          mediaItem.id !==
          item.id
      );

    setMedia(
      current =>
        current.filter(
          mediaItem =>
            mediaItem.id !==
            item.id
        )
    );

    if (
      activePage.photo_path ===
      item.photo_path
    ) {
      const replacement =
        remaining[0];

      await client
        .from(
          "campus_magazine_pages"
        )
        .update({
          photo_url:
            replacement
              ?.photo_url ||
            null,
          photo_path:
            replacement
              ?.photo_path ||
            null,
        })
        .eq(
          "id",
          activePage.id
        );

      setPages(
        current =>
          current.map(
            page =>
              page.id ===
              activePage.id
                ? {
                    ...page,
                    photo_url:
                      replacement
                        ?.photo_url ||
                      null,
                    photo_path:
                      replacement
                        ?.photo_path ||
                      null,
                  }
                : page
          )
      );
    }
  }


  async function deleteSpread() {
    if (
      !activePage ||
      !window.confirm(
        "Delete this entire magazine spread?"
      )
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

    const spreadMedia =
      media.filter(
        item =>
          item.page_id ===
          activePage.id
      );

    const {
      error,
    } =
      await client
        .from(
          "campus_magazine_pages"
        )
        .delete()
        .eq(
          "id",
          activePage.id
        );

    if (
      error
    ) {
      setStatus(
        error.message
      );
      return;
    }

    if (
      spreadMedia.length
    ) {
      await client.storage
        .from(
          "campus-magazine"
        )
        .remove(
          spreadMedia.map(
            item =>
              item.photo_path
          )
        );
    }

    const remainingPages =
      pages.filter(
        page =>
          page.id !==
          activePage.id
      );

    setPages(
      remainingPages
    );

    setMedia(
      current =>
        current.filter(
          item =>
            item.page_id !==
            activePage.id
        )
    );

    setActiveIndex(
      current =>
        Math.max(
          0,
          Math.min(
            current,
            remainingPages.length -
            1
          )
        )
    );

    setEditingPage(
      false
    );
  }


  if (
    loading
  ) {
    return (
      <section
        className="campusMagazine magazineLoading"
        id="campus-magazine"
      >
        Preparing Campus Chronicle…
      </section>
    );
  }


  return (
    <section
      className="campusMagazine"
      id="campus-magazine"
    >
      <header className="magazineHeader">
        <div>
          <span>
            RNSIT · CAMPUS LIFE
          </span>

          <h2>
            Campus Chronicle
          </h2>

          <p>
            An editorial archive of campus
            photographs, people, achievements
            and stories.
          </p>
        </div>

        <div className="magazineHeaderActions">
          {issues.length >
            1 && (
            <select
              value={
                selectedIssueId
              }
              onChange={
                event =>
                  setSelectedIssueId(
                    event.target
                      .value
                  )
              }
            >
              {issues.map(
                issue => (
                  <option
                    value={
                      issue.id
                    }
                    key={
                      issue.id
                    }
                  >
                    {issue.edition_label ||
                      issue.title}
                    {canEdit
                      ? ` · ${issue.status}`
                      : ""}
                  </option>
                )
              )}
            </select>
          )}

          {canEdit && (
            <>
              <button
                onClick={
                  newIssue
                }
              >
                + New edition
              </button>

              {selectedIssue && (
                <button
                  className="primary"
                  onClick={
                    editIssue
                  }
                >
                  Edit edition
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {status && (
        <p className="magazineStatus">
          {status}
        </p>
      )}

      {editingIssue &&
        canEdit && (
        <form
          className="magazineIssueForm"
          onSubmit={
            saveIssue
          }
        >
          <header>
            <div>
              <span>
                MAGAZINE EDITOR
              </span>

              <h3>
                Edition information
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                setEditingIssue(
                  false
                )
              }
            >
              ×
            </button>
          </header>

          <div>
            <label>
              <span>
                Title
              </span>

              <input
                value={
                  issueForm.title
                }
                onChange={
                  event =>
                    setIssueForm(
                      current => ({
                        ...current,
                        title:
                          event.target
                            .value,
                      })
                    )
                }
                required
              />
            </label>

            <label>
              <span>
                Edition
              </span>

              <input
                value={
                  issueForm.edition
                }
                onChange={
                  event =>
                    setIssueForm(
                      current => ({
                        ...current,
                        edition:
                          event.target
                            .value,
                      })
                    )
                }
                placeholder="August 2026"
              />
            </label>

            <label className="wide">
              <span>
                Subtitle
              </span>

              <textarea
                value={
                  issueForm.subtitle
                }
                onChange={
                  event =>
                    setIssueForm(
                      current => ({
                        ...current,
                        subtitle:
                          event.target
                            .value,
                      })
                    )
                }
                rows={
                  2
                }
              />
            </label>
          </div>

          <footer>
            <button
              type="button"
              onClick={() =>
                setEditingIssue(
                  false
                )
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                savingIssue
              }
            >
              {savingIssue
                ? "Saving…"
                : "Save edition"}
            </button>
          </footer>
        </form>
      )}

      {!selectedIssue ? (
        <div className="magazineEmpty">
          <i>
            M
          </i>

          <h3>
            No magazine edition available
          </h3>

          <p>
            {canEdit
              ? "Create an edition and upload real campus photographs."
              : "The editorial team is preparing the first edition."}
          </p>

          {canEdit && (
            <button
              onClick={
                newIssue
              }
            >
              Create edition
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="magazineEdition">
            <div>
              <span>
                {selectedIssue.edition_label ||
                  "CAMPUS EDITION"}
              </span>

              <h3>
                {selectedIssue.title}
              </h3>

              <p>
                {selectedIssue.subtitle ||
                  "Stories from the RNSIT community."}
              </p>
            </div>

            <em
              className={
                selectedIssue.status
                  .toLowerCase()
              }
            >
              {selectedIssue.status}
            </em>
          </div>

          {canEdit && (
            <div className="magazineToolbar">
              <span>
                Editorial access · {profile.role}
              </span>

              <div>
                <button
                  onClick={
                    addSpread
                  }
                >
                  + Add spread
                </button>

                {activePage && (
                  <button
                    onClick={
                      editSpread
                    }
                  >
                    Edit spread
                  </button>
                )}

                <button
                  className={
                    selectedIssue.status ===
                    "Published"
                      ? "draftButton"
                      : "publishButton"
                  }
                  onClick={
                    togglePublication
                  }
                >
                  {selectedIssue.status ===
                    "Published"
                    ? "Return to draft"
                    : "Publish edition"}
                </button>
              </div>
            </div>
          )}

          {activePage ? (
            <div className="magazinePresentation">
              <button
                className="magazineArrow"
                onClick={() =>
                  turnPage(
                    "previous"
                  )
                }
                disabled={
                  activeIndex ===
                    0 ||
                  Boolean(
                    turning
                  ) ||
                  editingPage
                }
              >
                ‹
              </button>

              <div
                className={
                  `magazineBook ${
                    turning
                      ? `turn-${turning}`
                      : ""
                  }`
                }
              >
                <i className="magazineSpine" />
                <i className="magazinePageEdges left" />
                <i className="magazinePageEdges right" />

                {editingPage ? (
                  <form
                    className="magazineSpread editing"
                    onSubmit={
                      saveSpread
                    }
                  >
                    <section className="magazineEditorMedia">
                      <header>
                        <span>
                          PHOTOGRAPH LAYOUT
                        </span>

                        <strong>
                          {activeMedia.length}/8 photos
                        </strong>
                      </header>

                      <div className="magazineEditorThumbnails">
                        {activeMedia.map(
                          item => (
                            <figure
                              key={
                                item.id
                              }
                            >
                              <img
                                src={
                                  item.photo_url
                                }
                                alt=""
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  void removePhoto(
                                    item
                                  )
                                }
                              >
                                ×
                              </button>
                            </figure>
                          )
                        )}

                        {selectedFiles.map(
                          (
                            file,
                            index
                          ) => (
                            <figure
                              className="pending"
                              key={
                                `${file.name}-${index}`
                              }
                            >
                              <span>
                                {file.name}
                              </span>
                            </figure>
                          )
                        )}
                      </div>

                      <label className="magazineMultiUpload">
                        <strong>
                          Add photographs
                        </strong>

                        <small>
                          Select multiple campus photos · Maximum 8
                        </small>

                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          onChange={
                            choosePhotos
                          }
                        />

                        <span>
                          Choose photos
                        </span>
                      </label>
                    </section>

                    <section className="magazineEditorCopy">
                      <span>
                        EDITORIAL COPY
                      </span>

                      <input
                        className="headlineInput"
                        value={
                          storyForm.headline
                        }
                        onChange={
                          event =>
                            setStoryForm(
                              current => ({
                                ...current,
                                headline:
                                  event.target
                                    .value,
                              })
                            )
                        }
                        placeholder="Story headline"
                      />

                      <textarea
                        value={
                          storyForm.description
                        }
                        onChange={
                          event =>
                            setStoryForm(
                              current => ({
                                ...current,
                                description:
                                  event.target
                                    .value,
                              })
                            )
                        }
                        placeholder="Write the full editorial story. It will automatically flow across both magazine pages…"
                        rows={
                          11
                        }
                        required
                      />

                      <input
                        value={
                          storyForm.caption
                        }
                        onChange={
                          event =>
                            setStoryForm(
                              current => ({
                                ...current,
                                caption:
                                  event.target
                                    .value,
                              })
                            )
                        }
                        placeholder="Main photograph caption"
                      />

                      <footer>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPage(
                              false
                            );

                            setSelectedFiles([]);
                          }}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          className="delete"
                          onClick={
                            deleteSpread
                          }
                        >
                          Delete spread
                        </button>

                        <button
                          type="submit"
                          disabled={
                            savingPage
                          }
                        >
                          {savingPage
                            ? "Saving…"
                            : "Save spread"}
                        </button>
                      </footer>
                    </section>
                  </form>
                ) : (
                  <article className="magazineSpread">
                    <section className="magazineEditorialPage magazineLeftPage">
                      <header className="editorialRunningHeader">
                        <span>
                          CAMPUS LIFE
                        </span>

                        <small>
                          {selectedIssue.edition_label ||
                            "RNSIT"}
                        </small>
                      </header>

                      <div
                        className={
                          `editorialLeftMedia count-${Math.min(
                            activeMedia
                              .slice(
                                0,
                                2
                              )
                              .length,
                            2
                          )}`
                        }
                      >
                        {activeMedia
                          .slice(
                            0,
                            2
                          )
                          .map(
                            item => (
                              <figure
                                key={
                                  item.id
                                }
                              >
                                <img
                                  src={
                                    item.photo_url
                                  }
                                  alt={
                                    item.caption ||
                                    activePage.headline
                                  }
                                />

                                {item.caption && (
                                  <figcaption>
                                    {item.caption}
                                  </figcaption>
                                )}
                              </figure>
                            )
                          )}

                        {activeMedia.length ===
                          0 && (
                          <div className="editorialPhotoEmpty">
                            <span>
                              CAMPUS PHOTOGRAPHY
                            </span>

                            <strong>
                              Images awaiting editorial publication
                            </strong>
                          </div>
                        )}
                      </div>

                      <h3>
                        {activePage.headline ||
                          "Untitled campus story"}
                      </h3>

                      <div className="editorialLeftStory">
                        {leftStory}
                      </div>

                      <footer className="editorialPageNumber">
                        <span>
                          CAMPUS CHRONICLE
                        </span>

                        <small>
                          {String(
                            activePage.page_number *
                            2 -
                            1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </small>
                      </footer>
                    </section>

                    <section className="magazineEditorialPage magazineRightPage">
                      <header className="editorialRunningHeader">
                        <span>
                          VISUAL JOURNAL
                        </span>

                        <small>
                          RNS INSTITUTE OF TECHNOLOGY
                        </small>
                      </header>

                      <div
                        className={
                          `editorialGallery gallery-${Math.min(
                            activeMedia
                              .slice(
                                2
                              )
                              .length,
                            6
                          )}`
                        }
                      >
                        {activeMedia
                          .slice(
                            2,
                            8
                          )
                          .map(
                            item => (
                              <figure
                                key={
                                  item.id
                                }
                              >
                                <img
                                  src={
                                    item.photo_url
                                  }
                                  alt={
                                    item.caption ||
                                    activePage.headline
                                  }
                                />

                                {item.caption && (
                                  <figcaption>
                                    {item.caption}
                                  </figcaption>
                                )}
                              </figure>
                            )
                          )}

                        {activeMedia.length <=
                          2 && (
                          <div className="editorialPullQuote">
                            <span>
                              “
                            </span>

                            <strong>
                              {activePage.caption ||
                                activePage.headline ||
                                "Life, learning and community on campus."}
                            </strong>
                          </div>
                        )}
                      </div>

                      <div className="editorialRightStory">
                        {rightStory ||
                          leftStory}
                      </div>

                      <footer className="editorialPageNumber">
                        <span>
                          CAMPUSCONNECT MAGAZINE
                        </span>

                        <small>
                          {String(
                            activePage.page_number *
                            2
                          ).padStart(
                            2,
                            "0"
                          )}
                        </small>
                      </footer>
                    </section>
                  </article>
                )}
              </div>

              <button
                className="magazineArrow"
                onClick={() =>
                  turnPage(
                    "next"
                  )
                }
                disabled={
                  activeIndex >=
                    pages.length -
                    1 ||
                  Boolean(
                    turning
                  ) ||
                  editingPage
                }
              >
                ›
              </button>
            </div>
          ) : (
            <div className="magazineEmpty">
              <i>
                01
              </i>

              <h3>
                This edition has no spreads
              </h3>

              <p>
                {canEdit
                  ? "Add a spread, upload campus photographs and write the editorial story."
                  : "The editorial team has not published any spreads."}
              </p>

              {canEdit && (
                <button
                  onClick={
                    addSpread
                  }
                >
                  Add first spread
                </button>
              )}
            </div>
          )}

          {pages.length >
            0 && (
            <footer className="magazinePagination">
              <button
                onClick={() =>
                  turnPage(
                    "previous"
                  )
                }
                disabled={
                  activeIndex ===
                    0 ||
                  editingPage
                }
              >
                ← Previous
              </button>

              <div>
                {pages.map(
                  (
                    page,
                    index
                  ) => (
                    <button
                      className={
                        index ===
                        activeIndex
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        !editingPage &&
                        setActiveIndex(
                          index
                        )
                      }
                      key={
                        page.id
                      }
                    >
                      {index + 1}
                    </button>
                  )
                )}
              </div>

              <span>
                Spread {activeIndex + 1}
                {" "}of{" "}
                {pages.length}
              </span>

              <button
                onClick={() =>
                  turnPage(
                    "next"
                  )
                }
                disabled={
                  activeIndex >=
                    pages.length -
                    1 ||
                  editingPage
                }
              >
                Next →
              </button>
            </footer>
          )}
        </>
      )}
    </section>
  );
}
