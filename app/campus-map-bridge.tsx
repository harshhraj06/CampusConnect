"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {getSupabaseClient} from "../lib/supabase";

type CampusMapBridgeProps = {
  role: string;
};

type MapTable =
  | "campus_map_buildings"
  | "campus_map_nodes"
  | "campus_map_edges";

type MapMessage = {
  type?: string;
  table?: MapTable;
  action?: "insert" | "update" | "delete";
  id?: string;
  payload?: Record<string, unknown>;
};

const allowedTables =
  new Set<MapTable>([
    "campus_map_buildings",
    "campus_map_nodes",
    "campus_map_edges",
  ]);

export function CampusMapBridge({
  role,
}: CampusMapBridgeProps) {
  const iframeRef =
    useRef<HTMLIFrameElement | null>(
      null
    );

  const [ready, setReady] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const postToMap =
    useCallback(
      (
        message:
          Record<string, unknown>
      ) => {
        iframeRef.current
          ?.contentWindow
          ?.postMessage(
            message,
            window.location.origin
          );
      },
      []
    );

  const loadMapData =
    useCallback(async () => {
      const client =
        getSupabaseClient();

      if (!client) {
        setError(
          "Campus map database is unavailable."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const [
        buildingsResult,
        nodesResult,
        edgesResult,
      ] =
        await Promise.all([
          client
            .from(
              "campus_map_buildings"
            )
            .select("*")
            .order(
              "display_order",
              {
                ascending: true,
              }
            ),

          client
            .from(
              "campus_map_nodes"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending: true,
              }
            ),

          client
            .from(
              "campus_map_edges"
            )
            .select("*")
            .order(
              "created_at",
              {
                ascending: true,
              }
            ),
        ]);

      const firstError =
        buildingsResult.error ||
        nodesResult.error ||
        edgesResult.error;

      if (firstError) {
        console.error(
          "Campus map load error:",
          firstError
        );

        setError(
          firstError.message ||
            "Unable to load campus map data."
        );

        setLoading(false);
        return;
      }

      postToMap({
        type:
          "campus-map:data",

        canManage:
          role ===
          "Main Admin",

        buildings:
          buildingsResult.data ||
          [],

        nodes:
          nodesResult.data ||
          [],

        edges:
          edgesResult.data ||
          [],
      });

      setLoading(false);
    }, [
      postToMap,
      role,
    ]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    void loadMapData();
  }, [
    ready,
    loadMapData,
  ]);

  useEffect(() => {
    const handleMessage =
      async (
        event: MessageEvent<MapMessage>
      ) => {
        if (
          event.origin !==
          window.location.origin
        ) {
          return;
        }

        if (
          event.source !==
          iframeRef.current
            ?.contentWindow
        ) {
          return;
        }

        const message =
          event.data;

        if (
          !message ||
          typeof message !==
            "object"
        ) {
          return;
        }

        if (
          message.type ===
          "campus-map:ready"
        ) {
          setReady(true);

          postToMap({
            type:
              "campus-map:auth",

            canManage:
              role ===
              "Main Admin",
          });

          return;
        }

        if (
          message.type ===
          "campus-map:reload"
        ) {
          await loadMapData();
          return;
        }

        if (
          message.type !==
          "campus-map:mutation"
        ) {
          return;
        }

        if (
          role !==
          "Main Admin"
        ) {
          postToMap({
            type:
              "campus-map:mutation-result",

            ok: false,

            error:
              "Only Main Admin can edit the campus map.",
          });

          return;
        }

        if (
          !message.table ||
          !allowedTables.has(
            message.table
          )
        ) {
          postToMap({
            type:
              "campus-map:mutation-result",

            ok: false,

            error:
              "Invalid campus map table.",
          });

          return;
        }

        const client =
          getSupabaseClient();

        if (!client) {
          postToMap({
            type:
              "campus-map:mutation-result",

            ok: false,

            error:
              "Supabase is unavailable.",
          });

          return;
        }

        const {
          data: authData,
          error: authError,
        } =
          await client.auth.getUser();

        if (
          authError ||
          !authData.user
        ) {
          postToMap({
            type:
              "campus-map:mutation-result",

            ok: false,

            error:
              "Authentication required.",
          });

          return;
        }

        try {
          if (
            message.action ===
            "insert"
          ) {
            const payload = {
              ...(message.payload ||
                {}),
              created_by:
                authData.user.id,
            };

            const {
              error: insertError,
            } =
              await client
                .from(
                  message.table
                )
                .insert(
                  payload
                );

            if (insertError) {
              throw insertError;
            }
          } else if (
            message.action ===
            "update"
          ) {
            if (
              !message.id
            ) {
              throw new Error(
                "Missing record ID."
              );
            }

            const {
              created_by:
                _ignoredCreatedBy,
              id:
                _ignoredId,
              created_at:
                _ignoredCreatedAt,
              ...safePayload
            } =
              message.payload ||
              {};

            const {
              error: updateError,
            } =
              await client
                .from(
                  message.table
                )
                .update(
                  safePayload
                )
                .eq(
                  "id",
                  message.id
                );

            if (updateError) {
              throw updateError;
            }
          } else if (
            message.action ===
            "delete"
          ) {
            if (
              !message.id
            ) {
              throw new Error(
                "Missing record ID."
              );
            }

            const {
              error: deleteError,
            } =
              await client
                .from(
                  message.table
                )
                .delete()
                .eq(
                  "id",
                  message.id
                );

            if (deleteError) {
              throw deleteError;
            }
          } else {
            throw new Error(
              "Invalid map action."
            );
          }

          postToMap({
            type:
              "campus-map:mutation-result",

            ok: true,
          });

          await loadMapData();
        } catch (mutationError) {
          console.error(
            "Campus map mutation error:",
            mutationError
          );

          const messageText =
            mutationError instanceof
            Error
              ? mutationError.message
              : "Campus map update failed.";

          postToMap({
            type:
              "campus-map:mutation-result",

            ok: false,

            error:
              messageText,
          });
        }
      };

    window.addEventListener(
      "message",
      handleMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );
    };
  }, [
    role,
    loadMapData,
    postToMap,
  ]);

  return (
    <div
      style={{
        position:
          "relative",
        minHeight:
          "900px",
      }}
    >
      <iframe
        ref={iframeRef}
        src="/campus-map/index.html"
        title="Interactive RNS campus navigation map"
        allow="geolocation"
        loading="eager"
        onLoad={() => {
          setReady(true);
        }}
        style={{
          display: "block",
          width: "100%",
          height: "900px",
          border: 0,
          background:
            "#eaf2f7",
        }}
      />

      {loading && (
        <div
          style={{
            position:
              "absolute",
            top: 18,
            left: "50%",
            transform:
              "translateX(-50%)",
            zIndex: 20,
            padding:
              "9px 14px",
            borderRadius:
              "999px",
            background:
              "rgba(255,253,249,.96)",
            border:
              "1px solid rgba(31,78,121,.14)",
            boxShadow:
              "0 8px 24px rgba(24,54,91,.12)",
            color:
              "#465b6c",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Loading campus map…
        </div>
      )}

      {error && (
        <div
          style={{
            position:
              "absolute",
            left: 18,
            right: 18,
            bottom: 18,
            zIndex: 20,
            padding:
              "12px 14px",
            borderRadius:
              "12px",
            background:
              "#fff7f4",
            border:
              "1px solid rgba(169,91,67,.2)",
            color:
              "#8b4e3d",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
