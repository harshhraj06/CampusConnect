"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {getSupabaseClient} from "../lib/supabase";
import {createPortal} from "react-dom";
import {FacultyExcelImport} from "./faculty-excel-import";


type FacultyRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


export type FacultyDirectoryProfile = {
  name: string;
  role: FacultyRole;
};


type FacultyBranch = {
  id: string;
  code: string;
  title: string;
  tagline: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  display_order: number;
  status: "Active" | "Inactive";
};


const blankBranchForm = {
  code: "",
  title: "",
  tagline: "",
  description: "",
  display_order: "100",
  status: "Active" as "Active" | "Inactive",
};


type FacultyMember = {
  id: string;
  full_name: string;
  department: string;
  designation: string;
  qualification: string;
  specialization: string;
  experience: string;
  bio: string;
  email: string;
  photo_url: string | null;
  profile_url: string | null;
  is_hod: boolean;
  is_featured: boolean;

  leadership_role:
    | "Dean"
    | "HOD"
    | "Domain Head"
    | "Program Coordinator"
    | "Faculty";

  domain: string | null;
  leadership_priority: number;

  display_order: number;
  status: "Active" | "Inactive";
  created_at: string;
};


const blankForm = {
  full_name: "",
  department: "ECE",
  designation: "Assistant Professor",
  qualification: "",
  specialization: "",
  experience: "",
  bio: "",
  email: "",
  profile_url: "",
  is_hod: false,
  is_featured: false,

  leadership_role: "Faculty" as
    | "Dean"
    | "HOD"
    | "Domain Head"
    | "Program Coordinator"
    | "Faculty",

  domain: "",
  leadership_priority: "100",

  display_order: "100",
};


const normalizeFacultyDepartment =
  (
    value: string | null | undefined
  ) =>
    String(value || "")
      .trim()
      .toUpperCase();


const designationOrder = [
  "Dean",
  "Professor & Head",
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Lecturer",
  "Visiting Faculty",
];


const leadershipRoles = [
  "Dean",
  "HOD",
  "Domain Head",
  "Program Coordinator",
  "Faculty",
] as const;


const domainOptions = [
  "VLSI & Semiconductor Systems",
  "Embedded Systems & IoT",
  "Communication Systems",
  "Signal Processing",
  "Microwave & RF",
  "Control Systems",
  "Robotics & Automation",
  "Power Electronics",
  "Artificial Intelligence & ML",
  "Computer Networks",
  "Cyber Security",
  "Data Science",
  "Software Engineering",
];


type FacultyBranchMeta = {
  title: string;
  shortTitle: string;
  tagline: string;
  description: string;
  banner: string;
};


const facultyBranchMeta:
  Record<string, FacultyBranchMeta> = {

  ECE: {
    title:
      "Electronics & Communication Engineering",

    shortTitle:
      "ECE",

    tagline:
      "Circuits · Communication · Intelligence",

    description:
      "Explore academic leadership and faculty expertise across VLSI, embedded systems, communication systems, signal processing and next-generation electronics.",

    banner:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=85",
  },


  CSE: {
    title:
      "Computer Science & Engineering",

    shortTitle:
      "CSE",

    tagline:
      "Software · Systems · Computing",

    description:
      "Meet faculty working across software engineering, algorithms, artificial intelligence, systems and advanced computing.",

    banner:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1800&q=85",
  },


  ISE: {
    title:
      "Information Science & Engineering",

    shortTitle:
      "ISE",

    tagline:
      "Information · Data · Platforms",

    description:
      "Explore academic expertise across information systems, data platforms, software engineering and intelligent applications.",

    banner:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1800&q=85",
  },


  EEE: {
    title:
      "Electrical & Electronics Engineering",

    shortTitle:
      "EEE",

    tagline:
      "Power · Control · Electronics",

    description:
      "Meet faculty specialising in electrical systems, machines, control engineering, power electronics and energy technologies.",

    banner:
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1800&q=85",
  },


  AIML: {
    title:
      "Artificial Intelligence & Machine Learning",

    shortTitle:
      "AI & ML",

    tagline:
      "Learning · Intelligence · Data",

    description:
      "Explore faculty focused on artificial intelligence, machine learning, data science and intelligent computational systems.",

    banner:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1800&q=85",
  },


  CIVIL: {
    title:
      "Civil Engineering",

    shortTitle:
      "CIVIL",

    tagline:
      "Structures · Cities · Infrastructure",

    description:
      "Meet faculty across structural, transportation, geotechnical, construction and environmental engineering.",

    banner:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=85",
  },


  ME: {
    title:
      "Mechanical Engineering",

    shortTitle:
      "ME",

    tagline:
      "Design · Manufacturing · Systems",

    description:
      "Explore faculty expertise in mechanical design, manufacturing, thermal engineering, automation and industrial systems.",

    banner:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1800&q=85",
  },


  MBA: {
    title:
      "Master of Business Administration",

    shortTitle:
      "MBA",

    tagline:
      "Leadership · Strategy · Business",

    description:
      "Meet faculty across management, finance, marketing, operations, entrepreneurship and organisational leadership.",

    banner:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1800&q=85",
  },
};


const getFacultyBranchMeta =
  (
    value: string
  ): FacultyBranchMeta => {

    const key =
      normalizeFacultyDepartment(
        value
      );


    return (
      facultyBranchMeta[key] || {
        title:
          `${key} Department`,

        shortTitle:
          key,

        tagline:
          "Academic Excellence",

        description:
          `Meet the academic leadership and complete faculty team of the ${key} department.`,

        banner:
          "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1800&q=85",
      }
    );
  };


