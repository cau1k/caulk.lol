import { createFileRoute } from "@tanstack/react-router";
import {
  getGitHubAuthUrl,
  exchangeCodeForToken,
  createSession,
  encodeSession,
} from "@/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const action = params._ || "";

        // Start OAuth flow
        if (action === "github") {
          const redirectUri = `${url.origin}/api/auth/callback`;
          const authUrl = await getGitHubAuthUrl(redirectUri);
          return Response.redirect(authUrl);
        }

        // OAuth callback
        if (action === "callback") {
          const code = url.searchParams.get("code");
          
          if (!code) {
            return Response.redirect("/admin/login?error=no_code");
          }

          try {
            const redirectUri = `${url.origin}/api/auth/callback`;
            const accessToken = await exchangeCodeForToken(code, redirectUri);
            const session = await createSession(accessToken);
            const sessionCookie = encodeSession(session);

            return new Response(null, {
              status: 302,
              headers: {
                Location: "/admin",
                "Set-Cookie": `session=${sessionCookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
              },
            });
          } catch (error) {
            console.error("OAuth callback error:", error);
            return Response.redirect("/admin/login?error=auth_failed");
          }
        }

        // Logout
        if (action === "logout") {
          return new Response(null, {
            status: 302,
            headers: {
              Location: "/",
              "Set-Cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            },
          });
        }

        return new Response("Not found", { status: 404 });
      },
    },
  },
});

