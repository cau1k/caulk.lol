import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuthRequest(request),
      POST: async ({ request }) => handleAuthRequest(request),
    },
  },
});

async function handleAuthRequest(request: Request): Promise<Response> {
  const { getAuth } = await import("@/lib/auth");
  return getAuth(request).handler(request);
}
