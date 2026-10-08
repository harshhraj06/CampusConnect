"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import { motion } from "motion/react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import "./campus-team.css";


const LinkedinIcon = ({
  size = 16,
}: {
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip-linkedin-team01)">
      <path
        d="M13.633 13.633h-2.37V9.92c0-.885-.017-2.025-1.234-2.025-1.235 0-1.424.965-1.424 1.96v3.778h-2.37V5.998H8.51v1.043h.031a2.5 2.5 0 0 1 2.246-1.233c2.403 0 2.846 1.58 2.846 3.637zM3.56 4.954a1.376 1.376 0 1 1 0-2.751 1.376 1.376 0 0 1 0 2.751m1.185 8.679H2.372V5.998h2.373zM14.815.001H1.18A1.17 1.17 0 0 0 0 1.154v13.691A1.17 1.17 0 0 0 1.18 16h13.635A1.17 1.17 0 0 0 16 14.845V1.153A1.17 1.17 0 0 0 14.815 0"
        fill="currentColor"
      />
    </g>

    <defs>
      <clipPath id="clip-linkedin-team01">
        <rect
          width="16"
          height="16"
          fill="white"
        />
      </clipPath>
    </defs>
  </svg>
);


type TeamMember = {
  id: string;
  name: string;
  role: string;
  image: string;
  imagePath?: string | null;

  socials: {
    website: string;
    linkedin: string;
  };

  displayOrder: number;
};


type Team = TeamMember[];


type TeamDatabaseRow = {
  id: string;
  name: string;
  role: string;
  image_url: string;
  image_path: string | null;
  website_url: string;
  linkedin_url: string;
  display_order: number;
};


type CampusTeamProps = {
  viewerRole?: string;
};


const referenceTeamData: Team = [
  {
    id: "reference-logan",
    name: "Logan Dang",
    role: "WordPress Developer",
    image:
      "https://cdn.21st.dev/assets/localized/a15173e6535b3403cf75d3a251b152b66cb158540ae6fe0cef584477d25c296d.png",
    socials: {
      website: "#",
      linkedin: "#",
    },
    displayOrder: 10,
  },
  {
    id: "reference-ana",
    name: "Ana Belić",
    role: "Social Media Specialist",
    image:
      "https://cdn.21st.dev/assets/localized/642c6a86e5fbd3b161614c1493159ed72ba9f28fd64bbd3dac1aaf902841acbb.png",
    socials: {
      website: "#",
      linkedin: "#",
    },
    displayOrder: 20,
  },
  {
    id: "reference-brian",
    name: "Brian Hanley",
    role: "Product Designer",
    image:
      "https://cdn.21st.dev/assets/localized/16f617e9aa4511f685dd437418d90bcb53817ed5031cd822d60db98848ad536f.png",
    socials: {
      website: "#",
      linkedin: "#",
    },
    displayOrder: 30,
  },
  {
    id: "reference-darko",
    name: "Darko Stanković",
    role: "UI Designer",
    image:
      "https://cdn.21st.dev/assets/localized/90f8eb479a4a56a4da83ebf6be45a9ff73515b0af2cff481f665ea40189a8137.png",
    socials: {
      website: "#",
      linkedin: "#",
    },
    displayOrder: 40,
  },
];


const emptyForm = {
  name: "",
  role: "",
  website: "",
  linkedin: "",
  displayOrder: "100",
};


const toTeamMember = (
  row: TeamDatabaseRow
): TeamMember => ({
  id: row.id,

  name:
    row.name,

  role:
    row.role,

  image:
    row.image_url,

  imagePath:
    row.image_path,

  socials: {
    website:
      row.website_url ||
      "#",

    linkedin:
      row.linkedin_url ||
      "#",
  },

  displayOrder:
    Number(
      row.display_order ||
      0
    ),
});


