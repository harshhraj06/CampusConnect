"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const register = async () => {
      try {
        const CAMPUSCONNECT_LOCAL_SW_GUARD = true;
        const isLocalCampusConnect =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";

        if (isLocalCampusConnect) {
          void navigator.serviceWorker.getRegistrations().then(
            registrations =>
              Promise.all(
                registrations.map(
                  registration =>
                    registration.unregister()
                )
              )
          );
          return;
        }

        await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
          }
        );
      } catch (error) {
        console.error(
          "CampusConnect service worker registration failed:",
          error
        );
      }
    };

    void register();
  }, []);

  return null;
}
