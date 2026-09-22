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