export default function CampusTeam({
  viewerRole = "",
}: CampusTeamProps) {

  const canManage =
    viewerRole ===
    "Main Admin";


  const [
    teamData,
    setTeamData,
  ] =
    useState<Team>(
      referenceTeamData
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    managing,
    setManaging,
  ] =
    useState(false);


  const [
    editing,
    setEditing,
  ] =
    useState<TeamMember | null>(
      null
    );


  const [
    form,
    setForm,
  ] =
    useState(
      emptyForm
    );


  const [
    imageFile,
    setImageFile,
  ] =
    useState<File | null>(
      null
    );


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    status,
    setStatus,
  ] =
    useState("");


  const loadTeam =
    async () => {

      const client =
        getSupabaseClient();

      if (!client) {
        setLoading(false);
        return;
      }


      const {
        data,
        error,
      } =
        await client
          .from(
            "campus_team_members"
          )
          .select(
            "id,name,role,image_url,image_path,website_url,linkedin_url,display_order"
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "display_order",
            {
              ascending:
                true,
            }
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          );


      if (error) {

        console.warn(
          "[Campus Team] Using reference data until team database is available:",
          error.message
        );

        setLoading(false);
        return;
      }


      const rows =
        (
          data ||
          []
        ) as TeamDatabaseRow[];


      if (
        rows.length >
        0
      ) {

        setTeamData(
          rows.map(
            toTeamMember
          )
        );

      }


      setLoading(false);

    };


  useEffect(
    () => {
      void loadTeam();
    },
    []
  );


  const openCreate =
    () => {

      if (!canManage) {
        return;
      }

      setEditing(null);

      setForm(
        emptyForm
      );

      setImageFile(null);

      setStatus("");

      setManaging(true);

    };


  const openEdit =
    (
      member:
        TeamMember
    ) => {

      if (!canManage) {
        return;
      }

      setEditing(
        member
      );

      setForm({
        name:
          member.name,

        role:
          member.role,

        website:
          member.socials
            .website ===
            "#"
            ? ""
            : member.socials
                .website,

        linkedin:
          member.socials
            .linkedin ===
            "#"
            ? ""
            : member.socials
                .linkedin,

        displayOrder:
          String(
            member.displayOrder
          ),
      });

      setImageFile(null);

      setStatus("");

      setManaging(true);

    };


  const chooseImage =
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {

      const file =
        event.target
          .files?.[0] ||
        null;

      setImageFile(
        file
      );

    };


  const saveMember =
    async (
      event:
        FormEvent
    ) => {

      event.preventDefault();

      if (!canManage) {
        return;
      }


      if (
        !form.name.trim() ||
        !form.role.trim()
      ) {

        setStatus(
          "Name and role are required."
        );

        return;

      }


      const client =
        getSupabaseClient();

      if (!client) {

        setStatus(
          "Supabase is unavailable."
        );

        return;

      }


      setSaving(true);

      setStatus("");


      try {

        const {
          data:
            authData,
          error:
            authError,
        } =
          await client
            .auth
            .getUser();


        if (
          authError ||
          !authData.user
        ) {

          throw new Error(
            "Authentication required."
          );

        }


        let imageUrl =
          editing?.image ||
          "";

        let imagePath =
          editing?.imagePath ||
          null;


        if (
          imageFile
        ) {

          if (
            !imageFile.type
              .startsWith(
                "image/"
              )
          ) {

            throw new Error(
              "Choose a valid image file."
            );

          }


          if (
            imageFile.size >
            8 *
            1024 *
            1024
          ) {

            throw new Error(
              "Image must be smaller than 8 MB."
            );

          }


          const extension =
            imageFile.name
              .split(".")
              .pop()
              ?.toLowerCase()
              .replace(
                /[^a-z0-9]/g,
                ""
              ) ||
            "jpg";


          const nextPath =
            `${authData.user.id}/${crypto.randomUUID()}.${extension}`;


          const {
            error:
              uploadError,
          } =
            await client
              .storage
              .from(
                "campus-team"
              )
              .upload(
                nextPath,
                imageFile,
                {
                  cacheControl:
                    "3600",

                  upsert:
                    false,
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
            client
              .storage
              .from(
                "campus-team"
              )
              .getPublicUrl(
                nextPath
              );


          imageUrl =
            publicUrlData
              .publicUrl;

          imagePath =
            nextPath;

        }


        if (
          !imageUrl
        ) {

          throw new Error(
            "Add a team member picture."
          );

        }


        const payload = {
          name:
            form.name.trim(),

          role:
            form.role.trim(),

          image_url:
            imageUrl,

          image_path:
            imagePath,

          website_url:
            form.website.trim(),

          linkedin_url:
            form.linkedin.trim(),

          display_order:
            Number(
              form.displayOrder ||
              100
            ),

          is_active:
            true,
        };


        if (
          editing &&
          !editing.id.startsWith(
            "reference-"
          )
        ) {

          const {
            error,
          } =
            await client
              .from(
                "campus_team_members"
              )
              .update(
                payload
              )
              .eq(
                "id",
                editing.id
              );


          if (error) {
            throw error;
          }

        } else {

          const {
            error,
          } =
            await client
              .from(
                "campus_team_members"
              )
              .insert({
                ...payload,

                created_by:
                  authData.user.id,
              });


          if (error) {
            throw error;
          }

        }


        if (
          imageFile &&
          editing?.imagePath &&
          editing.imagePath !==
            imagePath
        ) {

          await client
            .storage
            .from(
              "campus-team"
            )
            .remove([
              editing.imagePath,
            ]);

        }


        await loadTeam();

        setManaging(false);

        setEditing(null);

        setImageFile(null);

        setForm(
          emptyForm
        );

      } catch (
        error
      ) {

        setStatus(
          error instanceof
          Error
            ? error.message
            : "Unable to save team member."
        );

      } finally {

        setSaving(false);

      }

    };


  return (
    <section className="campusTeamReference">

      <div className="lg:py-20 sm:py-16 py-8">

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-16 flex flex-col items-center justify-center gap-8 md:gap-16">

          <motion.div
            initial={{
              y:
                -40,
              opacity:
                0,
            }}
            whileInView={{
              y:
                0,
              opacity:
                1,
            }}
            viewport={{
              once:
                true,
            }}
            transition={{
              duration:
                0.8,

              ease:
                [
                  0.21,
                  0.47,
                  0.32,
                  0.98,
                ],
            }}
            className="max-w-xl mx-auto flex flex-col items-center justify-center text-center gap-4"
          >

            <Badge
              variant={"outline"}
              className="px-3 py-1 h-auto text-sm"
            >
              Team
            </Badge>

            <h2 className="text-3xl md:text-5xl font-medium text-foreground">
              Meet the creative minds behind our success
            </h2>

          </motion.div>


          {canManage && (

            <div className="campusTeamAdminBar">

              <div>

                <span>
                  MAIN ADMIN
                </span>

                <strong>
                  Team management
                </strong>

              </div>


              <button
                type="button"
                onClick={
                  openCreate
                }
              >
                + Add team member
              </button>

            </div>

          )}


          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 campusTeamGrid">

            {teamData?.map(
              (
                value,
                index
              ) => {

                return (

                  <motion.div
                    key={
                      value.id ||
                      index
                    }
                    initial={{
                      y:
                        40,
                      opacity:
                        0,
                    }}
                    whileInView={{
                      y:
                        0,
                      opacity:
                        1,
                    }}
                    viewport={{
                      once:
                        true,
                    }}
                    transition={{
                      duration:
                        0.8,

                      delay:
                        index *
                        0.1,

                      ease:
                        [
                          0.21,
                          0.47,
                          0.32,
                          0.98,
                        ],
                    }}
                    className="group flex flex-col items-center justify-center gap-6 campusTeamCard"
                  >

                    <div className="campusTeamImageWrap">

                      <img
                        className="w-full h-full group-hover:grayscale transition-all duration-300"
                        src={
                          value.image
                        }
                        alt="team-img"
                      />


                      {canManage && (

                        <button
                          type="button"
                          className="campusTeamEdit"
                          onClick={() =>
                            openEdit(
                              value
                            )
                          }
                        >
                          Edit
                        </button>

                      )}

                    </div>


                    <div className="w-full flex flex-col gap-4 items-center justify-center">

                      <div className="flex flex-col items-center justify-center gap-2">

                        <h3 className="text-2xl font-medium text-foreground">
                          {value.name}
                        </h3>

                        <p className="text-sm font-normal text-muted-foreground">
                          {value.role}
                        </p>

                      </div>


                      <div className="flex gap-2">

                        <a
                          href={
                            value.socials
                              .website
                          }
                          className="p-2 hover:bg-accent/80 rounded-full"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Globe
                            size={
                              16
                            }
                          />
                        </a>


                        <a
                          href={
                            value.socials
                              .linkedin
                          }
                          className="p-2 hover:bg-accent/80 rounded-full"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <LinkedinIcon
                            size={
                              16
                            }
                          />
                        </a>

                      </div>

                    </div>

                  </motion.div>

                );

              }
            )}

          </div>


          {loading && (

            <small className="campusTeamLoading">
              Loading verified team profiles…
            </small>

          )}

        </div>

      </div>


      {canManage &&
        managing && (

        <div
          className="campusTeamEditorBackdrop"
          role="presentation"
        >

          <form
            className="campusTeamEditor"
            onSubmit={
              saveMember
            }
          >

            <header>

              <div>

                <span>
                  MAIN ADMIN ONLY
                </span>

                <h3>
                  {editing
                    ? "Edit team member"
                    : "Add team member"}
                </h3>

              </div>


              <button
                type="button"
                onClick={() =>
                  setManaging(
                    false
                  )
                }
                aria-label="Close team editor"
              >
                ×
              </button>

            </header>


            <label>

              <span>
                Name
              </span>

              <input
                value={
                  form.name
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        name:
                          event
                            .target
                            .value,
                      })
                    )
                }
                required
              />

            </label>


            <label>

              <span>
                Role
              </span>

              <input
                value={
                  form.role
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        role:
                          event
                            .target
                            .value,
                      })
                    )
                }
                required
              />

            </label>


            <label>

              <span>
                Picture
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  chooseImage
                }
              />

              {editing && (
                <small>
                  Leave empty to keep the current picture.
                </small>
              )}

            </label>


            <label>

              <span>
                Website
              </span>

              <input
                type="url"
                placeholder="https://..."
                value={
                  form.website
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        website:
                          event
                            .target
                            .value,
                      })
                    )
                }
              />

            </label>


            <label>

              <span>
                LinkedIn
              </span>

              <input
                type="url"
                placeholder="https://linkedin.com/in/..."
                value={
                  form.linkedin
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        linkedin:
                          event
                            .target
                            .value,
                      })
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
                min="0"
                max="9999"
                value={
                  form.displayOrder
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        displayOrder:
                          event
                            .target
                            .value,
                      })
                    )
                }
              />

            </label>


            {status && (
              <p className="campusTeamEditorStatus">
                {status}
              </p>
            )}


            <footer>

              <button
                type="button"
                onClick={() =>
                  setManaging(
                    false
                  )
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
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Add member"}
              </button>

            </footer>

          </form>

        </div>

      )}

    </section>
  );
}
