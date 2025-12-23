// Simple GitHub OAuth authentication without database
// Uses signed cookies to store session data

import { Octokit } from "octokit";

type SessionData = {
  user: {
    login: string;
    name: string;
    email: string;
    avatar_url: string;
  };
  accessToken: string;
  expiresAt: number;
};

const GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

export async function getGitHubAuthUrl(redirectUri: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state: crypto.randomUUID(),
  });

  return `${GITHUB_OAUTH_URL}?${params}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

export async function getGitHubUser(accessToken: string) {
  const octokit = new Octokit({ auth: accessToken });
  const { data: user } = await octokit.rest.users.getAuthenticated();
  return user;
}

export async function createSession(accessToken: string): Promise<SessionData> {
  const user = await getGitHubUser(accessToken);
  
  return {
    user: {
      login: user.login,
      name: user.name || user.login,
      email: user.email || "",
      avatar_url: user.avatar_url,
    },
    accessToken,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

export function encodeSession(session: SessionData): string {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

export function decodeSession(encoded: string): SessionData | null {
  try {
    const json = Buffer.from(encoded, "base64").toString("utf-8");
    const session = JSON.parse(json) as SessionData;
    
    if (session.expiresAt < Date.now()) {
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request): SessionData | null {
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(/session=([^;]+)/);
  
  if (!match) return null;
  
  return decodeSession(match[1]);
}

export function isAuthorizedUser(session: SessionData | null): boolean {
  if (!session) return false;
  
  const allowedUsername = process.env.ALLOWED_GITHUB_USERNAME || "cau1k";
  return session.user.login.toLowerCase() === allowedUsername.toLowerCase();
}
