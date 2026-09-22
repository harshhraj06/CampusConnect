"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {createPortal} from "react-dom";
import {getSupabaseClient} from "../lib/supabase";
import "./campus-alumni.css";

type AlumniRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";

type AlumniStatus =
  | "Published"
  | "Draft"
  | "Archived";

type AlumniRecord = {
  id: string;
  full_name: string;
  graduation_year: number;
  department: string;
  job_title: string;
  company: string;
  location: string;
  biography: string;
  achievement: string;
  photo_url: string | null;
  photo_path: string | null;
  linkedin_url: string | null;
  is_featured: boolean;
  display_order: number;
  status: AlumniStatus;
};

type AlumniForm = {
  full_name: string;
  graduation_year: string;
  department: string;
  job_title: string;
  company: string;
  location: string;
  biography: string;
  achievement: string;
  linkedin_url: string;
  is_featured: boolean;
  display_order: string;
  status: AlumniStatus;
};

const emptyForm = (): AlumniForm => ({
  full_name: "",
  graduation_year: String(
    new Date().getFullYear()
  ),
  department: "",
  job_title: "",
  company: "",
  location: "",
  biography: "",
  achievement: "",
  linkedin_url: "",
  is_featured: false,
  display_order: "0",
  status: "Published",
});

const initials = (
  name: string
) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();

