import { publicPages, siteOrigin } from "../lib/campus-seo";
/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;

  /**
   * Server-only secret used by the attendance email worker.
   * Never expose this value to client code.
   */
  ATTENDANCE_DELIVERY_WORKER_SECRET?: string;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === "www.campusconnect-pro.in" ||
        (url.hostname === "campusconnect-pro.in" && url.protocol === "http:")) {
      return new Response(null, {
        status: 308,
        headers: { Location: siteOrigin + url.pathname + url.search },
      });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const path = url.pathname.replace(/\/+$/, "") || "/";
    const isPublic = Object.prototype.hasOwnProperty.call(publicPages, path)
      && !(path === "/" && url.searchParams.has("redirectTo"));
    const isSearchAsset = /^\/(?:robots\.txt|sitemap\.xml|manifest\.json|favicon\.ico|og\.png|icon-(?:48|96|192|512|maskable-512)\.png|apple-touch-icon\.png)$/.test(path);
    const response = await handler.fetch(request, env, ctx);
    if (isSearchAsset || path.startsWith("/_next/")) return response;

    const result = new Response(response.body, response);
    result.headers.set("Cache-Control", "private, no-store, max-age=0");
    if (!isPublic || response.status >= 400) {
      result.headers.set("X-Robots-Tag",
        /^(?:\/events\/pass(?:\/|$)|\/api(?:\/|$))/.test(path) ? "noindex, nofollow" : "noindex, follow");
    }
    return result;
  },

  /**
   * Cloudflare Cron entry point.
   *
   * SAFETY:
   * This scheduler intentionally calls the attendance worker
   * in read-only dry-run mode.
   *
   * Real delivery remains disabled until the CampusConnect
   * sender domain is verified and production secrets have
   * been configured.
   */
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const workerSecret =
          env.ATTENDANCE_DELIVERY_WORKER_SECRET;

        if (!workerSecret) {
          console.error(
            "[Attendance Email Cron] " +
              "ATTENDANCE_DELIVERY_WORKER_SECRET is missing."
          );
          return;
        }

        const request = new Request(
          "http://localhost/api/internal/attendance-email-worker",
          {
            method: "POST",
            headers: {
              "content-type":
                "application/json",
              "x-campusconnect-worker-secret":
                workerSecret,
            },
            body: JSON.stringify({
              dryRun: true,
              limit: 10,
            }),
          },
        );

        try {
          /*
           * Route internally through the same Vinext application
           * instead of making an external network request.
           */
          const response =
            await handler.fetch(
              request,
              env,
              ctx,
            );

          const result =
            await response
              .clone()
              .text();

          if (!response.ok) {
            console.error(
              "[Attendance Email Cron] " +
                `Dry-run failed (${response.status}): ` +
                result.slice(0, 1000)
            );
            return;
          }

          console.log(
            "[Attendance Email Cron] " +
              "Dry-run completed:",
            result.slice(0, 1000),
          );
        } catch (error) {
          console.error(
            "[Attendance Email Cron] " +
              "Dry-run crashed:",
            error,
          );
        }
      })(),
    );
  },
};

export default worker;
