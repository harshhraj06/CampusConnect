"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {getSupabaseClient} from "../lib/supabase";
import {NetworkProfileModal} from "./network-profile-modal";

type NetworkRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";

type NetworkPostAttachment = {
  id: string;
  post_id: string;
  uploader_id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

type NetworkAttachmentWithUrl =
  NetworkPostAttachment & {
    signed_url?: string;
  };

type NetworkFeedProfile = {
  name: string;
  role: NetworkRole;
  department?: string;
  campus_uid?: string;
  avatar_url?: string | null;
};

type NetworkPostType =
  | "Update"
  | "Project"
  | "Achievement"
  | "Internship"
  | "Placement"
  | "Opportunity"
  | "Technical";

type NetworkPost = {
  id: string;
  author_id: string;
  post_type: NetworkPostType;
  body: string;
  created_at: string;
  updated_at: string;
};

type NetworkReaction = {
  post_id: string;
  user_id: string;
  reaction: string;
};

type NetworkComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type NetworkRepost = {
  post_id: string;
  user_id: string;
};

type NetworkSavedPost = {
  post_id: string;
  user_id: string;
};

type DirectoryPerson = {
  id: string;
  full_name: string;
  campus_uid: string;
  department: string;
  graduation_year: string;
  role: string;
  avatar_url?: string | null;
  bio?: string;
  skills?: string;
};

const postTypes: NetworkPostType[] = [
  "Update",
  "Project",
  "Achievement",
  "Internship",
  "Placement",
  "Opportunity",
  "Technical",
];

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join("") || "CC"
  );
}

function relativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference = Math.max(
    0,
    Date.now() - date.getTime()
  );

  const minutes = Math.floor(
    difference / 60000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}d`;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  ).format(date);
}

function FeedAvatar({
  name,
  source,
}: {
  name: string;
  source?: string | null;
}) {
  return (
    <span className="networkFeedAvatar">
      {source ? (
        <img
          src={source}
          alt={`${name} profile`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function NetworkProfessionalFeed({
  profile,
}: {
  profile: NetworkFeedProfile;
}) {
  const [currentUserId, setCurrentUserId] =
    useState("");

  const [posts, setPosts] =
    useState<NetworkPost[]>([]);

  const [reactions, setReactions] =
    useState<NetworkReaction[]>([]);

  const [comments, setComments] =
    useState<NetworkComment[]>([]);

  const [reposts, setReposts] =
    useState<NetworkRepost[]>([]);

  const [savedPosts, setSavedPosts] =
    useState<NetworkSavedPost[]>([]);

  const [directory, setDirectory] =
    useState<DirectoryPerson[]>([]);

  const [composerOpen, setComposerOpen] =
    useState(false);

  const [postType, setPostType] =
    useState<NetworkPostType>("Update");

  const [body, setBody] =
    useState("");

  const [expandedComments, setExpandedComments] =
    useState<string[]>([]);

  const [commentDrafts, setCommentDrafts] =
    useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(true);

  const [busyKey, setBusyKey] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [postFiles, setPostFiles] =
    useState<File[]>([]);

  const [attachments, setAttachments] =
    useState<NetworkAttachmentWithUrl[]>([]);

  const [editingPostId, setEditingPostId] =
    useState<string | null>(null);

  const [editingPostBody, setEditingPostBody] =
    useState("");

  const [editingPostType, setEditingPostType] =
    useState<NetworkPostType>("Update");

  const [editingPostFiles, setEditingPostFiles] =
    useState<File[]>([]);

  const [editingRemovedAttachmentIds, setEditingRemovedAttachmentIds] =
    useState<string[]>([]);

  const [openPostMenuId, setOpenPostMenuId] =
    useState<string | null>(null);

  const [selectedProfileId, setSelectedProfileId] =
    useState<string | null>(null);

  const loadFeed =
    useCallback(async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        setStatus(
          "CampusConnect database connection is unavailable."
        );
        setLoading(false);
        return;
      }

      setLoading(true);

      const {
        data: auth,
        error: authError,
      } = await client.auth.getUser();

      if (
        authError ||
        !auth.user
      ) {
        setStatus(
          "Sign in again to use your professional network."
        );
        setLoading(false);
        return;
      }

      const userId =
        auth.user.id;

      setCurrentUserId(
        userId
      );

      const {
        data: postData,
        error: postError,
      } = await client
        .from("network_posts")
        .select(
          "id,author_id,post_type,body,created_at,updated_at"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(100);

      if (postError) {
        setStatus(
          postError.message
        );
        setLoading(false);
        return;
      }

      const loadedPosts =
        (postData ||
          []) as NetworkPost[];

      const postIds =
        loadedPosts.map(
          post => post.id
        );

      const [
        directoryResult,
        reactionResult,
        commentResult,
        repostResult,
        savedResult,
      ] =
        await Promise.all([
          client.rpc(
            "list_campus_network_profiles"
          ),

          postIds.length
            ? client
                .from(
                  "network_post_reactions"
                )
                .select(
                  "post_id,user_id,reaction"
                )
                .in(
                  "post_id",
                  postIds
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          postIds.length
            ? client
                .from(
                  "network_post_comments"
                )
                .select(
                  "id,post_id,author_id,body,created_at"
                )
                .in(
                  "post_id",
                  postIds
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      true,
                  }
                )
                .limit(5000)
            : Promise.resolve({
                data: [],
                error: null,
              }),

          postIds.length
            ? client
                .from(
                  "network_post_reposts"
                )
                .select(
                  "post_id,user_id"
                )
                .in(
                  "post_id",
                  postIds
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          postIds.length
            ? client
                .from(
                  "network_saved_posts"
                )
                .select(
                  "post_id,user_id"
                )
                .in(
                  "post_id",
                  postIds
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),
        ]);

      const firstError =
        directoryResult.error ||
        reactionResult.error ||
        commentResult.error ||
        repostResult.error ||
        savedResult.error;

      if (firstError) {
        setStatus(
          firstError.message
        );
        setLoading(false);
        return;
      }

      const {
        data: attachmentRows,
        error: attachmentError,
      } = loadedPosts.length
        ? await client
            .from(
              "network_post_attachments"
            )
            .select(
              "id,post_id,uploader_id,file_name,file_path,mime_type,file_size,created_at"
            )
            .in(
              "post_id",
              loadedPosts.map(
                item => item.id
              )
            )
        : {
            data: [],
            error: null,
          };

      if (attachmentError) {
        setStatus(
          attachmentError.message
        );
        setLoading(false);
        return;
      }

      const hydratedAttachments =
        await Promise.all(
          (
            attachmentRows || []
          ).map(
            async row => {
              const {data} =
                await client.storage
                  .from(
                    "professional-media"
                  )
                  .createSignedUrl(
                    row.file_path,
                    3600
                  );

              return {
                ...row,
                signed_url:
                  data?.signedUrl ||
                  "",
              } as NetworkAttachmentWithUrl;
            }
          )
        );

      setAttachments(
        hydratedAttachments
      );

      setPosts(
        loadedPosts
      );

      setDirectory(
        (directoryResult.data ||
          []) as DirectoryPerson[]
      );

      setReactions(
        (reactionResult.data ||
          []) as NetworkReaction[]
      );

      setComments(
        (commentResult.data ||
          []) as NetworkComment[]
      );

      setReposts(
        (repostResult.data ||
          []) as NetworkRepost[]
      );

      setSavedPosts(
        (savedResult.data ||
          []) as NetworkSavedPost[]
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const peopleById =
    useMemo(() => {
      const map =
        new Map<
          string,
          DirectoryPerson
        >();

      directory.forEach(
        person => {
          map.set(
            person.id,
            person
          );
        }
      );

      if (currentUserId) {
        map.set(
          currentUserId,
          {
            id:
              currentUserId,
            full_name:
              profile.name,
            campus_uid:
              profile.campus_uid ||
              "",
            department:
              profile.department ||
              "",
            graduation_year:
              "",
            role:
              profile.role,
            avatar_url:
              profile.avatar_url,
          }
        );
      }

      return map;
    }, [
      directory,
      currentUserId,
      profile,
    ]);

  const publishPost =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      const text =
        body.trim();

      if (
        (!text &&
          postFiles.length === 0) ||
        !currentUserId ||
        busyKey
      ) {
        return;
      }

      if (
        postFiles.length > 6
      ) {
        setStatus(
          "You can attach up to 6 files per post."
        );
        return;
      }

      const oversized =
        postFiles.find(
          file =>
            file.size >
            15 * 1024 * 1024
        );

      if (oversized) {
        setStatus(
          `${oversized.name} is larger than 15 MB.`
        );
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusyKey(
        "publish"
      );
      setStatus("");

      try {
        const {
          data,
          error,
        } = await client
          .from(
            "network_posts"
          )
          .insert({
            author_id:
              currentUserId,
            post_type:
              postType,
            body:
              text ||
              "Shared an attachment.",
          })
          .select(
            "id,author_id,post_type,body,created_at,updated_at"
          )
          .single();

        if (error) {
          throw error;
        }

        const uploadedAttachments:
          NetworkAttachmentWithUrl[] = [];

        try {
          for (
            const file of postFiles
          ) {
            const safeName =
              file.name.replace(
                /[^a-zA-Z0-9._-]/g,
                "-"
              );

            const filePath =
              `network/${currentUserId}/${data.id}/${crypto.randomUUID()}-${safeName}`;

            const {
              error: uploadError,
            } =
              await client.storage
                .from(
                  "professional-media"
                )
                .upload(
                  filePath,
                  file,
                  {
                    upsert: false,
                    contentType:
                      file.type ||
                      undefined,
                  }
                );

            if (uploadError) {
              throw uploadError;
            }

            const {
              data:
                attachmentRow,
              error:
                attachmentError,
            } = await client
              .from(
                "network_post_attachments"
              )
              .insert({
                post_id:
                  data.id,
                uploader_id:
                  currentUserId,
                file_name:
                  file.name,
                file_path:
                  filePath,
                mime_type:
                  file.type || "",
                file_size:
                  file.size,
              })
              .select(
                "id,post_id,uploader_id,file_name,file_path,mime_type,file_size,created_at"
              )
              .single();

            if (
              attachmentError
            ) {
              await client.storage
                .from(
                  "professional-media"
                )
                .remove([
                  filePath,
                ]);

              throw attachmentError;
            }

            const {
              data: signed,
            } =
              await client.storage
                .from(
                  "professional-media"
                )
                .createSignedUrl(
                  filePath,
                  3600
                );

            uploadedAttachments.push({
              ...attachmentRow,
              signed_url:
                signed?.signedUrl ||
                "",
            } as NetworkAttachmentWithUrl);
          }
        } catch (
          attachmentUploadError
        ) {
          await client
            .from(
              "network_posts"
            )
            .delete()
            .eq(
              "id",
              data.id
            );

          throw attachmentUploadError;
        }

        setAttachments(
          current => [
            ...uploadedAttachments,
            ...current,
          ]
        );

        setPosts(
          current => [
            data as NetworkPost,
            ...current,
          ]
        );

        setBody("");
        setPostFiles([]);
        setPostType(
          "Update"
        );
        setComposerOpen(
          false
        );

        setStatus(
          "Post shared with your professional network."
        );
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to publish post."
        );
      } finally {
        setBusyKey("");
      }
    };

  const startEditingPost = (
    post: NetworkPost
  ) => {
    setEditingPostId(
      post.id
    );

    setEditingPostBody(
      post.body
    );

    setEditingPostType(
      post.post_type
    );

    setEditingPostFiles(
      []
    );

    setEditingRemovedAttachmentIds(
      []
    );

    setOpenPostMenuId(
      null
    );
  };


  const cancelEditingPost = () => {
    setEditingPostId(
      null
    );

    setEditingPostBody(
      ""
    );

    setEditingPostType(
      "Update"
    );

    setEditingPostFiles(
      []
    );

    setEditingRemovedAttachmentIds(
      []
    );
  };


  const saveEditedPost = async (
    post: NetworkPost
  ) => {
    const bodyText =
      editingPostBody.trim();

    if (
      !currentUserId ||
      post.author_id !== currentUserId ||
      !bodyText ||
      busyKey
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }

    setBusyKey(
      `edit-${post.id}`
    );

    setStatus("");

    try {
      const {
        data,
        error,
      } = await client
        .from(
          "network_posts"
        )
        .update({
          body:
            bodyText,

          post_type:
            editingPostType,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          post.id
        )
        .eq(
          "author_id",
          currentUserId
        )
        .select(
          "id,author_id,post_type,body,created_at,updated_at"
        )
        .single();

      if (error) {
        throw error;
      }

      const removed =
        attachments.filter(
          item =>
            editingRemovedAttachmentIds.includes(
              item.id
            )
        );

      if (removed.length > 0) {
        const {
          error: removeRowsError,
        } = await client
          .from(
            "network_post_attachments"
          )
          .delete()
          .in(
            "id",
            removed.map(
              item => item.id
            )
          );

        if (removeRowsError) {
          throw removeRowsError;
        }

        await client.storage
          .from(
            "professional-media"
          )
          .remove(
            removed.map(
              item =>
                item.file_path
            )
          );
      }

      const uploaded:
        NetworkAttachmentWithUrl[] =
        [];

      for (
        const file of editingPostFiles
      ) {
        if (
          file.size >
          15 * 1024 * 1024
        ) {
          throw new Error(
            `${file.name} is larger than 15 MB.`
          );
        }

        const safeName =
          file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          );

        const filePath =
          `network/${currentUserId}/${post.id}/${crypto.randomUUID()}-${safeName}`;

        const {
          error: uploadError,
        } =
          await client.storage
            .from(
              "professional-media"
            )
            .upload(
              filePath,
              file,
              {
                upsert: false,
                contentType:
                  file.type ||
                  undefined,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: attachmentRow,
          error: attachmentError,
        } =
          await client
            .from(
              "network_post_attachments"
            )
            .insert({
              post_id:
                post.id,
              uploader_id:
                currentUserId,
              file_name:
                file.name,
              file_path:
                filePath,
              mime_type:
                file.type || "",
              file_size:
                file.size,
            })
            .select(
              "id,post_id,uploader_id,file_name,file_path,mime_type,file_size,created_at"
            )
            .single();

        if (attachmentError) {
          await client.storage
            .from(
              "professional-media"
            )
            .remove([
              filePath,
            ]);

          throw attachmentError;
        }

        const {
          data: signed,
        } =
          await client.storage
            .from(
              "professional-media"
            )
            .createSignedUrl(
              filePath,
              3600
            );

        uploaded.push({
          ...attachmentRow,
          signed_url:
            signed?.signedUrl ||
            "",
        } as NetworkAttachmentWithUrl);
      }

      setAttachments(
        current => [
          ...current.filter(
            item =>
              !editingRemovedAttachmentIds.includes(
                item.id
              )
          ),
          ...uploaded,
        ]
      );

      setPosts(
        current =>
          current.map(
            item =>
              item.id === post.id
                ? data as NetworkPost
                : item
          )
      );

      cancelEditingPost();

      setStatus(
        "Post updated."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to update post."
      );
    } finally {
      setBusyKey(
        ""
      );
    }
  };


  const toggleLike =
    async (
      postId: string
    ) => {
      if (
        !currentUserId ||
        busyKey
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      const existing =
        reactions.find(
          reaction =>
            reaction.post_id ===
              postId &&
            reaction.user_id ===
              currentUserId
        );

      setBusyKey(
        `like-${postId}`
      );

      try {
        if (existing) {
          const {error} =
            await client
              .from(
                "network_post_reactions"
              )
              .delete()
              .eq(
                "post_id",
                postId
              )
              .eq(
                "user_id",
                currentUserId
              );

          if (error) {
            throw error;
          }

          setReactions(
            current =>
              current.filter(
                reaction =>
                  !(
                    reaction.post_id ===
                      postId &&
                    reaction.user_id ===
                      currentUserId
                  )
              )
          );
        } else {
          const {
            data,
            error,
          } = await client
            .from(
              "network_post_reactions"
            )
            .insert({
              post_id:
                postId,
              user_id:
                currentUserId,
              reaction:
                "Like",
            })
            .select(
              "post_id,user_id,reaction"
            )
            .single();

          if (error) {
            throw error;
          }

          setReactions(
            current => [
              ...current,
              data as NetworkReaction,
            ]
          );
        }
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to update reaction."
        );
      } finally {
        setBusyKey("");
      }
    };

  const toggleSave =
    async (
      postId: string
    ) => {
      if (
        !currentUserId ||
        busyKey
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      const existing =
        savedPosts.some(
          saved =>
            saved.post_id ===
              postId &&
            saved.user_id ===
              currentUserId
        );

      setBusyKey(
        `save-${postId}`
      );

      try {
        if (existing) {
          const {error} =
            await client
              .from(
                "network_saved_posts"
              )
              .delete()
              .eq(
                "post_id",
                postId
              )
              .eq(
                "user_id",
                currentUserId
              );

          if (error) {
            throw error;
          }

          setSavedPosts(
            current =>
              current.filter(
                saved =>
                  !(
                    saved.post_id ===
                      postId &&
                    saved.user_id ===
                      currentUserId
                  )
              )
          );
        } else {
          const {
            data,
            error,
          } = await client
            .from(
              "network_saved_posts"
            )
            .insert({
              post_id:
                postId,
              user_id:
                currentUserId,
            })
            .select(
              "post_id,user_id"
            )
            .single();

          if (error) {
            throw error;
          }

          setSavedPosts(
            current => [
              ...current,
              data as NetworkSavedPost,
            ]
          );
        }
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to save post."
        );
      } finally {
        setBusyKey("");
      }
    };

  const toggleRepost =
    async (
      postId: string
    ) => {
      if (
        !currentUserId ||
        busyKey
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      const existing =
        reposts.some(
          repost =>
            repost.post_id ===
              postId &&
            repost.user_id ===
              currentUserId
        );

      setBusyKey(
        `repost-${postId}`
      );

      try {
        if (existing) {
          const {error} =
            await client
              .from(
                "network_post_reposts"
              )
              .delete()
              .eq(
                "post_id",
                postId
              )
              .eq(
                "user_id",
                currentUserId
              );

          if (error) {
            throw error;
          }

          setReposts(
            current =>
              current.filter(
                repost =>
                  !(
                    repost.post_id ===
                      postId &&
                    repost.user_id ===
                      currentUserId
                  )
              )
          );
        } else {
          const {
            data,
            error,
          } = await client
            .from(
              "network_post_reposts"
            )
            .insert({
              post_id:
                postId,
              user_id:
                currentUserId,
            })
            .select(
              "post_id,user_id"
            )
            .single();

          if (error) {
            throw error;
          }

          setReposts(
            current => [
              ...current,
              data as NetworkRepost,
            ]
          );
        }
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to update repost."
        );
      } finally {
        setBusyKey("");
      }
    };

  const publishComment =
    async (
      event:
        FormEvent<HTMLFormElement>,
      postId: string
    ) => {
      event.preventDefault();

      const text =
        (
          commentDrafts[
            postId
          ] || ""
        ).trim();

      if (
        !text ||
        !currentUserId ||
        busyKey
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusyKey(
        `comment-${postId}`
      );

      try {
        const {
          data,
          error,
        } = await client
          .from(
            "network_post_comments"
          )
          .insert({
            post_id:
              postId,
            author_id:
              currentUserId,
            body:
              text,
          })
          .select(
            "id,post_id,author_id,body,created_at"
          )
          .single();

        if (error) {
          throw error;
        }

        setComments(
          current => [
            ...current,
            data as NetworkComment,
          ]
        );

        setCommentDrafts(
          current => ({
            ...current,
            [postId]: "",
          })
        );
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to publish comment."
        );
      } finally {
        setBusyKey("");
      }
    };

  const deletePost =
    async (
      post: NetworkPost
    ) => {
      if (
        post.author_id !==
        currentUserId
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          "Delete this post permanently? Its comments, reactions, reposts and uploaded files will also be removed."
        );

      if (!confirmed) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusyKey(
        `delete-${post.id}`
      );

      try {
        const postAttachments =
          attachments.filter(
            item =>
              item.post_id ===
              post.id
          );

        const {error} =
          await client
            .from(
              "network_posts"
            )
            .delete()
            .eq(
              "id",
              post.id
            )
            .eq(
              "author_id",
              currentUserId
            );

        if (error) {
          throw error;
        }

        if (
          postAttachments.length >
          0
        ) {
          const {
            error:
              storageDeleteError,
          } =
            await client.storage
              .from(
                "professional-media"
              )
              .remove(
                postAttachments.map(
                  item =>
                    item.file_path
                )
              );

          if (
            storageDeleteError
          ) {
            console.error(
              "POST STORAGE CLEANUP ERROR:",
              storageDeleteError
            );

            setStatus(
              "Post deleted, but some uploaded files could not be removed from storage."
            );
          }
        }

        setAttachments(
          current =>
            current.filter(
              item =>
                item.post_id !==
                post.id
            )
        );

        setPosts(
          current =>
            current.filter(
              item =>
                item.id !==
                post.id
            )
        );

        setReactions(
          current =>
            current.filter(
              item =>
                item.post_id !==
                post.id
            )
        );

        setSavedPosts(
          current =>
            current.filter(
              item =>
                item.post_id !==
                post.id
            )
        );

        setExpandedComments(
          current =>
            current.filter(
              id =>
                id !==
                post.id
            )
        );

        setCommentDrafts(
          current => {
            const next = {
              ...current,
            };

            delete next[
              post.id
            ];

            return next;
          }
        );

        if (
          editingPostId ===
          post.id
        ) {
          cancelEditingPost();
        }

        setOpenPostMenuId(
          null
        );

        setComments(
          current =>
            current.filter(
              item =>
                item.post_id !==
                post.id
            )
        );

        setReposts(
          current =>
            current.filter(
              item =>
                item.post_id !==
                post.id
            )
        );

        setSavedPosts(
          current =>
            current.filter(
              item =>
                item.post_id !==
                post.id
            )
        );

        setStatus(
          "Post deleted."
        );
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to delete post."
        );
      } finally {
        setBusyKey("");
      }
    };

  return (
    <div className="networkProfessionalFeed">
      <section className="networkPostStarter">
        <FeedAvatar
          name={profile.name}
          source={
            profile.avatar_url
          }
        />

        <button
          type="button"
          onClick={() =>
            setComposerOpen(
              true
            )
          }
        >
          Start a post
        </button>
      </section>

      <section className="networkPostStarterActions">
        <button
          type="button"
          onClick={() => {
            setPostType(
              "Project"
            );
            setComposerOpen(
              true
            );
          }}
        >
          <span>⌘</span>
          Project
        </button>

        <button
          type="button"
          onClick={() => {
            setPostType(
              "Achievement"
            );
            setComposerOpen(
              true
            );
          }}
        >
          <span>★</span>
          Achievement
        </button>

        <button
          type="button"
          onClick={() => {
            setPostType(
              "Opportunity"
            );
            setComposerOpen(
              true
            );
          }}
        >
          <span>↗</span>
          Opportunity
        </button>
      </section>

      {composerOpen && (
        <section className="networkPostComposer">
          <header>
            <FeedAvatar
              name={
                profile.name
              }
              source={
                profile.avatar_url
              }
            />

            <div>
              <b>
                {profile.name}
              </b>

              <span>
                {profile.role}
                {profile.department
                  ? ` · ${profile.department}`
                  : ""}
              </span>

              {profile.campus_uid && (
                <small>
                  {
                    profile.campus_uid
                  }
                </small>
              )}
            </div>

            <button
              type="button"
              className="networkComposerClose"
              onClick={() =>
                setComposerOpen(
                  false
                )
              }
              aria-label="Close composer"
            >
              ×
            </button>
          </header>

          <form
            onSubmit={
              publishPost
            }
          >
            <textarea
              value={body}
              onChange={
                event =>
                  setBody(
                    event.target
                      .value
                  )
              }
              maxLength={
                5000
              }
              placeholder="What do you want to share with your professional campus network?"
              autoFocus
              required
            />

            <div className="networkComposerAttachments">

              <label className="networkAttachmentButton">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.ppt,.pptx"
                  onChange={event => {
                    const selected =
                      Array.from(
                        event.target.files ||
                        []
                      );

                    setPostFiles(
                      current =>
                        [
                          ...current,
                          ...selected,
                        ].slice(
                          0,
                          6
                        )
                    );

                    event.currentTarget.value =
                      "";
                  }}
                />

                <span>
                  📎 Photo / File
                </span>
              </label>

              {postFiles.length > 0 && (
                <div className="networkSelectedFiles">
                  {postFiles.map(
                    (
                      file,
                      index
                    ) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="networkSelectedFile"
                      >
                        <span>
                          {file.type.startsWith(
                            "image/"
                          )
                            ? "🖼"
                            : "📄"}
                        </span>

                        <div>
                          <b>
                            {file.name}
                          </b>

                          <small>
                            {(
                              file.size /
                              1024 /
                              1024
                            ).toFixed(
                              2
                            )}{" "}
                            MB
                          </small>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPostFiles(
                              current =>
                                current.filter(
                                  (
                                    _,
                                    fileIndex
                                  ) =>
                                    fileIndex !==
                                    index
                                )
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

            </div>

            <footer>
              <select
                value={
                  postType
                }
                onChange={
                  event =>
                    setPostType(
                      event.target
                        .value as NetworkPostType
                    )
                }
              >
                {postTypes.map(
                  item => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {
                        item
                      }
                    </option>
                  )
                )}
              </select>

              <span>
                {
                  body.length
                }
                /5000
              </span>

              <button
                type="submit"
                disabled={
                  (
                    !body.trim() &&
                    postFiles.length === 0
                  ) ||
                  busyKey ===
                    "publish"
                }
              >
                {busyKey ===
                "publish"
                  ? "Posting…"
                  : "Post"}
              </button>
            </footer>
          </form>
        </section>
      )}

      {status && (
        <div className="networkFeedStatus">
          {status}
        </div>
      )}

      {loading ? (
        <section className="networkFeedEmpty">
          <div className="networkFeedSpinner"/>
          <b>
            Loading professional feed
          </b>
          <p>
            Reading posts from your CampusConnect network.
          </p>
        </section>
      ) : posts.length === 0 ? (
        <section className="networkFeedEmpty">
          <span>◎</span>

          <b>
            Your professional feed is ready
          </b>

          <p>
            Be the first to share a project, achievement,
            internship update or professional insight.
          </p>

          <button
            type="button"
            onClick={() =>
              setComposerOpen(
                true
              )
            }
          >
            Create first post
          </button>
        </section>
      ) : (
        <section className="networkFeedList">
          {posts.map(
            post => {
              const author =
                peopleById.get(
                  post.author_id
                );

              const authorName =
                author?.full_name ||
                "CampusConnect member";

              const postReactions =
                reactions.filter(
                  item =>
                    item.post_id ===
                    post.id
                );

              const postComments =
                comments.filter(
                  item =>
                    item.post_id ===
                    post.id
                );

              const postReposts =
                reposts.filter(
                  item =>
                    item.post_id ===
                    post.id
                );

              const liked =
                postReactions.some(
                  item =>
                    item.user_id ===
                    currentUserId
                );

              const reposted =
                postReposts.some(
                  item =>
                    item.user_id ===
                    currentUserId
                );

              const saved =
                savedPosts.some(
                  item =>
                    item.post_id ===
                      post.id &&
                    item.user_id ===
                      currentUserId
                );

              const commentsOpen =
                expandedComments.includes(
                  post.id
                );

              return (
                <article
                  className="networkFeedPost"
                  key={
                    post.id
                  }
                >
                  <header className="networkFeedPostHeader">
                    <button
                      type="button"
                      className="networkFeedAuthorAvatarButton"
                      onClick={() =>
                        setSelectedProfileId(
                          post.author_id
                        )
                      }
                      aria-label={`View ${authorName} profile`}
                    >
                      <FeedAvatar
                        name={
                          authorName
                        }
                        source={
                          author?.avatar_url
                        }
                      />
                    </button>

                    <div className="networkFeedPostIdentity">
                      <button
                        type="button"
                        className="networkFeedAuthorNameButton"
                        onClick={() =>
                          setSelectedProfileId(
                            post.author_id
                          )
                        }
                      >
                        <b>
                          {
                            authorName
                          }

                          <i title="Verified CampusConnect profile">
                            ✓
                          </i>
                        </b>
                      </button>

                      <span>
                        {author?.role ||
                          "CampusConnect member"}
                        {author?.department
                          ? ` · ${author.department}`
                          : ""}
                      </span>

                      <small>
                        {author?.campus_uid
                          ? `${author.campus_uid} · `
                          : ""}
                        {relativeTime(
                          post.created_at
                        )}
                      </small>
                    </div>

                    {post.author_id ===
                      currentUserId && (
                      <div className="networkPostOwnerMenu">

                        <button
                          type="button"
                          className="networkPostMenuButton"
                          onClick={() =>
                            setOpenPostMenuId(
                              current =>
                                current ===
                                  post.id
                                  ? null
                                  : post.id
                            )
                          }
                          aria-label="Post options"
                          title="Post options"
                        >
                          ⋯
                        </button>

                        {openPostMenuId ===
                          post.id && (
                          <div className="networkPostMenu">

                            <button
                              type="button"
                              onClick={() =>
                                startEditingPost(
                                  post
                                )
                              }
                            >
                              <span>
                                ✎
                              </span>

                              Edit post
                            </button>

                            <button
                              type="button"
                              className="danger"
                              disabled={
                                busyKey ===
                                `delete-${post.id}`
                              }
                              onClick={() => {
                                setOpenPostMenuId(
                                  null
                                );

                                void deletePost(
                                  post
                                );
                              }}
                            >
                              <span>
                                ⌫
                              </span>

                              Delete post
                            </button>

                          </div>
                        )}

                      </div>
                    )}
                  </header>

                  <div className="networkFeedPostContent">

                    {editingPostId ===
                    post.id ? (
                      <div className="networkPostEditPanel">

                        <select
                          value={
                            editingPostType
                          }
                          onChange={
                            event =>
                              setEditingPostType(
                                event.target
                                  .value as NetworkPostType
                              )
                          }
                        >
                          {postTypes.map(
                            item => (
                              <option
                                key={
                                  item
                                }
                                value={
                                  item
                                }
                              >
                                {
                                  item
                                }
                              </option>
                            )
                          )}
                        </select>

                        <textarea
                          value={
                            editingPostBody
                          }
                          onChange={
                            event =>
                              setEditingPostBody(
                                event.target
                                  .value
                              )
                          }
                          maxLength={
                            5000
                          }
                          autoFocus
                        />

                        <div className="networkPostEditAttachments">

                          {attachments
                            .filter(
                              item =>
                                item.post_id ===
                                post.id &&
                                !editingRemovedAttachmentIds.includes(
                                  item.id
                                )
                            )
                            .map(
                              attachment => (
                                <div
                                  key={
                                    attachment.id
                                  }
                                  className="networkEditExistingAttachment"
                                >
                                  <span>
                                    {attachment.mime_type.startsWith(
                                      "image/"
                                    )
                                      ? "🖼"
                                      : "📄"}
                                  </span>

                                  <b>
                                    {
                                      attachment.file_name
                                    }
                                  </b>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingRemovedAttachmentIds(
                                        current => [
                                          ...current,
                                          attachment.id,
                                        ]
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                              )
                            )}

                          {editingPostFiles.map(
                            (
                              file,
                              index
                            ) => (
                              <div
                                key={`${file.name}-${index}`}
                                className="networkEditExistingAttachment"
                              >
                                <span>
                                  {file.type.startsWith(
                                    "image/"
                                  )
                                    ? "🖼"
                                    : "📄"}
                                </span>

                                <b>
                                  {
                                    file.name
                                  }
                                </b>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingPostFiles(
                                      current =>
                                        current.filter(
                                          (
                                            _,
                                            fileIndex
                                          ) =>
                                            fileIndex !==
                                            index
                                        )
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            )
                          )}

                          <label className="networkEditAddFile">
                            <input
                              type="file"
                              multiple
                              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.ppt,.pptx"
                              onChange={event => {
                                const selected =
                                  Array.from(
                                    event.target.files ||
                                    []
                                  );

                                setEditingPostFiles(
                                  current =>
                                    [
                                      ...current,
                                      ...selected,
                                    ].slice(
                                      0,
                                      6
                                    )
                                );

                                event.currentTarget.value =
                                  "";
                              }}
                            />

                            <span>
                              + Add photo / file
                            </span>
                          </label>

                        </div>

                        <div className="networkPostEditFooter">

                          <span>
                            {
                              editingPostBody.length
                            }
                            /5000
                          </span>

                          <div>
                            <button
                              type="button"
                              className="ghost"
                              onClick={
                                cancelEditingPost
                              }
                            >
                              Cancel
                            </button>

                            <button
                              type="button"
                              className="primary"
                              disabled={
                                !editingPostBody.trim() ||
                                busyKey ===
                                  `edit-${post.id}`
                              }
                              onClick={() =>
                                void saveEditedPost(
                                  post
                                )
                              }
                            >
                              {busyKey ===
                              `edit-${post.id}`
                                ? "Saving..."
                                : "Save"}
                            </button>
                          </div>

                        </div>

                      </div>
                    ) : (
                      <>
                        <span className="networkPostType">
                          {
                            post.post_type
                          }
                        </span>

                        <p>
                          {
                            post.body
                          }
                        </p>
                      </>
                    )}

                  </div>

                  {attachments.some(
                    item =>
                      item.post_id ===
                      post.id
                  ) && (
                    <div className="networkPostAttachments">

                      {attachments
                        .filter(
                          item =>
                            item.post_id ===
                            post.id &&
                            item.mime_type.startsWith(
                              "image/"
                            )
                        )
                        .map(
                          attachment => (
                            <button
                              type="button"
                              key={
                                attachment.id
                              }
                              className="networkPostImage"
                              onClick={() => {
                                if (
                                  attachment.signed_url
                                ) {
                                  window.open(
                                    attachment.signed_url,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }
                              }}
                            >
                              <img
                                src={
                                  attachment.signed_url
                                }
                                alt={
                                  attachment.file_name
                                }
                              />
                            </button>
                          )
                        )}

                      {attachments
                        .filter(
                          item =>
                            item.post_id ===
                            post.id &&
                            !item.mime_type.startsWith(
                              "image/"
                            )
                        )
                        .map(
                          attachment => (
                            <button
                              type="button"
                              key={
                                attachment.id
                              }
                              className="networkPostFile"
                              onClick={() => {
                                if (
                                  attachment.signed_url
                                ) {
                                  window.open(
                                    attachment.signed_url,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }
                              }}
                            >
                              <i>
                                📄
                              </i>

                              <span>
                                <b>
                                  {
                                    attachment.file_name
                                  }
                                </b>

                                <small>
                                  {(
                                    attachment.file_size /
                                    1024 /
                                    1024
                                  ).toFixed(
                                    2
                                  )}{" "}
                                  MB
                                </small>
                              </span>

                              <strong>
                                Open
                              </strong>
                            </button>
                          )
                        )}

                    </div>
                  )}

                  <div className="networkFeedPostMetrics">
                    <span>
                      {postReactions.length >
                        0
                        ? `👍 ${postReactions.length}`
                        : ""}
                    </span>

                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedComments(
                            current =>
                              current.includes(
                                post.id
                              )
                                ? current.filter(
                                    id =>
                                      id !==
                                      post.id
                                  )
                                : [
                                    ...current,
                                    post.id,
                                  ]
                          )
                        }
                      >
                        {
                          postComments.length
                        }{" "}
                        comment
                        {postComments.length ===
                        1
                          ? ""
                          : "s"}
                      </button>

                      <span>·</span>

                      <span>
                        {
                          postReposts.length
                        }{" "}
                        repost
                        {postReposts.length ===
                        1
                          ? ""
                          : "s"}
                      </span>
                    </div>
                  </div>

                  <footer className="networkFeedPostActions">
                    <button
                      type="button"
                      className={
                        liked
                          ? "active"
                          : ""
                      }
                      disabled={
                        busyKey ===
                        `like-${post.id}`
                      }
                      onClick={() =>
                        void toggleLike(
                          post.id
                        )
                      }
                    >
                      <span>♡</span>
                      {liked
                        ? "Liked"
                        : "Like"}
                    </button>

                    <button
                      type="button"
                      className={
                        commentsOpen
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setExpandedComments(
                          current =>
                            current.includes(
                              post.id
                            )
                              ? current.filter(
                                  id =>
                                    id !==
                                    post.id
                                )
                              : [
                                  ...current,
                                  post.id,
                                ]
                        )
                      }
                    >
                      <span>◯</span>
                      Comment
                    </button>

                    <button
                      type="button"
                      className={
                        reposted
                          ? "active"
                          : ""
                      }
                      disabled={
                        busyKey ===
                        `repost-${post.id}`
                      }
                      onClick={() =>
                        void toggleRepost(
                          post.id
                        )
                      }
                    >
                      <span>↻</span>
                      {reposted
                        ? "Reposted"
                        : "Repost"}
                    </button>

                    <button
                      type="button"
                      className={
                        saved
                          ? "active"
                          : ""
                      }
                      disabled={
                        busyKey ===
                        `save-${post.id}`
                      }
                      onClick={() =>
                        void toggleSave(
                          post.id
                        )
                      }
                    >
                      <span>⌑</span>
                      {saved
                        ? "Saved"
                        : "Save"}
                    </button>
                  </footer>

                  {commentsOpen && (
                    <section className="networkPostComments">
                      {postComments.length >
                      0 ? (
                        postComments.map(
                          comment => {
                            const commentAuthor =
                              peopleById.get(
                                comment.author_id
                              );

                            const commentName =
                              commentAuthor?.full_name ||
                              "CampusConnect member";

                            return (
                              <article
                                key={
                                  comment.id
                                }
                              >
                                <FeedAvatar
                                  name={
                                    commentName
                                  }
                                  source={
                                    commentAuthor?.avatar_url
                                  }
                                />

                                <div>
                                  <header>
                                    <b>
                                      {
                                        commentName
                                      }
                                    </b>

                                    <span>
                                      {commentAuthor?.role ||
                                        "Member"}
                                      {" · "}
                                      {relativeTime(
                                        comment.created_at
                                      )}
                                    </span>
                                  </header>

                                  <p>
                                    {
                                      comment.body
                                    }
                                  </p>
                                </div>
                              </article>
                            );
                          }
                        )
                      ) : (
                        <p className="networkNoComments">
                          No comments yet. Start the conversation.
                        </p>
                      )}

                      <form
                        onSubmit={
                          event =>
                            void publishComment(
                              event,
                              post.id
                            )
                        }
                      >
                        <FeedAvatar
                          name={
                            profile.name
                          }
                          source={
                            profile.avatar_url
                          }
                        />

                        <input
                          value={
                            commentDrafts[
                              post.id
                            ] || ""
                          }
                          onChange={
                            event =>
                              setCommentDrafts(
                                current => ({
                                  ...current,
                                  [post.id]:
                                    event.target
                                      .value,
                                })
                              )
                          }
                          maxLength={
                            2000
                          }
                          placeholder="Add a comment..."
                          required
                        />

                        <button
                          type="submit"
                          disabled={
                            !(
                              commentDrafts[
                                post.id
                              ] || ""
                            ).trim() ||
                            busyKey ===
                              `comment-${post.id}`
                          }
                        >
                          Send
                        </button>
                      </form>
                    </section>
                  )}
                </article>
              );
            }
          )}
        </section>
      )}
    {selectedProfileId && (
      <NetworkProfileModal
        userId={selectedProfileId}
        onClose={() =>
          setSelectedProfileId(null)
        }
      />
    )}

    </div>
  );
}
