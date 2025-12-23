import { createAPIFileRoute } from "@tanstack/react-start/api";

// OAuth callback handler for Decap CMS
export const Route = createAPIFileRoute("/api/auth/callback")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response("Missing code parameter", { status: 400 });
    }

    // Exchange code for access token
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "OAuth not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    try {
      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
          }),
        },
      );

      const data = (await tokenResponse.json()) as {
        access_token?: string;
        error?: string;
      };

      // Send message to opener window (Decap CMS)
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authenticating...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .message {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="message">
    <p>✓ Authenticated successfully!</p>
    <p><small>You can close this window now.</small></p>
  </div>
  <script>
    (function() {
      function receiveMessage(e) {
        console.log("Received message from opener:", e);
        window.opener.postMessage(
          'authorization:github:success:${JSON.stringify(data)}',
          e.origin
        );
        window.removeEventListener("message", receiveMessage, false);
      }
      window.addEventListener("message", receiveMessage, false);
      
      console.log("Sending authorization message to opener");
      window.opener.postMessage("authorizing:github", "*");
    })();
  </script>
</body>
</html>
      `;

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      console.error("OAuth error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
