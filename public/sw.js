const CACHE_VERSION =
  "campusconnect-shell-v4";

const STATIC_CACHE =
  CACHE_VERSION;

const APP_SHELL_URL = "/";

const OFFLINE_URL =
  "/offline";

/*
 * The offline document is required.
 * If it cannot be cached, installation
 * should fail rather than pretending the
 * app is offline-ready.
 */
const REQUIRED_PRECACHE = [
  OFFLINE_URL,
];

/*
 * These improve the offline experience,
 * but failure of one asset must not make
 * the entire service-worker install fail.
 */
const OPTIONAL_PRECACHE = [
  "/campusconnect-logo.png",
  "/icons/campusconnect-192-v2.png",
  "/icons/campusconnect-512-v2.png",
];

async function cacheRequiredAssets(
  cache
) {
  for (
    const url of REQUIRED_PRECACHE
  ) {
    const response =
      await fetch(url, {
        cache: "reload",
      });

    if (!response.ok) {
      throw new Error(
        `Required precache failed: ${url} (${response.status})`
      );
    }

    await cache.put(
      url,
      response
    );
  }
}

async function cacheOptionalAssets(
  cache
) {
  await Promise.allSettled(
    OPTIONAL_PRECACHE.map(
      async url => {
        const response =
          await fetch(url, {
            cache: "reload",
          });

        if (!response.ok) {
          throw new Error(
            `Optional precache failed: ${url} (${response.status})`
          );
        }

        await cache.put(
          url,
          response
        );
      }
    )
  );
}

self.addEventListener(
  "install",
  event => {
    event.waitUntil(
      (async () => {
        const cache =
          await caches.open(
            STATIC_CACHE
          );

        await cacheRequiredAssets(
          cache
        );

        await cacheOptionalAssets(
          cache
        );

        await self.skipWaiting();
      })()
    );
  }
);

self.addEventListener(
  "activate",
  event => {
    event.waitUntil(
      (async () => {
        const keys =
          await caches.keys();

        await Promise.all(
          keys
            .filter(
              key =>
                key.startsWith(
                  "campusconnect-"
                ) &&
                key !==
                  STATIC_CACHE
            )
            .map(
              key =>
                caches.delete(key)
            )
        );

        await self.clients.claim();
      })()
    );
  }
);

function isSensitiveRequest(
  url
) {
  return (
    url.pathname.startsWith(
      "/api/"
    ) ||
    url.pathname.startsWith(
      "/auth/"
    ) ||
    url.hostname.includes(
      "supabase"
    )
  );
}

async function handleNavigation(
  request
) {
  const cache =
    await caches.open(
      STATIC_CACHE
    );

  try {
    const response =
      await fetch(request);

    if (
      response &&
      response.ok &&
      response.type === "basic"
    ) {
      await cache.put(
        APP_SHELL_URL,
        response.clone()
      );
    }

    return response;
  } catch {
    const shell =
      await cache.match(
        APP_SHELL_URL
      );

    if (shell) {
      return shell;
    }

    const offline =
      await cache.match(
        OFFLINE_URL
      );

    return (
      offline ||
      new Response(
        "CampusConnect is offline.",
        {
          status: 503,
          headers: {
            "Content-Type":
              "text/plain; charset=utf-8",
          },
        }
      )
    );
  }
}

async function handleStaticAsset(
  request
) {
  const cached =
    await caches.match(
      request
    );

  if (cached) {
    return cached;
  }

  const response =
    await fetch(request);

  if (
    !response ||
    !response.ok
  ) {
    return response;
  }

  const cache =
    await caches.open(
      STATIC_CACHE
    );

  await cache.put(
    request,
    response.clone()
  );

  return response;
}

self.addEventListener(
  "fetch",
  event => {
    const request =
      event.request;

    if (
      request.method !== "GET"
    ) {
      return;
    }

    const url =
      new URL(
        request.url
      );

    /*
     * Never intercept cross-origin
     * traffic, including Supabase
     * Storage signed URLs.
     */
    if (
      url.origin !==
      self.location.origin
    ) {
      return;
    }

    /*
     * Authentication and API requests
     * remain network-only.
     */
    if (
      isSensitiveRequest(url)
    ) {
      return;
    }

    if (
      request.mode ===
      "navigate"
    ) {
      event.respondWith(
        handleNavigation(
          request
        )
      );

      return;
    }

    if (
      url.pathname.startsWith(
        "/_next/"
      ) ||
      url.pathname.startsWith(
        "/assets/"
      ) ||
      url.pathname.startsWith(
        "/icons/"
      ) ||
      /\.(?:png|jpg|jpeg|webp|ico|svg|css|js|woff2?)$/i.test(
        url.pathname
      )
    ) {
      event.respondWith(
        handleStaticAsset(
          request
        )
      );
    }
  }
);
