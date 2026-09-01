"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getSupabaseClient,
} from "../lib/supabase";


type SevaRole =
  | "Student"
  | "Faculty"
  | "Placement Cell"
  | "Coordinator"
  | "Volunteer"
  | "Main Admin";


type ServiceRequestRow = {
  id: string;
  request_number: string;
  requester_id: string;
  requester_name: string;
  category: string;
  subject: string;
  priority: string;
  status: string;
  assigned_role: string;
  assigned_to: string | null;
  resolution_note: string;
  created_at: string;
  updated_at: string;
};


type RequestRelation = {
  request_number?: string;
  requester_id?: string;
  assigned_to?: string | null;
  assigned_role?: string;
  subject?: string;
};


type ServiceCommentRow = {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  body: string;
  created_at: string;
  campus_service_requests?:
    | RequestRelation
    | RequestRelation[]
    | null;
};


export type CampusSevaNotification = {
  id: string;
  kind: "seva";
  label: string;
  title: string;
  message: string;
  time: string;
  target: "Seva Kendra";
  sortAt: string;
};


function relativeSevaTime(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  const difference =
    Date.now() -
    date.getTime();

  const minutes =
    Math.max(
      0,
      Math.floor(
        difference /
        60000
      )
    );

  if (
    minutes <
    1
  ) {
    return "Just now";
  }

  if (
    minutes <
    60
  ) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes /
      60
    );

  if (
    hours <
    24
  ) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours /
      24
    );

  if (
    days <
    7
  ) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day:
        "numeric",
      month:
        "short",
    }
  ).format(
    date
  );
}


export function
useCampusSevaNotifications({
  profileEmail,
  role,
}: {
  profileEmail:
    string;
  role:
    SevaRole;
}) {
  const [
    notifications,
    setNotifications,
  ] =
    useState<
      CampusSevaNotification[]
    >([]);


  useEffect(
    () => {
      const client =
        getSupabaseClient();

      if (
        !client ||
        !profileEmail
      ) {
        setNotifications(
          []
        );

        return;
      }

      let active =
        true;


      const load =
        async () => {
          const {
            data:
              authData,
          } =
            await client.auth
              .getUser();

          const user =
            authData.user;

          if (
            !user ||
            !active
          ) {
            return;
          }

          const [
            requestResult,
            commentResult,
          ] =
            await Promise.all([
              client
                .from(
                  "campus_service_requests"
                )
                .select(
                  "id,request_number,requester_id,requester_name,category,subject,priority,status,assigned_role,assigned_to,resolution_note,created_at,updated_at"
                )
                .order(
                  "updated_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  30
                ),

              client
                .from(
                  "campus_service_comments"
                )
                .select(
                  "id,author_id,author_name,author_role,body,created_at,campus_service_requests(request_number,requester_id,assigned_to,assigned_role,subject)"
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  25
                ),
            ]);

          if (
            !active
          ) {
            return;
          }

          if (
            requestResult.error
          ) {
            console.error(
              "[Campus Seva notification requests]",
              requestResult.error
            );
          }

          if (
            commentResult.error
          ) {
            console.error(
              "[Campus Seva notification comments]",
              commentResult.error
            );
          }

          const next:
            CampusSevaNotification[] =
              [];

          for (
            const request of
            (
              requestResult.data ||
              []
            ) as
              ServiceRequestRow[]
          ) {
            const isRequester =
              request.requester_id ===
              user.id;

            const isAssigned =
              request.assigned_to ===
              user.id;

            const isOpenQueue =
              !request.assigned_to &&
              request.assigned_role ===
                role;

            if (
              isRequester
            ) {
              next.push({
                id:
                  `seva-request-${request.id}-${request.updated_at}`,
                kind:
                  "seva",
                label:
                  "Seva Kendra",
                title:
                  `${request.request_number} · ${request.status}`,
                message:
                  request.resolution_note ||
                  `${request.subject} is currently ${request.status.toLowerCase()}.`,
                time:
                  relativeSevaTime(
                    request.updated_at
                  ),
                target:
                  "Seva Kendra",
                sortAt:
                  request.updated_at,
              });

              continue;
            }

            if (
              isAssigned ||
              isOpenQueue ||
              role ===
                "Main Admin"
            ) {
              next.push({
                id:
                  `seva-queue-${request.id}-${request.updated_at}`,
                kind:
                  "seva",
                label:
                  request.priority ===
                    "Urgent"
                    ? "Urgent Patra"
                    : "Service request",
                title:
                  `${request.request_number} · ${request.subject}`,
                message:
                  isAssigned
                    ? `Assigned to you · ${request.requester_name} · ${request.status}`
                    : `${request.requester_name} submitted a ${request.category} request routed to ${request.assigned_role}.`,
                time:
                  relativeSevaTime(
                    request.updated_at
                  ),
                target:
                  "Seva Kendra",
                sortAt:
                  request.updated_at,
              });
            }
          }

          for (
            const comment of
            (
              commentResult.data ||
              []
            ) as
              ServiceCommentRow[]
          ) {
            if (
              comment.author_id ===
              user.id
            ) {
              continue;
            }

            const relation =
              comment
                .campus_service_requests;

            const request =
              (
                Array.isArray(
                  relation
                )
                  ? relation[0]
                  : relation
              ) ||
              null;

            if (
              !request
            ) {
              continue;
            }

            const relevant =
              request.requester_id ===
                user.id ||
              request.assigned_to ===
                user.id ||
              (
                !request.assigned_to &&
                request.assigned_role ===
                  role
              ) ||
              role ===
                "Main Admin";

            if (
              !relevant
            ) {
              continue;
            }

            const body =
              String(
                comment.body ||
                ""
              ).trim();

            next.push({
              id:
                `seva-comment-${comment.id}`,
              kind:
                "seva",
              label:
                `${comment.author_role} response`,
              title:
                `${request.request_number || "Campus Patra"} · New message`,
              message:
                `${comment.author_name}: ${body.slice(0, 145)}${
                  body.length >
                    145
                    ? "…"
                    : ""
                }`,
              time:
                relativeSevaTime(
                  comment.created_at
                ),
              target:
                "Seva Kendra",
              sortAt:
                comment.created_at,
            });
          }

          next.sort(
            (
              first,
              second
            ) =>
              new Date(
                second.sortAt
              ).getTime() -
              new Date(
                first.sortAt
              ).getTime()
          );

          setNotifications(
            next.slice(
              0,
              30
            )
          );
        };


      void load();


      const channel =
        client
          .channel(
            `campus-seva-notification-hook-${profileEmail}`
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
              void load();
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
              void load();
            }
          )
          .subscribe();


      return () => {
        active =
          false;

        void client
          .removeChannel(
            channel
          );
      };
    },
    [
      profileEmail,
      role,
    ]
  );


  return notifications;
}
