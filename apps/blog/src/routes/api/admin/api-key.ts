import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getOwnerSession } from "@/lib/auth-guards";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(48).default("good links client"),
});

export const Route = createFileRoute("/api/admin/api-key")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getOwnerSession(request);
        if (!session) {
          return jsonResponse({ error: "Unauthorized." }, { status: 401 });
        }

        const parsed = createApiKeySchema.safeParse(await request.json());
        if (!parsed.success) {
          return jsonResponse(
            { error: "Invalid API key payload.", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        const key = await getAuth(request).api.createApiKey({
          body: {
            name: parsed.data.name,
            userId: session.user.id,
            prefix: "caulk_",
            permissions: {
              links: ["write"],
            },
            metadata: {
              purpose: "good-links",
            },
          },
        });

        return jsonResponse({ key }, { status: 201 });
      },
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
