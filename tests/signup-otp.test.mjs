import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { test } from "node:test";
import { chromium } from "@playwright/test";

const app = "http://127.0.0.1:4173";
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  identities: [{ provider: "email" }],
  email: "student@example.test",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Test Student" },
  created_at: "2026-01-01T00:00:00Z",
};
const confirmed = { ...user, email_confirmed_at: user.created_at };
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const mockAccess = [
  encode({ alg: "HS256", typ: "JWT" }),
  encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
  "mock-signature",
].join(".");

test("student signup requires OTP and keeps the confirmed browser session", { timeout: 90000 }, async t => {
  let consumed = false;
  let resent = false;
  let signupCount = 0;
  const provider = createServer(async (request, response) => {
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    const headers = {
      "access-control-allow-origin": app,
      "access-control-allow-headers": request.headers["access-control-request-headers"] ?? "",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "content-type": "application/json",
    };
    const send = (status, body) => response.writeHead(status, headers).end(JSON.stringify(body));
    if (request.method === "OPTIONS") return send(200, {});
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : {};
    if (path === "/auth/v1/signup") {
      signupCount++;
      if (body.email !== user.email || "role" in (body.data ?? {})) return send(400, {});
      return send(200, user);
    }
    if (path === "/auth/v1/resend") {
      resent = body.type === "signup" && body.email === user.email;
      return send(200, {});
    }
    if (path === "/auth/v1/verify") {
      if (consumed || !resent || body.type !== "signup" || body.email !== user.email || body.token !== "12345678") {
        return send(403, { code: "otp_expired", msg: "Token has expired or is invalid" });
      }
      consumed = true;
      return send(200, {
        user: confirmed,
        access_token: mockAccess,
        refresh_token: "mock-refresh",
        token_type: "bearer",
        expires_in: 3600,
      });
    }
    if (path === "/auth/v1/user") {
      return request.headers.authorization === `Bearer ${mockAccess}`
        ? send(200, confirmed)
        : send(401, { code: "session_not_found" });
    }
    if (path === "/rest/v1/profiles") return send(200, [{ full_name: "Test Student", role: "Student" }]);
    return send(200, request.headers.accept === "application/vnd.pgrst.object+json" ? {} : []);
  });
  provider.listen(54321, "127.0.0.1");
  await once(provider, "listening");
  t.after(() => provider.close());

  const browser = await chromium.launch({ executablePath: process.env.SIGNUP_CHROMIUM });
  t.after(() => browser.close());
  // The deployed CSP allows the production provider. This test substitutes loopback.
  const context = await browser.newContext({ bypassCSP: true });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  await page.goto(`${app}/dashboard`);
  assert.equal(new URL(page.url()).pathname, "/");
  await page.getByRole("button", { name: "Essential only" }).click();
  await page.locator(".ccLandingV2RegisterButton").click();
  await page.getByPlaceholder("Enter your full name").fill("Test Student");
  await page.getByPlaceholder("you@college.edu").fill(user.email);
  await page.getByPlaceholder("Minimum 6 characters").fill("local-fixture-password");
  await page.clock.install();
  await page.getByRole("button", { name: "Create Student account" }).click();
  await page.waitForURL(url => url.pathname === "/auth/verify-otp", { timeout: 15000 })
    .catch(async error => {
      const failure = await page.locator(".authError").allTextContents();
      throw new Error(`Signup did not reach verification (mock requests: ${signupCount}). ${failure.join(" ")}`, { cause: error });
    });
  assert.equal(signupCount, 1);
  const protectedPage = await context.newPage();
  await protectedPage.goto(`${app}/dashboard`);
  assert.equal(new URL(protectedPage.url()).pathname, "/");
  await protectedPage.close();

  const code = page.locator("#otp-code");
  const verify = page.getByRole("button", { name: "Verify account" });
  for (const invalid of ["11111111", "12345678", "33333333", "44444444", "55555555"]) {
    await code.fill(invalid);
    await verify.click();
    await page.getByText(/incorrect, expired, or already used|Attempt limit reached/).waitFor();
  }
  await page.getByText(/Attempt limit reached/).waitFor();
  await code.fill("12345678");
  assert.equal(await verify.isDisabled(), true);
  await page.clock.runFor(62000);
  await page.getByRole("button", { name: /^Resend code$/i }).click();
  await page.getByText("A new verification code has been sent.").waitFor();
  assert.equal(resent, true);
  await code.fill("12345678");
  await verify.click();
  await page.getByText("Verification complete", { exact: true }).waitFor();
  await page.clock.runFor(3000);
  await page.waitForURL("**/dashboard");
  await page.reload();
  await page.getByText("Test Student", { exact: true }).first().waitFor({ state: "attached" });
  assert.equal(new URL(page.url()).pathname, "/dashboard");
  assert.equal(await page.getByRole("heading", { name: "Sign in to continue" }).count(), 0);

  const other = await browser.newContext({ bypassCSP: true });
  await other.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
  const replay = await other.newPage();
  await replay.goto(`${app}/auth/verify-otp?email=${encodeURIComponent(user.email)}`);
  await replay.getByRole("button", { name: "Essential only" }).click();
  await replay.locator("#otp-code").fill("12345678");
  await replay.getByRole("button", { name: "Verify account" }).click();
  await replay.getByText(/incorrect, expired, or already used/).waitFor();
  await other.close();
});
