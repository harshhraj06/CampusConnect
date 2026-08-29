"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {getSupabaseClient} from "../lib/supabase";


type ActivityRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


export type ActivityCenterProfile = {
  name: string;
  email: string;
  department: string;
  year: string;
  role: ActivityRole;
  campus_uid?: string;
  avatar_url?: string;
};


type Club = {
  id: string;
  name: string;
  short_name: string;
  category: string;
  description: string;
  tagline: string;
  department: string;
  logo_url: string | null;
  banner_url: string | null;
  video_banner_url: string | null;
  poster_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  contact_email: string;
  founded_year: string;
  status: string;
  is_featured: boolean;
  created_by?: string | null;
  created_by_name?: string;
  created_at?: string;
};


type ClubMember = {
  id: string;
  club_id: string;
  student_id?: string | null;
  member_name: string;
  campus_uid: string;
  role_title: string;
  department: string;
  academic_year: string;
  photo_url: string | null;
  bio: string;
  linkedin_url: string | null;
  instagram_url: string | null;
  display_order: number;
  is_current: boolean;
};


type ClubGalleryItem = {
  id: string;
  club_id: string;
  title: string;
  description: string;
  image_url: string;
  activity_date: string | null;
  uploaded_by_name: string;
  created_at: string;
};


type Sport = {
  id: string;
  name: string;
  sport_type: string;
  description: string;
  tagline: string;
  logo_url: string | null;
  banner_url: string | null;
  poster_url: string | null;
  coach_name: string;
  captain_name: string;
  venue: string;
  practice_schedule: string;
  achievements: string;
  contact_email: string;
  instagram_url: string | null;
  status: string;
  is_featured: boolean;
};


const blankClubForm = {
  name: "",
  short_name: "",
  category: "Technical",
  description: "",
  tagline: "",
  department: "All",
  contact_email: "",
  founded_year: "",
  instagram_url: "",
  linkedin_url: "",
  website_url: "",
  is_featured: false,
};


const blankSportForm = {
  name: "",
  sport_type: "Team",
  description: "",
  tagline: "",
  coach_name: "",
  captain_name: "",
  venue: "",
  practice_schedule: "",
  achievements: "",
  contact_email: "",
  instagram_url: "",
  is_featured: false,
};


const blankMemberForm = {
  member_name: "",
  campus_uid: "",
  role_title: "Member",
  department: "",
  academic_year: "",
  bio: "",
  linkedin_url: "",
  instagram_url: "",
};


const blankGalleryForm = {
  title: "",
  description: "",
  activity_date: "",
};


const leadershipOrder = [
  "Faculty Advisor",
  "President",
  "Vice President",
  "Chairperson",
  "Team Head",
  "Head",
  "Secretary",
  "Treasurer",
  "Technical Lead",
  "Creative Lead",
  "Coordinator",
  "Core Member",
  "Member",
];


