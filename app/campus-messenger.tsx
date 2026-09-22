"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {getSupabaseClient} from "../lib/supabase";

type Role =
  | "Student"
  | "Faculty"
  | "Coordinator"
  | "Volunteer"
  | "Placement Cell"
  | "Main Admin";

export type MessengerProfile = {
  name: string;
  email?: string;
  department: string;
  year: string;
  role: Role;
  campus_uid?: string;
  avatar_url?: string;
};

type CampusUser = {
  id: string;
  full_name: string;
  email?: string;
  role: Role;
  department: string;
  graduation_year: string;
  campus_uid: string;
  avatar_url?: string | null;
};

type Conversation = {
  id: string;
  conversation_type: "Direct" | "Group";
  name: string;
  description: string;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Member = {
  conversation_id: string;
  user_id: string;
  member_role: "Member" | "Admin";
  last_read_at?: string | null;
  is_muted?: boolean;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  message_type:
    | "Text"
    | "Image"
    | "File"
    | "System";
  body: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  reply_to: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
};

type MessageReceipt = {
  message_id: string;
  user_id: string;
  delivered_at: string | null;
  read_at: string | null;
};

type Connection = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status:
    | "Pending"
    | "Accepted"
    | "Rejected"
    | "Blocked";
};


function MessengerUserAvatar({
  name,
  src,
  className = "",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word.charAt(0))
    .join("")
    .toUpperCase() || "U";

  return (
    <div
      className={`messengerUserAvatar ${className}`.trim()}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={`${name} profile`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}


export default function CampusMessenger({
  profile,
}: {
  profile: MessengerProfile;
}) {
  const [currentUserId, setCurrentUserId] =
    useState("");

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [activeConversationId, setActiveConversationId] =
    useState("");

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [sidebarMessages, setSidebarMessages] =
    useState<ChatMessage[]>([]);

  const [composer, setComposer] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [uidQuery, setUidQuery] =
    useState("");

  const [foundUser, setFoundUser] =
    useState<CampusUser | null>(null);

  const [messageReceipts, setMessageReceipts] =
    useState<MessageReceipt[]>([]);

  const [connections, setConnections] =
    useState<Connection[]>([]);

  const [incomingRequests, setIncomingRequests] =
    useState<Connection[]>([]);

  const [requestUsers, setRequestUsers] =
    useState<Record<string, CampusUser>>({});

  const [connectionUsers, setConnectionUsers] =
    useState<Record<string, CampusUser>>({});

  const [peopleTab, setPeopleTab] =
    useState<
      "Friends" |
      "Requests" |
      "Sent" |
      "Removed"
    >("Friends");


  useEffect(() => {
    const applyRequestedTab = (
      requestedTab?: string | null
    ) => {
      if (
        requestedTab === "Friends" ||
        requestedTab === "Requests" ||
        requestedTab === "Sent" ||
        requestedTab === "Removed"
      ) {
        setPeopleTab(
          requestedTab
        );
      }
    };

    applyRequestedTab(
      window.sessionStorage
        .getItem(
          "campusconnect-messenger-people-tab"
        )
    );

    window.sessionStorage
      .removeItem(
        "campusconnect-messenger-people-tab"
      );

    const handleOpenMessengerTab =
      (event: Event) => {
        const customEvent =
          event as CustomEvent<string>;

        applyRequestedTab(
          customEvent.detail
        );
      };

    window.addEventListener(
      "campus-open-messenger-tab",
      handleOpenMessengerTab
    );

    return () => {
      window.removeEventListener(
        "campus-open-messenger-tab",
        handleOpenMessengerTab
      );
    };
  }, []);



  const [showNewChat, setShowNewChat] =
    useState(false);

  const [showCreateGroup, setShowCreateGroup] =
    useState(false);

  const [showGroupInfo, setShowGroupInfo] =
    useState(false);

  const [showConversationMenu, setShowConversationMenu] =
    useState(false);

  const [groupInfoName, setGroupInfoName] =
    useState("");

  const [groupInfoDescription, setGroupInfoDescription] =
    useState("");

  const [groupInfoSearch, setGroupInfoSearch] =
    useState("");

  const [groupAvatarFile, setGroupAvatarFile] =
    useState<File | null>(null);

  const [groupAvatarPreview, setGroupAvatarPreview] =
    useState("");

  const [groupInfoTab, setGroupInfoTab] =
    useState<"Members" | "Media" | "Docs" | "Links">("Members");

  const [groupInfoCandidates, setGroupInfoCandidates] =
    useState<CampusUser[]>([]);

  const [groupMemberProfiles, setGroupMemberProfiles] =
    useState<Record<string, CampusUser>>({});

  const [groupActionBusy, setGroupActionBusy] =
    useState(false);

  const [groupName, setGroupName] =
    useState("");

  const [groupDescription, setGroupDescription] =
    useState("");

  const [groupSearch, setGroupSearch] =
    useState("");

  const [groupCandidates, setGroupCandidates] =
    useState<CampusUser[]>([]);

  const [selectedMemberIds, setSelectedMemberIds] =
    useState<string[]>([]);

  const [selectedGroupUsers, setSelectedGroupUsers] =
    useState<CampusUser[]>([]);

  const [attachment, setAttachment] =
    useState<File | null>(null);

  const [replyingTo, setReplyingTo] =
    useState<ChatMessage | null>(null);

  const [reactions, setReactions] =
    useState<Record<string, {
      emoji: string;
      user_id: string;
    }[]>>({});

  const [typingUsers, setTypingUsers] =
    useState<Record<string, string>>({});

  const [busy, setBusy] =
    useState(false);

  const [status, setStatus] =
    useState("");

  const [onlineUserIds, setOnlineUserIds] =
    useState<Set<string>>(new Set());

  const messageEndRef =
    useRef<HTMLDivElement>(null);

  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const typingChannelRef =
    useRef<any>(null);

  const activeConversation =
    conversations.find(
      conversation =>
        conversation.id === activeConversationId
    );

  const acceptedConnections =
    useMemo(
      () =>
        connections.filter(
          connection =>
            connection.status === "Accepted" &&
            (
              connection.requester_id === currentUserId ||
              connection.receiver_id === currentUserId
            )
        ),
      [connections, currentUserId]
    );

  const sentRequests =
    useMemo(
      () =>
        connections.filter(
          connection =>
            connection.status === "Pending" &&
            connection.requester_id === currentUserId
        ),
      [connections, currentUserId]
    );

  const removedConnections =
    useMemo(
      () =>
        connections.filter(
          connection =>
            connection.status === "Rejected" &&
            (
              connection.requester_id === currentUserId ||
              connection.receiver_id === currentUserId
            )
        ),
      [connections, currentUserId]
    );


  const connectionOtherUserId = (
    connection: Connection
  ) =>
    connection.requester_id === currentUserId
      ? connection.receiver_id
      : connection.requester_id;


  const loadBaseData = async () => {
    const client = getSupabaseClient();

    if (!client) return;

    const {data: auth} =
      await client.auth.getUser();

    if (!auth.user) return;

    setCurrentUserId(auth.user.id);

    const [
      memberResult,
      connectionResult,
    ] = await Promise.all([
      client
        .from("chat_members")
        .select(
          "conversation_id,user_id,member_role,last_read_at,is_muted"
        ),

      client
        .from("chat_connections")
        .select("*"),
    ]);

    if (!memberResult.error) {
      const membershipRows =
        (memberResult.data || []) as Member[];

      setMembers(membershipRows);

      const conversationIds =
        membershipRows
          .filter(
            member =>
              member.user_id === auth.user.id
          )
          .map(member =>
            member.conversation_id
          );

      if (conversationIds.length) {
        const {data, error} =
          await client
            .from("chat_conversations")
            .select("*")
            .in("id", conversationIds)
            .order(
              "updated_at",
              {ascending: false}
            );

        if (!error) {
          const rows =
            (data || []) as Conversation[];

          setConversations(rows);

          if (
            rows.length &&
            !activeConversationId
          ) {
            setActiveConversationId(
              rows[0].id
            );
          }
        }
      } else {
        setConversations([]);
      }
    }

    if (!connectionResult.error) {
      setConnections(
        (connectionResult.data || []) as Connection[]
      );
    }
  };

  useEffect(() => {
    void loadBaseData();
  }, []);


  // =======================================================
  // CAMPUSCONNECT MESSENGER — RELIABLE LIVE PRESENCE
  // =======================================================

  useEffect(() => {
    if (!currentUserId) {
      setOnlineUserIds(
        new Set()
      );

      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      return;
    }

    let cancelled = false;

    const ONLINE_THRESHOLD_MS =
      75_000;

    // -----------------------------------------------------
    // Write this user's heartbeat
    // -----------------------------------------------------

    const heartbeat =
      async () => {
        const now =
          new Date().toISOString();

        const {
          error,
        } =
          await client
            .from(
              "chat_user_presence"
            )
            .upsert(
              {
                user_id:
                  currentUserId,

                last_seen_at:
                  now,

                updated_at:
                  now,
              },
              {
                onConflict:
                  "user_id",
              }
            );

        if (error) {
          console.error(
            "[Messenger Presence] Heartbeat failed:",
            error
          );
        }
      };

    // -----------------------------------------------------
    // Read currently-online users
    // -----------------------------------------------------

    const loadOnlineUsers =
      async () => {
        const cutoff =
          new Date(
            Date.now() -
              ONLINE_THRESHOLD_MS
          ).toISOString();

        const {
          data,
          error,
        } =
          await client
            .from(
              "chat_user_presence"
            )
            .select(
              "user_id,last_seen_at"
            )
            .gte(
              "last_seen_at",
              cutoff
            );

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "[Messenger Presence] Read failed:",
            error
          );

          return;
        }

        const next =
          new Set<string>();

        for (
          const row
          of data || []
        ) {
          if (
            typeof row.user_id ===
            "string"
          ) {
            next.add(
              row.user_id
            );
          }
        }

        setOnlineUserIds(
          next
        );
      };

    // -----------------------------------------------------
    // Initial presence
    // -----------------------------------------------------

    const initialize =
      async () => {
        await heartbeat();

        if (!cancelled) {
          await loadOnlineUsers();
        }
      };

    void initialize();

    // Keep ourselves alive.
    const heartbeatTimer =
      window.setInterval(
        () => {
          void heartbeat();
        },
        20_000
      );

    // Poll as a reliable fallback.
    const refreshTimer =
      window.setInterval(
        () => {
          void loadOnlineUsers();
        },
        10_000
      );

    // -----------------------------------------------------
    // Realtime DB changes make status update immediately.
    // Polling above remains the fallback.
    // -----------------------------------------------------

    const channel =
      client
        .channel(
          `messenger-presence-db:${currentUserId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "chat_user_presence",
          },
          () => {
            void loadOnlineUsers();
          }
        )
        .subscribe();

    // -----------------------------------------------------
    // Refresh immediately when user returns to the app
    // -----------------------------------------------------

    const handleFocus =
      () => {
        void heartbeat();
        void loadOnlineUsers();
      };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void heartbeat();
          void loadOnlineUsers();
        }
      };

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      cancelled = true;

      window.clearInterval(
        heartbeatTimer
      );

      window.clearInterval(
        refreshTimer
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );

      void client.removeChannel(
        channel
      );
    };
  }, [currentUserId]);


  const sendTypingSignal = () => {
    const channel =
      typingChannelRef.current;

    if (!channel) return;

    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id:
          currentUserId,
        name:
          profile.name,
      },
    });
  };


  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);


  useEffect(() => {
    if (
      !activeConversationId ||
      !currentUserId
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    const markRead = async () => {
      const readAt =
        new Date().toISOString();

      // ---------------------------------------------------
      // 1. Conversation-level read marker
      // Used by unread badges / sidebar counts
      // ---------------------------------------------------

      const {error: memberError} =
        await client
          .from("chat_members")
          .update({
            last_read_at:
              readAt,
          })
          .eq(
            "conversation_id",
            activeConversationId
          )
          .eq(
            "user_id",
            currentUserId
          );

      if (memberError) {
        console.error(
          "Unable to update read status:",
          memberError
        );
      } else {
        setMembers(current =>
          current.map(member =>
            member.conversation_id ===
              activeConversationId &&
            member.user_id ===
              currentUserId
              ? {
                  ...member,
                  last_read_at:
                    readAt,
                }
              : member
          )
        );
      }

      // ---------------------------------------------------
      // 2. Per-message persistent read receipts
      // ---------------------------------------------------

      const incomingMessages =
        messages.filter(
          message =>
            message.conversation_id ===
              activeConversationId &&
            message.sender_id !==
              currentUserId
        );

      if (!incomingMessages.length) {
        return;
      }

      const receiptRows =
        incomingMessages.map(
          message => ({
            message_id:
              message.id,

            user_id:
              currentUserId,

            delivered_at:
              readAt,

            read_at:
              readAt,
          })
        );

      const {
        data: receiptData,
        error: receiptError,
      } = await client
        .from("chat_message_receipts")
        .upsert(
          receiptRows,
          {
            onConflict:
              "message_id,user_id",
          }
        )
        .select(
          "message_id,user_id,delivered_at,read_at"
        );

      if (receiptError) {
        console.error(
          "Unable to mark messages read:",
          receiptError
        );

        return;
      }

      const updatedReceipts =
        (receiptData || []) as MessageReceipt[];

      setMessageReceipts(current => {
        const next =
          [...current];

        for (
          const receipt
          of updatedReceipts
        ) {
          const index =
            next.findIndex(
              item =>
                item.message_id ===
                  receipt.message_id &&
                item.user_id ===
                  receipt.user_id
            );

          if (index >= 0) {
            next[index] =
              receipt;
          } else {
            next.push(
              receipt
            );
          }
        }

        return next;
      });
    };

    void markRead();

  }, [
    activeConversationId,
    currentUserId,
    messages.length,
  ]);

  const loadIncomingRequests = async () => {
    const client = getSupabaseClient();

    if (!client || !currentUserId) {
      return;
    }

    const {data, error} =
      await client
        .from("chat_connections")
        .select("*")
        .eq(
          "receiver_id",
          currentUserId
        )
        .eq(
          "status",
          "Pending"
        )
        .order(
          "created_at",
          {ascending: false}
        );

    if (error) {
      console.error(
        "Unable to load connection requests:",
        error
      );
      return;
    }

    const rows =
      (data || []) as Connection[];

    setIncomingRequests(rows);

    if (!rows.length) {
      setRequestUsers({});
      return;
    }

    const senderIds =
      rows.map(
        row => row.requester_id
      );

    const {
      data: users,
      error: usersError,
    } = await client.rpc(
      "find_campus_users_by_ids",
      {
        user_ids: senderIds,
      }
    );

    if (usersError) {
      console.error(
        "Unable to load request users:",
        usersError
      );
      return;
    }

    const userMap:
      Record<string, CampusUser> = {};

    for (
      const user
      of (users || []) as CampusUser[]
    ) {
      userMap[user.id] = user;
    }

    setRequestUsers(userMap);
  };


  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    void loadIncomingRequests();
  }, [currentUserId]);


  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    const channel =
      client
        .channel(
          `connection-requests:${currentUserId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "chat_connections",
            filter:
              `receiver_id=eq.${currentUserId}`,
          },
          () => {
            void loadIncomingRequests();
            void loadBaseData();
          }
        )
        .subscribe();

    return () => {
      void client.removeChannel(
        channel
      );
    };
  }, [currentUserId]);


  useEffect(() => {
    if (!currentUserId || !connections.length) {
      setConnectionUsers({});
      return;
    }

    const client = getSupabaseClient();

    if (!client) return;

    const ids = Array.from(
      new Set(
        connections
          .filter(
            connection =>
              connection.requester_id === currentUserId ||
              connection.receiver_id === currentUserId
          )
          .map(connection =>
            connection.requester_id === currentUserId
              ? connection.receiver_id
              : connection.requester_id
          )
          .filter(Boolean)
      )
    );

    if (!ids.length) {
      setConnectionUsers({});
      return;
    }

    let cancelled = false;

    void client
      .rpc(
        "find_campus_users_by_ids",
        {
          user_ids: ids,
        }
      )
      .then(({data, error}) => {
        if (cancelled || error) return;

        const next:
          Record<string, CampusUser> = {};

        for (
          const user
          of (data || []) as CampusUser[]
        ) {
          next[user.id] = user;
        }

        setConnectionUsers(next);
      });

    return () => {
      cancelled = true;
    };
  }, [connections, currentUserId]);


  useEffect(() => {
    if (!currentUserId) return;

    const client =
      getSupabaseClient();

    if (!client) return;

    const channel =
      client
        .channel(
          `sent-connections:${currentUserId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_connections",
            filter:
              `requester_id=eq.${currentUserId}`,
          },
          () => {
            void loadBaseData();
          }
        )
        .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [currentUserId]);


  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    const channel =
      client
        .channel(
          `read-status:${activeConversationId}`
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_members",
            filter:
              `conversation_id=eq.${activeConversationId}`,
          },
          (payload: any) => {
            const updated =
              payload.new as Member;

            setMembers(current =>
              current.map(member =>
                member.conversation_id ===
                  updated.conversation_id &&
                member.user_id ===
                  updated.user_id
                  ? {
                      ...member,
                      ...updated,
                    }
                  : member
              )
            );
          }
        )
        .subscribe();

    return () => {
      void client.removeChannel(
        channel
      );
    };
  }, [activeConversationId]);


  const searchByUid = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const value =
      uidQuery.trim().toUpperCase();

    if (!value) {
      return setStatus(
        "Enter a CampusConnect UID."
      );
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    setBusy(true);
    setFoundUser(null);
    setStatus("");

    const {data, error} =
      await client.rpc(
        "find_campus_user_by_uid",
        {
          lookup_uid: value,
        }
      );

    const found =
      Array.isArray(data)
        ? data[0]
        : data;

    setBusy(false);

    if (error) {
      return setStatus(error.message);
    }

    if (!found) {
      return setStatus(
        "No CampusConnect user found with that UID."
      );
    }

    if (
      String(found.id) ===
      currentUserId
    ) {
      return setStatus(
        "That is your own CampusConnect UID."
      );
    }

    setFoundUser(
      found as CampusUser
    );
  };

  const connectionWith = (
    userId: string
  ) =>
    connections.find(
      connection =>
        (
          connection.requester_id ===
            currentUserId &&
          connection.receiver_id ===
            userId
        ) ||
        (
          connection.receiver_id ===
            currentUserId &&
          connection.requester_id ===
            userId
        )
    );

  const sendConnectionRequest =
    async (user: CampusUser) => {
      const client =
        getSupabaseClient();

      if (!client || !currentUserId) {
        return setStatus(
          "Unable to send connection request right now."
        );
      }

      if (user.id === currentUserId) {
        return setStatus(
          "You cannot connect with your own account."
        );
      }

      setBusy(true);
      setStatus("");

      try {
        /*
         * Always ask Supabase for the current relationship.
         *
         * Do not rely only on the local `connections` state:
         * another browser/user may have changed the relationship
         * after this page loaded.
         */
        const {
          data: relationshipRows,
          error: relationshipError,
        } =
          await client
            .from(
              "chat_connections"
            )
            .select("*")
            .or(
              [
                `and(requester_id.eq.${currentUserId},receiver_id.eq.${user.id})`,
                `and(requester_id.eq.${user.id},receiver_id.eq.${currentUserId})`,
              ].join(",")
            );

        if (relationshipError) {
          throw relationshipError;
        }

        const relationships =
          (
            relationshipRows ||
            []
          ) as Connection[];

        /*
         * Prefer a live relationship over an old rejected one
         * if historical reverse-direction rows happen to exist.
         */
        const existingAccepted =
          relationships.find(
            connection =>
              connection.status ===
              "Accepted"
          );

        if (existingAccepted) {
          await loadBaseData();

          return setStatus(
            `You are already connected with ${user.full_name}.`
          );
        }


        const existingPending =
          relationships.find(
            connection =>
              connection.status ===
              "Pending"
          );

        if (existingPending) {
          await loadBaseData();
          await loadIncomingRequests();

          if (
            existingPending.receiver_id ===
            currentUserId
          ) {
            return setStatus(
              `${user.full_name} has already sent you a connection request. Open Requests to accept it.`
            );
          }

          return setStatus(
            `Connection request to ${user.full_name} is already pending.`
          );
        }


        const existingBlocked =
          relationships.find(
            connection =>
              connection.status ===
              "Blocked"
          );

        if (existingBlocked) {
          await loadBaseData();

          return setStatus(
            "This connection cannot be requested right now."
          );
        }


        /*
         * Reuse an existing rejected row rather than INSERTING
         * another row that could collide with the unique pair.
         */
        const rejectedRelationship =
          relationships.find(
            connection =>
              connection.status ===
              "Rejected" &&
              connection.requester_id ===
              currentUserId &&
              connection.receiver_id ===
              user.id
          ) ||
          relationships.find(
            connection =>
              connection.status ===
              "Rejected"
          );

        if (rejectedRelationship) {
          const {
            data,
            error,
          } =
            await client
              .from(
                "chat_connections"
              )
              .update({
                status:
                  "Pending",

                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                rejectedRelationship.id
              )
              .select()
              .single();

          if (error) {
            throw error;
          }

          setConnections(current => {
            const exists =
              current.some(
                item =>
                  item.id ===
                  rejectedRelationship.id
              );

            if (!exists) {
              return [
                ...current,
                data as Connection,
              ];
            }

            return current.map(
              item =>
                item.id ===
                rejectedRelationship.id
                  ? data as Connection
                  : item
            );
          });

          await loadBaseData();
          await loadIncomingRequests();

          setStatus(
            `Connection request sent to ${user.full_name}.`
          );

          return;
        }


        /*
         * No relationship exists in either direction.
         * Only now is a fresh INSERT allowed.
         */
        const {
          data,
          error,
        } =
          await client
            .from(
              "chat_connections"
            )
            .insert({
              requester_id:
                currentUserId,

              receiver_id:
                user.id,

              status:
                "Pending",
            })
            .select()
            .single();

        if (error) {
          /*
           * A simultaneous request from another browser can
           * still race between SELECT and INSERT.
           *
           * Refresh the authoritative state and show a friendly
           * result instead of PostgreSQL's constraint message.
           */
          if (
            error.code ===
            "23505"
          ) {
            await loadBaseData();
            await loadIncomingRequests();

            return setStatus(
              `A connection request or relationship with ${user.full_name} already exists.`
            );
          }

          throw error;
        }

        setConnections(
          current => [
            ...current.filter(
              item =>
                item.id !==
                data.id
            ),
            data as Connection,
          ]
        );

        setStatus(
          `Connection request sent to ${user.full_name}.`
        );

        await loadIncomingRequests();

      } catch (error) {
        console.error(
          "Unable to send connection request:",
          error
        );

        setStatus(
          "Unable to send the connection request. Please try again."
        );
      } finally {
        setBusy(false);
      }
    };


  const acceptConnectionRequest =
    async (
      connection: Connection
    ) => {
      const client =
        getSupabaseClient();

      if (!client) return;

      const user =
        requestUsers[
          connection.requester_id
        ];

      if (!user) {
        return setStatus(
          "Unable to load the requester profile."
        );
      }

      setBusy(true);
      setStatus("");

      try {
        const {error} =
          await client
            .from("chat_connections")
            .update({
              status: "Accepted",
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              connection.id
            );

        if (error) throw error;

        setConnections(current =>
          current.map(item =>
            item.id === connection.id
              ? {
                  ...item,
                  status: "Accepted",
                }
              : item
          )
        );

        setIncomingRequests(current =>
          current.filter(
            item =>
              item.id !==
              connection.id
          )
        );

        setStatus(
          `${user.full_name} is now connected. Opening chat...`
        );

        await startDirectChat(
          user,
          true
        );

        await loadBaseData();

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to accept request."
        );
      } finally {
        setBusy(false);
      }
    };


  const rejectConnectionRequest =
    async (
      connection: Connection
    ) => {
      const client =
        getSupabaseClient();

      if (!client) return;

      setBusy(true);

      try {
        const {error} =
          await client
            .from("chat_connections")
            .update({
              status: "Rejected",
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              connection.id
            );

        if (error) throw error;

        setIncomingRequests(current =>
          current.filter(
            item =>
              item.id !==
              connection.id
          )
        );

        setConnections(current =>
          current.map(item =>
            item.id === connection.id
              ? {
                  ...item,
                  status: "Rejected",
                }
              : item
          )
        );

        setStatus(
          "Connection request rejected."
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to reject request."
        );
      } finally {
        setBusy(false);
      }
    };


  const removeFriend =
    async (
      connection: Connection,
      user: CampusUser
    ) => {
      const client =
        getSupabaseClient();

      if (!client || !currentUserId) {
        return;
      }

      const confirmed =
        window.confirm(
          `Remove ${user.full_name} from your friends?`
        );

      if (!confirmed) {
        return;
      }

      setBusy(true);
      setStatus("");

      try {
        const {
          data,
          error,
        } =
          await client
            .from("chat_connections")
            .update({
              status: "Rejected",
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              connection.id
            )
            .select()
            .single();

        if (error) {
          throw error;
        }

        setConnections(
          current =>
            current.map(
              item =>
                item.id === connection.id
                  ? data as Connection
                  : item
            )
        );

        setStatus(
          `${user.full_name} was removed from your friends.`
        );

        setPeopleTab("Removed");

        await loadBaseData();

      } catch (error) {
        console.error(
          "Unable to remove friend:",
          error
        );

        setStatus(
          "Unable to remove this friend."
        );
      } finally {
        setBusy(false);
      }
    };


  const deleteRemovedPerson =
    async (
      connection: Connection,
      user: CampusUser
    ) => {
      const client =
        getSupabaseClient();

      if (!client || !currentUserId) {
        return;
      }

      if (
        connection.status !== "Rejected"
      ) {
        return setStatus(
          "Remove this person before deleting the relationship."
        );
      }

      const confirmed =
        window.confirm(
          `Delete ${user.full_name} from Messenger connections?\n\nTheir CampusConnect account and old messages will not be deleted.`
        );

      if (!confirmed) {
        return;
      }

      setBusy(true);
      setStatus("");

      try {
        const {error} =
          await client
            .from("chat_connections")
            .delete()
            .eq(
              "id",
              connection.id
            );

        if (error) {
          throw error;
        }

        setConnections(
          current =>
            current.filter(
              item =>
                item.id !== connection.id
            )
        );

        setIncomingRequests(
          current =>
            current.filter(
              item =>
                item.id !== connection.id
            )
        );

        setStatus(
          `${user.full_name} was deleted from Messenger connections.`
        );

      } catch (error) {
        console.error(
          "Unable to delete person:",
          error
        );

        setStatus(
          "Unable to delete this person."
        );
      } finally {
        setBusy(false);
      }
    };


  const cancelSentRequest =
    async (
      connection: Connection
    ) => {
      const client =
        getSupabaseClient();

      if (!client) return;

      setBusy(true);
      setStatus("");

      try {
        const {error} =
          await client
            .from("chat_connections")
            .update({
              status: "Rejected",
            })
            .eq(
              "id",
              connection.id
            )
            .eq(
              "requester_id",
              currentUserId
            );

        if (error) throw error;

        setConnections(current =>
          current.map(item =>
            item.id === connection.id
              ? {
                  ...item,
                  status: "Rejected",
                }
              : item
          )
        );

        setStatus(
          "Connection request cancelled."
        );
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to cancel request."
        );
      } finally {
        setBusy(false);
      }
    };


  const startDirectChat =
    async (
      user: CampusUser,
      skipConnectionCheck = false
    ) => {
      const connection =
        connectionWith(user.id);

      if (
        !skipConnectionCheck &&
        (
          !connection ||
          connection.status !== "Accepted"
        )
      ) {
        return setStatus(
          "Connect with this user before starting a private chat."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return setStatus(
          "CampusConnect is not connected to Supabase."
        );
      }

      setBusy(true);
      setStatus("");

      try {
        const {data, error} =
          await client.rpc(
            "get_or_create_direct_chat",
            {
              other_user_id:
                user.id,
            }
          );

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "Unable to create the private conversation."
          );
        }

        const conversation =
          data as Conversation;

        const displayConversation:
          Conversation = {
            ...conversation,

            name:
              user.full_name,

            description:
              `Private conversation with ${user.full_name}`,
          };

        setConversations(current => {
          const exists =
            current.some(
              item =>
                item.id ===
                conversation.id
            );

          if (exists) {
            return current.map(
              item =>
                item.id === conversation.id
                  ? displayConversation
                  : item
            );
          }

          return [
            displayConversation,
            ...current,
          ];
        });

        setMembers(current => {
          const withoutConversation =
            current.filter(
              member =>
                member.conversation_id !==
                conversation.id
            );

          return [
            ...withoutConversation,

            {
              conversation_id:
                conversation.id,

              user_id:
                currentUserId,

              member_role:
                "Admin",
            },

            {
              conversation_id:
                conversation.id,

              user_id:
                user.id,

              member_role:
                "Member",
            },
          ];
        });

        setActiveConversationId(
          conversation.id
        );

        setShowNewChat(false);

        setStatus(
          `Chat with ${user.full_name} opened.`
        );

        await loadBaseData();

        setActiveConversationId(
          conversation.id
        );

      } catch (error) {
        console.error(
          "Direct chat error:",
          error
        );

        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to start conversation."
        );
      } finally {
        setBusy(false);
      }
    };


  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !currentUserId
    ) {
      return;
    }

    const targetUserId =
      window.sessionStorage.getItem(
        "campusconnect-open-direct-chat"
      );

    if (!targetUserId) {
      return;
    }

    const user =
      connectionUsers[targetUserId];

    if (!user) {
      return;
    }

    const relationship =
      connectionWith(targetUserId);

    if (
      !relationship ||
      relationship.status !== "Accepted"
    ) {
      window.sessionStorage.removeItem(
        "campusconnect-open-direct-chat"
      );

      setStatus(
        "This connection is no longer available."
      );

      return;
    }

    window.sessionStorage.removeItem(
      "campusconnect-open-direct-chat"
    );

    void startDirectChat(user);
  }, [
    currentUserId,
    connectionUsers,
    connections,
  ]);


  const activeGroupMembers =
    activeConversation
      ? members.filter(
          member =>
            member.conversation_id ===
            activeConversation.id
        )
      : [];


  const currentGroupMembership =
    activeConversation
      ? activeGroupMembers.find(
          member =>
            member.user_id ===
            currentUserId
        )
      : undefined;


  const isCurrentGroupAdmin =
    activeConversation?.conversation_type ===
      "Group" &&
    currentGroupMembership?.member_role ===
      "Admin";


  const loadGroupMemberProfiles =
    async (
      conversationId: string
    ) => {
      const client =
        getSupabaseClient();

      if (!client) return;

      const ids =
        members
          .filter(
            member =>
              member.conversation_id ===
              conversationId
          )
          .map(
            member =>
              member.user_id
          );

      if (!ids.length) {
        setGroupMemberProfiles({});
        return;
      }

      const {data, error} =
        await client.rpc(
          "find_campus_users_by_ids",
          {
            user_ids: ids,
          }
        );

      if (error) {
        setStatus(error.message);
        return;
      }

      const next:
        Record<string, CampusUser> = {};

      for (
        const user
        of (data || []) as CampusUser[]
      ) {
        next[user.id] = user;
      }

      setGroupMemberProfiles(next);
    };


  const openGroupInformation =
    async () => {
      if (
        !activeConversation ||
        activeConversation.conversation_type !==
          "Group"
      ) {
        return;
      }

      setGroupInfoName(
        activeConversation.name
      );

      setGroupInfoDescription(
        activeConversation.description
      );

      setGroupInfoSearch("");
      setGroupInfoCandidates([]);
      setShowGroupInfo(true);

      await loadGroupMemberProfiles(
        activeConversation.id
      );
    };


  const uploadGroupAvatar =
    async () => {
      if (
        !activeConversation ||
        activeConversation.conversation_type !== "Group"
      ) {
        return;
      }

      if (!isCurrentGroupAdmin) {
        return setStatus(
          "Only group admins can change the group photo."
        );
      }

      if (!groupAvatarFile) {
        return setStatus(
          "Choose an image first."
        );
      }

      if (
        groupAvatarFile.size >
        5 * 1024 * 1024
      ) {
        return setStatus(
          "Group photo must be smaller than 5 MB."
        );
      }

      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp",
        ].includes(
          groupAvatarFile.type
        )
      ) {
        return setStatus(
          "Group photo must be JPG, PNG or WebP."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      setGroupActionBusy(true);
      setStatus("");

      try {
        const safeName =
          groupAvatarFile.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          );

        const path =
          `${currentUserId}/${activeConversation.id}/group-avatar-${Date.now()}-${safeName}`;

        const {error: uploadError} =
          await client.storage
            .from("chat-files")
            .upload(
              path,
              groupAvatarFile,
              {
                upsert: false,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        const {data: signedData, error: signedError} =
          await client.storage
            .from("chat-files")
            .createSignedUrl(
              path,
              60 * 60 * 24 * 365
            );

        if (signedError) {
          throw signedError;
        }

        const avatarUrl =
          signedData.signedUrl;

        const {error: updateError} =
          await client
            .from("chat_conversations")
            .update({
              avatar_url:
                avatarUrl,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              activeConversation.id
            );

        if (updateError) {
          throw updateError;
        }

        setConversations(current =>
          current.map(
            conversation =>
              conversation.id ===
              activeConversation.id
                ? {
                    ...conversation,
                    avatar_url:
                      avatarUrl,
                  }
                : conversation
          )
        );

        setGroupAvatarFile(null);
        setGroupAvatarPreview("");

        setStatus(
          "Group photo updated."
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to update group photo."
        );
      } finally {
        setGroupActionBusy(false);
      }
    };


  const saveGroupInformation =
    async () => {
      if (
        !activeConversation ||
        !isCurrentGroupAdmin
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      setGroupActionBusy(true);
      setStatus("");

      try {
        const {error} =
          await client.rpc(
            "update_chat_group",
            {
              target_conversation:
                activeConversation.id,

              next_name:
                groupInfoName,

              next_description:
                groupInfoDescription,
            }
          );

        if (error) throw error;

        setConversations(current =>
          current.map(item =>
            item.id ===
              activeConversation.id
              ? {
                  ...item,
                  name:
                    groupInfoName.trim(),
                  description:
                    groupInfoDescription.trim(),
                }
              : item
          )
        );

        setStatus(
          "Group information updated."
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to update group."
        );
      } finally {
        setGroupActionBusy(false);
      }
    };


  const searchUsersForExistingGroup =
    async (
      value: string
    ) => {
      setGroupInfoSearch(value);

      const search =
        value.trim();

      if (
        search.length < 2 ||
        !activeConversation
      ) {
        setGroupInfoCandidates([]);
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      const {data, error} =
        await client
          .from("profiles")
          .select(
            "id,full_name,email,role,department,graduation_year,campus_uid,avatar_url"
          )
          .or(
            `full_name.ilike.%${search}%,campus_uid.ilike.%${search}%`
          )
          .limit(15);

      if (error) {
        return setStatus(
          error.message
        );
      }

      const existingIds =
        new Set(
          activeGroupMembers.map(
            member =>
              member.user_id
          )
        );

      setGroupInfoCandidates(
        ((data || []) as CampusUser[])
          .filter(
            user =>
              !existingIds.has(
                user.id
              )
          )
      );
    };


  const addExistingGroupMember =
    async (
      user: CampusUser
    ) => {
      if (
        !activeConversation ||
        !isCurrentGroupAdmin
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      setGroupActionBusy(true);

      try {
        const {error} =
          await client.rpc(
            "add_chat_group_member",
            {
              target_conversation:
                activeConversation.id,

              target_user:
                user.id,
            }
          );

        if (error) throw error;

        await loadBaseData();

        setGroupMemberProfiles(
          current => ({
            ...current,
            [user.id]: user,
          })
        );

        setGroupInfoCandidates(
          current =>
            current.filter(
              item =>
                item.id !==
                user.id
            )
        );

        setStatus(
          `${user.full_name} added to the group.`
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to add member."
        );
      } finally {
        setGroupActionBusy(false);
      }
    };


  const removeExistingGroupMember =
    async (
      userId: string
    ) => {
      if (
        !activeConversation ||
        !isCurrentGroupAdmin
      ) {
        return;
      }

      const user =
        groupMemberProfiles[
          userId
        ];

      if (
        !window.confirm(
          `Remove ${
            user?.full_name ||
            "this member"
          } from the group?`
        )
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      setGroupActionBusy(true);

      try {
        const {error} =
          await client.rpc(
            "remove_chat_group_member",
            {
              target_conversation:
                activeConversation.id,

              target_user:
                userId,
            }
          );

        if (error) throw error;

        await loadBaseData();

        setGroupMemberProfiles(
          current => {
            const next = {
              ...current,
            };

            delete next[userId];

            return next;
          }
        );

        setStatus(
          "Member removed from group."
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to remove member."
        );
      } finally {
        setGroupActionBusy(false);
      }
    };


  const changeExistingGroupRole =
    async (
      member: Member
    ) => {
      if (
        !activeConversation ||
        !isCurrentGroupAdmin
      ) {
        return;
      }

      const nextRole =
        member.member_role === "Admin"
          ? "Member"
          : "Admin";

      const client =
        getSupabaseClient();

      if (!client) return;

      setGroupActionBusy(true);

      try {
        const {error} =
          await client.rpc(
            "set_chat_group_member_role",
            {
              target_conversation:
                activeConversation.id,

              target_user:
                member.user_id,

              next_role:
                nextRole,
            }
          );

        if (error) throw error;

        setMembers(current =>
          current.map(item =>
            item.conversation_id ===
              activeConversation.id &&
            item.user_id ===
              member.user_id
              ? {
                  ...item,
                  member_role:
                    nextRole,
                }
              : item
          )
        );

        setStatus(
          nextRole === "Admin"
            ? "Member promoted to admin."
            : "Admin changed to member."
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to change member role."
        );
      } finally {
        setGroupActionBusy(false);
      }
    };


  const deleteActiveGroup =
    async () => {
      if (
        !activeConversation ||
        activeConversation.conversation_type !== "Group"
      ) {
        return;
      }

      if (!isCurrentGroupAdmin) {
        return setStatus(
          "Only a group admin can delete this group."
        );
      }

      const confirmed =
        window.confirm(
          `Delete "${activeConversation.name}" permanently? This will remove the group and all its messages.`
        );

      if (!confirmed) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return setStatus(
          "CampusConnect is not connected to Supabase."
        );
      }

      setGroupActionBusy(true);
      setStatus("");

      try {
        const {error} =
          await client.rpc(
            "delete_chat_group",
            {
              target_conversation:
                activeConversation.id,
            }
          );

        if (error) {
          throw error;
        }

        const deletedId =
          activeConversation.id;

        setConversations(current =>
          current.filter(
            conversation =>
              conversation.id !== deletedId
          )
        );

        setMembers(current =>
          current.filter(
            member =>
              member.conversation_id !== deletedId
          )
        );

        setMessages([]);
        setSidebarMessages(current =>
          current.filter(
            message =>
              message.conversation_id !== deletedId
          )
        );

        setActiveConversationId("");
        setShowGroupInfo(false);

        setStatus(
          "Group deleted successfully."
        );

        await loadBaseData();

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to delete group."
        );
      } finally {
        setGroupActionBusy(false);
      }
    };


  const leaveActiveGroup =
    async () => {
      if (
        !activeConversation ||
        activeConversation.conversation_type !==
          "Group"
      ) {
        return;
      }

      if (
        !window.confirm(
          `Leave ${activeConversation.name}?`
        )
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      setGroupActionBusy(true);

      try {
        const leavingId =
          activeConversation.id;

        const {error} =
          await client.rpc(
            "leave_chat_group",
            {
              target_conversation:
                leavingId,
            }
          );

        if (error) throw error;

        setShowGroupInfo(false);

        setConversations(current =>
          current.filter(
            item =>
              item.id !==
                leavingId
          )
        );

        setMembers(current =>
          current.filter(
            member =>
              member.conversation_id !==
                leavingId
          )
        );

        setActiveConversationId("");

        setStatus(
          "You left the group."
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to leave group."
        );
      } finally {
        setGroupActionBusy(false);
      }
    };


  const searchGroupUsers =
    async (
      value: string
    ) => {
      setGroupSearch(value);

      const search =
        value.trim();

      if (search.length < 2) {
        setGroupCandidates([]);
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        setStatus(
          "CampusConnect is not connected to Supabase."
        );
        return;
      }

      setStatus("");

      try {
        /*
         * UID SEARCH
         *
         * Use the same RPC that already works
         * in the New Chat window.
         */
        if (
          search
            .toUpperCase()
            .startsWith("CC-")
        ) {
          const {
            data,
            error,
          } = await client.rpc(
            "find_campus_user_by_uid",
            {
              lookup_uid:
                search.toUpperCase(),
            }
          );

          if (error) {
            throw error;
          }

          const found =
            Array.isArray(data)
              ? data[0]
              : data;

          if (!found) {
            setGroupCandidates([]);
            setStatus(
              "No user found with this CampusConnect UID."
            );
            return;
          }

          const user =
            found as CampusUser;

          if (
            user.id ===
            currentUserId
          ) {
            setGroupCandidates([]);
            setStatus(
              "You are already included as the group admin."
            );
            return;
          }

          setGroupCandidates([
            user,
          ]);

          return;
        }

        /*
         * NAME SEARCH
         */
        const {
          data,
          error,
        } = await client
          .from("profiles")
          .select(
            "id,full_name,email,role,department,graduation_year,campus_uid,avatar_url"
          )
          .neq(
            "id",
            currentUserId
          )
          .ilike(
            "full_name",
            `%${search}%`
          )
          .limit(100);

        if (error) {
          throw error;
        }

        setGroupCandidates(
          (data || []) as CampusUser[]
        );

      } catch (error) {
        console.error(
          "Group member search failed:",
          error
        );

        setGroupCandidates([]);

        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to search for members."
        );
      }
    };


  const toggleGroupMember = (
    user: CampusUser
  ) => {
    if (
      !user.id ||
      user.id === currentUserId
    ) {
      return;
    }

    const alreadySelected =
      selectedMemberIds.includes(
        user.id
      );

    if (alreadySelected) {
      setSelectedMemberIds(
        current =>
          current.filter(
            id =>
              id !== user.id
          )
      );

      setSelectedGroupUsers(
        current =>
          current.filter(
            item =>
              item.id !== user.id
          )
      );

      return;
    }

    setSelectedMemberIds(
      current => [
        ...current,
        user.id,
      ]
    );

    setSelectedGroupUsers(
      current => {
        if (
          current.some(
            item =>
              item.id === user.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          user,
        ];
      }
    );
  };


  const loadMessages = async (
    conversationId: string
  ) => {
    const client =
      getSupabaseClient();

    if (!client || !conversationId) {
      setMessages([]);
      return;
    }

    const {data, error} =
      await client
        .from("chat_messages")
        .select("*")
        .eq(
          "conversation_id",
          conversationId
        )
        .order(
          "created_at",
          {ascending: false}
        )
        .limit(1000);

    if (error) {
      console.error(
        "Unable to load chat history:",
        error
      );

      setStatus(
        `Unable to load messages: ${error.message}`
      );

      return;
    }

    const rows =
      ((data || []) as ChatMessage[])
        .reverse();

    setMessages(rows);
  };


  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    void loadMessages(
      activeConversationId
    );
  }, [
    activeConversationId,
  ]);


  const createGroup = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const name =
      groupName.trim();

    if (name.length < 2) {
      setStatus(
        "Enter a group name."
      );
      return;
    }

    const memberIds =
      Array.from(
        new Set(
          selectedMemberIds.filter(
            id =>
              Boolean(id) &&
              id !== currentUserId
          )
        )
      );

    if (!memberIds.length) {
      setStatus(
        "Select at least one member."
      );
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      setStatus(
        "CampusConnect is not connected to Supabase."
      );
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      const {
        data,
        error,
      } = await client.rpc(
        "create_chat_group",
        {
          group_name:
            name,

          group_description:
            groupDescription.trim(),

          member_ids:
            memberIds,
        }
      );

      if (error) {
        throw error;
      }

      const newConversationId =
        String(data || "");

      if (!newConversationId) {
        throw new Error(
          "Supabase did not return the new group ID."
        );
      }

      setGroupName("");
      setGroupDescription("");
      setSelectedMemberIds([]);
      setSelectedGroupUsers([]);
      setGroupCandidates([]);
      setGroupSearch("");
      setShowCreateGroup(false);

      await loadBaseData();

      setActiveConversationId(
        newConversationId
      );

      await loadMessages(
        newConversationId
      );

      setStatus(
        `Group created with ${
          memberIds.length + 1
        } members.`
      );

    } catch (error) {
      console.error(
        "Create group failed:",
        error
      );

      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to create group."
      );
    } finally {
      setBusy(false);
    }
  };


  const uploadAttachment =
    async () => {
      if (!attachment) {
        return null;
      }

      if (
        attachment.size >
        15 * 1024 * 1024
      ) {
        throw new Error(
          "Chat files must be smaller than 15 MB."
        );
      }

      const client =
        getSupabaseClient();

      if (!client) {
        throw new Error(
          "CampusConnect is not connected to Supabase."
        );
      }

      const safeName =
        attachment.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "-"
        );

      const path =
        `${currentUserId}/${activeConversationId}/${Date.now()}-${safeName}`;

      const {error} =
        await client.storage
          .from("chat-files")
          .upload(
            path,
            attachment,
            {
              upsert: false,
            }
          );

      if (error) throw error;

      return {
        path,
        file_name:
          attachment.name,
        file_size:
          attachment.size,
        file_type:
          attachment.type ||
          "application/octet-stream",
      };
    };

  const sendMessage = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (
      !activeConversationId
    ) {
      return;
    }

    if (
      !composer.trim() &&
      !attachment
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    setBusy(true);

    try {
      const uploaded =
        await uploadAttachment();

      const isImage =
        attachment?.type
          .startsWith("image/");

      const {
        data: insertedMessage,
        error,
      } =
        await client
          .from("chat_messages")
          .insert({
            conversation_id:
              activeConversationId,

            sender_id:
              currentUserId,

            sender_name:
              profile.name,

            message_type:
              uploaded
                ? isImage
                  ? "Image"
                  : "File"
                : "Text",

            body:
              composer.trim(),

            file_path:
              uploaded?.path ||
              null,

            file_name:
              uploaded?.file_name ||
              null,

            file_size:
              uploaded?.file_size ||
              null,

            file_type:
              uploaded?.file_type ||
              null,

            reply_to:
              replyingTo?.id ||
              null,
          })
          .select("*")
          .single();

      if (error) {
        throw error;
      }

      const sent =
        insertedMessage as ChatMessage;

      setMessages(current => {
        if (
          current.some(
            message =>
              message.id === sent.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          sent,
        ];
      });

      setSidebarMessages(current => {
        const withoutDuplicate =
          current.filter(
            message =>
              message.id !== sent.id
          );

        return [
          sent,
          ...withoutDuplicate,
        ];
      });

      setConversations(current =>
        current.map(conversation =>
          conversation.id ===
            activeConversationId
            ? {
                ...conversation,
                updated_at:
                  sent.created_at,
              }
            : conversation
        )
      );

      await client
        .from("chat_conversations")
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          activeConversationId
        );

      setComposer("");
      setAttachment(null);
      setReplyingTo(null);

    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to send message."
      );
    } finally {
      setBusy(false);
    }
  };

  const loadMessageReceipts = async () => {
    const client = getSupabaseClient();

    if (
      !client ||
      !messages.length
    ) {
      setMessageReceipts([]);
      return;
    }

    const ids = messages.map(
      message => message.id
    );

    const {data, error} = await client
      .from("chat_message_receipts")
      .select(
        "message_id,user_id,delivered_at,read_at"
      )
      .in(
        "message_id",
        ids
      );

    if (error) {
      console.error(
        "Unable to load message receipts:",
        error
      );
      return;
    }

    setMessageReceipts(
      (data || []) as MessageReceipt[]
    );
  };


  useEffect(() => {
    void loadMessageReceipts();
  }, [
    activeConversationId,
    messages.length,
  ]);


  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    const channel =
      client
        .channel(
          `message-receipts:${currentUserId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "chat_message_receipts",
          },
          (payload: any) => {
            const receipt =
              payload.new as MessageReceipt;

            setMessageReceipts(current => {
              const exists =
                current.some(
                  item =>
                    item.message_id ===
                      receipt.message_id &&
                    item.user_id ===
                      receipt.user_id
                );

              if (exists) {
                return current.map(
                  item =>
                    item.message_id ===
                        receipt.message_id &&
                    item.user_id ===
                        receipt.user_id
                      ? receipt
                      : item
                );
              }

              return [
                ...current,
                receipt,
              ];
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table:
              "chat_message_receipts",
          },
          (payload: any) => {
            const receipt =
              payload.new as MessageReceipt;

            setMessageReceipts(current => {
              const exists =
                current.some(
                  item =>
                    item.message_id ===
                      receipt.message_id &&
                    item.user_id ===
                      receipt.user_id
                );

              if (!exists) {
                return [
                  ...current,
                  receipt,
                ];
              }

              return current.map(
                item =>
                  item.message_id ===
                      receipt.message_id &&
                  item.user_id ===
                      receipt.user_id
                    ? receipt
                    : item
              );
            });
          }
        )
        .subscribe();

    return () => {
      void client.removeChannel(
        channel
      );
    };

  }, [currentUserId]);


  const messageStatus = (
    message: ChatMessage
  ) => {
    if (
      message.sender_id !==
      currentUserId
    ) {
      return null;
    }

    const conversation =
      conversations.find(
        item =>
          item.id ===
          message.conversation_id
      );

    const receipts =
      messageReceipts.filter(
        receipt =>
          receipt.message_id ===
          message.id &&
          receipt.user_id !==
          currentUserId
      );

    if (
      conversation?.conversation_type ===
      "Group"
    ) {
      const recipients =
        members.filter(
          member =>
            member.conversation_id ===
              message.conversation_id &&
            member.user_id !==
              currentUserId
        );

      if (!recipients.length) {
        return {
          label: "✓",
          read: false,
        };
      }

      const allRead =
        recipients.every(member =>
          receipts.some(
            receipt =>
              receipt.user_id ===
                member.user_id &&
              Boolean(receipt.read_at)
          )
        );

      if (allRead) {
        return {
          label: "✓✓",
          read: true,
        };
      }

      const allDelivered =
        recipients.every(member =>
          receipts.some(
            receipt =>
              receipt.user_id ===
                member.user_id &&
              Boolean(
                receipt.delivered_at
              )
          )
        );

      return {
        label:
          allDelivered
            ? "✓✓"
            : "✓",
        read: false,
      };
    }

    const peerId =
      directPeerId(
        message.conversation_id
      );

    if (!peerId) {
      return {
        label: "✓",
        read: false,
      };
    }

    const receipt =
      receipts.find(
        item =>
          item.user_id ===
          peerId
      );

    if (receipt?.read_at) {
      return {
        label: "✓✓",
        read: true,
      };
    }

    if (receipt?.delivered_at) {
      return {
        label: "✓✓",
        read: false,
      };
    }

    return {
      label: "✓",
      read: false,
    };
  };


  const deleteMessage =
    async (
      message: ChatMessage
    ) => {
      if (
        message.sender_id !==
        currentUserId
      ) {
        return;
      }

      if (message.deleted_at) {
        return;
      }

      if (
        !window.confirm(
          "Delete this message?"
        )
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) return;

      setStatus("");

      try {
        if (message.file_path) {
          const {error: storageError} =
            await client.storage
              .from("chat-files")
              .remove([
                message.file_path,
              ]);

          if (storageError) {
            console.warn(
              "Unable to remove chat attachment:",
              storageError
            );
          }
        }

        const deletedAt =
          new Date().toISOString();

        const {data, error} =
          await client
            .from("chat_messages")
            .update({
              body: "",
              file_path: null,
              file_name: null,
              file_size: null,
              file_type: null,
              deleted_at:
                deletedAt,
              edited_at:
                null,
            })
            .eq(
              "id",
              message.id
            )
            .eq(
              "sender_id",
              currentUserId
            )
            .select()
            .single();

        if (error) {
          throw error;
        }

        const updated =
          data as ChatMessage;

        setMessages(current =>
          current.map(item =>
            item.id === updated.id
              ? updated
              : item
          )
        );

        setSidebarMessages(current =>
          current.map(item =>
            item.id === updated.id
              ? updated
              : item
          )
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to delete message."
        );
      }
    };


  const loadReactions =
    async () => {
      const client =
        getSupabaseClient();

      if (!client || !activeConversationId) {
        setReactions({});
        return;
      }

      const messageIds =
        messages.map(
          message => message.id
        );

      if (!messageIds.length) {
        setReactions({});
        return;
      }

      const {data, error} =
        await client
          .from("chat_message_reactions")
          .select(
            "message_id,user_id,emoji"
          )
          .in(
            "message_id",
            messageIds
          );

      if (error) {
        console.error(
          "Unable to load reactions:",
          error
        );
        return;
      }

      const grouped:
        Record<string, {
          emoji: string;
          user_id: string;
        }[]> = {};

      for (const row of data || []) {
        if (!grouped[row.message_id]) {
          grouped[row.message_id] = [];
        }

        grouped[row.message_id].push({
          emoji: row.emoji,
          user_id: row.user_id,
        });
      }

      setReactions(grouped);
    };


  useEffect(() => {
    void loadReactions();
  }, [
    activeConversationId,
    messages.length,
  ]);


  const toggleReaction =
    async (
      message: ChatMessage,
      emoji: string
    ) => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !currentUserId
      ) {
        return;
      }

      const current =
        reactions[
          message.id
        ] || [];

      const existing =
        current.some(
          reaction =>
            reaction.user_id ===
              currentUserId &&
            reaction.emoji ===
              emoji
        );

      // Optimistic UI
      setReactions(previous => {
        const existingRows =
          previous[
            message.id
          ] || [];

        if (existing) {
          return {
            ...previous,
            [message.id]:
              existingRows.filter(
                reaction =>
                  !(
                    reaction.user_id ===
                      currentUserId &&
                    reaction.emoji ===
                      emoji
                  )
              ),
          };
        }

        return {
          ...previous,
          [message.id]: [
            ...existingRows,
            {
              user_id:
                currentUserId,
              emoji,
            },
          ],
        };
      });

      try {
        if (existing) {
          const {error} =
            await client
              .from(
                "chat_message_reactions"
              )
              .delete()
              .eq(
                "message_id",
                message.id
              )
              .eq(
                "user_id",
                currentUserId
              )
              .eq(
                "emoji",
                emoji
              );

          if (error) {
            throw error;
          }

        } else {
          const {error} =
            await client
              .from(
                "chat_message_reactions"
              )
              .insert({
                message_id:
                  message.id,

                user_id:
                  currentUserId,

                emoji,
              });

          if (error) {
            throw error;
          }
        }

      } catch (error) {
        console.error(
          "REACTION ERROR:",
          error
        );

        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to update reaction."
        );

        // Roll back optimistic UI
        await loadReactions();
      }
    };


  useEffect(() => {
    if (
      !activeConversationId
    ) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) return;

    const channel =
      client
        .channel(
          `chat-reactions:${activeConversationId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "chat_message_reactions",
          },
          () => {
            void loadReactions();
          }
        )
        .subscribe();

    return () => {
      void client.removeChannel(
        channel
      );
    };

  }, [
    activeConversationId,
    messages.length,
  ]);


  const repliedMessageFor = (
    message: ChatMessage
  ) =>
    message.reply_to
      ? messages.find(
          item =>
            item.id ===
            message.reply_to
        )
      : undefined;


  const openChatFile =
    async (
      message: ChatMessage
    ) => {
      if (!message.file_path) return;

      const client =
        getSupabaseClient();

      if (!client) return;

      const {data, error} =
        await client.storage
          .from("chat-files")
          .createSignedUrl(
            message.file_path,
            120
          );

      if (error) {
        return setStatus(
          error.message
        );
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    };

  useEffect(() => {
    if (!currentUserId) return;

    const client =
      getSupabaseClient();

    if (!client) return;

    const channel =
      client
        .channel(
          `chat-sidebar:${currentUserId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
          },
          (payload: any) => {
            const incoming =
              payload.new as ChatMessage;

            setSidebarMessages(current => {
              if (
                current.some(
                  item =>
                    item.id ===
                    incoming.id
                )
              ) {
                return current;
              }

              return [
                incoming,
                ...current,
              ];
            });

            if (
              incoming.conversation_id ===
              activeConversationId
            ) {
              setMessages(current => {
                if (
                  current.some(
                    item =>
                      item.id === incoming.id
                  )
                ) {
                  return current;
                }

                return [
                  ...current,
                  incoming,
                ];
              });
            }

            setConversations(current =>
              current.map(conversation =>
                conversation.id ===
                incoming.conversation_id
                  ? {
                      ...conversation,
                      updated_at:
                        incoming.created_at,
                    }
                  : conversation
              )
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_messages",
          },
          (payload: any) => {
            const updated =
              payload.new as ChatMessage;

            setSidebarMessages(current =>
              current.map(message =>
                message.id === updated.id
                  ? updated
                  : message
              )
            );

            setMessages(current =>
              current.map(message =>
                message.id === updated.id
                  ? updated
                  : message
              )
            );
          }
        )
        .subscribe();

    return () => {
      void client.removeChannel(
        channel
      );
    };
  }, [
    currentUserId,
    activeConversationId,
  ]);


  useEffect(() => {
    if (
      !activeConversationId ||
      !currentUserId
    ) {
      return;
    }

    const peerMember =
      members.find(
        member =>
          member.conversation_id ===
            activeConversationId &&
          member.user_id !==
            currentUserId
      );

    console.log(
      "[CampusConnect Presence Debug]",
      {
        currentUserId,
        activeConversationId,
        peerUserId:
          peerMember?.user_id || "",
        conversationMembers:
          members
            .filter(
              member =>
                member.conversation_id ===
                activeConversationId
            )
            .map(
              member =>
                member.user_id
            ),
        onlineUserIds:
          Array.from(
            onlineUserIds
          ),
      }
    );
  }, [
    activeConversationId,
    currentUserId,
    members,
    onlineUserIds,
  ]);


  const directPeerId = (
    conversationId: string
  ) =>
    members.find(
      member =>
        member.conversation_id ===
          conversationId &&
        member.user_id !==
          currentUserId
    )?.user_id || "";


  const directPeer = (
    conversationId: string
  ) => {
    const peerId =
      directPeerId(
        conversationId
      );

    return peerId
      ? connectionUsers[peerId]
      : undefined;
  };


  const removeCurrentFriend =
    async () => {
      if (
        !activeConversation ||
        activeConversation.conversation_type !==
          "Direct" ||
        !currentUserId
      ) {
        return;
      }

      const peerId =
        directPeerId(
          activeConversation.id
        );

      if (!peerId) {
        return setStatus(
          "Unable to identify this user."
        );
      }

      const peer =
        directPeer(
          activeConversation.id
        );

      const friendship =
        connections.find(
          connection =>
            connection.status ===
              "Accepted" &&
            (
              (
                connection.requester_id ===
                  currentUserId &&
                connection.receiver_id ===
                  peerId
              ) ||
              (
                connection.requester_id ===
                  peerId &&
                connection.receiver_id ===
                  currentUserId
              )
            )
        );

      if (!friendship) {
        return setStatus(
          "This user is not currently in your friends list."
        );
      }

      const confirmed =
        window.confirm(
          `Remove ${
            peer?.full_name ||
            "this user"
          } from your friends?`
        );

      if (!confirmed) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      setBusy(true);
      setShowConversationMenu(false);

      try {
        const {error} =
          await client
            .from(
              "chat_connections"
            )
            .delete()
            .eq(
              "id",
              friendship.id
            );

        if (error) {
          throw error;
        }

        setConnections(current =>
          current.filter(
            connection =>
              connection.id !==
                friendship.id
          )
        );

        setConnectionUsers(
          current => {
            const next = {
              ...current,
            };

            delete next[peerId];

            return next;
          }
        );

        setStatus(
          `${
            peer?.full_name ||
            "User"
          } removed from friends.`
        );

      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to remove friend."
        );
      } finally {
        setBusy(false);
      }
    };


  const currentConversationMembership =
    activeConversationId
      ? members.find(
          member =>
            member.conversation_id ===
              activeConversationId &&
            member.user_id ===
              currentUserId
        )
      : undefined;


  const toggleConversationMute =
    async () => {
      if (
        !activeConversationId ||
        !currentUserId
      ) {
        return;
      }

      const client =
        getSupabaseClient();

      if (!client) {
        return;
      }

      const nextMuted =
        !Boolean(
          currentConversationMembership?.is_muted
        );

      const {error} =
        await client
          .from("chat_members")
          .update({
            is_muted:
              nextMuted,
          })
          .eq(
            "conversation_id",
            activeConversationId
          )
          .eq(
            "user_id",
            currentUserId
          );

      if (error) {
        setStatus(
          error.message
        );
        return;
      }

      setMembers(current =>
        current.map(member =>
          member.conversation_id ===
            activeConversationId &&
          member.user_id ===
            currentUserId
            ? {
                ...member,
                is_muted:
                  nextMuted,
              }
            : member
        )
      );

      setShowConversationMenu(false);

      setStatus(
        nextMuted
          ? "Conversation muted."
          : "Conversation notifications enabled."
      );
    };


  const conversationDisplayName = (
    conversation: Conversation
  ) => {
    if (
      conversation.conversation_type ===
      "Group"
    ) {
      return (
        conversation.name ||
        "Campus group"
      );
    }

    return (
      directPeer(
        conversation.id
      )?.full_name ||
      conversation.name ||
      "Private chat"
    );
  };


  const lastMessageFor = (
    conversationId: string
  ) =>
    sidebarMessages
      .filter(
        message =>
          message.conversation_id ===
          conversationId
      )
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      )[0];


  const unreadCountFor = (
    conversationId: string
  ) => {
    const myMembership =
      members.find(
        member =>
          member.conversation_id ===
            conversationId &&
          member.user_id ===
            currentUserId
      );

    const readTime =
      myMembership?.last_read_at
        ? new Date(
            myMembership.last_read_at
          ).getTime()
        : 0;

    return sidebarMessages.filter(
      message =>
        message.conversation_id ===
          conversationId &&
        message.sender_id !==
          currentUserId &&
        new Date(
          message.created_at
        ).getTime() >
          readTime
    ).length;
  };


  const messagePreview = (
    message:
      | ChatMessage
      | undefined
  ) => {
    if (!message) {
      return "Start a conversation";
    }

    if (message.deleted_at) {
      return "This message was deleted";
    }

    if (
      message.message_type ===
      "Image"
    ) {
      return message.body
        ? `📷 ${message.body}`
        : "📷 Photo";
    }

    if (
      message.message_type ===
      "File"
    ) {
      return message.file_name
        ? `📎 ${message.file_name}`
        : "📎 Attachment";
    }

    return (
      message.body ||
      "New message"
    );
  };


  const visibleConversations =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      const filtered =
        conversations.filter(
          conversation => {

            /*
             * Direct chats are visible only while the other
             * CampusConnect user is an accepted friend.
             *
             * This hides:
             * - removed friends
             * - deleted Messenger relationships
             * - orphan "Private chat" rows
             *
             * Historical messages remain safely stored.
             */
            if (
              conversation.conversation_type ===
              "Direct"
            ) {
              const peer =
                directPeer(
                  conversation.id
                );

              if (!peer) {
                return false;
              }

              const relationship =
                connectionWith(
                  peer.id
                );

              if (
                !relationship ||
                relationship.status !==
                  "Accepted"
              ) {
                return false;
              }
            }

            if (!normalized) {
              return true;
            }

            return conversationDisplayName(
              conversation
            )
              .toLowerCase()
              .includes(
                normalized
              );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          const aLast =
            lastMessageFor(
              a.id
            );

          const bLast =
            lastMessageFor(
              b.id
            );

          const aTime =
            aLast
              ? new Date(
                  aLast.created_at
                ).getTime()
              : new Date(
                  a.updated_at
                ).getTime();

          const bTime =
            bLast
              ? new Date(
                  bLast.created_at
                ).getTime()
              : new Date(
                  b.updated_at
                ).getTime();

          return bTime - aTime;
        }
      );
    }, [
      conversations,
      query,
      sidebarMessages,
      members,
      connectionUsers,
      currentUserId,
      connections,
    ]);


  /*
   * If the currently-open direct chat becomes hidden because
   * the friend was removed/deleted, automatically leave it.
   */
  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    const stillVisible =
      visibleConversations.some(
        conversation =>
          conversation.id ===
          activeConversationId
      );

    if (stillVisible) {
      return;
    }

    setShowConversationMenu(false);
    setMessages([]);
    setReplyingTo(null);

    setActiveConversationId(
      visibleConversations[0]?.id ||
      ""
    );
  }, [
    activeConversationId,
    visibleConversations,
  ]);


  return (
    <div className="campusMessenger">

      <aside className="messengerSidebar">

        <div className="messengerIdentity">
          <MessengerUserAvatar
            name={profile.name}
            src={profile.avatar_url}
            className="messengerAvatar"
          />

          <div>
            <b>{profile.name}</b>

            <span>
              {profile.role}
            </span>

            <small>
              UID{" "}
              {profile.campus_uid ||
                "Generating..."}
            </small>
          </div>

          <button
            type="button"
            title="New chat"
            onClick={() =>
              setShowNewChat(true)
            }
          >
            ＋
          </button>
        </div>

        <div className="messengerQuickActions">

          <button
            type="button"
            onClick={() =>
              setShowNewChat(true)
            }
          >
            New chat
          </button>

          <button
            type="button"
            onClick={() =>
              setShowCreateGroup(true)
            }
          >
            New group
          </button>

        </div>

        <div className="messengerSearch">
          <span>⌕</span>

          <input
            value={query}
            onChange={event =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Search chats"
          />
        </div>

        <section className="messengerPeople">

          <div className="messengerPeopleTabs">

            <button
              type="button"
              className={
                peopleTab === "Friends"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeopleTab("Friends")
              }
            >
              Friends
              <b>
                {acceptedConnections.length}
              </b>
            </button>

            <button
              type="button"
              className={
                peopleTab === "Requests"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeopleTab("Requests")
              }
            >
              Requests
              {incomingRequests.length > 0 && (
                <b className="requestNotificationCount">
                  {incomingRequests.length}
                </b>
              )}
            </button>

            <button
              type="button"
              className={
                peopleTab === "Sent"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeopleTab("Sent")
              }
            >
              Sent
              <b>
                {sentRequests.length}
              </b>
            </button>

            <button
              type="button"
              className={
                peopleTab === "Removed"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeopleTab("Removed")
              }
            >
              Removed

              {removedConnections.length > 0 && (
                <b>
                  {removedConnections.length}
                </b>
              )}
            </button>

          </div>


          {peopleTab === "Friends" && (
            <div className="friendDirectory">

              {acceptedConnections.map(
                connection => {
                  const userId =
                    connectionOtherUserId(
                      connection
                    );

                  const user =
                    connectionUsers[
                      userId
                    ];

                  if (!user) {
                    return null;
                  }

                  return (
                    <article
                      className="friendRow friendRowWithActions"
                      key={connection.id}
                    >

                      <button
                        type="button"
                        className="friendMainAction"
                        onClick={() =>
                          void startDirectChat(
                            user
                          )
                        }
                      >
                        <MessengerUserAvatar
                          name={user.full_name}
                          src={user.avatar_url}
                          className="friendAvatar"
                        />

                        <span>
                          <b>
                            {user.full_name}
                          </b>

                          <small>
                            {user.role}
                            {" · "}
                            {user.department}
                          </small>

                          <em>
                            {user.campus_uid}
                          </em>
                        </span>
                      </button>

                      <div className="friendRowActions">

                        <button
                          type="button"
                          className="friendMessageButton"
                          disabled={busy}
                          onClick={() =>
                            void startDirectChat(
                              user
                            )
                          }
                        >
                          Message
                        </button>

                        <button
                          type="button"
                          className="friendRemoveButton"
                          disabled={busy}
                          onClick={() =>
                            void removeFriend(
                              connection,
                              user
                            )
                          }
                        >
                          Remove
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

              {!acceptedConnections.length && (
                <div className="peopleEmpty">
                  <b>No friends yet</b>

                  <span>
                    Find someone using their CampusConnect UID
                    and send a connection request.
                  </span>
                </div>
              )}

            </div>
          )}


          {peopleTab === "Requests" &&
            !incomingRequests.length && (
              <div className="peopleEmpty">
                <b>No pending requests</b>

                <span>
                  New connection requests will appear
                  here automatically.
                </span>
              </div>
            )}


          {peopleTab === "Sent" && (
            <div className="sentRequestDirectory">

              {sentRequests.map(
                connection => {
                  const user =
                    connectionUsers[
                      connection.receiver_id
                    ];

                  if (!user) {
                    return null;
                  }

                  return (
                    <article
                      className="sentRequestRow"
                      key={connection.id}
                    >

                      <MessengerUserAvatar
                        name={user.full_name}
                        src={user.avatar_url}
                        className="friendAvatar"
                      />

                      <span>
                        <b>
                          {user.full_name}
                        </b>

                        <small>
                          {user.role}
                          {" · "}
                          {user.department}
                        </small>

                        <em>
                          {user.campus_uid}
                        </em>
                      </span>

                      <div>
                        <strong>
                          Pending
                        </strong>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void cancelSentRequest(
                              connection
                            )
                          }
                        >
                          Cancel
                        </button>
                      </div>

                    </article>
                  );
                }
              )}

              {!sentRequests.length && (
                <div className="peopleEmpty">
                  <b>No sent requests</b>

                  <span>
                    Requests waiting for acceptance
                    will appear here.
                  </span>
                </div>
              )}

            </div>
          )}

        </section>


        {peopleTab === "Requests" &&
          incomingRequests.length > 0 && (
          <section className="connectionRequestsBox">

            <div className="connectionRequestsHeader">
              <span>
                CONNECTION REQUESTS
              </span>

              <b>
                {incomingRequests.length}
              </b>
            </div>

            {incomingRequests.map(
              request => {
                const user =
                  requestUsers[
                    request.requester_id
                  ];

                if (!user) {
                  return null;
                }

                return (
                  <article
                    className="connectionRequestItem"
                    key={request.id}
                  >

                    <MessengerUserAvatar
                      name={user.full_name}
                      src={user.avatar_url}
                      className="conversationAvatar"
                    />

                    <div className="connectionRequestInfo">

                      <b>
                        {user.full_name}
                      </b>

                      <small>
                        {user.role}
                        {" · "}
                        {user.department}
                      </small>

                      <span>
                        {user.campus_uid}
                      </span>

                      <div className="connectionRequestActions">

                        <button
                          type="button"
                          className="acceptRequestButton"
                          disabled={busy}
                          onClick={() =>
                            void acceptConnectionRequest(
                              request
                            )
                          }
                        >
                          Accept
                        </button>

                        <button
                          type="button"
                          className="rejectRequestButton"
                          disabled={busy}
                          onClick={() =>
                            void rejectConnectionRequest(
                              request
                            )
                          }
                        >
                          Reject
                        </button>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </section>
        )}

        {peopleTab === "Removed" && (
          <div className="friendDirectory removedFriendDirectory">

            {removedConnections.map(
              connection => {
                const userId =
                  connectionOtherUserId(
                    connection
                  );

                const user =
                  connectionUsers[
                    userId
                  ];

                if (!user) {
                  return null;
                }

                return (
                  <article
                    className="removedFriendRow"
                    key={connection.id}
                  >
                    <div className="removedFriendIdentity">

                      <MessengerUserAvatar
                        name={user.full_name}
                        src={user.avatar_url}
                        className="friendAvatar"
                      />

                      <span>
                        <b>
                          {user.full_name}
                        </b>

                        <small>
                          {user.role}
                          {" · "}
                          {user.department}
                        </small>

                        <em>
                          {user.campus_uid}
                        </em>
                      </span>

                    </div>

                    <div className="removedFriendActions">

                      <button
                        type="button"
                        className="restoreConnectionButton"
                        disabled={busy}
                        onClick={() =>
                          void sendConnectionRequest(
                            user
                          )
                        }
                      >
                        Connect again
                      </button>

                      <button
                        type="button"
                        className="deletePersonButton"
                        disabled={busy}
                        onClick={() =>
                          void deleteRemovedPerson(
                            connection,
                            user
                          )
                        }
                      >
                        Delete person
                      </button>

                    </div>

                  </article>
                );
              }
            )}

            {!removedConnections.length && (
              <div className="peopleEmpty">
                <b>
                  No removed people
                </b>

                <span>
                  Removed friends will appear here.
                </span>
              </div>
            )}

          </div>
        )}


        <div className="conversationList">

          {visibleConversations.map(
            conversation => (
              <button
                type="button"
                key={
                  conversation.id
                }
                className={
                  activeConversationId ===
                  conversation.id
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveConversationId(
                    conversation.id
                  )
                }
              >
                <div className="conversationAvatar">
                  {conversation.conversation_type === "Group" ? (
                    conversation.avatar_url ? (
                      <img
                        src={conversation.avatar_url}
                        alt={conversation.name || "Group"}
                      />
                    ) : (
                      (conversation.name || "Group")
                        .split(/\\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(word => word.charAt(0))
                        .join("")
                        .toUpperCase()
                    )
                  ) : (
                    <MessengerUserAvatar
                      name={
                        directPeer(conversation.id)?.full_name ||
                        conversation.name ||
                        "Campus user"
                      }
                      src={
                        directPeer(conversation.id)?.avatar_url ||
                        undefined
                      }
                      className="conversationPeerAvatar"
                    />
                  )}
                </div>

                <span>
                  <b>
                    {conversationDisplayName(
                      conversation
                    )}
                  </b>

                  <small>
                    {messagePreview(
                      lastMessageFor(
                        conversation.id
                      )
                    )}
                  </small>
                </span>

                <div className="conversationMeta">

                  <time>
                    {new Date(
                      lastMessageFor(
                        conversation.id
                      )?.created_at ||
                      conversation.updated_at
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day:
                          "2-digit",
                        month:
                          "short",
                      }
                    )}
                  </time>

                  {unreadCountFor(
                    conversation.id
                  ) > 0 && (
                    <b className="chatUnreadBadge">
                      {Math.min(
                        99,
                        unreadCountFor(
                          conversation.id
                        )
                      )}
                    </b>
                  )}

                </div>
              </button>
            )
          )}

          {!visibleConversations.length && (
            <div className="messengerEmpty">
              <b>No chats yet</b>

              <span>
                Connect using a CampusConnect UID.
              </span>
            </div>
          )}

        </div>

      </aside>


      <section className="messengerConversation">

        {activeConversation ? (
          <>
            <header className="messengerConversationHeader">

              <div className="conversationAvatar large">
                {activeConversation.conversation_type === "Group" ? (
                  activeConversation.avatar_url ? (
                    <img
                      src={activeConversation.avatar_url}
                      alt={activeConversation.name || "Group"}
                    />
                  ) : (
                    (activeConversation.name || "Group")
                      .split(/\\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map(word => word.charAt(0))
                      .join("")
                      .toUpperCase()
                  )
                ) : (
                  <MessengerUserAvatar
                    name={
                      directPeer(activeConversation.id)?.full_name ||
                      activeConversation.name ||
                      "Campus user"
                    }
                    src={
                      directPeer(activeConversation.id)?.avatar_url ||
                      undefined
                    }
                    className="conversationPeerAvatar large"
                  />
                )}
              </div>

              <div>
                <h3>
                  {conversationDisplayName(
                    activeConversation
                  )}
                </h3>

                <span className="conversationPresence">
                  {activeConversation.conversation_type ===
                  "Group"
                    ? `${
                        members.filter(
                          member =>
                            member.conversation_id ===
                            activeConversation.id
                        ).length
                      } members`
                    : Object.keys(
                        typingUsers
                      ).length > 0
                    ? `${
                        Object.values(
                          typingUsers
                        )[0]
                      } is typing…`
                    : onlineUserIds.has(
                        directPeerId(
                          activeConversation.id
                        )
                      )
                    ? "online"
                    : "offline"}
                </span>
              </div>

              <div className="conversationMenuWrap">
                <button
                  type="button"
                  title="Conversation options"
                  onClick={() =>
                    setShowConversationMenu(
                      value => !value
                    )
                  }
                >
                  ⋮
                </button>

                {showConversationMenu && (
                  <div className="conversationMenu">
                    {activeConversation.conversation_type ===
                    "Group" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowConversationMenu(false);
                          void openGroupInformation();
                        }}
                      >
                        Group info
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setShowConversationMenu(false);

                          const peer =
                            directPeer(
                              activeConversation.id
                            );

                          if (peer) {
                            setFoundUser(peer);
                            setShowNewChat(true);
                          }
                        }}
                      >
                        View profile
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowConversationMenu(false);

                        requestAnimationFrame(() => {
                          document
                            .querySelector(
                              ".messageArea"
                            )
                            ?.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                        });
                      }}
                    >
                      Search / go to top
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowConversationMenu(false);

                        navigator.clipboard
                          ?.writeText(
                            conversationDisplayName(
                              activeConversation
                            )
                          );

                        setStatus(
                          "Conversation name copied."
                        );
                      }}
                    >
                      Copy conversation name
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void toggleConversationMute()
                      }
                    >
                      {currentConversationMembership?.is_muted
                        ? "Unmute notifications"
                        : "Mute notifications"}
                    </button>

                    {activeConversation.conversation_type ===
                      "Direct" && (
                      <button
                        type="button"
                        className="conversationMenuDanger"
                        disabled={busy}
                        onClick={() =>
                          void removeCurrentFriend()
                        }
                      >
                        Remove friend
                      </button>
                    )}

                    {activeConversation.conversation_type ===
                      "Group" && (
                      <button
                        type="button"
                        onClick={async () => {
                          setShowConversationMenu(false);

                          setGroupInfoTab(
                            "Media"
                          );

                          await openGroupInformation();
                        }}
                      >
                        Members & media
                      </button>
                    )}
                  </div>
                )}
              </div>

            </header>


            <div className="messageArea">

              {messages.map(message => {
                const mine =
                  message.sender_id ===
                  currentUserId;

                return (
                  <div
                    className={
                      mine
                        ? "chatMessageRow mine"
                        : "chatMessageRow"
                    }
                    key={message.id}
                  >
                    <article className="chatBubble">

                      {!mine &&
                        activeConversation.conversation_type ===
                          "Group" && (
                          <strong>
                            {message.sender_name}
                          </strong>
                        )}

                      {message.reply_to &&
                        (() => {
                          const replied =
                            repliedMessageFor(message);

                          if (!replied) {
                            return null;
                          }

                          return (
                            <div className="chatReplyQuote">
                              <b>
                                {replied.sender_name}
                              </b>
                              <span>
                                {replied.deleted_at
                                  ? "This message was deleted"
                                  : replied.body ||
                                    replied.file_name ||
                                    "Attachment"}
                              </span>
                            </div>
                          );
                        })()}

                      {message.deleted_at ? (
                        <p className="deletedMessage">
                          <i>⊘</i>
                          This message was deleted
                        </p>
                      ) : message.body ? (
                        <p>
                          {message.body}
                        </p>
                      ) : null}

                      {!message.deleted_at &&
                        message.file_path && (
                        <button
                          type="button"
                          className="chatAttachment"
                          onClick={() =>
                            void openChatFile(
                              message
                            )
                          }
                        >
                          <i>
                            {message.message_type ===
                            "Image"
                              ? "IMG"
                              : "FILE"}
                          </i>

                          <span>
                            <b>
                              {message.file_name ||
                                "Attachment"}
                            </b>

                            <small>
                              {message.file_size
                                ? `${Math.max(
                                    1,
                                    Math.round(
                                      message.file_size /
                                        1024
                                    )
                                  )} KB`
                                : ""}
                            </small>
                          </span>
                        </button>
                      )}

                      {!message.deleted_at && (
                        <button
                          type="button"
                          className="chatMessageReply"
                          onClick={() =>
                            setReplyingTo(message)
                          }
                        >
                          Reply
                        </button>
                      )}

                      {mine &&
                        !message.deleted_at && (
                          <button
                            type="button"
                            className="chatMessageDelete"
                            title="Delete message"
                            onClick={() =>
                              void deleteMessage(
                                message
                              )
                            }
                          >
                            Delete
                          </button>
                        )}

                      {!message.deleted_at && (
                        <div className="messageReactionBar">

                          {[
                            "👍",
                            "❤️",
                            "😂",
                            "😮",
                            "👏",
                          ].map(emoji => (
                            <button
                              type="button"
                              key={emoji}
                              onClick={() =>
                                void toggleReaction(
                                  message,
                                  emoji
                                )
                              }
                            >
                              {emoji}
                            </button>
                          ))}

                        </div>
                      )}

                      {reactions[message.id]?.length > 0 && (
                        <div className="messageReactions">
                          {Object.entries(
                            reactions[
                              message.id
                            ].reduce(
                              (
                                result:
                                  Record<string, number>,
                                reaction
                              ) => {
                                result[
                                  reaction.emoji
                                ] =
                                  (
                                    result[
                                      reaction.emoji
                                    ] || 0
                                  ) + 1;

                                return result;
                              },
                              {}
                            )
                          ).map(
                            ([emoji, count]) => (
                              <span key={emoji}>
                                {emoji} {count}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      <time>
                        {new Intl.DateTimeFormat(
                          "en-IN",
                          {
                            hour:
                              "2-digit",
                            minute:
                              "2-digit",
                          }
                        ).format(
                          new Date(
                            message.created_at
                          )
                        )}
                      </time>

                      {mine &&
                        (() => {
                          const status =
                            messageStatus(
                              message
                            );

                          if (!status) {
                            return null;
                          }

                          return (
                            <span
                              className={
                                status.read
                                  ? "chatMessageStatus read"
                                  : "chatMessageStatus"
                              }
                              title={
                                status.read
                                  ? "Read"
                                  : status.label ===
                                    "✓✓"
                                  ? "Delivered"
                                  : "Sent"
                              }
                            >
                              {status.label}
                            </span>
                          );
                        })()}

                    </article>
                  </div>
                );
              })}

              <div ref={messageEndRef}/>

            </div>


            {attachment && (
              <div className="chatFilePreview">
                <span>
                  {attachment.name}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setAttachment(null)
                  }
                >
                  ×
                </button>
              </div>
            )}


            {replyingTo && (
              <div className="composerReplyPreview">
                <div>
                  <b>
                    Replying to {replyingTo.sender_name}
                  </b>

                  <span>
                    {replyingTo.body ||
                      replyingTo.file_name ||
                      "Attachment"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setReplyingTo(null)
                  }
                >
                  ×
                </button>
              </div>
            )}

            <form
              className="messageComposerBar"
              onSubmit={sendMessage}
            >

              <label className="chatAttachButton">
                ＋

                <input
                  type="file"
                  hidden
                  onChange={(
                    event:
                      ChangeEvent<HTMLInputElement>
                  ) =>
                    setAttachment(
                      event.target.files?.[0] ||
                      null
                    )
                  }
                />
              </label>

              <input
                value={composer}
                onChange={event => {
                  setComposer(
                    event.target.value
                  );

                  sendTypingSignal();
                }}
                placeholder="Type a message"
              />

              <button
                type="submit"
                disabled={busy}
              >
                Send
              </button>

            </form>

          </>
        ) : (
          <div className="messengerWelcome">

            <div>CC</div>

            <h2>
              CampusConnect Messenger
            </h2>

            <p>
              Private realtime chat for
              students, faculty and verified
              campus users.
            </p>

            <button
              className="primary"
              onClick={() =>
                setShowNewChat(true)
              }
            >
              Start a conversation
            </button>

          </div>
        )}

      </section>


      {showNewChat && (
        <div
          className="messengerModalScrim"
          onClick={() =>
            setShowNewChat(false)
          }
        >
          <section
            className="messengerModal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <header>
              <div>
                <span>CONNECT</span>
                <h3>Find by UID</h3>
              </div>

              <button
                onClick={() =>
                  setShowNewChat(false)
                }
              >
                ×
              </button>
            </header>

            <form
              className="uidSearchForm"
              onSubmit={searchByUid}
            >
              <input
                value={uidQuery}
                onChange={event =>
                  setUidQuery(
                    event.target.value
                      .toUpperCase()
                  )
                }
                placeholder="CC-XXXXXXXX"
              />

              <button
                className="primary"
                disabled={busy}
              >
                Find
              </button>
            </form>

            {foundUser && (
              <div className="foundCampusUser">

                <MessengerUserAvatar
                  name={foundUser.full_name}
                  src={foundUser.avatar_url}
                  className="conversationAvatar large"
                />

                <div>
                  <b>
                    {foundUser.full_name}
                  </b>

                  <span>
                    {foundUser.role} ·{" "}
                    {foundUser.department}
                  </span>

                  <small>
                    {foundUser.campus_uid}
                  </small>
                </div>

                {connectionWith(
                  foundUser.id
                )?.status ===
                "Accepted" ? (
                  <button
                    className="primary"
                    onClick={() =>
                      void startDirectChat(
                        foundUser
                      )
                    }
                  >
                    Message
                  </button>
                ) : (
                  <button
                    className="primary"
                    onClick={() =>
                      void sendConnectionRequest(
                        foundUser
                      )
                    }
                  >
                    Connect
                  </button>
                )}

              </div>
            )}

            {status && (
              <p className="messengerStatus">
                {status}
              </p>
            )}

          </section>
        </div>
      )}


      {showGroupInfo &&
        activeConversation &&
        activeConversation.conversation_type ===
          "Group" && (
        <div
          className="messengerModalScrim"
          onClick={() =>
            setShowGroupInfo(false)
          }
        >
          <section
            className="messengerModal groupInfoModal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <header>
              <div>
                <span>GROUP INFO</span>
                <h3>
                  {activeConversation.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGroupInfo(false)
                }
              >
                ×
              </button>
            </header>


            <div className="groupInfoIdentity">

              <div className="groupInfoAvatar">
                {groupAvatarPreview ||
                activeConversation.avatar_url ? (
                  <img
                    src={
                      groupAvatarPreview ||
                      activeConversation.avatar_url ||
                      ""
                    }
                    alt={activeConversation.name}
                  />
                ) : (
                  activeConversation.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(word =>
                      word.charAt(0)
                    )
                    .join("")
                    .toUpperCase()
                )}
              </div>

              <div>
                <b>
                  {activeConversation.name}
                </b>

                <span>
                  {activeGroupMembers.length}
                  {" "}
                  members
                </span>
              </div>

            </div>

            {isCurrentGroupAdmin && (
              <section className="groupAvatarControls">

                <label>
                  <span>Change group photo</span>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={event => {
                      const file =
                        event.target.files?.[0] ||
                        null;

                      setGroupAvatarFile(
                        file
                      );

                      if (file) {
                        setGroupAvatarPreview(
                          URL.createObjectURL(
                            file
                          )
                        );
                      } else {
                        setGroupAvatarPreview("");
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  className="primary"
                  disabled={
                    !groupAvatarFile ||
                    groupActionBusy
                  }
                  onClick={() =>
                    void uploadGroupAvatar()
                  }
                >
                  {groupActionBusy
                    ? "Uploading..."
                    : "Save group photo"}
                </button>

              </section>
            )}


            {isCurrentGroupAdmin ? (
              <section className="groupInfoEdit">

                <label>
                  Group name

                  <input
                    value={groupInfoName}
                    onChange={event =>
                      setGroupInfoName(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Description

                  <textarea
                    value={
                      groupInfoDescription
                    }
                    onChange={event =>
                      setGroupInfoDescription(
                        event.target.value
                      )
                    }
                    placeholder="What is this group for?"
                  />
                </label>

                <button
                  type="button"
                  className="primary"
                  disabled={
                    groupActionBusy
                  }
                  onClick={() =>
                    void saveGroupInformation()
                  }
                >
                  Save group info
                </button>

              </section>
            ) : (
              <p className="groupInfoDescription">
                {activeConversation.description ||
                  "No group description."}
              </p>
            )}


            {isCurrentGroupAdmin && (
              <section className="groupAddMember">

                <span>ADD MEMBERS</span>

                <input
                  value={
                    groupInfoSearch
                  }
                  onChange={event =>
                    void searchUsersForExistingGroup(
                      event.target.value
                    )
                  }
                  placeholder="Search name or Campus UID"
                />

                {groupInfoCandidates.length >
                  0 && (
                  <div className="groupInfoSearchResults">

                    {groupInfoCandidates.map(
                      user => (
                        <div
                          key={user.id}
                          className="groupInfoPerson"
                        >

                          <MessengerUserAvatar
                            name={user.full_name}
                            src={user.avatar_url}
                            className="groupPersonAvatar"
                          />

                          <span>
                            <b>
                              {user.full_name}
                            </b>

                            <small>
                              {user.role}
                              {" · "}
                              {user.campus_uid}
                            </small>
                          </span>

                          <button
                            type="button"
                            disabled={
                              groupActionBusy
                            }
                            onClick={() =>
                              void addExistingGroupMember(
                                user
                              )
                            }
                          >
                            Add
                          </button>

                        </div>
                      )
                    )}

                  </div>
                )}

              </section>
            )}


            <div className="groupInfoTabs">

              {[
                "Members",
                "Media",
                "Docs",
                "Links",
              ].map(tab => (
                <button
                  type="button"
                  key={tab}
                  className={
                    groupInfoTab === tab
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setGroupInfoTab(
                      tab as
                        | "Members"
                        | "Media"
                        | "Docs"
                        | "Links"
                    )
                  }
                >
                  {tab}
                </button>
              ))}

            </div>


            {groupInfoTab === "Members" && (
            <section className="groupMemberSection">

              <div className="groupMemberHeading">
                <span>MEMBERS</span>

                <b>
                  {activeGroupMembers.length}
                </b>
              </div>

              <div className="groupMemberList">

                {activeGroupMembers.map(
                  member => {
                    const user =
                      groupMemberProfiles[
                        member.user_id
                      ];

                    const isMe =
                      member.user_id ===
                      currentUserId;

                    return (
                      <article
                        className="groupMemberRow"
                        key={
                          member.user_id
                        }
                      >

                        <MessengerUserAvatar
                          name={
                            user?.full_name ||
                            (isMe ? profile.name : "User")
                          }
                          src={
                            user?.avatar_url ||
                            (isMe ? profile.avatar_url : null)
                          }
                          className="groupMemberAvatar"
                        />

                        <span>
                          <b>
                            {user?.full_name ||
                              (isMe
                                ? profile.name
                                : "Campus member")}
                            {isMe
                              ? " · You"
                              : ""}
                          </b>

                          <small>
                            {user?.role ||
                              "Campus user"}
                          </small>
                        </span>

                        {member.member_role ===
                          "Admin" && (
                          <em>
                            Group admin
                          </em>
                        )}

                        {isCurrentGroupAdmin &&
                          !isMe && (
                          <div className="groupMemberActions">

                            <button
                              type="button"
                              onClick={() =>
                                void changeExistingGroupRole(
                                  member
                                )
                              }
                            >
                              {member.member_role ===
                              "Admin"
                                ? "Remove admin"
                                : "Make admin"}
                            </button>

                            <button
                              type="button"
                              className="danger"
                              onClick={() =>
                                void removeExistingGroupMember(
                                  member.user_id
                                )
                              }
                            >
                              Remove
                            </button>

                          </div>
                        )}

                      </article>
                    );
                  }
                )}

              </div>

            </section>
            )}

            {groupInfoTab === "Media" && (
              <section className="sharedContentGrid">

                {messages
                  .filter(
                    message =>
                      !message.deleted_at &&
                      message.message_type === "Image" &&
                      message.file_path
                  )
                  .map(message => (
                    <button
                      type="button"
                      className="sharedMediaItem"
                      key={message.id}
                      onClick={() =>
                        void openChatFile(
                          message
                        )
                      }
                    >
                      <span>IMG</span>

                      <b>
                        {message.file_name ||
                          "Image"}
                      </b>
                    </button>
                  ))}

                {!messages.some(
                  message =>
                    !message.deleted_at &&
                    message.message_type === "Image" &&
                    message.file_path
                ) && (
                  <div className="groupSharedEmpty">
                    No shared media yet.
                  </div>
                )}

              </section>
            )}

            {groupInfoTab === "Docs" && (
              <section className="sharedDocumentList">

                {messages
                  .filter(
                    message =>
                      !message.deleted_at &&
                      message.message_type === "File" &&
                      message.file_path
                  )
                  .map(message => (
                    <button
                      type="button"
                      key={message.id}
                      onClick={() =>
                        void openChatFile(
                          message
                        )
                      }
                    >
                      <i>FILE</i>

                      <span>
                        <b>
                          {message.file_name ||
                            "Document"}
                        </b>

                        <small>
                          {message.file_size
                            ? `${Math.max(
                                1,
                                Math.round(
                                  message.file_size /
                                    1024
                                )
                              )} KB`
                            : ""}
                        </small>
                      </span>

                      <em>Open</em>
                    </button>
                  ))}

                {!messages.some(
                  message =>
                    !message.deleted_at &&
                    message.message_type === "File" &&
                    message.file_path
                ) && (
                  <div className="groupSharedEmpty">
                    No shared documents yet.
                  </div>
                )}

              </section>
            )}

            {groupInfoTab === "Links" && (
              <section className="sharedLinkList">

                {messages
                  .filter(
                    message =>
                      !message.deleted_at &&
                      /https?:\/\/[^\s]+/i.test(
                        message.body
                      )
                  )
                  .map(message => {
                    const match =
                      message.body.match(
                        /https?:\/\/[^\s]+/i
                      );

                    if (!match) {
                      return null;
                    }

                    return (
                      <a
                        key={message.id}
                        href={match[0]}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span>
                          {message.sender_name}
                        </span>

                        <b>
                          {match[0]}
                        </b>
                      </a>
                    );
                  })}

                {!messages.some(
                  message =>
                    !message.deleted_at &&
                    /https?:\/\/[^\s]+/i.test(
                      message.body
                    )
                ) && (
                  <div className="groupSharedEmpty">
                    No shared links yet.
                  </div>
                )}

              </section>
            )}


            <div className="groupDangerZone">

              <button
                type="button"
                className="leaveGroupButton"
                disabled={groupActionBusy}
                onClick={() =>
                  void leaveActiveGroup()
                }
              >
                Leave group
              </button>

              {isCurrentGroupAdmin && (
                <button
                  type="button"
                  className="deleteGroupButton"
                  disabled={groupActionBusy}
                  onClick={() =>
                    void deleteActiveGroup()
                  }
                >
                  Delete group
                </button>
              )}

            </div>

          </section>
        </div>
      )}


      {showCreateGroup && (
        <div
          className="messengerModalScrim"
          onClick={() =>
            setShowCreateGroup(false)
          }
        >
          <section
            className="messengerModal groupModal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <header>
              <div>
                <span>NEW GROUP</span>
                <h3>Create conversation</h3>
              </div>

              <button
                onClick={() =>
                  setShowCreateGroup(false)
                }
              >
                ×
              </button>
            </header>

            <form
              onSubmit={createGroup}
            >

              <label>
                Group name

                <input
                  value={groupName}
                  onChange={event =>
                    setGroupName(
                      event.target.value
                    )
                  }
                  placeholder="ECE Project Team"
                />
              </label>

              <label>
                Description

                <textarea
                  value={
                    groupDescription
                  }
                  onChange={event =>
                    setGroupDescription(
                      event.target.value
                    )
                  }
                  placeholder="What is this group for?"
                />
              </label>

              <label>
                Add members

                <input
                  value={groupSearch}
                  onChange={event =>
                    void searchGroupUsers(
                      event.target.value
                    )
                  }
                  placeholder="Search name or Campus UID"
                />
              </label>

              <div className="groupSelectionSummary">
                <span>
                  Selected members
                </span>

                <b>
                  {selectedMemberIds.length}
                </b>
              </div>

              {selectedGroupUsers.length > 0 && (
                <div className="selectedGroupUserList">

                  {selectedGroupUsers.map(
                    user => (
                      <div
                        className="selectedGroupUser"
                        key={user.id}
                      >
                        <MessengerUserAvatar
                          name={user.full_name}
                          src={user.avatar_url}
                          className="selectedGroupAvatar"
                        />

                        <div>
                          <b>
                            {user.full_name}
                          </b>

                          <small>
                            {user.role}
                            {" · "}
                            {user.campus_uid}
                          </small>
                        </div>

                        <button
                          type="button"
                          title="Remove member"
                          onClick={() =>
                            toggleGroupMember(
                              user
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

              <div className="groupUserResults">

                {groupCandidates.map(
                  user => (
                    <button
                      type="button"
                      key={user.id}
                      className={
                        selectedMemberIds.includes(
                          user.id
                        )
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        toggleGroupMember(
                          user
                        )
                      }
                    >
                      <MessengerUserAvatar
                        name={user.full_name}
                        src={user.avatar_url}
                        className="groupCandidateAvatar"
                      />

                      <span>
                        <b>
                          {user.full_name}
                        </b>

                        <small>
                          {user.role} ·{" "}
                          {user.campus_uid}
                        </small>
                      </span>

                      <em>
                        {selectedMemberIds.includes(
                          user.id
                        )
                          ? "✓"
                          : "+"}
                      </em>
                    </button>
                  )
                )}

              </div>

              <button
                type="submit"
                className="primary createGroupButton"
                disabled={
                  busy ||
                  groupName.trim().length < 2 ||
                  selectedMemberIds.length === 0
                }
              >
                {busy
                  ? "Creating group..."
                  : selectedMemberIds.length === 0
                  ? "Select members"
                  : `Create group · ${
                      selectedMemberIds.length + 1
                    } members`}
              </button>

            </form>

          </section>
        </div>
      )}

    </div>
  );
}
