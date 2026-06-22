import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/$")({
  beforeLoad: ({ location, params }) => {
    const url = shortcutUrlFromPath(params._splat, location.searchStr, location.hash);
    if (!url) throw notFound();

    throw redirect({
      to: "/links/add",
      search: { url },
    });
  },
});

const bareDomainPattern = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i;

function shortcutUrlFromPath(
  splat: string | undefined,
  searchStr: string,
  hash: string,
): string | undefined {
  const pathValue = splat?.trim();
  if (!pathValue) return undefined;

  return parseShortcutUrl(`${normalizeProtocolSlashes(pathValue)}${searchStr}${hash}`);
}

function parseShortcutUrl(value: string): string | undefined {
  const candidate = addSchemeToBareDomain(value.trim());
  if (!URL.canParse(candidate)) return undefined;

  const url = new URL(candidate);
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;

  return url.toString();
}

function addSchemeToBareDomain(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (bareDomainPattern.test(value)) return `https://${value}`;
  return value;
}

function normalizeProtocolSlashes(value: string): string {
  if (value.startsWith("https:/") && !value.startsWith("https://")) {
    return `https://${value.slice("https:/".length).replace(/^\/+/, "")}`;
  }

  if (value.startsWith("http:/") && !value.startsWith("http://")) {
    return `http://${value.slice("http:/".length).replace(/^\/+/, "")}`;
  }

  return value;
}
