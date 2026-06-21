import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/bootstrap")({
  server: {
    handlers: {
      POST: async () =>
        jsonResponse({ error: "Bootstrap is disabled. Sign in with email OTP." }, { status: 410 }),
    },
  },
});

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}
