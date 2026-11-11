/** Admin navigation and bookmarks follow the API environment configured by Alchemy. */
export function adminUrl(serverUrl: string, pathname: string) {
  const url = new URL(serverUrl);
  if (url.hostname === "api.caulk.lol") return `https://admin.caulk.lol${pathname}`;
  if (url.hostname === "dev-api.caulk.lol") return `https://dev-admin.caulk.lol${pathname}`;
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    url.port = "3002";
    url.pathname = pathname;
    return url.href;
  }
  throw new Error(`Unknown API host for admin redirect: ${url.hostname}`);
}