export function FacultyDirectory({
  profile,
}: {
  profile: FacultyDirectoryProfile;
}) {

  const [faculty, setFaculty] =
    useState<FacultyMember[]>([]);

  const [branches, setBranches] =
    useState<FacultyBranch[]>([]);

  const [showBranchForm, setShowBranchForm] =
    useState(false);

  const [editingBranch, setEditingBranch] =
    useState<FacultyBranch | null>(null);

  const [branchForm, setBranchForm] =
    useState(blankBranchForm);

  const [branchLogoFile, setBranchLogoFile] =
    useState<File | null>(null);

  const [branchBannerFile, setBranchBannerFile] =
    useState<File | null>(null);

  const [savingBranch, setSavingBranch] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [department, setDepartment] =
    useState("All");

  const [selectedFaculty, setSelectedFaculty] =
    useState<FacultyMember | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [editing, setEditing] =
    useState<FacultyMember | null>(null);

  const [form, setForm] =
    useState(blankForm);

  const [photoFile, setPhotoFile] =
    useState<File | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [status, setStatus] =
    useState("");


  /*
   * Faculty Directory permissions
   *
   * Main Admin:
   * - add faculty
   * - edit faculty
   * - delete faculty
   * - Excel import
   * - branch management
   *
   * Coordinator:
   * - edit existing faculty only
   */

  /*
   * Full Faculty Directory management
   *
   * Coordinator + Main Admin:
   * - add faculty
   * - edit faculty
   * - delete faculty
   * - Excel import
   * - add/edit/delete branches
   * - faculty media
   * - branch media
   */

  const canManage =
    profile.role === "Coordinator" ||
    profile.role === "Main Admin";


  const canEditFaculty =
    canManage;


  // =========================================================
  // FACULTY PROFILE ACTIONS
  // =========================================================

  const openAddBranch =
    () => {

      if (!canManage) {
        return;
      }


      setEditingBranch(
        null
      );

      setBranchForm(
        blankBranchForm
      );

      setBranchLogoFile(
        null
      );

      setBranchBannerFile(
        null
      );

      setShowBranchForm(
        true
      );
    };


  const openEditBranch =
    (
      branch: FacultyBranch
    ) => {

      if (!canManage) {
        return;
      }


      setEditingBranch(
        branch
      );


      setBranchForm({
        code:
          branch.code,

        title:
          branch.title,

        tagline:
          branch.tagline || "",

        description:
          branch.description || "",

        display_order:
          String(
            branch.display_order ??
            100
          ),

        status:
          branch.status,
      });


      setBranchLogoFile(
        null
      );

      setBranchBannerFile(
        null
      );

      setShowBranchForm(
        true
      );
    };


  const saveFacultyBranch =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();


      if (!canManage) {
        return;
      }


      if (
        !branchForm.code.trim() ||
        !branchForm.title.trim()
      ) {

        setStatus(
          "Branch code and title are required."
        );

        return;
      }


      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      setSavingBranch(
        true
      );


      try {

        const {
          data: auth,
        } =
          await client.auth
            .getUser();


        if (!auth.user) {
          throw new Error(
            "Session expired."
          );
        }


        let logoUrl =
          editingBranch?.logo_url ||
          null;


        let bannerUrl =
          editingBranch?.banner_url ||
          null;


        if (branchLogoFile) {

          logoUrl =
            await uploadFacultyBranchMedia(
              branchLogoFile,
              "logos"
            );
        }


        if (branchBannerFile) {

          bannerUrl =
            await uploadFacultyBranchMedia(
              branchBannerFile,
              "banners"
            );
        }


        const payload = {

          code:
            branchForm.code
              .trim()
              .toUpperCase(),

          title:
            branchForm.title
              .trim(),

          tagline:
            branchForm.tagline
              .trim(),

          description:
            branchForm.description
              .trim(),

          logo_url:
            logoUrl,

          banner_url:
            bannerUrl,

          display_order:
            Number(
              branchForm.display_order ||
              100
            ),

          status:
            branchForm.status,
        };


        if (editingBranch) {

          const {
            error,
          } =
            await client
              .from(
                "faculty_branches"
              )
              .update(
                payload
              )
              .eq(
                "id",
                editingBranch.id
              );


          if (error) {
            throw error;
          }


          setStatus(
            "Branch updated."
          );

        } else {

          const {
            error,
          } =
            await client
              .from(
                "faculty_branches"
              )
              .insert({
                ...payload,

                created_by:
                  auth.user.id,
              });


          if (error) {
            throw error;
          }


          setStatus(
            "Branch created."
          );
        }


        setShowBranchForm(
          false
        );

        setEditingBranch(
          null
        );

        setBranchLogoFile(
          null
        );

        setBranchBannerFile(
          null
        );


        await loadFacultyBranches();


      } catch (error) {

        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to save branch."
        );

      } finally {

        setSavingBranch(
          false
        );
      }
    };


  const openFacultyProfile =
    (
      item: FacultyMember
    ) => {

      setSelectedFaculty(
        item
      );

      /*
       * Do NOT move the page.
       * The fixed modal opens directly in the current viewport.
       */
      window.requestAnimationFrame(
        () => {

          const modal =
            document.querySelector(
              ".facultyProfileModal"
            ) as HTMLElement | null;

          const content =
            document.querySelector(
              ".facultyProfileContent"
            ) as HTMLElement | null;

          if (modal) {
            modal.scrollTop = 0;
          }

          if (content) {
            content.scrollTop = 0;
          }

        }
      );
    };


  const openFacultyEmail =
    (
      email: string
    ) => {

      const cleanEmail =
        String(email || "")
          .trim()
          .replace(/^mailto:/i, "");


      if (!cleanEmail) {
        setStatus(
          "Official faculty email is not available."
        );

        return;
      }


      /*
       * Gmail browser composer avoids depending on
       * whether macOS Mail is configured.
       */
      const gmailUrl =
        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
          cleanEmail
        )}`;


      window.open(
        gmailUrl,
        "_blank",
        "noopener,noreferrer"
      );
    };


  const openAcademicProfile =
    (
      value: string | null
    ) => {

      const raw =
        String(value || "")
          .trim();


      if (!raw) {
        setStatus(
          "Academic profile is not available for this faculty member."
        );

        return;
      }


      const safeUrl =
        /^https?:\/\//i.test(raw)
          ? raw
          : `https://${raw}`;


      window.open(
        safeUrl,
        "_blank",
        "noopener,noreferrer"
      );
    };


  // =========================================================
  // LOAD FACULTY BRANCHES
  // =========================================================

  const loadFacultyBranches =
    async () => {

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      const {
        data,
        error,
      } =
        await client
          .from(
            "faculty_branches"
          )
          .select("*")
          .order(
            "display_order",
            {
              ascending: true,
            }
          )
          .order(
            "title",
            {
              ascending: true,
            }
          );


      if (error) {

        console.error(
          "[Faculty Branches]",
          error
        );

        return;
      }


      setBranches(
        (data || []) as
          FacultyBranch[]
      );
    };


  // =========================================================
  // LOAD FACULTY
  // =========================================================

  const loadFaculty =
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


      const {
        data,
        error,
      } =
        await client
          .from("campus_faculty")
          .select("*")
          .order(
            "department",
            {
              ascending: true,
            }
          )
          .order(
            "leadership_priority",
            {
              ascending: true,
            }
          )
          .order(
            "display_order",
            {
              ascending: true,
            }
          )
          .order(
            "full_name",
            {
              ascending: true,
            }
          );


      if (error) {

        console.error(
          "[Faculty Directory]",
          error
        );

        setStatus(
          error.message
        );

      } else {

        setFaculty(
          (data || []) as
            FacultyMember[]
        );

      }


      setLoading(false);
    };


  useEffect(() => {
    void loadFaculty();
    void loadFacultyBranches();
  }, []);


  useEffect(() => {

    /*
     * Selecting a branch means the user wants the complete
     * faculty directory for that department.
     *
     * Clear any old search query so ECE shows every ECE
     * faculty member immediately.
     */
    setSearch("");

  }, [
    department,
  ]);


  // =========================================================
  // DEPARTMENTS
  // =========================================================

  const departments =
    useMemo(
      () => [
        "All",

        ...Array.from(
          new Set(
            faculty
              .map(
                item =>
                  normalizeFacultyDepartment(
                    item.department
                  )
              )
              .filter(Boolean)
          )
        ).sort(),
      ],
      [faculty]
    );


  const facultyBranchCards =
    useMemo(
      () =>
        departments
          .filter(
            item =>
              item !== "All"
          )
          .map(
            branch => {

              const normalized =
                normalizeFacultyDepartment(
                  branch
                );


              const members =
                faculty.filter(
                  member =>
                    normalizeFacultyDepartment(
                      member.department
                    ) === normalized
                );


              const hod =
                members.find(
                  member =>
                    member.leadership_role ===
                      "HOD" ||
                    member.is_hod
                ) || null;


              const domainHeads =
                members.filter(
                  member =>
                    member.leadership_role ===
                      "Domain Head"
                ).length;


              return {
                branch:
                  normalized,

                meta:
                  getFacultyBranchMeta(
                    normalized
                  ),

                count:
                  members.length,

                hod,

                domainHeads,
              };
            }
          ),
      [
        departments,
        faculty,
      ]
    );


  const selectedBranchMeta =
    department === "All"
      ? null
      : getFacultyBranchMeta(
          department
        );


  const visibleFaculty =
    useMemo(
      () => {

        const normalized =
          search
            .trim()
            .toLowerCase();


        return faculty.filter(
          item => {

            if (
              department !==
                "All" &&
              normalizeFacultyDepartment(
                item.department
              ) !==
                normalizeFacultyDepartment(
                  department
                )
            ) {
              return false;
            }


            if (
              !normalized
            ) {
              return true;
            }


            return [
              item.full_name,
              item.department,
              item.designation,
              item.leadership_role,
              item.domain || "",
              item.qualification,
              item.specialization,
              item.email,
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                normalized
              );
          }
        );

      },
      [
        faculty,
        department,
        search,
      ]
    );


  const uploadFacultyBranchMedia =
    async (
      file: File,
      folder: string
    ) => {

      const client =
        getSupabaseClient();

      if (!client) {
        throw new Error(
          "Supabase unavailable."
        );
      }


      const {
        data: auth,
      } =
        await client.auth.getUser();


      if (!auth.user) {
        throw new Error(
          "Session expired."
        );
      }


      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(
          file.type
        )
      ) {
        throw new Error(
          "Use JPG, PNG or WebP."
        );
      }


      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";


      const filePath =
        `${auth.user.id}/${folder}/` +
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;


      const {
        error,
      } =
        await client.storage
          .from(
            "faculty-branches"
          )
          .upload(
            filePath,
            file,
            {
              cacheControl:
                "3600",

              upsert:
                false,
            }
          );


      if (error) {
        throw error;
      }


      const {
        data,
      } =
        client.storage
          .from(
            "faculty-branches"
          )
          .getPublicUrl(
            filePath
          );


      return data.publicUrl;
    };


  // =========================================================
  // IMAGE UPLOAD
  // =========================================================

  const uploadPhoto =
    async (
      file: File
    ) => {

      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(
          file.type
        )
      ) {
        throw new Error(
          "Faculty photo must be JPG, PNG or WebP."
        );
      }


      if (
        file.size >
        10 * 1024 * 1024
      ) {
        throw new Error(
          "Faculty photo must be below 10 MB."
        );
      }


      const client =
        getSupabaseClient();

      if (!client) {
        throw new Error(
          "Supabase unavailable."
        );
      }


      const {
        data: auth,
      } =
        await client.auth
          .getUser();


      if (!auth.user) {
        throw new Error(
          "Session expired."
        );
      }


      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";


      const path =
        `${auth.user.id}/faculty/${Date.now()}-${crypto.randomUUID()}.${extension}`;


      const {
        error,
      } =
        await client.storage
          .from(
            "faculty-media"
          )
          .upload(
            path,
            file,
            {
              cacheControl:
                "3600",

              upsert:
                false,
            }
          );


      if (error) {
        throw error;
      }


      const {
        data,
      } =
        client.storage
          .from(
            "faculty-media"
          )
          .getPublicUrl(
            path
          );


      return data.publicUrl;
    };


  // =========================================================
  // OPEN ADD
  // =========================================================

  const openAdd =
    () => {

      if (!canManage) {
        return;
      }


      setEditing(
        null
      );

      setForm(
        blankForm
      );

      setPhotoFile(
        null
      );

      setShowForm(
        true
      );

      setStatus(
        ""
      );
    };


  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEdit =
    (
      item:
        FacultyMember
    ) => {

      if (!canEditFaculty) {
        return;
      }


      setEditing(
        item
      );


      setForm({
        full_name:
          item.full_name,

        department:
          item.department,

        designation:
          item.designation,

        qualification:
          item.qualification,

        specialization:
          item.specialization,

        experience:
          item.experience,

        bio:
          item.bio,

        email:
          item.email,

        profile_url:
          item.profile_url ||
          "",

        is_hod:
          item.is_hod,

        is_featured:
          item.is_featured,

        leadership_role:
          item.leadership_role ||
          (
            item.is_hod
              ? "HOD"
              : "Faculty"
          ),

        domain:
          item.domain || "",

        leadership_priority:
          String(
            item.leadership_priority ??
            (
              item.is_hod
                ? 20
                : 100
            )
          ),

        display_order:
          String(
            item.display_order
          ),
      });


      setPhotoFile(
        null
      );

      setShowForm(
        true
      );

      setSelectedFaculty(
        null
      );
    };


  // =========================================================
  // SAVE
  // =========================================================

  const saveFaculty =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();


      if (!canEditFaculty || (!editing && !canManage)) {
        return;
      }


      if (
        !form.full_name
          .trim() ||
        !form.department
          .trim() ||
        !form.designation
          .trim()
      ) {

        setStatus(
          "Name, department and designation are required."
        );

        return;
      }


      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }


      setSaving(
        true
      );

      setStatus(
        ""
      );


      try {

        const {
          data: auth,
        } =
          await client.auth
            .getUser();


        if (!auth.user) {
          throw new Error(
            "Session expired."
          );
        }


        let photoUrl =
          editing?.photo_url ||
          null;


        if (
          photoFile
        ) {
          photoUrl =
            await uploadPhoto(
              photoFile
            );
        }


        const payload = {
          full_name:
            form.full_name
              .trim(),

          department:
            form.department
              .trim(),

          designation:
            form.is_hod
              ? "HOD"
              : form.designation,

          qualification:
            form.qualification
              .trim(),

          specialization:
            form.specialization
              .trim(),

          experience:
            form.experience
              .trim(),

          bio:
            form.bio
              .trim(),

          email:
            form.email
              .trim(),

          profile_url:
            form.profile_url
              .trim() ||
            null,

          photo_url:
            photoUrl,

          is_hod:
            form.is_hod,

          

        leadership_role:
          form.leadership_role,

        domain:
          form.leadership_role ===
            "Domain Head"
              ? form.domain.trim() ||
                null
              : null,

        leadership_priority:
          Number(
            form.leadership_priority ||
            (
              form.leadership_role === "Dean"
                ? 10
                : form.leadership_role === "HOD"
                ? 20
                : form.leadership_role === "Domain Head"
                ? 30
                : form.leadership_role === "Program Coordinator"
                ? 40
                : 100
            )
          ),
is_featured:
            form.is_featured,

          display_order:
            Number(
              form.display_order ||
              100
            ),

          updated_at:
            new Date()
              .toISOString(),
        };


        if (editing) {

          const {
            data,
            error,
          } =
            await client
              .from(
                "campus_faculty"
              )
              .update(
                payload
              )
              .eq(
                "id",
                editing.id
              )
              .select()
              .single();


          if (error) {
            throw error;
          }


          setFaculty(
            current =>
              current.map(
                item =>
                  item.id ===
                    editing.id
                    ? data as
                        FacultyMember
                    : item
              )
          );


          setStatus(
            "Faculty profile updated."
          );

        } else {

          const {
            data,
            error,
          } =
            await client
              .from(
                "campus_faculty"
              )
              .insert({
                ...payload,

                created_by:
                  auth.user.id,

                status:
                  "Active",
              })
              .select()
              .single();


          if (error) {
            throw error;
          }


          setFaculty(
            current => [
              data as
                FacultyMember,
              ...current,
            ]
          );


          setStatus(
            "Faculty profile published."
          );

        }


        setShowForm(
          false
        );

        setEditing(
          null
        );

        setPhotoFile(
          null
        );


        await loadFaculty();

      } catch (
        error
      ) {

        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to save faculty profile."
        );

      } finally {

        setSaving(
          false
        );

      }
    };


  // =========================================================
  // DELETE
  // =========================================================

  const deleteFaculty =
    async (
      item:
        FacultyMember
    ) => {

      if (!canManage) {
        return;
      }


      if (
        !window.confirm(
          `Delete ${item.full_name}?`
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
        error,
      } =
        await client
          .from(
            "campus_faculty"
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


      setFaculty(
        current =>
          current.filter(
            row =>
              row.id !==
              item.id
          )
      );


      setSelectedFaculty(
        null
      );


      setStatus(
        "Faculty profile deleted."
      );
    };


  return (
    <div className="facultyDirectory">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="facultyHero">

        <div className="facultyHeroContent">

          <span>
            RNSIT ACADEMIC COMMUNITY
          </span>

          <h1>
            Meet our faculty.
          </h1>

          <p>
            Discover the educators, researchers and academic
            leaders shaping every department across our campus.
          </p>

          <div className="facultyHeroStats">

            <div>
              <strong>
                {faculty.length}
              </strong>

              <small>
                Faculty members
              </small>
            </div>

            <div>
              <strong>
                {
                  departments.filter(
                    item =>
                      item !==
                      "All"
                  ).length
                }
              </strong>

              <small>
                Departments
              </small>
            </div>

            <div>
              <strong>
                {
                  faculty.filter(
                    item =>
                      item.is_hod
                  ).length
                }
              </strong>

              <small>
                Department heads
              </small>
            </div>

          </div>

        </div>


        <div className="facultyHeroMark">
          <span>
            FACULTY
          </span>
        </div>

      </section>


      {/* =====================================================
          HEADER
      ====================================================== */}

      <section className="facultyDirectoryHead">

        <div>
          <span>
            PEOPLE OF RNSIT
          </span>

          <h2>
            Faculty directory
          </h2>

          <p>
            Browse faculty by department, designation or
            academic expertise.
          </p>
        </div>


        {canManage && (
          <div className="facultyDirectoryAdminButtons">

            <button
              type="button"
              className="facultyAddBranchButton"
              onClick={
                openAddBranch
              }
            >
              + Add branch
            </button>

            <button
              type="button"
              className="facultyAddButton"
              onClick={
                openAdd
              }
            >
              + Add faculty
            </button>

          </div>
        )}

      </section>


      {canManage && (
        <FacultyExcelImport
          onImported={() => {
            void loadFaculty();
          }}
        />
      )}


      {status && (
        <div className="facultyStatus">
          {status}
        </div>
      )}


      {/* =====================================================
          PROFESSIONAL DEPARTMENT DIRECTORY
      ====================================================== */}

      {loading ? (

        <div className="facultyLoading">
          Loading faculty directory...
        </div>

      ) : department === "All" ? (

        <>

          <section className="facultyBranchDirectoryIntro">

            <div>
              <span>
                MEET OUR FACULTY
              </span>

              <h2>
                Explore academic departments
              </h2>

              <p>
                Select a branch to meet its Head of Department,
                domain leaders and complete faculty team.
              </p>
            </div>


            <div className="facultyDirectorySummary">

              <strong>
                {facultyBranchCards.length}
              </strong>

              <small>
                Departments
              </small>


              <i/>


              <strong>
                {faculty.length}
              </strong>

              <small>
                Faculty
              </small>

            </div>

          </section>


          <section className="facultyBranchGrid">

            {facultyBranchCards.map(
              ({
                branch,
                meta,
                count,
                hod,
                domainHeads,
              }) => (

                <button
                  type="button"
                  className="facultyBranchCard"
                  key={
                    branch
                  }
                  onClick={() => {

                    setSearch(
                      ""
                    );

                    setDepartment(
                      branch
                    );


                    window.requestAnimationFrame(
                      () => {

                        const workspace =
                          document.querySelector(
                            ".workspace"
                          ) as HTMLElement | null;


                        workspace?.scrollTo({
                          top: 0,
                          behavior:
                            "instant",
                        });


                        window.scrollTo({
                          top: 0,
                          behavior:
                            "instant",
                        });

                      }
                    );

                  }}
                >

                  <div className="facultyBranchCardVisual">

                    <img
                      src={
                        meta.banner
                      }
                      alt={
                        meta.title
                      }
                    />


                    <div className="facultyBranchCardShade"/>


                    <div className="facultyBranchCode">
                      {meta.shortTitle}
                    </div>


                    <span className="facultyBranchCardCount">
                      {count}
                      {" "}
                      faculty
                    </span>

                  </div>


                  {canManage && (

                    <button
                      type="button"
                      className="facultyBranchEditButton"
                      onClick={
                        event => {

                          event.stopPropagation();

                          openEditBranch(
                            branches.find(
                              item =>
                                normalizeFacultyDepartment(
                                  item.code
                                ) ===
                                normalizeFacultyDepartment(
                                  branch
                                )
                            ) || {
                              id: "",
                              code: branch,
                              title: meta.title,
                              tagline: meta.tagline,
                              description: meta.description,
                              logo_url: null,
                              banner_url: meta.banner,
                              display_order: 100,
                              status: "Active",
                            }
                          );

                        }
                      }
                    >
                      Edit branch
                    </button>

                  )}


                  <div className="facultyBranchCardContent">

                    <span>
                      {meta.tagline}
                    </span>


                    <h3>
                      {meta.title}
                    </h3>


                    <p>
                      {meta.description}
                    </p>


                    <div className="facultyBranchInsights">

                      <div>

                        <small>
                          HEAD OF DEPARTMENT
                        </small>

                        <strong>
                          {hod
                            ? hod.full_name
                            : "To be updated"}
                        </strong>

                      </div>


                      <div>

                        <small>
                          DOMAIN HEADS
                        </small>

                        <strong>
                          {domainHeads}
                        </strong>

                      </div>

                    </div>


                    <footer>

                      <span>
                        Explore faculty
                      </span>

                      <strong>
                        Open branch →
                      </strong>

                    </footer>

                  </div>

                </button>

              )
            )}

          </section>

        </>

      ) : (

        <>

          <div className="facultyBranchPageToolbar">

            <button
              type="button"
              className="facultyBranchBack"
              onClick={() => {

                setDepartment(
                  "All"
                );

                setSearch(
                  ""
                );


                window.requestAnimationFrame(
                  () => {

                    const workspace =
                      document.querySelector(
                        ".workspace"
                      ) as HTMLElement | null;


                    workspace?.scrollTo({
                      top: 0,
                      behavior:
                        "instant",
                    });


                    window.scrollTo({
                      top: 0,
                      behavior:
                        "instant",
                    });

                  }
                );

              }}
            >

              <span>
                ←
              </span>


              <div>
                <small>
                  FACULTY DIRECTORY
                </small>

                <strong>
                  All departments
                </strong>
              </div>

            </button>


            <div className="facultyBranchBreadcrumb">

              <span>
                Departments
              </span>

              <i>
                ›
              </i>

              <strong>
                {department}
              </strong>

            </div>

          </div>


          {selectedBranchMeta && (

            <section className="facultyBranchHero">

              <img
                src={
                  selectedBranchMeta.banner
                }
                alt={
                  selectedBranchMeta.title
                }
              />


              <div className="facultyBranchHeroShade"/>


              <div className="facultyBranchHeroContent">

                <span>
                  {selectedBranchMeta.tagline}
                </span>


                <h1>
                  {selectedBranchMeta.title}
                </h1>


                <p>
                  {selectedBranchMeta.description}
                </p>


                <div className="facultyBranchHeroStats">

                  <div>
                    <strong>
                      {visibleFaculty.length}
                    </strong>

                    <small>
                      Faculty members
                    </small>
                  </div>


                  <div>
                    <strong>
                      {
                        visibleFaculty.filter(
                          member =>
                            member.leadership_role ===
                            "Domain Head"
                        ).length
                      }
                    </strong>

                    <small>
                      Domain heads
                    </small>
                  </div>


                  <div>
                    <strong>
                      {
                        visibleFaculty.filter(
                          member =>
                            member.is_hod ||
                            member.leadership_role ===
                              "HOD"
                        ).length
                      }
                    </strong>

                    <small>
                      Department head
                    </small>
                  </div>

                </div>

              </div>

            </section>

          )}


          <section className="facultyBranchDirectoryHead">

            <div>
              <span>
                MEET THE DEPARTMENT
              </span>

              <h2>
                {department} faculty
              </h2>

              <p>
                Academic leadership, domain expertise and
                teaching faculty.
              </p>
            </div>


            <label className="facultyBranchSearch">

              <span>
                ⌕
              </span>

              <input
                value={
                  search
                }
                onChange={
                  event =>
                    setSearch(
                      event.target.value
                    )
                }
                placeholder={`Search ${department} faculty...`}
              />

            </label>

          </section>


          {visibleFaculty.length ? (

            <section className="facultyGrid">

              {visibleFaculty.map(
                item => (

                  <article
                    className={
                      item.leadership_role ===
                        "Dean"
                        ? "facultyCard dean"
                        : item.is_hod ||
                          item.leadership_role ===
                            "HOD"
                        ? "facultyCard hod"
                        : "facultyCard"
                    }
                    key={
                      item.id
                    }
                  >

                    <button
                      type="button"
                      className="facultyCardMain"
                      onClick={() =>
                        openFacultyProfile(
                          item
                        )
                      }
                    >

                      <div className="facultyPhoto">

                        {item.photo_url ? (

                          <img
                            src={
                              item.photo_url
                            }
                            alt={
                              item.full_name
                            }
                          />

                        ) : (

                          <div className="facultyPhotoFallback">

                            {item.full_name
                              .split(" ")
                              .filter(
                                Boolean
                              )
                              .slice(
                                0,
                                2
                              )
                              .map(
                                word =>
                                  word[0]
                              )
                              .join("")
                              .toUpperCase()}

                          </div>

                        )}


                        {item.leadership_role &&
                          item.leadership_role !==
                            "Faculty" && (

                          <span
                            className={`facultyHodBadge facultyLeadershipBadge ${
                              item.leadership_role
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )
                            }`}
                          >

                            {item.leadership_role ===
                              "Dean"
                              ? "DEAN"
                              : item.leadership_role ===
                                "HOD"
                              ? "HEAD OF DEPARTMENT"
                              : item.leadership_role ===
                                "Domain Head"
                              ? `DOMAIN HEAD${
                                  item.domain
                                    ? ` · ${item.domain}`
                                    : ""
                                }`
                              : item.leadership_role
                            }

                          </span>

                        )}

                      </div>


                      <div className="facultyCardInfo">

                        <span>
                          {item.department}
                        </span>


                        <h3>
                          {item.full_name}
                        </h3>


                        <strong>
                          {item.designation}
                        </strong>


                        {item.leadership_role ===
                          "Domain Head" &&
                          item.domain && (

                          <span className="facultyCardDomain">
                            {item.domain}
                          </span>

                        )}


                        {item.qualification && (

                          <p>
                            {item.qualification}
                          </p>

                        )}


                        {item.specialization && (

                          <small>
                            {item.specialization}
                          </small>

                        )}


                        <div className="facultyCardFooter">

                          <span>
                            View profile
                          </span>

                          <b>
                            →
                          </b>

                        </div>

                      </div>

                    </button>


                    {canManage && (

                      <div className="facultyAdminActions">

                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
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
                            void deleteFaculty(
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

          ) : (

            <div className="facultyEmpty">

              <strong>
                No faculty found
              </strong>

              <p>
                No faculty matches the current search.
              </p>


              {search && (

                <button
                  type="button"
                  onClick={() =>
                    setSearch(
                      ""
                    )
                  }
                >
                  Clear search
                </button>

              )}

            </div>

          )}

        </>

      )}


      {showBranchForm &&
        typeof document !== "undefined" &&
        createPortal(

        <div
          className="facultyModalLayer facultyBranchEditLayer"
          onClick={() =>
            setShowBranchForm(
              false
            )
          }
        >

          <form
            className="facultyBranchEditor"
            onSubmit={
              saveFacultyBranch
            }
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>

              <div>

                <span>
                  FACULTY DIRECTORY
                </span>

                <h2>
                  {editingBranch
                    ? "Edit branch"
                    : "Add branch"}
                </h2>

              </div>


              <button
                type="button"
                onClick={() =>
                  setShowBranchForm(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="facultyBranchEditorGrid">

              <label>

                <span>
                  Branch code
                </span>

                <input
                  value={
                    branchForm.code
                  }
                  onChange={
                    event =>
                      setBranchForm({
                        ...branchForm,
                        code:
                          event.target.value
                            .toUpperCase(),
                      })
                  }
                  placeholder="ECE"
                  required
                />

              </label>


              <label>

                <span>
                  Branch title
                </span>

                <input
                  value={
                    branchForm.title
                  }
                  onChange={
                    event =>
                      setBranchForm({
                        ...branchForm,
                        title:
                          event.target.value,
                      })
                  }
                  placeholder="Electronics & Communication Engineering"
                  required
                />

              </label>


              <label className="facultyBranchEditorFull">

                <span>
                  Tagline
                </span>

                <input
                  value={
                    branchForm.tagline
                  }
                  onChange={
                    event =>
                      setBranchForm({
                        ...branchForm,
                        tagline:
                          event.target.value,
                      })
                  }
                  placeholder="Circuits · Communication · Intelligence"
                />

              </label>


              <label className="facultyBranchEditorFull">

                <span>
                  Description
                </span>

                <textarea
                  rows={5}
                  value={
                    branchForm.description
                  }
                  onChange={
                    event =>
                      setBranchForm({
                        ...branchForm,
                        description:
                          event.target.value,
                      })
                  }
                />

              </label>


              <label>

                <span>
                  Branch logo
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    event =>
                      setBranchLogoFile(
                        event.target
                          .files?.[0] ||
                        null
                      )
                  }
                />

              </label>


              <label>

                <span>
                  Branch banner
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    event =>
                      setBranchBannerFile(
                        event.target
                          .files?.[0] ||
                        null
                      )
                  }
                />

              </label>


              <label>

                <span>
                  Display order
                </span>

                <input
                  type="number"
                  value={
                    branchForm.display_order
                  }
                  onChange={
                    event =>
                      setBranchForm({
                        ...branchForm,
                        display_order:
                          event.target.value,
                      })
                  }
                />

              </label>


              <label>

                <span>
                  Status
                </span>

                <select
                  value={
                    branchForm.status
                  }
                  onChange={
                    event =>
                      setBranchForm({
                        ...branchForm,
                        status:
                          event.target.value as
                            "Active" |
                            "Inactive",
                      })
                  }
                >

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>

                </select>

              </label>

            </div>


            <footer>

              <button
                type="button"
                onClick={() =>
                  setShowBranchForm(
                    false
                  )
                }
              >
                Cancel
              </button>


              <button
                type="submit"
                className="facultySaveButton"
                disabled={
                  savingBranch
                }
              >
                {savingBranch
                  ? "Saving..."
                  : editingBranch
                  ? "Save branch"
                  : "Create branch"}
              </button>

            </footer>

          </form>

        </div>,

        document.body
      )}


      {/* =====================================================
          PROFILE MODAL
      ====================================================== */}

      {selectedFaculty &&
        typeof document !== "undefined" &&
        createPortal(

        <div
          className="facultyModalLayer"
          onClick={() =>
            setSelectedFaculty(
              null
            )
          }
        >

          <section
            className="facultyProfileModal"
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <button
              type="button"
              className="facultyModalClose"
              onClick={() =>
                setSelectedFaculty(
                  null
                )
              }
            >
              ×
            </button>


            <div className="facultyProfilePhoto">

              {selectedFaculty.photo_url ? (

                <img
                  src={
                    selectedFaculty.photo_url
                  }
                  alt={
                    selectedFaculty.full_name
                  }
                />

              ) : (

                <strong>
                  {selectedFaculty.full_name
                    .charAt(0)
                    .toUpperCase()}
                </strong>

              )}

            </div>


            <div className="facultyProfileContent">

              <span className="facultyProfileDepartment">
                {selectedFaculty.department}
              </span>


              <h2>
                {selectedFaculty.full_name}
              </h2>


              <h3>
                {selectedFaculty.designation}
              </h3>


              {selectedFaculty.leadership_role &&
                selectedFaculty.leadership_role !==
                  "Faculty" && (

                <div className="facultyProfileHod facultyProfileLeadership">

                  <strong>
                    {selectedFaculty.leadership_role ===
                      "HOD"
                      ? "Head of Department"
                      : selectedFaculty.leadership_role}
                  </strong>


                  {selectedFaculty.leadership_role ===
                    "Domain Head" &&
                    selectedFaculty.domain && (

                    <small>
                      {selectedFaculty.domain}
                    </small>

                  )}

                </div>

              )}


              <div className="facultyProfileFacts">

                <div>
                  <small>
                    EDUCATION
                  </small>

                  <strong>
                    {selectedFaculty.qualification ||
                      "Not provided"}
                  </strong>
                </div>


                <div>
                  <small>
                    SPECIALIZATION
                  </small>

                  <strong>
                    {selectedFaculty.specialization ||
                      "Not provided"}
                  </strong>
                </div>


                <div>
                  <small>
                    EXPERIENCE
                  </small>

                  <strong>
                    {selectedFaculty.experience ||
                      "Not provided"}
                  </strong>
                </div>

              </div>


              {selectedFaculty.bio && (
                <div className="facultyProfileAbout">

                  <small>
                    ABOUT
                  </small>

                  <p>
                    {selectedFaculty.bio}
                  </p>

                </div>
              )}


              <div className="facultyProfileLinks">

                {selectedFaculty.email && (

                  <button
                    type="button"
                    className="facultyProfileActionLink"
                    onClick={() =>
                      openFacultyEmail(
                        selectedFaculty.email
                      )
                    }
                  >
                    ✉ Email faculty
                  </button>

                )}


                {selectedFaculty.profile_url && (

                  <button
                    type="button"
                    className="facultyProfileActionLink"
                    onClick={() =>
                      openAcademicProfile(
                        selectedFaculty.profile_url
                      )
                    }
                  >
                    Academic profile ↗
                  </button>

                )}

              </div>

            </div>

          </section>

        </div>

        ,
        document.body
      )}


      {/* =====================================================
          ADMIN FORM
      ====================================================== */}

      {showForm &&
        canManage &&
        typeof document !== "undefined" &&
        createPortal(

        <div className="facultyModalLayer facultyEditModalLayer">

          <form
            className="facultyEditor"
            onSubmit={
              saveFaculty
            }
          >

            <header>

              <div>
                <span>
                  FACULTY DIRECTORY
                </span>

                <h2>
                  {editing
                    ? "Edit faculty profile"
                    : "Add faculty member"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="facultyEditorGrid">

              <label>
                <span>
                  Full name
                </span>

                <input
                  value={
                    form.full_name
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        full_name:
                          event.target
                            .value,
                      })
                  }
                  required
                />
              </label>


              <label>
                <span>
                  Department / Branch
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
                          event.target
                            .value
                            .toUpperCase(),
                      })
                  }
                  placeholder="ECE"
                  required
                />
              </label>


              <label>
                <span>
                  Designation
                </span>

                <select
                  value={
                    form.designation
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        designation:
                          event.target
                            .value,
                      })
                  }
                >

                  {designationOrder.map(
                    designation => (
                      <option
                        value={
                          designation
                        }
                        key={
                          designation
                        }
                      >
                        {designation}
                      </option>
                    )
                  )}

                </select>
              </label>


              <label>
                <span>
                  Academic leadership role
                </span>

                <select
                  value={
                    form.leadership_role
                  }
                  onChange={
                    event => {

                      const nextRole =
                        event.target
                          .value as
                          typeof form.leadership_role;


                      const priority =
                        nextRole === "Dean"
                          ? "10"
                          : nextRole === "HOD"
                          ? "20"
                          : nextRole === "Domain Head"
                          ? "30"
                          : nextRole === "Program Coordinator"
                          ? "40"
                          : "100";


                      setForm({
                        ...form,

                        leadership_role:
                          nextRole,

                        is_hod:
                          nextRole ===
                          "HOD",

                        leadership_priority:
                          priority,

                        domain:
                          nextRole ===
                            "Domain Head"
                            ? form.domain
                            : "",
                      });
                    }
                  }
                >

                  {leadershipRoles.map(
                    leadership => (
                      <option
                        value={
                          leadership
                        }
                        key={
                          leadership
                        }
                      >
                        {leadership}
                      </option>
                    )
                  )}

                </select>
              </label>


              {form.leadership_role ===
                "Domain Head" && (

                <label>
                  <span>
                    Domain / Academic Area
                  </span>

                  <input
                    value={
                      form.domain
                    }
                    onChange={
                      event =>
                        setForm({
                          ...form,

                          domain:
                            event.target
                              .value,
                        })
                    }
                    list="faculty-domain-options"
                    placeholder="VLSI & Semiconductor Systems"
                    required
                  />

                  <datalist id="faculty-domain-options">
                    {domainOptions.map(
                      domain => (
                        <option
                          value={
                            domain
                          }
                          key={
                            domain
                          }
                        />
                      )
                    )}
                  </datalist>

                </label>

              )}


              <label>
                <span>
                  Leadership priority
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    form.leadership_priority
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,

                        leadership_priority:
                          event.target
                            .value,
                      })
                  }
                />
              </label>


              <label>
                <span>
                  Education / Qualification
                </span>

                <input
                  value={
                    form.qualification
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        qualification:
                          event.target
                            .value,
                      })
                  }
                  placeholder="Ph.D., M.Tech, B.E."
                />
              </label>


              <label>
                <span>
                  Specialization
                </span>

                <input
                  value={
                    form.specialization
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        specialization:
                          event.target
                            .value,
                      })
                  }
                  placeholder="VLSI, Embedded Systems..."
                />
              </label>


              <label>
                <span>
                  Experience
                </span>

                <input
                  value={
                    form.experience
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        experience:
                          event.target
                            .value,
                      })
                  }
                  placeholder="18+ years"
                />
              </label>


              <label>
                <span>
                  Official email
                </span>

                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        email:
                          event.target
                            .value,
                      })
                  }
                />
              </label>


              <label>
                <span>
                  Academic profile URL
                </span>

                <input
                  value={
                    form.profile_url
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        profile_url:
                          event.target
                            .value,
                      })
                  }
                />
              </label>


              <label className="facultyEditorFull">
                <span>
                  About faculty
                </span>

                <textarea
                  value={
                    form.bio
                  }
                  onChange={
                    event =>
                      setForm({
                        ...form,
                        bio:
                          event.target
                            .value,
                      })
                  }
                  rows={
                    5
                  }
                />
              </label>


              <label>
                <span>
                  Professional photo
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
                          event.target
                            .value,
                      })
                  }
                />
              </label>

            </div>


            <div className="facultyEditorChecks">

              <label>
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
                          event.target
                            .checked,
                      })
                  }
                />

                <span>
                  Featured faculty
                </span>
              </label>

            </div>


            <footer>

              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="facultySaveButton"
                disabled={
                  saving
                }
              >
                {saving
                  ? "Saving..."
                  : editing
                  ? "Save changes"
                  : "Publish faculty"}
              </button>

            </footer>

          </form>

        </div>

        ,
        document.body
      )}

    </div>
  );
}
