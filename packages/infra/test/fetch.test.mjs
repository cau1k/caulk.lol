import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";

// Exercise Alchemy's actual HTTP client: builds alone never contact its state API.
const { safeFetch } = await import(new URL("./util/safe-fetch.js", import.meta.resolve("alchemy")));

test("Alchemy's dispatcher works with the deployment Node runtime", async () => {
  const server = createServer((_request, response) => response.end("ok"));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const { port } = server.address();
    const response = await safeFetch(`http://127.0.0.1:${port}`, {}, 1);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
