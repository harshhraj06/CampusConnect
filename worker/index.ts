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

    return handler.fetch(request, env, ctx);
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
