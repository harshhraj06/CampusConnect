"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";

import "./campus-patra-admin-content.css";


type PatraEntry = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  image_url: string;
  image_path: string | null;
  link_label: string;
  link_url: string;
  display_order: number;
  is_published: boolean;
};


type Props = {
  viewerRole?: string;
};


const blankForm = {
  eyebrow: "",
  title: "",
  body: "",
  linkLabel: "",
  linkUrl: "",
  displayOrder: "100",
  published: true,
};


export default function CampusPatraAdminContent({
  viewerRole = "",
}: Props) {

  const canManage =
    viewerRole ===
    "Main Admin";


  const [
    entries,
    setEntries,
  ] =
    useState<PatraEntry[]>(
      []
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    editorOpen,
    setEditorOpen,
  ] =
    useState(false);


  const [
    editing,
    setEditing,
  ] =
    useState<PatraEntry | null>(
      null
    );


  const [
    form,
    setForm,
  ] =
    useState(
      blankForm
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


  const loadEntries =
    async () => {

      const client =
        getSupabaseClient();

      if (!client) {
        setLoading(false);
        return;
      }


      let query =
        client
          .from(
            "campus_patra_entries"
          )
          .select(
            "id,eyebrow,title,body,image_url,image_path,link_label,link_url,display_order,is_published"
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


      if (!canManage) {
        query =
          query.eq(
            "is_published",
            true
          );
      }


      const {
        data,
        error,
      } =
        await query;


      if (error) {

        console.warn(
          "[Campus Patra] Entries unavailable:",
          error.message
        );

        setLoading(false);
        return;

      }


      setEntries(
        (
          data ||
          []
        ) as PatraEntry[]
      );

      setLoading(false);

    };


  useEffect(
    () => {
      void loadEntries();
    },
    [
      canManage,
    ]
  );


  const openCreate =
    () => {

      if (!canManage) {
        return;
      }

      setEditing(null);

      setForm(
        blankForm
      );

      setImageFile(null);

      setStatus("");

      setEditorOpen(true);

    };


  const openEdit =
    (
      entry:
        PatraEntry
    ) => {

      if (!canManage) {
        return;
      }


      setEditing(
        entry
      );


      setForm({
        eyebrow:
          entry.eyebrow,

        title:
          entry.title,

        body:
          entry.body,

        linkLabel:
          entry.link_label,

        linkUrl:
          entry.link_url,

        displayOrder:
          String(
            entry.display_order
          ),

        published:
          entry.is_published,
      });


      setImageFile(null);

      setStatus("");

      setEditorOpen(true);

    };


  const handleImage =
    (
      event:
        ChangeEvent<HTMLInputElement>
    ) => {

      setImageFile(
        event.target
          .files?.[0] ||
        null
      );

    };


  const saveEntry =
    async (
      event:
        FormEvent
    ) => {

      event.preventDefault();


      if (!canManage) {
        return;
      }


      if (
        !form.title.trim() ||
        !form.body.trim()
      ) {

        setStatus(
          "Title and content are required."
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
          editing?.image_url ||
          "";

        let imagePath =
          editing?.image_path ||
          null;


        if (imageFile) {

          if (
            !imageFile.type
              .startsWith(
                "image/"
              )
          ) {

            throw new Error(
              "Choose a valid image."
            );

          }


          if (
            imageFile.size >
            8 *
            1024 *
            1024
          ) {

            throw new Error(
              "Image must be under 8 MB."
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
                "campus-patra"
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


          if (uploadError) {
            throw uploadError;
          }


          const {
            data:
              publicData,
          } =
            client
              .storage
              .from(
                "campus-patra"
              )
              .getPublicUrl(
                nextPath
              );


          imageUrl =
            publicData
              .publicUrl;

          imagePath =
            nextPath;

        }


        const payload = {

          eyebrow:
            form.eyebrow
              .trim(),

          title:
            form.title
              .trim(),

          body:
            form.body
              .trim(),

          image_url:
            imageUrl,

          image_path:
            imagePath,

          link_label:
            form.linkLabel
              .trim(),

          link_url:
            form.linkUrl
              .trim(),

          display_order:
            Number(
              form.displayOrder ||
              100
            ),

          is_published:
            form.published,
        };


        if (editing) {

          const {
            error,
          } =
            await client
              .from(
                "campus_patra_entries"
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
                "campus_patra_entries"
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
          editing?.image_path &&
          editing.image_path !==
            imagePath
        ) {

          await client
            .storage
            .from(
              "campus-patra"
            )
            .remove([
              editing.image_path,
            ]);

        }


        setEditorOpen(false);

        setEditing(null);

        setImageFile(null);

        setForm(
          blankForm
        );


        await loadEntries();

      } catch (
        error
      ) {

        setStatus(
          error instanceof
          Error
            ? error.message
            : "Unable to save Patra entry."
        );

      } finally {

        setSaving(false);

      }

    };


  const deleteEntry =
    async (
      entry:
        PatraEntry
    ) => {

      if (!canManage) {
        return;
      }


      const confirmed =
        window.confirm(
          `Delete "${entry.title}" from the Patra?`
        );


      if (!confirmed) {
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
            "campus_patra_entries"
          )
          .delete()
          .eq(
            "id",
            entry.id
          );


      if (error) {

        window.alert(
          error.message
        );

        return;

      }


      if (
        entry.image_path
      ) {

        await client
          .storage
          .from(
            "campus-patra"
          )
          .remove([
            entry.image_path,
          ]);

      }


      await loadEntries();

    };


  return (
    <section className="campusPatraCustomContent">

      <header className="campusPatraCustomHeader">

        <div>

          <span>
            CAMPUSCONNECT PATRA
          </span>

          <h3>
            Stories &amp; additions
          </h3>

          <p>
            Additional notes, milestones,
            announcements and stories
            published inside the
            CampusConnect chronicle.
          </p>

        </div>


        {canManage && (

          <button
            type="button"
            className="campusPatraAddButton"
            onClick={
              openCreate
            }
          >
            + Add to Patra
          </button>

        )}

      </header>


      {loading && (
        <p className="campusPatraCustomEmpty">
          Loading Patra entries…
        </p>
      )}


      {!loading &&
        entries.length ===
          0 &&
        canManage && (

        <div className="campusPatraCustomEmpty admin">

          <span>
            No custom Patra entries yet.
          </span>

          <button
            type="button"
            onClick={
              openCreate
            }
          >
            Create the first entry
          </button>

        </div>

      )}


      <div className="campusPatraCustomGrid">

        {entries.map(
          entry => (

            <article
              key={
                entry.id
              }
              className={
                `campusPatraCustomEntry ${
                  entry.is_published
                    ? ""
                    : "isDraft"
                }`
              }
            >

              {entry.image_url && (

                <img
                  src={
                    entry.image_url
                  }
                  alt={
                    entry.title
                  }
                />

              )}


              <div className="campusPatraCustomEntryCopy">

                <div className="campusPatraCustomMeta">

                  <span>
                    {entry.eyebrow ||
                      "CAMPUSCONNECT"}
                  </span>


                  {canManage &&
                    !entry.is_published && (

                    <em>
                      DRAFT
                    </em>

                  )}

                </div>


                <h4>
                  {entry.title}
                </h4>


                <p>
                  {entry.body}
                </p>


                {entry.link_url &&
                  entry.link_label && (

                  <a
                    href={
                      entry.link_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {entry.link_label}
                    <span>
                      ↗
                    </span>
                  </a>

                )}


                {canManage && (

                  <div className="campusPatraCustomAdminActions">

                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          entry
                        )
                      }
                    >
                      Edit
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        void deleteEntry(
                          entry
                        )
                      }
                    >
                      Delete
                    </button>

                  </div>

                )}

              </div>

            </article>

          )
        )}

      </div>


      {canManage &&
        editorOpen && (

        <div className="campusPatraEntryEditorBackdrop">

          <form
            className="campusPatraEntryEditor"
            onSubmit={
              saveEntry
            }
          >

            <header>

              <div>

                <span>
                  MAIN ADMIN
                </span>

                <h3>
                  {editing
                    ? "Edit Patra entry"
                    : "Add to Patra"}
                </h3>

              </div>


              <button
                type="button"
                onClick={() =>
                  setEditorOpen(
                    false
                  )
                }
              >
                ×
              </button>

            </header>


            <label>

              <span>
                Small heading
              </span>

              <input
                placeholder="Example: CAMPUS MILESTONE"
                value={
                  form.eyebrow
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        eyebrow:
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
                Title
              </span>

              <input
                placeholder="Write the Patra title"
                value={
                  form.title
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        title:
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
                Content
              </span>

              <textarea
                placeholder="Write what you want to add to the Patra..."
                value={
                  form.body
                }
                onChange={
                  event =>
                    setForm(
                      current => ({
                        ...current,
                        body:
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
                Optional picture
              </span>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={
                  handleImage
                }
              />

              {editing?.image_url && (
                <small>
                  Leave empty to keep the
                  current picture.
                </small>
              )}

            </label>


            <div className="campusPatraEntryEditorRow">

              <label>

                <span>
                  Link label
                </span>

                <input
                  placeholder="Read more"
                  value={
                    form.linkLabel
                  }
                  onChange={
                    event =>
                      setForm(
                        current => ({
                          ...current,
                          linkLabel:
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
                  Link URL
                </span>

                <input
                  type="url"
                  placeholder="https://..."
                  value={
                    form.linkUrl
                  }
                  onChange={
                    event =>
                      setForm(
                        current => ({
                          ...current,
                          linkUrl:
                            event
                              .target
                              .value,
                        })
                      )
                  }
                />

              </label>

            </div>


            <div className="campusPatraEntryEditorRow">

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


              <label className="campusPatraPublishedToggle">

                <input
                  type="checkbox"
                  checked={
                    form.published
                  }
                  onChange={
                    event =>
                      setForm(
                        current => ({
                          ...current,
                          published:
                            event
                              .target
                              .checked,
                        })
                      )
                  }
                />

                <span>
                  Published
                </span>

              </label>

            </div>


            {status && (
              <p className="campusPatraEditorStatus">
                {status}
              </p>
            )}


            <footer>

              <button
                type="button"
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
                disabled={
                  saving
                }
              >
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Publish to Patra"}
              </button>

            </footer>

          </form>

        </div>

      )}

    </section>
  );
}