export function ActivityCenter({
  profile,
}: {
  profile: ActivityCenterProfile;
}) {
  const [tab, setTab] =
    useState<"Clubs" | "Sports">("Clubs");

  const [clubs, setClubs] =
    useState<Club[]>([]);

  const [sports, setSports] =
    useState<Sport[]>([]);

  const [members, setMembers] =
    useState<ClubMember[]>([]);

  const [gallery, setGallery] =
    useState<ClubGalleryItem[]>([]);

  const [selectedClubId, setSelectedClubId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const [showClubForm, setShowClubForm] =
    useState(false);

  const [showSportForm, setShowSportForm] =
    useState(false);

  const [showMemberForm, setShowMemberForm] =
    useState(false);

  const [showGalleryForm, setShowGalleryForm] =
    useState(false);

  const [galleryViewer, setGalleryViewer] =
    useState<ClubGalleryItem | null>(null);

  const [clubForm, setClubForm] =
    useState(blankClubForm);

  const [sportForm, setSportForm] =
    useState(blankSportForm);

  const [memberForm, setMemberForm] =
    useState(blankMemberForm);

  const [galleryForm, setGalleryForm] =
    useState(blankGalleryForm);

  const [logoFile, setLogoFile] =
    useState<File | null>(null);

  const [bannerFile, setBannerFile] =
    useState<File | null>(null);

  const [sportLogoFile, setSportLogoFile] =
    useState<File | null>(null);

  const [sportBannerFile, setSportBannerFile] =
    useState<File | null>(null);

  const [sportPosterFile, setSportPosterFile] =
    useState<File | null>(null);

  const [posterFile, setPosterFile] =
    useState<File | null>(null);

  const [videoBannerFile, setVideoBannerFile] =
    useState<File | null>(null);

  const [editingClub, setEditingClub] =
    useState<Club | null>(null);

  const [editClubForm, setEditClubForm] =
    useState(blankClubForm);

  const [editLogoFile, setEditLogoFile] =
    useState<File | null>(null);

  const [editBannerFile, setEditBannerFile] =
    useState<File | null>(null);

  const [editVideoBannerFile, setEditVideoBannerFile] =
    useState<File | null>(null);

  const [editPosterFile, setEditPosterFile] =
    useState<File | null>(null);

  const [removeVideoBanner, setRemoveVideoBanner] =
    useState(false);

  const [memberPhotoFile, setMemberPhotoFile] =
    useState<File | null>(null);

  const [galleryFile, setGalleryFile] =
    useState<File | null>(null);


  /*
   * Activity Center management is intentionally restricted.
   *
   * Coordinator:
   * - clubs
   * - sports
   * - banners
   * - gallery
   * - team members
   *
   * Main Admin:
   * - full Activity Center control
   *
   * No other role receives management permission.
   */
  const canManage =
    profile.role === "Coordinator" ||
    profile.role === "Main Admin";


  const selectedClub =
    clubs.find(
      club =>
        club.id === selectedClubId
    ) || null;


  // =========================================================
  // PRIVATE ACTIVITY CENTER MEDIA
  // =========================================================

  const getActivityStoragePath =
    (
      value:
        string |
        null |
        undefined
    ) => {

      if (!value) {
        return null;
      }

      /*
       * New records may already contain only the object path.
       */
      if (
        !value.startsWith(
          "http://"
        ) &&
        !value.startsWith(
          "https://"
        )
      ) {
        return value
          .replace(
            /^\/+/,
            ""
          );
      }


      /*
       * Existing records currently contain URLs such as:
       *
       * /storage/v1/object/public/activity-center/<path>
       *
       * or
       *
       * /storage/v1/object/sign/activity-center/<path>
       */

      const publicMarker =
        "/storage/v1/object/public/activity-center/";

      const signedMarker =
        "/storage/v1/object/sign/activity-center/";

      const authenticatedMarker =
        "/storage/v1/object/authenticated/activity-center/";

      let pathValue =
        "";


      if (
        value.includes(
          publicMarker
        )
      ) {
        pathValue =
          value.split(
            publicMarker
          )[1] || "";

      } else if (
        value.includes(
          signedMarker
        )
      ) {
        pathValue =
          value.split(
            signedMarker
          )[1] || "";

      } else if (
        value.includes(
          authenticatedMarker
        )
      ) {
        pathValue =
          value.split(
            authenticatedMarker
          )[1] || "";

      } else {

        return null;

      }


      /*
       * Remove signed URL query parameters.
       */
      pathValue =
        pathValue.split(
          "?"
        )[0];


      try {
        return decodeURIComponent(
          pathValue
        );
      } catch {
        return pathValue;
      }
    };


  /*
   * =========================================================
   * ACTIVITY CENTER MEDIA RESOLVER
   * =========================================================
   *
   * The activity-center bucket is public.
   *
   * Older database records may contain:
   *
   * - public Supabase URLs
   * - signed Supabase URLs
   * - authenticated Supabase URLs
   * - raw storage paths
   *
   * Do NOT create a new signed URL for every render.
   * Convert everything to the canonical public URL instead.
   */

  const createActivitySignedUrl =
    async (
      value: string | null | undefined
    ): Promise<string | null> => {

      if (!value) {
        return null;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return null;
      }

      /*
       * Convert every supported database value into
       * an activity-center object path.
       *
       * Supports:
       * - raw storage paths
       * - old public URLs
       * - old signed URLs
       * - authenticated URLs
       */

      let objectPath = value.trim();

      const markers = [
        "/storage/v1/object/public/activity-center/",
        "/storage/v1/object/sign/activity-center/",
        "/storage/v1/object/authenticated/activity-center/",
      ];

      if (
        objectPath.startsWith("http://") ||
        objectPath.startsWith("https://")
      ) {
        const marker =
          markers.find(item =>
            objectPath.includes(item)
          );

        if (!marker) {
          /*
           * Non-Supabase external image.
           * Keep it unchanged.
           */
          return objectPath;
        }

        objectPath =
          objectPath.split(marker)[1] || "";
      }

      objectPath =
        objectPath
          .split("?")[0]
          .replace(/^\/+/, "");

      try {
        objectPath =
          decodeURIComponent(
            objectPath
          );
      } catch {
        // Keep original path if decoding fails.
      }

      if (!objectPath) {
        return null;
      }

      const {
        data,
        error,
      } =
        await client.storage
          .from("activity-center")
          .createSignedUrl(
            objectPath,
            60 * 60 * 6
          );

      if (error) {
        console.error(
          "[Activity Center] signed URL failed",
          {
            original: value,
            path: objectPath,
            error,
          }
        );

        return null;
      }

      return (
        data?.signedUrl ||
        null
      );
    };

  const signClubMedia =
    async (
      club: Club
    ): Promise<Club> => {

      const [
        logoUrl,
        bannerUrl,
        videoBannerUrl,
        posterUrl,
      ] =
        await Promise.all([
          createActivitySignedUrl(
            club.logo_url
          ),

          createActivitySignedUrl(
            club.banner_url
          ),

          createActivitySignedUrl(
            club.video_banner_url
          ),

          createActivitySignedUrl(
            club.poster_url
          ),
        ]);


      return {
        ...club,

        logo_url:
          logoUrl,

        banner_url:
          bannerUrl,

        video_banner_url:
          videoBannerUrl,

        poster_url:
          posterUrl,
      };
    };


  const signSportMedia =
    async (
      sport: Sport
    ): Promise<Sport> => {

      const [
        logoUrl,
        bannerUrl,
        posterUrl,
      ] =
        await Promise.all([
          createActivitySignedUrl(
            sport.logo_url
          ),

          createActivitySignedUrl(
            sport.banner_url
          ),

          createActivitySignedUrl(
            sport.poster_url
          ),
        ]);


      return {
        ...sport,

        logo_url:
          logoUrl,

        banner_url:
          bannerUrl,

        poster_url:
          posterUrl,
      };
    };


  const signMemberMedia =
    async (
      member:
        ClubMember
    ): Promise<ClubMember> => {

      return {
        ...member,

        photo_url:
          await createActivitySignedUrl(
            member.photo_url
          ),
      };
    };


  const signGalleryMedia =
    async (
      item:
        ClubGalleryItem
    ): Promise<ClubGalleryItem> => {

      return {
        ...item,

        image_url:
          (
            await createActivitySignedUrl(
              item.image_url
            )
          ) || "",
      };
    };


  const loadActivityCenter =
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

      const [
        clubResult,
        sportResult,
      ] =
        await Promise.all([
          client
            .from("campus_clubs")
            .select("*")
            .neq(
              "status",
              "Archived"
            )
            .order(
              "is_featured",
              {
                ascending: false,
              }
            )
            .order(
              "name",
              {
                ascending: true,
              }
            ),

          client
            .from("campus_sports")
            .select("*")
            .neq(
              "status",
              "Archived"
            )
            .order(
              "is_featured",
              {
                ascending: false,
              }
            )
            .order(
              "name",
              {
                ascending: true,
              }
            ),
        ]);

      if (clubResult.error) {
        console.error(
          clubResult.error
        );

        setStatus(
          clubResult.error.message
        );
      } else {
        const rawRows =
          (clubResult.data || []) as
            Club[];

        console.log(
          "[Activity Center] CLUB MEDIA FROM DATABASE",
          rawRows.map(
            club => ({
              name:
                club.name,

              logo:
                club.logo_url,

              banner:
                club.banner_url,

              video:
                club.video_banner_url,

              poster:
                club.poster_url,
            })
          )
        );

        const rows =
          await Promise.all(
            rawRows.map(
              signClubMedia
            )
          );

        setClubs(rows);

        setSelectedClubId(
          current =>
            current &&
            rows.some(
              club =>
                club.id === current
            )
              ? current
              : ""
        );
      }

      if (sportResult.error) {
        console.error(
          sportResult.error
        );
      } else {
        const rawSports =
          (sportResult.data || []) as
            Sport[];

        const signedSports =
          await Promise.all(
            rawSports.map(
              signSportMedia
            )
          );

        setSports(
          signedSports
        );
      }

      setLoading(false);
    };


  const loadClubDetail =
    async (
      clubId: string
    ) => {
      if (!clubId) {
        setMembers([]);
        setGallery([]);
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setDetailLoading(true);

      const [
        memberResult,
        galleryResult,
      ] =
        await Promise.all([
          client
            .from(
              "campus_club_members"
            )
            .select("*")
            .eq(
              "club_id",
              clubId
            )
            .eq(
              "is_current",
              true
            )
            .order(
              "display_order",
              {
                ascending: true,
              }
            )
            .order(
              "created_at",
              {
                ascending: true,
              }
            ),

          client
            .from(
              "campus_club_gallery"
            )
            .select("*")
            .eq(
              "club_id",
              clubId
            )
            .order(
              "activity_date",
              {
                ascending: false,
              }
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),
        ]);

      if (!memberResult.error) {

        const rawMembers =
          (memberResult.data || []) as
            ClubMember[];

        const signedMembers =
          await Promise.all(
            rawMembers.map(
              signMemberMedia
            )
          );

        setMembers(
          signedMembers
        );
      }

      if (!galleryResult.error) {

        const rawGallery =
          (galleryResult.data || []) as
            ClubGalleryItem[];

        console.log(
          "[Activity Center] GALLERY MEDIA FROM DATABASE",
          rawGallery.map(
            item => ({
              title:
                item.title,

              image:
                item.image_url,
            })
          )
        );

        const signedGallery =
          await Promise.all(
            rawGallery.map(
              signGalleryMedia
            )
          );

        setGallery(
          signedGallery
        );
      }

      setDetailLoading(false);
    };


  useEffect(() => {
    void loadActivityCenter();
  }, []);


  useEffect(() => {
    void loadClubDetail(
      selectedClubId
    );
  }, [
    selectedClubId,
  ]);


  // =========================================================
  // CLUB PROFILE PAGE POSITION
  // =========================================================

  useEffect(() => {

    if (!selectedClubId) {
      return;
    }

    const frame =
      window.requestAnimationFrame(
        () => {

          const workspace =
            document.querySelector(
              ".workspace"
            ) as HTMLElement | null;

          if (workspace) {
            workspace.scrollTo({
              top: 0,
              behavior: "instant",
            });
          }

          window.scrollTo({
            top: 0,
            behavior: "instant",
          });

        }
      );

    return () =>
      window.cancelAnimationFrame(
        frame
      );

  }, [
    selectedClubId,
  ]);


  const uploadActivityFile =
    async (
      file: File,
      folder: string
    ): Promise<string> => {

      const client =
        getSupabaseClient();

      if (!client) {

        throw new Error(
          "Supabase is unavailable."
        );

      }


      const {
        data: auth,
      } =
        await client.auth
          .getUser();


      if (!auth.user) {

        throw new Error(
          "Your session has expired. Sign in again."
        );

      }


      /*
       * -----------------------------------------------------
       * FILE TYPE
       * -----------------------------------------------------
       */

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "";


      const mimeByExtension:
        Record<string, string> = {

        jpg:
          "image/jpeg",

        jpeg:
          "image/jpeg",

        png:
          "image/png",

        webp:
          "image/webp",

        gif:
          "image/gif",

        mp4:
          "video/mp4",

        webm:
          "video/webm",

        mov:
          "video/quicktime",

        m4v:
          "video/x-m4v",

      };


      const contentType =
        file.type ||
        mimeByExtension[
          extension
        ] ||
        "";


      const imageExtensions =
        [
          "jpg",
          "jpeg",
          "png",
          "webp",
          "gif",
        ];


      const videoExtensions =
        [
          "mp4",
          "webm",
          "mov",
          "m4v",
        ];


      const isImage =
        imageExtensions.includes(
          extension
        ) ||
        contentType.startsWith(
          "image/"
        );


      const isVideo =
        videoExtensions.includes(
          extension
        ) ||
        contentType.startsWith(
          "video/"
        );


      if (
        !isImage &&
        !isVideo
      ) {

        throw new Error(
          "Unsupported media. Use JPG, PNG, WEBP, GIF, MP4, WebM, MOV or M4V."
        );

      }


      /*
       * -----------------------------------------------------
       * SIZE VALIDATION
       * -----------------------------------------------------
       */

      const maxSize =
        isVideo
          ? 50 *
            1024 *
            1024
          : 10 *
            1024 *
            1024;


      if (
        file.size >
        maxSize
      ) {

        throw new Error(
          isVideo
            ? "Video must be smaller than 50 MB."
            : "Image must be smaller than 10 MB."
        );

      }


      /*
       * -----------------------------------------------------
       * SAFE STORAGE NAME
       * -----------------------------------------------------
       */

      const safeName =
        file.name
          .replace(
            /\.[^/.]+$/,
            ""
          )
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          )
          .replace(
            /^-|-$/g,
            ""
          )
          .slice(
            0,
            45
          ) ||
        "activity-media";


      const safeExtension =
        extension ||
        (
          isVideo
            ? "mp4"
            : "jpg"
        );


      /*
       * IMPORTANT:
       *
       * First folder MUST be auth.user.id.
       * This matches Supabase Storage RLS.
       */

      const filePath =

        `${auth.user.id}/` +

        `${folder}/` +

        `${Date.now()}-` +

        `${crypto.randomUUID()}-` +

        `${safeName}.` +

        `${safeExtension}`;


      /*
       * -----------------------------------------------------
       * UPLOAD
       * -----------------------------------------------------
       */

      const {
        error: uploadError,
      } =

        await client.storage

          .from(
            "activity-center"
          )

          .upload(
            filePath,
            file,
            {

              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                contentType ||
                undefined,

            }
          );


      if (uploadError) {

        console.error(
          "[Activity Center] media upload failed",
          {
            folder,
            file:
              file.name,
            type:
              contentType,
            size:
              file.size,
            error:
              uploadError,
          }
        );


        throw new Error(
          `Unable to upload ${file.name}: ${uploadError.message}`
        );

      }


      /*
       * PRIVATE BUCKET:
       *
       * Save object PATH to DB.
       *
       * signClubMedia() creates a temporary
       * signed URL when displaying it.
       */

      return filePath;

    };


  const createClub =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (!canManage) {
        return;
      }

      if (
        !clubForm.name.trim()
      ) {
        return setStatus(
          "Club name is required."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);
      setStatus("");

      try {
        const {
          data: auth,
        } =
          await client.auth
            .getUser();

        if (!auth.user) {
          throw new Error(
            "Your session has expired."
          );
        }

        const [
          logoUrl,
          bannerUrl,
          videoBannerUrl,
          posterUrl,
        ] =
          await Promise.all([
            logoFile
              ? uploadActivityFile(
                  logoFile,
                  "club-logos"
                )
              : Promise.resolve(
                  null
                ),

            bannerFile
              ? uploadActivityFile(
                  bannerFile,
                  "club-banners"
                )
              : Promise.resolve(
                  null
                ),

            videoBannerFile
              ? uploadActivityFile(
                  videoBannerFile,
                  "club-video-banners"
                )
              : Promise.resolve(
                  null
                ),

            posterFile
              ? uploadActivityFile(
                  posterFile,
                  "club-posters"
                )
              : Promise.resolve(
                  null
                ),
          ]);

        const {
          data,
          error,
        } =
          await client
            .from(
              "campus_clubs"
            )
            .insert({
              name:
                clubForm.name.trim(),

              short_name:
                clubForm.short_name
                  .trim(),

              category:
                clubForm.category,

              description:
                clubForm.description
                  .trim(),

              tagline:
                clubForm.tagline
                  .trim(),

              department:
                clubForm.department ||
                "All",

              contact_email:
                clubForm.contact_email
                  .trim(),

              founded_year:
                clubForm.founded_year
                  .trim(),

              instagram_url:
                clubForm.instagram_url
                  .trim() ||
                null,

              linkedin_url:
                clubForm.linkedin_url
                  .trim() ||
                null,

              website_url:
                clubForm.website_url
                  .trim() ||
                null,

              logo_url:
                logoUrl,

              banner_url:
                bannerUrl,

              video_banner_url:
                videoBannerUrl,

              poster_url:
                posterUrl,

              is_featured:
                clubForm.is_featured,

              created_by:
                auth.user.id,

              created_by_name:
                profile.name,

              status:
                "Active",
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        const created =
          await signClubMedia(
            data as Club
          );

        setClubs(
          current => [
            created,
            ...current,
          ]
        );

        setSelectedClubId(
          created.id
        );

        setClubForm(
          blankClubForm
        );

        setLogoFile(null);
        setBannerFile(null);
        setVideoBannerFile(null);
        setPosterFile(null);

        setShowClubForm(
          false
        );

        setStatus(
          `${created.name} created successfully.`
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to create club."
        );
      } finally {
        setBusy(false);
      }
    };


  const openClubEditor =
    (
      club: Club
    ) => {
      if (!canManage) {
        return;
      }

      setEditClubForm({
        name:
          club.name || "",

        short_name:
          club.short_name || "",

        category:
          club.category || "Technical",

        description:
          club.description || "",

        tagline:
          club.tagline || "",

        department:
          club.department || "All",

        contact_email:
          club.contact_email || "",

        founded_year:
          club.founded_year || "",

        instagram_url:
          club.instagram_url || "",

        linkedin_url:
          club.linkedin_url || "",

        website_url:
          club.website_url || "",

        is_featured:
          Boolean(
            club.is_featured
          ),
      });

      setEditLogoFile(null);
      setEditBannerFile(null);
      setEditVideoBannerFile(null);
      setEditPosterFile(null);
      setRemoveVideoBanner(false);

      setEditingClub(
        club
      );

      setStatus("");
    };


  const saveClubEdit =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !canManage ||
        !editingClub
      ) {
        return;
      }

      if (
        !editClubForm.name.trim()
      ) {
        return setStatus(
          "Club name is required."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);
      setStatus("");

      try {

        let logoUrl =
          editingClub.logo_url;

        let bannerUrl =
          editingClub.banner_url;

        let videoBannerUrl =
          editingClub.video_banner_url;

        let posterUrl =
          editingClub.poster_url;


        if (
          editLogoFile
        ) {
          logoUrl =
            await uploadActivityFile(
              editLogoFile,
              "club-logos"
            );
        }


        if (
          editBannerFile
        ) {
          bannerUrl =
            await uploadActivityFile(
              editBannerFile,
              "club-banners"
            );
        }


        if (
          editVideoBannerFile
        ) {
          videoBannerUrl =
            await uploadActivityFile(
              editVideoBannerFile,
              "club-video-banners"
            );
        }


        if (
          removeVideoBanner
        ) {
          videoBannerUrl =
            null;
        }


        if (
          editPosterFile
        ) {
          posterUrl =
            await uploadActivityFile(
              editPosterFile,
              "club-posters"
            );
        }


        const {
          data,
          error,
        } =
          await client
            .from(
              "campus_clubs"
            )
            .update({
              name:
                editClubForm.name
                  .trim(),

              short_name:
                editClubForm.short_name
                  .trim(),

              category:
                editClubForm.category,

              description:
                editClubForm.description
                  .trim(),

              tagline:
                editClubForm.tagline
                  .trim(),

              department:
                editClubForm.department
                  .trim() ||
                "All",

              contact_email:
                editClubForm.contact_email
                  .trim(),

              founded_year:
                editClubForm.founded_year
                  .trim(),

              instagram_url:
                editClubForm.instagram_url
                  .trim() ||
                null,

              linkedin_url:
                editClubForm.linkedin_url
                  .trim() ||
                null,

              website_url:
                editClubForm.website_url
                  .trim() ||
                null,

              logo_url:
                logoUrl,

              banner_url:
                bannerUrl,

              video_banner_url:
                videoBannerUrl,

              poster_url:
                posterUrl,

              is_featured:
                editClubForm.is_featured,

              updated_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              "id",
              editingClub.id
            )
            .select()
            .single();

        if (error) {
          throw error;
        }

        const updated =
          data as Club;

        setClubs(
          current =>
            current.map(
              club =>
                club.id ===
                updated.id
                  ? updated
                  : club
            )
        );

        setEditingClub(
          null
        );

        setEditLogoFile(
          null
        );

        setEditBannerFile(
          null
        );

        setEditVideoBannerFile(
          null
        );

        setEditPosterFile(
          null
        );

        setRemoveVideoBanner(
          false
        );

        setStatus(
          `${updated.name} updated successfully.`
        );

      } catch (error) {

        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to update club."
        );

      } finally {

        setBusy(false);

      }
    };


  const deleteClub =
    async (
      club: Club
    ) => {
      if (!canManage) {
        return;
      }

      if (
        !window.confirm(
          `Delete "${club.name}" and its team/gallery records?`
        )
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);

      const {
        error,
      } =
        await client
          .from(
            "campus_clubs"
          )
          .delete()
          .eq(
            "id",
            club.id
          );

      setBusy(false);

      if (error) {
        return setStatus(
          error.message
        );
      }

      const remaining =
        clubs.filter(
          item =>
            item.id !==
            club.id
        );

      setClubs(
        remaining
      );

      setSelectedClubId(
        ""
      );

      setMembers([]);
      setGallery([]);

      setStatus(
        "Club deleted."
      );
    };


  const addClubMember =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !canManage ||
        !selectedClub
      ) {
        return;
      }

      if (
        !memberForm.member_name
          .trim()
      ) {
        return setStatus(
          "Member name is required."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);

      try {
        const {
          data: auth,
        } =
          await client.auth
            .getUser();

        if (!auth.user) {
          throw new Error(
            "Your session has expired."
          );
        }

        const photoUrl =
          memberPhotoFile
            ? await uploadActivityFile(
                memberPhotoFile,
                "club-members"
              )
            : null;

        const roleIndex =
          leadershipOrder.indexOf(
            memberForm.role_title
          );

        const {
          data,
          error,
        } =
          await client
            .from(
              "campus_club_members"
            )
            .insert({
              club_id:
                selectedClub.id,

              member_name:
                memberForm.member_name
                  .trim(),

              campus_uid:
                memberForm.campus_uid
                  .trim()
                  .toUpperCase(),

              role_title:
                memberForm.role_title,

              department:
                memberForm.department
                  .trim(),

              academic_year:
                memberForm.academic_year
                  .trim(),

              bio:
                memberForm.bio
                  .trim(),

              linkedin_url:
                memberForm.linkedin_url
                  .trim() ||
                null,

              instagram_url:
                memberForm.instagram_url
                  .trim() ||
                null,

              photo_url:
                photoUrl,

              display_order:
                roleIndex >= 0
                  ? roleIndex
                  : 99,

              is_current:
                true,

              added_by:
                auth.user.id,
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        setMembers(
          current =>
            [
              ...current,
              data as ClubMember,
            ].sort(
              (
                a,
                b
              ) =>
                a.display_order -
                b.display_order
            )
        );

        setMemberForm(
          blankMemberForm
        );

        setMemberPhotoFile(
          null
        );

        setShowMemberForm(
          false
        );

        setStatus(
          "Team member added."
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to add team member."
        );
      } finally {
        setBusy(false);
      }
    };


  const deleteClubMember =
    async (
      member:
        ClubMember
    ) => {
      if (!canManage) {
        return;
      }

      if (
        !window.confirm(
          `Remove ${member.member_name} from the club team?`
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
            "campus_club_members"
          )
          .delete()
          .eq(
            "id",
            member.id
          );

      if (error) {
        return setStatus(
          error.message
        );
      }

      setMembers(
        current =>
          current.filter(
            item =>
              item.id !==
              member.id
          )
      );

      setStatus(
        "Team member removed."
      );
    };


  const addGalleryPhoto =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (
        !canManage ||
        !selectedClub
      ) {
        return;
      }

      if (
        !galleryForm.title
          .trim() ||
        !galleryFile
      ) {
        return setStatus(
          "Gallery title and photo are required."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);

      try {
        const {
          data: auth,
        } =
          await client.auth
            .getUser();

        if (!auth.user) {
          throw new Error(
            "Your session has expired."
          );
        }

        const imageUrl =
          await uploadActivityFile(
            galleryFile,
            "club-gallery"
          );

        const {
          data,
          error,
        } =
          await client
            .from(
              "campus_club_gallery"
            )
            .insert({
              club_id:
                selectedClub.id,

              title:
                galleryForm.title
                  .trim(),

              description:
                galleryForm.description
                  .trim(),

              image_url:
                imageUrl,

              activity_date:
                galleryForm.activity_date ||
                null,

              uploaded_by:
                auth.user.id,

              uploaded_by_name:
                profile.name,
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        setGallery(
          current => [
            data as
              ClubGalleryItem,
            ...current,
          ]
        );

        setGalleryForm(
          blankGalleryForm
        );

        setGalleryFile(null);

        setShowGalleryForm(
          false
        );

        setStatus(
          "Gallery photo published."
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to upload gallery photo."
        );
      } finally {
        setBusy(false);
      }
    };


  const deleteGalleryPhoto =
    async (
      item:
        ClubGalleryItem
    ) => {
      if (!canManage) {
        return;
      }

      if (
        !window.confirm(
          `Delete "${item.title}" from the gallery?`
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
            "campus_club_gallery"
          )
          .delete()
          .eq(
            "id",
            item.id
          );

      if (error) {
        return setStatus(
          error.message
        );
      }

      setGallery(
        current =>
          current.filter(
            row =>
              row.id !==
              item.id
          )
      );

      setGalleryViewer(
        current =>
          current?.id ===
          item.id
            ? null
            : current
      );

      setStatus(
        "Gallery photo deleted."
      );
    };


  const categories =
    useMemo(
      () => [
        "All",
        ...Array.from(
          new Set(
            clubs
              .map(
                club =>
                  club.category
              )
              .filter(
                Boolean
              )
          )
        ),
      ],
      [
        clubs,
      ]
    );


  const visibleClubs =
    useMemo(
      () => {
        const normalized =
          search
            .trim()
            .toLowerCase();

        return clubs.filter(
          club => {
            const categoryMatch =
              category ===
                "All" ||
              club.category ===
                category;

            if (
              !categoryMatch
            ) {
              return false;
            }

            if (
              !normalized
            ) {
              return true;
            }

            return [
              club.name,
              club.short_name,
              club.category,
              club.department,
              club.description,
              club.tagline,
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
        clubs,
        search,
        category,
      ]
    );


  const formatDate =
    (
      value:
        string | null
    ) => {
      if (!value) {
        return "";
      }

      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "";
      }

      return new Intl.DateTimeFormat(
        "en-IN",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      ).format(
        date
      );
    };



  const [
    editingSportId,
    setEditingSportId,
  ] = useState<string | null>(
    null
  );

  const editSport = (
    sport: Sport
  ) => {
    const id =
      String(
        (
          sport as {
            id?: unknown;
          }
        ).id ?? ""
      );

    if (!id) {
      alert(
        "This sport cannot be edited because its ID is missing."
      );
      return;
    }

    setEditingSportId(
      id
    );

    setSportForm(
      current => {
        const source =
          sport as unknown as
            Record<
              string,
              unknown
            >;

        return Object.fromEntries(
          Object.keys(
            current
          ).map(
            key => [
              key,
              source[key] ??
                "",
            ]
          )
        ) as typeof current;
      }
    );

    setShowSportForm(
      true
    );
  };

  const createSport = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!canManage) {
      alert(
        "Only Coordinator or Main Admin can manage campus sports."
      );
      return;
    }

    const supabase =
      getSupabaseClient();

    if (!supabase) {
      alert(
        "CampusConnect is not connected to Supabase."
      );
      return;
    }

    if (!sportForm.name.trim()) {
      alert(
        "Enter a sport or team name."
      );
      return;
    }

    try {
      const payload =
        Object.fromEntries(
          Object.entries(
            sportForm
          ).filter(
            ([, value]) =>
              value !== undefined &&
              value !== null
          )
        );

      let result;

      if (editingSportId) {
        result =
          await supabase
            .from(
              "campus_sports"
            )
            .update(
              payload
            )
            .eq(
              "id",
              editingSportId
            )
            .select("*")
            .single();
      } else {
        result =
          await supabase
            .from(
              "campus_sports"
            )
            .insert(
              payload
            )
            .select("*")
            .single();
      }

      const {
        data,
        error,
      } = result;

      if (error) {
        console.error(
          "[CampusConnect] sport save:",
          error
        );

        alert(
          error.message ||
            "Unable to save sport."
        );

        return;
      }

      if (data) {
        if (editingSportId) {
          setSports(
            current =>
              current.map(
                sport =>
                  String(
                    (
                      sport as {
                        id?: unknown;
                      }
                    ).id
                  ) ===
                  editingSportId
                    ? data as Sport
                    : sport
              )
          );
        } else {
          setSports(
            current => [
              data as Sport,
              ...current,
            ]
          );
        }
      }

      const wasEditing =
        Boolean(
          editingSportId
        );

      setEditingSportId(
        null
      );

      setShowSportForm(
        false
      );

      alert(
        wasEditing
          ? "Sport updated successfully."
          : "Sport created successfully."
      );
    } catch (error) {
      console.error(
        "[CampusConnect] sport save:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save sport."
      );
    }
  };

  return (
    <div
      className={
        selectedClub
          ? "activityCenter activityClubPageMode"
          : "activityCenter"
      }
    >

      <section className="activityHero">

        <div className="activityHeroCopy">

          <span>
            CAMPUS LIFE
          </span>

          <h1>
            Activity Center
          </h1>

          <p>
            Discover clubs, sports teams, student leaders,
            campus achievements and the moments that make
            college life memorable.
          </p>

          <div className="activityHeroStats">

            <div>
              <strong>
                {clubs.length}
              </strong>

              <small>
                Clubs
              </small>
            </div>

            <div>
              <strong>
                {sports.length}
              </strong>

              <small>
                Sports
              </small>
            </div>

            <div>
              <strong>
                {members.length}
              </strong>

              <small>
                Active team members
              </small>
            </div>

          </div>

        </div>


        <div className="activityHeroVisual">

          <div className="activityOrbit activityOrbitOne">
            CLUBS
          </div>

          <div className="activityOrbit activityOrbitTwo">
            SPORTS
          </div>

          <div className="activityCenterMark">
            CC
          </div>

        </div>

      </section>


      <div className="activityTabs">

        <button
          type="button"
          className={
            tab === "Clubs"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("Clubs")
          }
        >
          Clubs
          <span>
            {clubs.length}
          </span>
        </button>


        <button
          type="button"
          className={
            tab === "Sports"
              ? "active"
              : ""
          }
          onClick={() =>
            setTab("Sports")
          }
        >
          Sports
          <span>
            {sports.length}
          </span>
        </button>


        {canManage && (
          <button
            type="button"
            className="activityCreateButton"
            onClick={() => {
              if (
                tab ===
                "Clubs"
              ) {
                setShowClubForm(
                  true
                );
              }
            }}
          >
            + Add{" "}
            {tab ===
            "Clubs"
              ? "club"
              : "sport"}
          </button>
        )}

      </div>


      {status && (
        <div className="activityStatus">
          {status}
        </div>
      )}


      {tab === "Clubs" ? (
        <>

          <section className="activityDiscovery">

            <div>

              <span>
                CLUB DIRECTORY
              </span>

              <h2>
                Explore campus clubs
              </h2>

              <p>
                Technical, cultural, creative and community
                organizations across campus.
              </p>

            </div>


            <div className="activityFilters">

              <input
                value={search}
                onChange={
                  event =>
                    setSearch(
                      event.target
                        .value
                    )
                }
                placeholder="Search clubs..."
              />


              <select
                value={category}
                onChange={
                  event =>
                    setCategory(
                      event.target
                        .value
                    )
                }
              >
                {categories.map(
                  item => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>

            </div>

          </section>


          {loading ? (
            <div className="activityLoading">
              Loading clubs...
            </div>
          ) : (
            <section className="activityClubGrid">

              {visibleClubs.map(
                club => (
                  <button
                    type="button"
                    key={club.id}
                    className={
                      club.id ===
                      selectedClubId
                        ? "activityClubCard active"
                        : "activityClubCard"
                    }
                    onClick={() => {

                      setSelectedClubId(
                        club.id
                      );

                      window.requestAnimationFrame(
                        () => {

                          const workspace =
                            document.querySelector(
                              ".workspace"
                            ) as HTMLElement | null;

                          if (workspace) {
                            workspace.scrollTo({
                              top: 0,
                              behavior: "instant",
                            });
                          }

                          window.scrollTo({
                            top: 0,
                            behavior: "instant",
                          });

                        }
                      );

                    }}
                  >

                    <div className="activityClubPoster">
                      {club.banner_url ? (
                        <img
                          src={club.banner_url}
                          alt={`${club.name} banner`}
                          loading="lazy"
                        />
                      ) : club.poster_url ? (
                        <img
                          src={club.poster_url}
                          alt={`${club.name} poster`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="activityClubFallback">
                          {club.short_name ||
                            club.name
                              .slice(0, 2)
                              .toUpperCase()}
                        </div>
                      )}


{club.is_featured && (
                        <span className="activityFeaturedBadge">
                          Featured
                        </span>
                      )}

                    </div>


                    <div className="activityClubCardBody">

                      <div className="activityClubIdentity">

                        <div className="activityClubLogo">

                          {club.logo_url ? (
                            <img
                              src={
                                club.logo_url
                              }
                              alt=""
                            />
                          ) : (
                            <strong>
                              {club.name
                                .charAt(0)
                                .toUpperCase()}
                            </strong>
                          )}

                        </div>


                        <div>

                          <small>
                            {club.category}
                          </small>

                          <h3>
                            {club.name}
                          </h3>

                        </div>

                      </div>


                      <p>
                        {club.tagline ||
                          club.description ||
                          "Campus student organization"}
                      </p>


                      <footer>

                        <span>
                          {club.department ||
                            "All departments"}
                        </span>

                        <strong>
                          View club →
                        </strong>

                      </footer>

                    </div>

                  </button>
                )
              )}


              {!visibleClubs.length && (
                <div className="activityEmptyDirectory">
                  <span>◇</span>

                  <h3>
                    No clubs found
                  </h3>

                  <p>
                    Try another search or add the first
                    campus club.
                  </p>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowClubForm(
                          true
                        )
                      }
                    >
                      + Add club
                    </button>
                  )}
                </div>
              )}

            </section>
          )}


          {selectedClub && (
            <div className="activityClubPageToolbar">

              <button
                type="button"
                className="activityClubBackButton"
                onClick={() => {

                  setSelectedClubId(
                    ""
                  );

                  setMembers([]);
                  setGallery([]);

                  window.requestAnimationFrame(
                    () => {

                      const workspace =
                        document.querySelector(
                          ".workspace"
                        ) as HTMLElement | null;

                      if (workspace) {
                        workspace.scrollTo({
                          top: 0,
                          behavior: "instant",
                        });
                      }

                      window.scrollTo({
                        top: 0,
                        behavior: "instant",
                      });

                    }
                  );

                }}
              >
                <span>←</span>

                <div>
                  <small>
                    ACTIVITY CENTER
                  </small>

                  <strong>
                    Back to clubs
                  </strong>
                </div>
              </button>


              <div className="activityClubPageBreadcrumb">

                <span>
                  Clubs
                </span>

                <i>›</i>

                <strong>
                  {selectedClub.name}
                </strong>

              </div>

            </div>
          )}


          {selectedClub && (
            <section
              id="activity-club-profile"
              className="activityClubProfile"
            >

              <div className="activityClubCover">

                {selectedClub.video_banner_url ? (
                  <video
                    className="activityClubCoverVideo"
                    src={
                      selectedClub.video_banner_url
                    }
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : selectedClub.banner_url ? (
                  <img
                    src={
                      selectedClub.banner_url
                    }
                    alt={`${selectedClub.name} banner`}
                  />
                ) : (
                  <div className="activityCoverFallback"/>
                )}


                <div className="activityCoverShade"/>


                <div className="activityClubProfileIdentity">

                  <div className="activityProfileLogo">

                    {selectedClub.logo_url ? (
                      <img
                        src={
                          selectedClub.logo_url
                        }
                        alt={`${selectedClub.name} logo`}
                      />
                    ) : (
                      <strong>
                        {selectedClub.name
                          .charAt(0)
                          .toUpperCase()}
                      </strong>
                    )}

                  </div>


                  <div>

                    <span>
                      {selectedClub.category}
                    </span>

                    <h2>
                      {selectedClub.name}
                    </h2>

                    <p>
                      {selectedClub.tagline ||
                        "Campus organization"}
                    </p>

                  </div>

                </div>


                {canManage && (
                  <div className="activityClubManageActions">

                    <button
                      type="button"
                      className="activityClubEdit"
                      onClick={() =>
                        openClubEditor(
                          selectedClub
                        )
                      }
                    >
                      Edit club
                    </button>

                    <button
                      type="button"
                      className="activityClubDelete"
                      disabled={busy}
                      onClick={() =>
                        void deleteClub(
                          selectedClub
                        )
                      }
                    >
                      Delete club
                    </button>

                  </div>
                )}

              </div>


              <div className="activityProfileGrid">

                <main className="activityProfileMain">

                  <section className="activityProfileSection">

                    <header>

                      <div>
                        <span>
                          ABOUT
                        </span>

                        <h3>
                          About the club
                        </h3>
                      </div>

                    </header>


                    <p className="activityLongCopy">
                      {selectedClub.description ||
                        "No description has been added yet."}
                    </p>


                    <div className="activityClubFacts">

                      <div>
                        <small>
                          CATEGORY
                        </small>

                        <strong>
                          {selectedClub.category}
                        </strong>
                      </div>

                      <div>
                        <small>
                          DEPARTMENT
                        </small>

                        <strong>
                          {selectedClub.department ||
                            "All"}
                        </strong>
                      </div>

                      <div>
                        <small>
                          FOUNDED
                        </small>

                        <strong>
                          {selectedClub.founded_year ||
                            "—"}
                        </strong>
                      </div>

                      <div>
                        <small>
                          STATUS
                        </small>

                        <strong>
                          {selectedClub.status}
                        </strong>
                      </div>

                    </div>

                  </section>


                  <section className="activityProfileSection">

                    <header>

                      <div>
                        <span>
                          LEADERSHIP
                        </span>

                        <h3>
                          Team & coordinators
                        </h3>

                        <p>
                          Current student leaders and club team members.
                        </p>
                      </div>


                      {canManage && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowMemberForm(
                              true
                            )
                          }
                        >
                          + Add member
                        </button>
                      )}

                    </header>


                    {detailLoading ? (
                      <div className="activityLoading">
                        Loading team...
                      </div>
                    ) : members.length ? (
                      <div className="activityTeamGrid">

                        {members.map(
                          member => (
                            <article
                              className="activityTeamMember"
                              key={
                                member.id
                              }
                            >

                              <div className="activityMemberPhoto">

                                {member.photo_url ? (
                                  <img
                                    src={
                                      member.photo_url
                                    }
                                    alt={
                                      member.member_name
                                    }
                                  />
                                ) : (
                                  <strong>
                                    {member.member_name
                                      .charAt(
                                        0
                                      )
                                      .toUpperCase()}
                                  </strong>
                                )}

                              </div>


                              <div className="activityMemberInfo">

                                <span>
                                  {member.role_title}
                                </span>

                                <h4>
                                  {member.member_name}
                                </h4>

                                <p>
                                  {member.department}

                                  {member.academic_year
                                    ? ` · ${member.academic_year}`
                                    : ""}
                                </p>

                                {member.bio && (
                                  <small>
                                    {member.bio}
                                  </small>
                                )}

                              </div>


                              {canManage && (
                                <button
                                  type="button"
                                  className="activityMemberRemove"
                                  onClick={() =>
                                    void deleteClubMember(
                                      member
                                    )
                                  }
                                >
                                  ×
                                </button>
                              )}

                            </article>
                          )
                        )}

                      </div>
                    ) : (
                      <div className="activitySectionEmpty">

                        <span>◇</span>

                        <strong>
                          Team information coming soon
                        </strong>

                        <p>
                          Club leadership and coordinators will
                          appear here.
                        </p>

                      </div>
                    )}

                  </section>


                  <section className="activityProfileSection">

                    <header>

                      <div>
                        <span>
                          MOMENTS
                        </span>

                        <h3>
                          Club gallery
                        </h3>

                        <p>
                          Events, achievements and memories from
                          the club.
                        </p>
                      </div>


                      {canManage && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowGalleryForm(
                              true
                            )
                          }
                        >
                          + Add photo
                        </button>
                      )}

                    </header>


                    {gallery.length ? (
                      <div className="activityGalleryGrid">

                        {gallery.map(
                          item => (
                            <article
                              key={
                                item.id
                              }
                              className="activityGalleryCard"
                            >

                              <button
                                type="button"
                                className="activityGalleryImage"
                                onClick={() => {
                                  setGalleryViewer(
                                    item
                                  );

                                  window.requestAnimationFrame(
                                    () => {
                                      window.scrollTo({
                                        top: 0,
                                        behavior:
                                          "smooth",
                                      });
                                    }
                                  );
                                }}
                              >
                                <img
                                  src={
                                    item.image_url
                                  }
                                  alt={
                                    item.title
                                  }
                                />
                              </button>


                              <div>

                                <span>
                                  {formatDate(
                                    item.activity_date
                                  ) ||
                                    "Club moment"}
                                </span>

                                <h4>
                                  {item.title}
                                </h4>

                                {item.description && (
                                  <p>
                                    {item.description}
                                  </p>
                                )}

                              </div>


                              {canManage && (
                                <button
                                  type="button"
                                  className="activityGalleryDelete"
                                  onClick={() =>
                                    void deleteGalleryPhoto(
                                      item
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              )}

                            </article>
                          )
                        )}

                      </div>
                    ) : (
                      <div className="activitySectionEmpty">

                        <span>▧</span>

                        <strong>
                          Gallery is empty
                        </strong>

                        <p>
                          Photos from club activities will appear
                          here.
                        </p>

                      </div>
                    )}

                  </section>

                </main>


                <aside className="activityProfileSidebar">

                  {selectedClub.poster_url && (
                    <section className="activityPosterPanel">

                      <span>
                        CLUB POSTER
                      </span>

                      <img
                        src={
                          selectedClub.poster_url
                        }
                        alt={`${selectedClub.name} poster`}
                      />

                    </section>
                  )}


                  <section className="activityContactPanel">

                    <span>
                      CONNECT
                    </span>

                    <h3>
                      Club links
                    </h3>


                    {selectedClub.contact_email && (
                      <a
                        href={`mailto:${selectedClub.contact_email}`}
                      >
                        Email
                        <b>↗</b>
                      </a>
                    )}


                    {selectedClub.instagram_url && (
                      <a
                        href={
                          selectedClub.instagram_url
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Instagram
                        <b>↗</b>
                      </a>
                    )}


                    {selectedClub.linkedin_url && (
                      <a
                        href={
                          selectedClub.linkedin_url
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        LinkedIn
                        <b>↗</b>
                      </a>
                    )}


                    {selectedClub.website_url && (
                      <a
                        href={
                          selectedClub.website_url
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Website
                        <b>↗</b>
                      </a>
                    )}


                    {!selectedClub.contact_email &&
                      !selectedClub.instagram_url &&
                      !selectedClub.linkedin_url &&
                      !selectedClub.website_url && (
                        <p>
                          Contact details have not been added.
                        </p>
                      )}

                  </section>

                </aside>

              </div>

            </section>
          )}

        </>
      ) : (
        <section className="activitySportsWorkspace">

          <header>

            <div>

              <span>
                CAMPUS SPORTS
              </span>

              <h2>
                Teams & athletics
              </h2>

              <p>
                Explore official campus sports teams, captains,
                coaches and practice information.
              </p>

            </div>


            {canManage && (
              <button
                type="button"
                className="primary activitySportsAddButton"
                onClick={() => {
                  setSportForm(
                    blankSportForm
                  );

                  setSportLogoFile(
                    null
                  );

                  setSportBannerFile(
                    null
                  );

                  setSportPosterFile(
                    null
                  );

                  setStatus("");

                  setShowSportForm(
                    true
                  );
                }}
              >
                + Add sport / team
              </button>
            )}

          </header>


          <div className="activitySportsGrid">

            {sports.map(
              sport => (
                <article
                  className="activitySportCard"
                  key={sport.id}
                >

                  <div className="activitySportVisual">

                    {sport.banner_url ? (
                      <img
                        src={
                          sport.banner_url
                        }
                        alt=""
                      />
                    ) : (
                      <strong>
                        {sport.name
                          .slice(
                            0,
                            2
                          )
                          .toUpperCase()}
                      </strong>
                    )}

                  </div>


                  <div className="activitySportBody">

                    <span>
                      {sport.sport_type}
                    </span>

                    <h3>
                      {sport.name}
                    </h3>

                    <p>
                      {sport.tagline ||
                        sport.description ||
                        "Campus sports team"}
                    </p>


                    <div>

                      <small>
                        CAPTAIN
                        <b>
                          {sport.captain_name ||
                            "—"}
                        </b>
                      </small>

                      <small>
                        COACH
                        <b>
                          {sport.coach_name ||
                            "—"}
                        </b>
                      </small>

                    </div>


                    {sport.practice_schedule && (
                      <footer>
                        {sport.practice_schedule}
                      </footer>
                    )}

                    {canManage && (
                      <div className="activitySportCardActions">

                        <button
                          type="button"
                          className="activitySportEditButton"
                          onClick={event => {
                            event.stopPropagation();

                            editSport(
                              sport
                            );
                          }}
                        >
                          <span>✎</span>
                          Edit sport
                        </button>

                      </div>
                    )}

                  </div>

                </article>
              )
            )}


            {!sports.length && (
              <div className="activityEmptyDirectory">
                <span>◇</span>

                <h3>
                  Sports directory coming soon
                </h3>

                <p>
                  Campus teams can be added from this workspace.
                </p>
              </div>
            )}

          </div>

        </section>
      )}


      {showSportForm && (
        <div
          className="activityModalScrim"
          onClick={() =>
            setShowSportForm(
              false
            )
          }
        >

          <form
            className="activityModal activitySportModal"
            onSubmit={
              createSport
            }
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>
              <div>
                <span>
                  CAMPUS SPORTS
                </span>

                <h2>
                  {editingSportId
                    ? "Edit sport / team"
                    : "Add sport / team"}
                </h2>

                <p>
                  Create an official campus sports profile with team,
                  leadership, practice and media information.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowSportForm(
                    false
                  )
                }
                aria-label="Close"
              >
                ×
              </button>
            </header>


            <div className="activityModalGrid">

              <label>
                <span>
                  TEAM / SPORT NAME *
                </span>

                <input
                  required
                  placeholder="Cricket Team"
                  value={
                    sportForm.name
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        name:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>


              <label>
                <span>
                  SPORT TYPE
                </span>

                <select
                  value={
                    sportForm.sport_type
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        sport_type:
                          event.target.value,
                      })
                    )
                  }
                >
                  <option>
                    Team
                  </option>

                  <option>
                    Individual
                  </option>

                  <option>
                    Indoor
                  </option>

                  <option>
                    Outdoor
                  </option>

                  <option>
                    Athletics
                  </option>

                  <option>
                    Esports
                  </option>
                </select>
              </label>


              <label className="activityModalFull">
                <span>
                  TAGLINE
                </span>

                <input
                  placeholder="Representing the campus on and off the field"
                  value={
                    sportForm.tagline
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        tagline:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>


              <label className="activityModalFull">
                <span>
                  DESCRIPTION
                </span>

                <textarea
                  rows={4}
                  placeholder="About the team, selection process, tournaments and activities..."
                  value={
                    sportForm.description
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        description:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>


              <label>
                <span>
                  CAPTAIN
                </span>

                <input
                  placeholder="Captain name"
                  value={
                    sportForm.captain_name
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        captain_name:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>


              <label>
                <span>
                  COACH
                </span>

                <input
                  placeholder="Coach / faculty mentor"
                  value={
                    sportForm.coach_name
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        coach_name:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>


              <label>
                <span>
                  VENUE
                </span>

                <input
                  placeholder="College ground"
                  value={
                    sportForm.venue
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        venue:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>


              <label>
                <span>
                  PRACTICE SCHEDULE
                </span>

                <input
                  placeholder="Mon–Fri · 4:30 PM"
                  value={
                    sportForm.practice_schedule
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        practice_schedule:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>


              <label>
                <span>
                  CONTACT EMAIL
                </span>

                <input
                  type="email"
                  placeholder="sports@college.edu"
                  value={
                    sportForm.contact_email
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        contact_email:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>


              <label>
                <span>
                  INSTAGRAM
                </span>

                <input
                  placeholder="https://instagram.com/..."
                  value={
                    sportForm.instagram_url
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        instagram_url:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>


              <label className="activityModalFull">
                <span>
                  ACHIEVEMENTS
                </span>

                <textarea
                  rows={3}
                  placeholder="Tournament wins, university representation, medals..."
                  value={
                    sportForm.achievements
                  }
                  onChange={event =>
                    setSportForm(
                      current => ({
                        ...current,
                        achievements:
                          event.target.value,
                      })
                    )
                  }
                />
              </label>

            </div>


            <section className="activitySportMediaFields">

              <header>
                <span>
                  MEDIA
                </span>

                <h3>
                  Team identity
                </h3>
              </header>


              <div className="activityModalGrid">

                <label>
                  <span>
                    TEAM LOGO
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={event =>
                      setSportLogoFile(
                        event.target.files?.[0] ||
                        null
                      )
                    }
                  />
                </label>


                <label>
                  <span>
                    BANNER
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={event =>
                      setSportBannerFile(
                        event.target.files?.[0] ||
                        null
                      )
                    }
                  />
                </label>


                <label>
                  <span>
                    POSTER
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={event =>
                      setSportPosterFile(
                        event.target.files?.[0] ||
                        null
                      )
                    }
                  />
                </label>

              </div>

            </section>


            <label className="activitySportFeatured">

              <input
                type="checkbox"
                checked={
                  sportForm.is_featured
                }
                onChange={event =>
                  setSportForm(
                    current => ({
                      ...current,
                      is_featured:
                        event.target.checked,
                    })
                  )
                }
              />

              <span>
                <b>
                  Feature this team
                </b>

                <small>
                  Prioritize this sport in the Activity Center.
                </small>
              </span>

            </label>


            {status && (
              <p className="activityModalStatus">
                {status}
              </p>
            )}


            <footer>

              <button
                type="button"
                className="ghost"
                disabled={
                  busy
                }
                onClick={() =>
                  setShowSportForm(
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
                  busy
                }
              >
                {busy
                  ? "Creating..."
                  : "Create sports team"}
              </button>

            </footer>

          </form>

        </div>
      )}


      {showClubForm && (
        <div
          className="activityModalScrim"
          onClick={() =>
            setShowClubForm(
              false
            )
          }
        >

          <form
            className="activityModal"
            onSubmit={
              createClub
            }
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>

              <div>
                <span>
                  ACTIVITY CENTER
                </span>

                <h2>
                  Create club
                </h2>

                <p>
                  Add the club identity, profile and visual assets.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowClubForm(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="activityFormGrid">

              <label>
                <span>
                  CLUB NAME
                </span>

                <input
                  required
                  value={
                    clubForm.name
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          name:
                            event.target
                              .value,
                        })
                      )
                  }
                  placeholder="IEEE Student Branch"
                />
              </label>


              <label>
                <span>
                  SHORT NAME
                </span>

                <input
                  value={
                    clubForm.short_name
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          short_name:
                            event.target
                              .value,
                        })
                      )
                  }
                  placeholder="IEEE"
                />
              </label>


              <label>
                <span>
                  CATEGORY
                </span>

                <select
                  value={
                    clubForm.category
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          category:
                            event.target
                              .value,
                        })
                      )
                  }
                >
                  <option>
                    Technical
                  </option>
                  <option>
                    Cultural
                  </option>
                  <option>
                    Creative
                  </option>
                  <option>
                    Entrepreneurship
                  </option>
                  <option>
                    Social
                  </option>
                  <option>
                    Literary
                  </option>
                  <option>
                    Music
                  </option>
                  <option>
                    Dance
                  </option>
                  <option>
                    Photography
                  </option>
                  <option>
                    Other
                  </option>
                </select>
              </label>


              <label>
                <span>
                  DEPARTMENT
                </span>

                <input
                  value={
                    clubForm.department
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          department:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  FOUNDED YEAR
                </span>

                <input
                  value={
                    clubForm.founded_year
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          founded_year:
                            event.target
                              .value,
                        })
                      )
                  }
                  placeholder="2024"
                />
              </label>


              <label>
                <span>
                  CONTACT EMAIL
                </span>

                <input
                  type="email"
                  value={
                    clubForm.contact_email
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          contact_email:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label className="activityWideField">
                <span>
                  TAGLINE
                </span>

                <input
                  value={
                    clubForm.tagline
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          tagline:
                            event.target
                              .value,
                        })
                      )
                  }
                  placeholder="Innovation starts here."
                />
              </label>


              <label className="activityWideField">
                <span>
                  DESCRIPTION
                </span>

                <textarea
                  value={
                    clubForm.description
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          description:
                            event.target
                              .value,
                        })
                      )
                  }
                  rows={5}
                  placeholder="Tell students about the club..."
                />
              </label>


              <label>
                <span>
                  INSTAGRAM
                </span>

                <input
                  value={
                    clubForm.instagram_url
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          instagram_url:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  LINKEDIN
                </span>

                <input
                  value={
                    clubForm.linkedin_url
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          linkedin_url:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label className="activityWideField">
                <span>
                  WEBSITE
                </span>

                <input
                  value={
                    clubForm.website_url
                  }
                  onChange={
                    event =>
                      setClubForm(
                        current => ({
                          ...current,
                          website_url:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>

            </div>


            <div className="activityUploadGrid">

              <ActivityFileInput
                title="Club logo"
                file={logoFile}
                onChange={
                  setLogoFile
                }
              />

              <ActivityFileInput
                title="Profile banner"
                file={bannerFile}
                onChange={
                  setBannerFile
                }
              />

              <ActivityFileInput
                title="Video banner"
                file={videoBannerFile}
                onChange={
                  setVideoBannerFile
                }
                accept="video/mp4,video/webm"
                help="MP4 or WebM · max 50 MB"
              />

              <ActivityFileInput
                title="Club poster"
                file={posterFile}
                onChange={
                  setPosterFile
                }
              />

            </div>


            <label className="activityCheckbox">

              <input
                type="checkbox"
                checked={
                  clubForm.is_featured
                }
                onChange={
                  event =>
                    setClubForm(
                      current => ({
                        ...current,
                        is_featured:
                          event.target
                            .checked,
                      })
                    )
                }
              />

              <span>
                Feature this club in Activity Center
              </span>

            </label>


            <footer>

              <button
                type="button"
                onClick={() =>
                  setShowClubForm(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary"
                disabled={busy}
              >
                {busy
                  ? "Creating..."
                  : "Create club"}
              </button>

            </footer>

          </form>

        </div>
      )}


      {editingClub && (
        <div
          className="activityModalScrim"
          onClick={() =>
            setEditingClub(
              null
            )
          }
        >

          <form
            className="activityModal activityClubEditModal"
            onSubmit={
              saveClubEdit
            }
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>

              <div>
                <span>
                  CLUB MANAGEMENT
                </span>

                <h2>
                  Edit {editingClub.name}
                </h2>

                <p>
                  Update club identity, description, links
                  and visual branding.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingClub(
                    null
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="activityEditPreview">

              <div className="activityEditBannerPreview">

                {editingClub.video_banner_url &&
                !removeVideoBanner ? (
                  <video
                    src={
                      editingClub.video_banner_url
                    }
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : editingClub.banner_url ? (
                  <img
                    src={
                      editingClub.banner_url
                    }
                    alt=""
                  />
                ) : (
                  <div/>
                )}

              </div>

              <div className="activityEditIdentityPreview">

                {editingClub.logo_url ? (
                  <img
                    src={
                      editingClub.logo_url
                    }
                    alt=""
                  />
                ) : (
                  <strong>
                    {editingClub.name
                      .charAt(0)
                      .toUpperCase()}
                  </strong>
                )}

                <div>
                  <span>
                    LIVE PROFILE
                  </span>

                  <b>
                    {editClubForm.name ||
                      editingClub.name}
                  </b>
                </div>

              </div>

            </div>


            <div className="activityFormGrid">

              <label>
                <span>
                  CLUB NAME
                </span>

                <input
                  required
                  value={
                    editClubForm.name
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          name:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  SHORT NAME
                </span>

                <input
                  value={
                    editClubForm.short_name
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          short_name:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  CATEGORY
                </span>

                <select
                  value={
                    editClubForm.category
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          category:
                            event.target
                              .value,
                        })
                      )
                  }
                >
                  <option>Technical</option>
                  <option>Cultural</option>
                  <option>Creative</option>
                  <option>Entrepreneurship</option>
                  <option>Social</option>
                  <option>Literary</option>
                  <option>Music</option>
                  <option>Dance</option>
                  <option>Photography</option>
                  <option>Other</option>
                </select>
              </label>


              <label>
                <span>
                  DEPARTMENT
                </span>

                <input
                  value={
                    editClubForm.department
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          department:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  FOUNDED YEAR
                </span>

                <input
                  value={
                    editClubForm.founded_year
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          founded_year:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  CONTACT EMAIL
                </span>

                <input
                  type="email"
                  value={
                    editClubForm.contact_email
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          contact_email:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label className="activityWideField">
                <span>
                  TAGLINE
                </span>

                <input
                  value={
                    editClubForm.tagline
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          tagline:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label className="activityWideField">
                <span>
                  DESCRIPTION
                </span>

                <textarea
                  rows={6}
                  value={
                    editClubForm.description
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          description:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  INSTAGRAM
                </span>

                <input
                  value={
                    editClubForm.instagram_url
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          instagram_url:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  LINKEDIN
                </span>

                <input
                  value={
                    editClubForm.linkedin_url
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          linkedin_url:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label className="activityWideField">
                <span>
                  WEBSITE
                </span>

                <input
                  value={
                    editClubForm.website_url
                  }
                  onChange={
                    event =>
                      setEditClubForm(
                        current => ({
                          ...current,
                          website_url:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>

            </div>


            <div className="activityEditMediaTitle">

              <span>
                VISUAL IDENTITY
              </span>

              <p>
                Upload only the asset you want to replace.
                Existing files stay unchanged.
              </p>

            </div>


            <div className="activityUploadGrid activityEditUploadGrid">

              <ActivityFileInput
                title="Replace logo"
                file={editLogoFile}
                onChange={
                  setEditLogoFile
                }
              />

              <ActivityFileInput
                title="Replace image banner"
                file={editBannerFile}
                onChange={
                  setEditBannerFile
                }
              />

              <ActivityFileInput
                title="Replace video banner"
                file={
                  editVideoBannerFile
                }
                onChange={
                  file => {
                    setEditVideoBannerFile(
                      file
                    );

                    if (file) {
                      setRemoveVideoBanner(
                        false
                      );
                    }
                  }
                }
                accept="video/mp4,video/webm"
                help="MP4 or WebM · max 50 MB"
              />

              <ActivityFileInput
                title="Replace poster"
                file={editPosterFile}
                onChange={
                  setEditPosterFile
                }
              />

            </div>


            {editingClub.video_banner_url && (
              <label className="activityCheckbox activityRemoveVideo">

                <input
                  type="checkbox"
                  checked={
                    removeVideoBanner
                  }
                  onChange={
                    event =>
                      setRemoveVideoBanner(
                        event.target
                          .checked
                      )
                  }
                />

                <span>
                  Remove current video banner and use image
                  banner instead
                </span>

              </label>
            )}


            <label className="activityCheckbox">

              <input
                type="checkbox"
                checked={
                  editClubForm.is_featured
                }
                onChange={
                  event =>
                    setEditClubForm(
                      current => ({
                        ...current,
                        is_featured:
                          event.target
                            .checked,
                      })
                    )
                }
              />

              <span>
                Feature this club in Activity Center
              </span>

            </label>


            <footer>

              <button
                type="button"
                onClick={() =>
                  setEditingClub(
                    null
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary"
                disabled={busy}
              >
                {busy
                  ? "Saving..."
                  : "Save changes"}
              </button>

            </footer>

          </form>

        </div>
      )}


      {showMemberForm &&
        selectedClub && (
        <div
          className="activityModalScrim"
          onClick={() =>
            setShowMemberForm(
              false
            )
          }
        >

          <form
            className="activityModal activitySmallModal"
            onSubmit={
              addClubMember
            }
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>

              <div>
                <span>
                  {selectedClub.name.toUpperCase()}
                </span>

                <h2>
                  Add team member
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMemberForm(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="activityFormGrid">

              <label>
                <span>
                  NAME
                </span>

                <input
                  required
                  value={
                    memberForm.member_name
                  }
                  onChange={
                    event =>
                      setMemberForm(
                        current => ({
                          ...current,
                          member_name:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  ROLE
                </span>

                <select
                  value={
                    memberForm.role_title
                  }
                  onChange={
                    event =>
                      setMemberForm(
                        current => ({
                          ...current,
                          role_title:
                            event.target
                              .value,
                        })
                      )
                  }
                >
                  {leadershipOrder.map(
                    role => (
                      <option
                        key={role}
                        value={role}
                      >
                        {role}
                      </option>
                    )
                  )}
                </select>
              </label>


              <label>
                <span>
                  CAMPUS UID
                </span>

                <input
                  value={
                    memberForm.campus_uid
                  }
                  onChange={
                    event =>
                      setMemberForm(
                        current => ({
                          ...current,
                          campus_uid:
                            event.target
                              .value,
                        })
                      )
                  }
                  placeholder="CampusConnect UID"
                />
              </label>


              <label>
                <span>
                  DEPARTMENT
                </span>

                <input
                  value={
                    memberForm.department
                  }
                  onChange={
                    event =>
                      setMemberForm(
                        current => ({
                          ...current,
                          department:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label>
                <span>
                  ACADEMIC YEAR
                </span>

                <input
                  value={
                    memberForm.academic_year
                  }
                  onChange={
                    event =>
                      setMemberForm(
                        current => ({
                          ...current,
                          academic_year:
                            event.target
                              .value,
                        })
                      )
                  }
                  placeholder="3rd Year"
                />
              </label>


              <label>
                <span>
                  PROFILE PHOTO
                </span>

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    event =>
                      setMemberPhotoFile(
                        event.target
                          .files?.[0] ||
                        null
                      )
                  }
                />
              </label>


              <label className="activityWideField">
                <span>
                  BIO
                </span>

                <textarea
                  rows={4}
                  value={
                    memberForm.bio
                  }
                  onChange={
                    event =>
                      setMemberForm(
                        current => ({
                          ...current,
                          bio:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>

            </div>


            <footer>

              <button
                type="button"
                onClick={() =>
                  setShowMemberForm(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary"
                disabled={busy}
              >
                {busy
                  ? "Adding..."
                  : "Add member"}
              </button>

            </footer>

          </form>

        </div>
      )}


      {showGalleryForm &&
        selectedClub && (
        <div
          className="activityModalScrim"
          onClick={() =>
            setShowGalleryForm(
              false
            )
          }
        >

          <form
            className="activityModal activitySmallModal"
            onSubmit={
              addGalleryPhoto
            }
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <header>

              <div>
                <span>
                  CLUB GALLERY
                </span>

                <h2>
                  Add a moment
                </h2>

                <p>
                  Publish an event, achievement or club memory.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGalleryForm(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <div className="activityFormGrid">

              <label>
                <span>
                  TITLE
                </span>

                <input
                  required
                  value={
                    galleryForm.title
                  }
                  onChange={
                    event =>
                      setGalleryForm(
                        current => ({
                          ...current,
                          title:
                            event.target
                              .value,
                        })
                      )
                  }
                  placeholder="Hackathon 2026"
                />
              </label>


              <label>
                <span>
                  DATE
                </span>

                <input
                  type="date"
                  value={
                    galleryForm.activity_date
                  }
                  onChange={
                    event =>
                      setGalleryForm(
                        current => ({
                          ...current,
                          activity_date:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label className="activityWideField">
                <span>
                  DESCRIPTION
                </span>

                <textarea
                  rows={4}
                  value={
                    galleryForm.description
                  }
                  onChange={
                    event =>
                      setGalleryForm(
                        current => ({
                          ...current,
                          description:
                            event.target
                              .value,
                        })
                      )
                  }
                />
              </label>


              <label className="activityWideField">
                <span>
                  PHOTO
                </span>

                <input
                  required
                  type="file"
                  accept="image/*"
                  onChange={
                    event =>
                      setGalleryFile(
                        event.target
                          .files?.[0] ||
                        null
                      )
                  }
                />
              </label>

            </div>


            <footer>

              <button
                type="button"
                onClick={() =>
                  setShowGalleryForm(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary"
                disabled={busy}
              >
                {busy
                  ? "Uploading..."
                  : "Publish photo"}
              </button>

            </footer>

          </form>

        </div>
      )}


      {galleryViewer && (
        <div
          className="activityGalleryViewer"
          onClick={() =>
            setGalleryViewer(
              null
            )
          }
        >

          <button
            type="button"
            className="activityViewerClose"
            onClick={() =>
              setGalleryViewer(
                null
              )
            }
          >
            ×
          </button>


          <div
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <img
              src={
                galleryViewer.image_url
              }
              alt={
                galleryViewer.title
              }
            />

            <section>

              <span>
                {formatDate(
                  galleryViewer.activity_date
                )}
              </span>

              <h2>
                {galleryViewer.title}
              </h2>

              {galleryViewer.description && (
                <p>
                  {galleryViewer.description}
                </p>
              )}

            </section>

          </div>

        </div>
      )}

    </div>
  );
}


function ActivityFileInput({
  title,
  file,
  onChange,
  accept = "image/*",
  help = "JPG, PNG or WebP · max 10 MB",
}: {
  title: string;
  file: File | null;
  onChange: (
    file:
      File | null
  ) => void;
  accept?: string;
  help?: string;
}) {
  return (
    <label className="activityUploadBox">

      <span>
        {title.toUpperCase()}
      </span>

      <strong>
        {file
          ? file.name
          : "+ Choose image"}
      </strong>

      <small>
        {help}
      </small>

      <input
        type="file"
        accept={accept}
        onChange={
          (
            event:
              ChangeEvent<HTMLInputElement>
          ) =>
            onChange(
              event.target
                .files?.[0] ||
              null
            )
        }
      />

    </label>
  );
}
