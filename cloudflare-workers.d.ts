declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    ASSETS?: Fetcher;
    IMAGES?: unknown;
    [key: string]: unknown;
  };
}