export function CampusAlumni({
  role,
}: {
  role: AlumniRole;
}) {
  const canManage =
    role === "Main Admin" ||
    role === "Faculty" ||
    role === "Placement Cell";

  const [alumni, setAlumni] =
    useState<AlumniRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [department, setDepartment] =
    useState("All");

  const [company, setCompany] =
    useState("All");

  const [year, setYear] =
    useState("All");

  const [sort, setSort] =
    useState<
      "Featured" |
      "Newest" |
      "Oldest" |
      "Name"
    >("Featured");

  const [statusFilter, setStatusFilter] =
    useState<
      "All" | AlumniStatus
    >("All");

  const [selected, setSelected] =
    useState<AlumniRecord | null>(null);


  const [editorOpen, setEditorOpen] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<AlumniForm>(
      emptyForm()
    );

  const [photoFile, setPhotoFile] =
    useState<File | null>(null);

  const [saving, setSaving] =
    useState(false);

  const loadAlumni =
    useCallback(async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        setError(
          "Campus Alumni database is unavailable."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const {
        data,
        error: loadError,
      } =
        await client
          .from("campus_alumni")
          .select(
            "id,full_name,graduation_year,department,job_title,company,location,biography,achievement,photo_url,photo_path,linkedin_url,is_featured,display_order,status"
          )
          .order(
            "is_featured",
            {
              ascending: false,
            }
          )
          .order(
            "display_order",
            {
              ascending: true,
            }
          )
          .order(
            "graduation_year",
            {
              ascending: false,
            }
          );

      if (loadError) {
        console.error(
          "[Campus Alumni] Load failed:",
          loadError
        );

        setError(
          "Unable to load the alumni directory."
        );
        setLoading(false);
        return;
      }

      console.table(
        (data || []).map(item => ({
          name: item.full_name,
          biography: item.biography,
          achievement: item.achievement,
          company: item.company,
          status: item.status,
        }))
      );

      setAlumni(
        (data || []) as AlumniRecord[]
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadAlumni();
  }, [loadAlumni]);

  useEffect(() => {
    const openEditor = () => {
      if (!canManage) {
        return;
      }

      setEditingId(null);
      setForm(emptyForm());
      setPhotoFile(null);
      setEditorOpen(true);
    };

    window.addEventListener(
      "campus-alumni-open-editor",
      openEditor
    );

    return () => {
      window.removeEventListener(
        "campus-alumni-open-editor",
        openEditor
      );
    };
  }, [canManage]);

  const departments =
    useMemo(
      () => [
        "All",
        ...Array.from(
          new Set(
            alumni
              .map(
                item =>
                  item.department.trim()
              )
              .filter(Boolean)
          )
        ).sort(),
      ],
      [alumni]
    );

  const companies =
    useMemo(
      () => [
        "All",
        ...Array.from(
          new Set(
            alumni
              .map(
                item =>
                  item.company.trim()
              )
              .filter(Boolean)
          )
        ).sort(),
      ],
      [alumni]
    );

  const years =
    useMemo(
      () => [
        "All",
        ...Array.from(
          new Set(
            alumni.map(
              item =>
                item.graduation_year
            )
          )
        )
          .sort(
            (a, b) =>
              b - a
          )
          .map(String),
      ],
      [alumni]
    );

  const visibleAlumni =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      const result =
        alumni.filter(
          item => {
            const matchesDepartment =
              department === "All" ||
              item.department ===
                department;

            const matchesCompany =
              company === "All" ||
              item.company ===
                company;

            const matchesYear =
              year === "All" ||
              String(
                item.graduation_year
              ) === year;

            const matchesStatus =
              !canManage ||
              statusFilter === "All" ||
              item.status ===
                statusFilter;

            const matchesSearch =
              !normalized ||
              [
                item.full_name,
                item.department,
                item.job_title,
                item.company,
                item.location,
                item.achievement,
                item.biography,
                item.graduation_year,
              ]
                .join(" ")
                .toLowerCase()
                .includes(
                  normalized
                );

            return (
              matchesDepartment &&
              matchesCompany &&
              matchesYear &&
              matchesStatus &&
              matchesSearch
            );
          }
        );

      return [
        ...result,
      ].sort(
        (a, b) => {
          if (
            sort ===
            "Newest"
          ) {
            return (
              b.graduation_year -
              a.graduation_year
            );
          }

          if (
            sort ===
            "Oldest"
          ) {
            return (
              a.graduation_year -
              b.graduation_year
            );
          }

          if (
            sort ===
            "Name"
          ) {
            return a.full_name.localeCompare(
              b.full_name
            );
          }

          return (
            Number(
              b.is_featured
            ) -
              Number(
                a.is_featured
              ) ||
            a.display_order -
              b.display_order ||
            b.graduation_year -
              a.graduation_year
          );
        }
      );
    }, [
      alumni,
      query,
      department,
      company,
      year,
      statusFilter,
      canManage,
      sort,
    ]);

  const featuredCount =
    alumni.filter(
      item =>
        item.is_featured &&
        item.status ===
          "Published"
    ).length;

  const organizationCount =
    new Set(
      alumni
        .filter(
          item =>
            item.status ===
            "Published"
        )
        .map(
          item =>
            item.company
        )
        .filter(Boolean)
    ).size;

  const publishedCount =
    alumni.filter(
      item =>
        item.status ===
        "Published"
    ).length;

  const openCreateEditor =
    () => {
      setEditingId(null);
      setForm(emptyForm());
      setPhotoFile(null);
      setNotice("");
      setEditorOpen(true);
    };

  const openEditEditor =
    (
      item: AlumniRecord
    ) => {
      setEditingId(
        item.id
      );

      setForm({
        full_name:
          item.full_name,

        graduation_year:
          String(
            item.graduation_year
          ),

        department:
          item.department,

        job_title:
          item.job_title,

        company:
          item.company,

        location:
          item.location,

        biography:
          item.biography,

        achievement:
          item.achievement,

        linkedin_url:
          item.linkedin_url ||
          "",

        is_featured:
          item.is_featured,

        display_order:
          String(
            item.display_order
          ),

        status:
          item.status,
      });

      setPhotoFile(null);
      setSelected(null);
      setNotice("");
      setEditorOpen(true);
    };

  const saveAlumni =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      const yearNumber =
        Number(
          form.graduation_year
        );

      const displayOrder =
        Number(
          form.display_order
        );

      if (
        !Number.isInteger(
          yearNumber
        ) ||
        yearNumber < 1950 ||
        yearNumber > 2100
      ) {
        setNotice(
          "Enter a valid graduation year."
        );
        return;
      }

      if (
        !form.full_name
          .trim()
      ) {
        setNotice(
          "Alumni name is required."
        );
        return;
      }

      if (
        photoFile &&
        photoFile.size >
          5 * 1024 * 1024
      ) {
        setNotice(
          "Alumni photo must be 5 MB or smaller."
        );
        return;
      }

      setSaving(true);
      setNotice("");

      let uploadedPath:
        string | null =
        null;

      try {
        const {
          data: authData,
          error: authError,
        } =
          await client.auth.getUser();

        if (
          authError ||
          !authData.user
        ) {
          throw new Error(
            "Your session is unavailable."
          );
        }

        let photoUrl:
          string | null =
          editingId
            ? alumni.find(
                item =>
                  item.id ===
                  editingId
              )?.photo_url ||
              null
            : null;

        let photoPath:
          string | null =
          editingId
            ? alumni.find(
                item =>
                  item.id ===
                  editingId
              )?.photo_path ||
              null
            : null;

        const previousPhotoPath =
          photoPath;

        if (photoFile) {
          const extension =
            photoFile.name
              .split(".")
              .pop()
              ?.toLowerCase() ||
            "jpg";

          const safeExtension =
            [
              "jpg",
              "jpeg",
              "png",
              "webp",
            ].includes(
              extension
            )
              ? extension
              : "jpg";

          uploadedPath =
            `${authData.user.id}/${crypto.randomUUID()}.${safeExtension}`;

          const {
            error:
              uploadError,
          } =
            await client.storage
              .from(
                "campus-alumni"
              )
              .upload(
                uploadedPath,
                photoFile,
                {
                  upsert:
                    false,

                  contentType:
                    photoFile.type,
                }
              );

          if (
            uploadError
          ) {
            throw uploadError;
          }

          const {
            data:
              publicUrlData,
          } =
            client.storage
              .from(
                "campus-alumni"
              )
              .getPublicUrl(
                uploadedPath
              );

          photoUrl =
            publicUrlData
              .publicUrl;

          photoPath =
            uploadedPath;

          if (
            previousPhotoPath &&
            previousPhotoPath !==
              uploadedPath
          ) {
            await client.storage
              .from(
                "campus-alumni"
              )
              .remove([
                previousPhotoPath,
              ]);
          }
        }

        const payload = {
          full_name:
            form.full_name.trim(),

          graduation_year:
            yearNumber,

          department:
            form.department.trim(),

          job_title:
            form.job_title.trim(),

          company:
            form.company.trim(),

          location:
            form.location.trim(),

          biography:
            form.biography.trim(),

          achievement:
            form.achievement.trim(),

          linkedin_url:
            form.linkedin_url.trim() ||
            null,

          photo_url:
            photoUrl,

          photo_path:
            photoPath,

          is_featured:
            form.is_featured,

          display_order:
            Number.isFinite(
              displayOrder
            )
              ? displayOrder
              : 0,

          status:
            form.status,
        };

        if (editingId) {
          const {
            error:
              updateError,
          } =
            await client
              .from(
                "campus_alumni"
              )
              .update(
                payload
              )
              .eq(
                "id",
                editingId
              );

          if (
            updateError
          ) {
            throw updateError;
          }

          setNotice(
            "Alumni profile updated successfully."
          );
        } else {
          const {
            error:
              insertError,
          } =
            await client
              .from(
                "campus_alumni"
              )
              .insert({
                ...payload,

                created_by:
                  authData
                    .user
                    .id,
              });

          if (
            insertError
          ) {
            throw insertError;
          }

          setNotice(
            "Alumni profile added successfully."
          );
        }

        setEditorOpen(
          false
        );

        setEditingId(
          null
        );

        setForm(
          emptyForm()
        );

        setPhotoFile(
          null
        );

        await loadAlumni();
      } catch (saveError) {
        if (
          uploadedPath
        ) {
          await client.storage
            .from(
              "campus-alumni"
            )
            .remove([
              uploadedPath,
            ]);
        }

        setNotice(
          saveError instanceof
            Error
            ? saveError.message
            : "Unable to save alumni profile."
        );
      } finally {
        setSaving(false);
      }
    };

  const deleteAlumni =
    async (
      item: AlumniRecord
    ) => {
      if (
        !canManage ||
        !window.confirm(
          `Delete ${item.full_name}'s alumni profile permanently?`
        )
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      const {
        error:
          deleteError,
      } =
        await client
          .from(
            "campus_alumni"
          )
          .delete()
          .eq(
            "id",
            item.id
          );

      if (
        deleteError
      ) {
        setNotice(
          deleteError.message
        );
        return;
      }

      if (
        item.photo_path
      ) {
        await client.storage
          .from(
            "campus-alumni"
          )
          .remove([
            item.photo_path,
          ]);
      }

      setSelected(null);

      setNotice(
        "Alumni profile deleted."
      );

      await loadAlumni();
    };

  return (
    <div className="campusAlumniPage">

      <section className="campusAlumniHero">

        <div className="campusAlumniHeroCopy">

          <span>
            RNSIT ALUMNI NETWORK
          </span>

          <h2>
            From campus
            <strong>
              to careers that inspire.
            </strong>
          </h2>

          <p>
            Explore verified alumni journeys, professional achievements and the organizations where former students are creating impact.
          </p>

          <div className="campusAlumniMetrics">

            <div>
              <b>
                {publishedCount}
              </b>

              <small>
                Published alumni
              </small>
            </div>

            <div>
              <b>
                {featuredCount}
              </b>

              <small>
                Featured journeys
              </small>
            </div>

            <div>
              <b>
                {organizationCount}
              </b>

              <small>
                Organizations
              </small>
            </div>

          </div>

        </div>

        <div
          className="campusAlumniHeroVisual"
          aria-hidden="true"
        >

          <div className="campusAlumniHeroBadge">

            <span>
              ALUMNI
            </span>

            <strong>
              RNS
            </strong>

            <small>
              Legacy · Growth · Impact
            </small>

          </div>

        </div>

      </section>


      <section className="campusAlumniToolbar">

        <div className="campusAlumniSearchField">

          <label htmlFor="alumni-search">
            Search alumni
          </label>

          <input
            id="alumni-search"
            value={query}
            onChange={
              event =>
                setQuery(
                  event.target.value
                )
            }
            placeholder="Name, company, role, location or achievement"
          />

        </div>


        <div>

          <label htmlFor="alumni-department">
            Department
          </label>

          <select
            id="alumni-department"
            value={department}
            onChange={
              event =>
                setDepartment(
                  event.target.value
                )
            }
          >

            {departments.map(
              value => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}

          </select>

        </div>


        <div>

          <label htmlFor="alumni-company">
            Company
          </label>

          <select
            id="alumni-company"
            value={company}
            onChange={
              event =>
                setCompany(
                  event.target.value
                )
            }
          >

            {companies.map(
              value => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}

          </select>

        </div>


        <div>

          <label htmlFor="alumni-year">
            Batch
          </label>

          <select
            id="alumni-year"
            value={year}
            onChange={
              event =>
                setYear(
                  event.target.value
                )
            }
          >

            {years.map(
              value => (
                <option
                  key={value}
                  value={value}
                >
                  {value ===
                  "All"
                    ? "All batches"
                    : `Class of ${value}`}
                </option>
              )
            )}

          </select>

        </div>


        <div>

          <label htmlFor="alumni-sort">
            Sort
          </label>

          <select
            id="alumni-sort"
            value={sort}
            onChange={
              event =>
                setSort(
                  event.target
                    .value as typeof sort
                )
            }
          >
            <option value="Featured">
              Featured first
            </option>

            <option value="Newest">
              Newest batch
            </option>

            <option value="Oldest">
              Oldest batch
            </option>

            <option value="Name">
              Name A-Z
            </option>
          </select>

        </div>


        {canManage && (
          <div>

            <label htmlFor="alumni-status">
              Publication
            </label>

            <select
              id="alumni-status"
              value={
                statusFilter
              }
              onChange={
                event =>
                  setStatusFilter(
                    event.target
                      .value as
                      | "All"
                      | AlumniStatus
                  )
              }
            >
              <option value="All">
                All statuses
              </option>

              <option value="Published">
                Published
              </option>

              <option value="Draft">
                Draft
              </option>

              <option value="Archived">
                Archived
              </option>
            </select>

          </div>
        )}


        {canManage && (
          <button
            type="button"
            className="campusAlumniAddButton"
            onClick={
              openCreateEditor
            }
          >
            + Add alumni
          </button>
        )}

      </section>


      <div className="campusAlumniResultBar">

        <span>
          <b>
            {visibleAlumni.length}
          </b>
          {" "}
          alumni
          {department !==
          "All"
            ? ` · ${department}`
            : ""}
        </span>

        {(
          query ||
          department !==
            "All" ||
          company !==
            "All" ||
          year !==
            "All" ||
          statusFilter !==
            "All"
        ) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDepartment(
                "All"
              );
              setCompany(
                "All"
              );
              setYear(
                "All"
              );
              setStatusFilter(
                "All"
              );
            }}
          >
            Clear filters
          </button>
        )}

      </div>


      {notice && (
        <div className="campusAlumniNotice">
          {notice}
        </div>
      )}


      {error && (
        <p
          className="campusAlumniError"
          role="alert"
        >
          {error}
        </p>
      )}


      {loading ? (

        <div className="campusAlumniLoading">

          <i />

          <p>
            Loading alumni network…
          </p>

        </div>

      ) : visibleAlumni.length ===
        0 ? (

        <section className="campusAlumniEmpty">

          <span>
            ◇
          </span>

          <h3>
            {alumni.length
              ? "No alumni found"
              : "The alumni network is ready"}
          </h3>

          <p>
            {alumni.length
              ? "Try changing your search or filters."
              : canManage
                ? "Add the first verified alumni profile to begin building the directory."
                : "Verified alumni profiles will appear here after they are published."}
          </p>

        </section>

      ) : (

        <section
          className="campusAlumniGrid"
          aria-label="Campus alumni directory"
        >

          {visibleAlumni.map(
            item => (
              <article
                className={
                  item.is_featured
                    ? "campusAlumniCard featured"
                    : "campusAlumniCard"
                }
                key={
                  item.id
                }
              >

                <button
                  type="button"
                  className="campusAlumniCardMain"
                  onClick={() =>
                    setSelected(
                      item
                    )
                  }
                >

                  <div className="campusAlumniPhoto">

                    {item.photo_url ? (
                      <img
                        src={
                          item.photo_url
                        }
                        alt={
                          item.full_name
                        }
                        loading="lazy"
                      />
                    ) : (
                      <span>
                        {initials(
                          item.full_name
                        )}
                      </span>
                    )}


                    <div className="campusAlumniPhotoBadges">

                      {item.is_featured && (
                        <b className="featured">
                          Featured
                        </b>
                      )}

                      {canManage &&
                        item.status !==
                          "Published" && (
                        <b
                          className={
                            item.status.toLowerCase()
                          }
                        >
                          {item.status}
                        </b>
                      )}

                    </div>

                  </div>


                  <div className="campusAlumniCardBody">

                    <small>
                      Class of{" "}
                      {
                        item.graduation_year
                      }
                      {item.department
                        ? ` · ${item.department}`
                        : ""}
                    </small>

                    <h3>
                      {item.full_name}
                    </h3>


                    {(item.job_title ||
                      item.company) && (
                      <div className="campusAlumniCareer">

                        <strong>
                          {item.job_title ||
                            "Professional"}
                        </strong>

                        {item.company && (
                          <span>
                            at{" "}
                            {
                              item.company
                            }
                          </span>
                        )}

                      </div>
                    )}


                    {item.achievement && (
                      <div className="campusAlumniAchievement">

                        <span>
                          ACHIEVEMENT
                        </span>

                        <p>
                          {
                            item.achievement
                          }
                        </p>

                      </div>
                    )}


                    {item.biography && (
                      <p className="campusAlumniBiography">
                        {
                          item.biography
                        }
                      </p>
                    )}


                    <footer>

                      <span>
                        {item.location ||
                          "India"}
                      </span>

                      <b>
                        View profile →
                      </b>

                    </footer>

                  </div>

                </button>


                {canManage && (
                  <div className="campusAlumniAdminActions">

                    <button
                      type="button"
                      onClick={() =>
                        openEditEditor(
                          item
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        void deleteAlumni(
                          item
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>
                )}

              </article>
            )
          )}

        </section>
      )}


      {selected &&
        typeof document !== "undefined" &&
        createPortal(
        <div
          className="campusAlumniModalBackdrop"
          onClick={() =>
            setSelected(
              null
            )
          }
        >

          <section
            className="campusAlumniProfileModal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.full_name} alumni profile`}
            tabIndex={-1}
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <button
              type="button"
              className="campusAlumniModalClose"
              onClick={() =>
                setSelected(
                  null
                )
              }
              aria-label="Close alumni profile"
            >
              ×
            </button>


            <div className="campusAlumniModalIdentity">

              <div className="campusAlumniModalPhoto">

                {selected.photo_url ? (
                  <img
                    src={
                      selected.photo_url
                    }
                    alt={
                      selected.full_name
                    }
                  />
                ) : (
                  <span>
                    {initials(
                      selected.full_name
                    )}
                  </span>
                )}

              </div>


              <div>

                <span className="campusAlumniVerified">
                  VERIFIED ALUMNI
                </span>

                <h2>
                  {selected.full_name}
                </h2>

                <p>
                  {selected.job_title ||
                    "Professional"}
                  {selected.company
                    ? ` · ${selected.company}`
                    : ""}
                </p>

                <small>
                  Class of{" "}
                  {
                    selected.graduation_year
                  }
                  {selected.department
                    ? ` · ${selected.department}`
                    : ""}
                </small>

              </div>

            </div>


            <div className="campusAlumniModalMeta">

              <div>
                <small>
                  COMPANY
                </small>
                <b>
                  {selected.company ||
                    "Not specified"}
                </b>
              </div>

              <div>
                <small>
                  ROLE
                </small>
                <b>
                  {selected.job_title ||
                    "Not specified"}
                </b>
              </div>

              <div>
                <small>
                  LOCATION
                </small>
                <b>
                  {selected.location ||
                    "Not specified"}
                </b>
              </div>

              <div>
                <small>
                  BATCH
                </small>
                <b>
                  {
                    selected.graduation_year
                  }
                </b>
              </div>

            </div>


            {selected.achievement && (
              <section className="campusAlumniModalSection achievement">

                <span>
                  CAREER HIGHLIGHT
                </span>

                <h3>
                  {
                    selected.achievement
                  }
                </h3>

              </section>
            )}


            <section className="campusAlumniModalSection">

              <span>
                ALUMNI STORY
              </span>

              <p>
                {selected.biography?.trim()
                  ? selected.biography
                  : "No alumni story has been added yet."}
              </p>

            </section>


            <footer className="campusAlumniModalFooter">

              {selected.linkedin_url && (
                <a
                  href={
                    selected.linkedin_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View LinkedIn ↗
                </a>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={() =>
                    openEditEditor(
                      selected
                    )
                  }
                >
                  Edit profile
                </button>
              )}

            </footer>

          </section>

        </div>,
        document.body
      )}

      {editorOpen && canManage && (
        <div
          className="campusAlumniModalBackdrop"
          onClick={() => {
            if (
              !saving
            ) {
              setEditorOpen(
                false
              );
            }
          }}
        >

          <form
            className="campusAlumniEditor"
            onSubmit={
              saveAlumni
            }
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>

              <div>

                <span>
                  ALUMNI MANAGEMENT
                </span>

                <h2>
                  {editingId
                    ? "Edit alumni profile"
                    : "Add alumni profile"}
                </h2>

                <p>
                  Publish accurate alumni career information for the CampusConnect community.
                </p>

              </div>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  setEditorOpen(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="campusAlumniEditorGrid">

              <label>
                <span>
                  Full name
                </span>

                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={
                    form.full_name
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        full_name:
                          event.target.value,
                      })
                  }
                />
              </label>


              <label>
                <span>
                  Graduation year
                </span>

                <input
                  required
                  type="number"
                  min="1950"
                  max="2100"
                  value={
                    form.graduation_year
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        graduation_year:
                          event.target.value,
                      })
                  }
                />
              </label>


              <label>
                <span>
                  Department
                </span>

                <input
                  value={
                    form.department
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        department:
                          event.target.value,
                      })
                  }
                  placeholder="ECE"
                />
              </label>


              <label>
                <span>
                  Current role
                </span>

                <input
                  value={
                    form.job_title
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        job_title:
                          event.target.value,
                      })
                  }
                  placeholder="Software Engineer"
                />
              </label>


              <label>
                <span>
                  Company
                </span>

                <input
                  value={
                    form.company
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        company:
                          event.target.value,
                      })
                  }
                  placeholder="Company name"
                />
              </label>


              <label>
                <span>
                  Location
                </span>

                <input
                  value={
                    form.location
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        location:
                          event.target.value,
                      })
                  }
                  placeholder="Bengaluru, India"
                />
              </label>


              <label>
                <span>
                  LinkedIn
                </span>

                <input
                  type="url"
                  value={
                    form.linkedin_url
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        linkedin_url:
                          event.target.value,
                      })
                  }
                  placeholder="https://linkedin.com/in/..."
                />
              </label>


              <label>
                <span>
                  Display order
                </span>

                <input
                  type="number"
                  value={
                    form.display_order
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        display_order:
                          event.target.value,
                      })
                  }
                />
              </label>


              <label>
                <span>
                  Publication status
                </span>

                <select
                  value={
                    form.status
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        status:
                          event.target
                            .value as AlumniStatus,
                      })
                  }
                >
                  <option value="Published">
                    Published
                  </option>

                  <option value="Draft">
                    Draft
                  </option>

                  <option value="Archived">
                    Archived
                  </option>
                </select>
              </label>


              <label className="campusAlumniPhotoInput">
                <span>
                  Alumni photo
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    event =>
                      setPhotoFile(
                        event.target
                          .files?.[0] ||
                          null
                      )
                  }
                />

                <small>
                  JPG, PNG or WebP · Maximum 5 MB
                </small>
              </label>

            </div>


            <label className="campusAlumniEditorWide">

              <span>
                Career highlight
              </span>

              <textarea
                maxLength={500}
                value={
                  form.achievement
                }
                onChange={
                  event =>
                    setForm({
                      ...form,
                      achievement:
                        event.target.value,
                    })
                }
                placeholder="Major professional achievement, milestone or contribution..."
              />

            </label>


            <label className="campusAlumniEditorWide">

              <span>
                Alumni story
              </span>

              <textarea
                maxLength={2000}
                value={
                  form.biography
                }
                onChange={
                  event =>
                    setForm({
                      ...form,
                      biography:
                        event.target.value,
                    })
                }
                placeholder="Career journey, experience and professional story..."
              />

            </label>


            <label className="campusAlumniFeaturedToggle">

              <input
                type="checkbox"
                checked={
                  form.is_featured
                }
                onChange={
                  event =>
                    setForm({
                      ...form,
                      is_featured:
                        event.target.checked,
                    })
                }
              />

              <span>
                <b>
                  Feature this alumnus
                </b>

                <small>
                  Featured alumni appear before standard profiles.
                </small>
              </span>

            </label>


            {notice && (
              <div className="campusAlumniEditorNotice">
                {notice}
              </div>
            )}


            <footer>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  setEditorOpen(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary"
                disabled={
                  saving
                }
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Publish alumni"}
              </button>

            </footer>

          </form>

        </div>
      )}

    </div>
  );
}
