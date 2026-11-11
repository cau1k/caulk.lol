import { adminUrl } from "@caulk.lol/env/urls";

/** The destination is captured here; the bookmarklet later runs on another site. */
export function linkShortcut(serverUrl: string) {
  const target = JSON.stringify(adminUrl(serverUrl, "/links/add"));
  return `javascript:(()=>{const p=new URLSearchParams({url:location.href,title:document.title});location.href=${target}+'?'+p.toString()})()`;
}

/** Exports keep subsequent CLI commands in the same environment and credential store. */
export function cliLogin(serverUrl: string, option: "--device-auth" | "--api-key <key>") {
  const api = new URL(serverUrl);
  if (api.origin === "https://api.caulk.lol") return `caulk auth login ${option}`;

  // Validate the supported environment before producing shell instructions.
  adminUrl(serverUrl, "/device");
  const stage = api.hostname === "dev-api.caulk.lol" ? "dev" : "local";
  return [
    `export CAULK_CONFIG_DIR="$HOME/.config/caulk-${stage}"`,
    `export CAULK_SERVER_URL=${api.origin}`,
    `caulk auth login ${option}`,
  ].join("\n");
}
