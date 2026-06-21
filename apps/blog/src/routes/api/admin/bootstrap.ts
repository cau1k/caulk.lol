import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getOwnerEmail } from "@/lib/auth-guards";
import { requireLinksDb } from "@/lib/links/queries";
import { getAppEnv, readEnvString } from "@/lib/worker-env";

const bootstrapSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).default("Zero"),
});

export const Route = createFileRoute("/api/admin/bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = readEnvString(getAppEnv(request).ADMIN_BOOTSTRAP_TOKEN);
        if (!token || request.headers.get("x-bootstrap-token") !== token) {
          return jsonResponse({ error: "Unauthorized." }, { status: 401 });
        }

        const parsed = bootstrapSchema.safeParse(await request.json());
        if (!parsed.success) {
          return jsonResponse(
            {
              error: "Invalid bootstrap payload.",
              issues: parsed.error.issues,
            },
            { status: 400 },
          );
        }

        const ownerEmail = getOwnerEmail();
        if (
          ownerEmail &&
          parsed.data.email.toLowerCase() !== ownerEmail.toLowerCase()
        ) {
          return jsonResponse(
            { error: "Email is not OWNER_EMAIL." },
            { status: 403 },
          );
        }

        const userCount = await requireLinksDb(request)
          .prepare('select count(*) as count from "user"')
          .first<{ count: number }>();

        if ((userCount?.count ?? 0) > 0) {
          return jsonResponse(
            { error: "Owner already exists." },
            { status: 409 },
          );
        }

        const created = await auth.api.signUpEmail({
          body: parsed.data,
        });

        return jsonResponse({ user: created.user }, { status: 201 });
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
