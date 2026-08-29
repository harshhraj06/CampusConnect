"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {getSupabaseClient} from "../lib/supabase";

type Role =
  | "Student"
  | "Faculty"
  | "Coordinator"
  | "Placement Cell"
  | "Volunteer"
  | "Main Admin";

type CommunityProfile = {
  name: string;
  role: Role;
  campus_uid?: string;
  avatar_url?: string;
};

type CommunityPost = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: Role;
  author_campus_uid: string;
  author_avatar_url?: string | null;
  category: string;
  title: string;
  body: string;
  status: "Open" | "Resolved";
  reply_count: number;
  created_at: string;
  updated_at: string;
};

type CommunityReply = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_role: Role;
  author_campus_uid: string;
  author_avatar_url?: string | null;
  body: string;
  created_at: string;
};

const roleColumns: Array<{
  value: Role;
  label: string;
  icon: string;
}> = [
  {value: "Student", label: "Students", icon: "ST"},
  {value: "Faculty", label: "Faculty", icon: "FC"},
  {value: "Coordinator", label: "Coordinators", icon: "CO"},
  {value: "Placement Cell", label: "Placement Cell", icon: "PC"},
  {value: "Volunteer", label: "Volunteers", icon: "VO"},
  {value: "Main Admin", label: "Admin", icon: "AD"},
];

const categories = [
  "Academic",
  "Question bank",
  "Technical issue",
  "Placement",
  "Campus service",
  "General",
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join("") || "CC";
}

