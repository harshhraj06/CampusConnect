import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],


  /*
   * CampusConnect attendance email queue scheduler.
   *
   * Cloudflare Cron Triggers use UTC.
   * This only registers the trigger.
   *
   * No scheduled() handler is being added in this step,
   * and ATTENDANCE_EMAIL_DELIVERY_ENABLED remains false.
   */
  triggers: {
    crons: ["*/5 * * * *"],
  },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    /*
     * React-PDF / fontkit contains several CommonJS packages.
     *
     * Without explicit pre-bundling Vite can serve those files
     * directly as browser ESM, causing errors such as:
     *
     *   does not provide an export named 'default'
     *
     * Keep the complete dependency chain in one optimized bundle.
     */
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "base64-js",
        "brotli",
        "unicode-properties",
        "unicode-trie",
        "fontkit",
      ],
    },
    optimizeDeps: {
      /*
       * React-PDF mixes ESM and CommonJS packages.
       * Pre-bundle the complete browser dependency tree so
       * CommonJS default exports are converted correctly.
       */
      include: [
        "@react-pdf/renderer",
        "@react-pdf/font",
        "@react-pdf/pdfkit",
        "@react-pdf/textkit",

        "fontkit",

        "js-md5",

        "base64-js",

        "brotli",
        "brotli/decompress",

        "unicode-properties",
        "unicode-trie",

        "linebreak",
        "png-js",

        "object-assign",
        "prop-types",
        "queue",
        "events",

        "vite-compatible-readable-stream",
      ],

      needsInterop: [
        "js-md5",

        "base64-js",

        "brotli",
        "brotli/decompress",

        "unicode-properties",
        "unicode-trie",

        "linebreak",
        "png-js",

        "object-assign",
        "prop-types",
        "queue",
      ],
    },

server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      ...(isCodexSeatbeltSandbox
        ? { watch: { useFsEvents: false, usePolling: true } }
        : {}),
    },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
