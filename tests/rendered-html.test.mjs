import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to allocate a test port."));
        return;
      }
      const port = address.port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

test("serves the built homepage with CampusConnect metadata", {
  timeout: 60000,
}, async t => {
  const port = await getAvailablePort();
  const cli = path.resolve("node_modules/wrangler/bin/wrangler.js");

  const child = spawn(process.execPath, [
    cli,
    "dev",
    "--config", "dist/server/wrangler.json",
    "--local",
    "--ip", "127.0.0.1",
    "--port", String(port),
    "--compatibility-date", "2026-05-22",
  ], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  let logs = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", chunk => { logs += chunk; });
  child.stderr.on("data", chunk => { logs += chunk; });

  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await Promise.race([
        new Promise(resolve => child.once("exit", resolve)),
        delay(3000),
      ]);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }
  });

  const deadline = Date.now() + 45000;
  let response;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Wrangler exited before serving the homepage:\n${logs.slice(-10000)}`);
    }

    try {
      response = await fetch(`http://127.0.0.1:${port}/`, {
        headers: { accept: "text/html" },
        signal: AbortSignal.timeout(1500),
      });
      break;
    } catch {
      await delay(400);
    }
  }

  assert.ok(response, `Homepage did not start in time:\n${logs.slice(-10000)}`);
  assert.equal(response.status, 200, `Unexpected homepage response:\n${logs.slice(-10000)}`);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title\b[^>]*>[^<]*CampusConnect Pro/i);
  assert.match(html, /<meta\b[^>]*name=["']viewport["'][^>]*>/i);
});