function relativeTime(value: string) {
  const difference = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function AuthorAvatar({
  name,
  source,
}: {
  name: string;
  source?: string | null;
}) {
  return (
    <i className="communityPostAvatar">
      {source ? (
        <img src={source} alt="" loading="lazy" referrerPolicy="no-referrer"/>
      ) : (
        initials(name)
      )}
    </i>
  );
}

export function CommunityPosts({profile}: {profile: CommunityProfile}) {
  const [currentUserId, setCurrentUserId] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [roleFilter, setRoleFilter] = useState<Role | "All">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Resolved">("All");
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [category, setCategory] = useState<(typeof categories)[number]>("General");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expandedPostId, setExpandedPostId] = useState("");
  const [replies, setReplies] = useState<Record<string, CommunityReply[]>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const loadPosts = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setStatus("CampusConnect database connection is unavailable.");
      setLoading(false);
      return;
    }

    const {data, error} = await client
      .from("community_posts")
      .select("*")
      .order("created_at", {ascending: false})
      .limit(150);

    if (error) {
      setStatus(error.message);
    } else {
      setPosts((data || []) as CommunityPost[]);
      setStatus("");
    }
    setLoading(false);
  }, []);

  const loadReplies = useCallback(async (postId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    const {data, error} = await client
      .from("community_post_replies")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", {ascending: true})
      .limit(200);

    if (error) {
      setStatus(error.message);
      return;
    }

    setReplies(current => ({
      ...current,
      [postId]: (data || []) as CommunityReply[],
    }));
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    void client.auth.getUser().then(({data}) => {
      setCurrentUserId(data.user?.id || "");
    });
    void loadPosts();

    const channel = client
      .channel("campus-community-posts")
      .on(
        "postgres_changes",
        {event: "*", schema: "public", table: "community_posts"},
        () => void loadPosts()
      )
      .on(
        "postgres_changes",
        {event: "*", schema: "public", table: "community_post_replies"},
        payload => {
          const next = payload.new as {post_id?: string};
          const previous = payload.old as {post_id?: string};
          const postId = next.post_id || previous.post_id;
          if (postId) void loadReplies(postId);
          void loadPosts();
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [loadPosts, loadReplies]);

  const roleCounts = useMemo(() => {
    return posts.reduce<Record<string, number>>((counts, post) => {
      counts[post.author_role] = (counts[post.author_role] || 0) + 1;
      return counts;
    }, {});
  }, [posts]);

  const visiblePosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return posts.filter(post => {
      if (roleFilter !== "All" && post.author_role !== roleFilter) return false;
      if (statusFilter !== "All" && post.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return [
        post.title,
        post.body,
        post.category,
        post.author_name,
        post.author_campus_uid,
      ].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [posts, query, roleFilter, statusFilter]);

  async function publishPost(event: FormEvent) {
    event.preventDefault();
    if (title.trim().length < 5 || body.trim().length < 10) {
      setStatus("Add a clear title and at least 10 characters of detail.");
      return;
    }

    const client = getSupabaseClient();
    if (!client || busy) return;
    setBusy(true);
    setStatus("");

    const {data, error} = await client
      .from("community_posts")
      .insert({category, title: title.trim(), body: body.trim()})
      .select("*")
      .single();

    if (error) {
      setStatus(error.message);
    } else {
      const post = data as CommunityPost;
      setPosts(current => [post, ...current.filter(item => item.id !== post.id)]);
      setTitle("");
      setBody("");
      setCategory("General");
      setComposerOpen(false);
      setRoleFilter("All");
      setStatus("Your community post is now live.");
    }
    setBusy(false);
  }

  async function toggleReplies(postId: string) {
    if (expandedPostId === postId) {
      setExpandedPostId("");
      return;
    }
    setExpandedPostId(postId);
    if (!replies[postId]) await loadReplies(postId);
  }

  async function publishReply(event: FormEvent, postId: string) {
    event.preventDefault();
    const replyBody = (replyDrafts[postId] || "").trim();
    if (!replyBody || busy) return;
    const client = getSupabaseClient();
    if (!client) return;
    setBusy(true);

    const {data, error} = await client
      .from("community_post_replies")
      .insert({post_id: postId, body: replyBody})
      .select("*")
      .single();

    if (error) {
      setStatus(error.message);
    } else {
      const reply = data as CommunityReply;
      setReplies(current => ({
        ...current,
        [postId]: [...(current[postId] || []), reply],
      }));
      setReplyDrafts(current => ({...current, [postId]: ""}));
      setPosts(current => current.map(post =>
        post.id === postId
          ? {...post, reply_count: post.reply_count + 1}
          : post
      ));
    }
    setBusy(false);
  }

  async function toggleResolved(post: CommunityPost) {
    const client = getSupabaseClient();
    if (!client || busy) return;
    setBusy(true);
    const nextStatus = post.status === "Resolved" ? "Open" : "Resolved";
    const {data, error} = await client
      .from("community_posts")
      .update({status: nextStatus})
      .eq("id", post.id)
      .select("*")
      .single();
    if (error) setStatus(error.message);
    else setPosts(current => current.map(item => item.id === post.id ? data as CommunityPost : item));
    setBusy(false);
  }

  async function removePost(post: CommunityPost) {
    if (!window.confirm("Delete this community post and all its replies?")) return;
    const client = getSupabaseClient();
    if (!client || busy) return;
    setBusy(true);
    const {error} = await client.from("community_posts").delete().eq("id", post.id);
    if (error) setStatus(error.message);
    else {
      setPosts(current => current.filter(item => item.id !== post.id));
      setExpandedPostId(current => current === post.id ? "" : current);
    }
    setBusy(false);
  }

  return (
    <div className="communityPosts">
      <section className="communityPostHero">
        <div>
          <span>AUTHENTICATED CAMPUS DISCUSSIONS</span>
          <h2>Community Posts</h2>
          <p>Ask for question banks, report a system issue, request campus help, or start a useful discussion.</p>
        </div>
        <button type="button" onClick={() => setComposerOpen(current => !current)}>
          {composerOpen ? "Close composer" : "+ Ask the community"}
        </button>
      </section>

      <section className="communityRoleColumns" aria-label="Community role columns">
        {roleColumns.map(column => (
          <button
            type="button"
            className={roleFilter === column.value ? "active" : ""}
            onClick={() => setRoleFilter(current => current === column.value ? "All" : column.value)}
            key={column.value}
          >
            <i>{column.icon}</i>
            <span><b>{column.label}</b><small>{roleCounts[column.value] || 0} posts</small></span>
          </button>
        ))}
      </section>

      {composerOpen && (
        <form className="communityPostComposer" onSubmit={publishPost}>
          <header>
            <AuthorAvatar name={profile.name} source={profile.avatar_url}/>
            <span>
              <b>{profile.name}</b>
              <small>{profile.role} · {profile.campus_uid || "CC ID not assigned"}</small>
            </span>
          </header>
          <div className="communityPostComposerFields">
            <select value={category} onChange={event => setCategory(event.target.value as (typeof categories)[number])}>
              {categories.map(item => <option key={item}>{item}</option>)}
            </select>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              maxLength={160}
              placeholder="Give your question a clear title"
              required
            />
          </div>
          <textarea
            value={body}
            onChange={event => setBody(event.target.value)}
            maxLength={5000}
            placeholder="Explain what you need, what you already tried, and any useful details..."
            required
          />
          <footer>
            <p>Your verified name, role, and CC ID are added automatically.</p>
            <button type="submit" disabled={busy}>{busy ? "Publishing..." : "Publish post"}</button>
          </footer>
        </form>
      )}

      <section className="communityPostToolbar">
        <div className="communityPostSearch">
          <i>⌕</i>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search posts, people, categories or CC IDs"/>
        </div>
        <div className="communityPostFilters">
          {(["All", "Open", "Resolved"] as const).map(item => (
            <button type="button" className={statusFilter === item ? "active" : ""} onClick={() => setStatusFilter(item)} key={item}>{item}</button>
          ))}
          {(roleFilter !== "All" || query) && <button type="button" onClick={() => {setRoleFilter("All"); setQuery("");}}>Clear</button>}
        </div>
      </section>

      {status && <p className="communityPostStatus">{status}</p>}

      <section className="communityPostFeed">
        {loading ? (
          <div className="communityPostEmpty"><i>···</i><b>Loading community posts</b></div>
        ) : visiblePosts.length === 0 ? (
          <div className="communityPostEmpty"><i>◇</i><b>No posts match this view</b><p>Start the first useful discussion for this community column.</p></div>
        ) : visiblePosts.map(post => {
          const canManage = post.author_id === currentUserId || profile.role === "Main Admin";
          const postReplies = replies[post.id] || [];
          const expanded = expandedPostId === post.id;
          return (
            <article className={`communityPostCard ${post.status === "Resolved" ? "resolved" : ""}`} key={post.id}>
              <header>
                <AuthorAvatar name={post.author_name} source={post.author_avatar_url}/>
                <div className="communityPostAuthor">
                  <b>{post.author_name}</b>
                  <span>{post.author_role}<i>·</i>{post.author_campus_uid || "CC ID not assigned"}<i>·</i>{relativeTime(post.created_at)}</span>
                </div>
                <div className="communityPostBadges">
                  <em>{post.category}</em>
                  <strong>{post.status}</strong>
                </div>
              </header>
              <div className="communityPostBody">
                <h3>{post.title}</h3>
                <p>{post.body}</p>
              </div>
              <footer className="communityPostActions">
                <button type="button" onClick={() => void toggleReplies(post.id)}>
                  <i>↳</i>{post.reply_count} {post.reply_count === 1 ? "reply" : "replies"}
                </button>
                {canManage && <button type="button" onClick={() => void toggleResolved(post)}>{post.status === "Resolved" ? "Reopen" : "Mark resolved"}</button>}
                {canManage && <button type="button" className="danger" onClick={() => void removePost(post)}>Delete</button>}
              </footer>

              {expanded && (
                <section className="communityPostReplies">
                  {postReplies.length > 0 ? postReplies.map(reply => (
                    <article key={reply.id}>
                      <AuthorAvatar name={reply.author_name} source={reply.author_avatar_url}/>
                      <div>
                        <header><b>{reply.author_name}</b><span>{reply.author_role} · {reply.author_campus_uid || "CC ID not assigned"} · {relativeTime(reply.created_at)}</span></header>
                        <p>{reply.body}</p>
                      </div>
                    </article>
                  )) : <p className="communityPostNoReplies">No replies yet. Add the first helpful response.</p>}
                  <form onSubmit={event => void publishReply(event, post.id)}>
                    <AuthorAvatar name={profile.name} source={profile.avatar_url}/>
                    <textarea
                      value={replyDrafts[post.id] || ""}
                      onChange={event => setReplyDrafts(current => ({...current, [post.id]: event.target.value}))}
                      maxLength={3000}
                      placeholder="Write a helpful reply..."
                      required
                    />
                    <button type="submit" disabled={busy}>Reply</button>
                  </form>
                </section>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
