import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const project = {
  id: "hyprwhspr-rs",
  repo: "better-slop/hyprwhspr-rs",
  title: "hyprwhspr-rs",
  description:
    "Native speech-to-text dictation for Hyprland and Omarchy, written in Rust.",
  author: "Zero Caulk",
};

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "caulk-lol-project-readme-sync",
};

if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function fetchText(url, init) {
  const response = await fetch(url, init);
  if (response.status === 401 && init?.headers?.Authorization) {
    const retryHeaders = { ...init.headers };
    delete retryHeaders.Authorization;
    return fetchText(url, { ...init, headers: retryHeaders });
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url) {
  const text = await fetchText(url, { headers });
  return JSON.parse(text);
}

function formatFrontmatterValue(value) {
  return JSON.stringify(value);
}

function absolutizeReadmeLinks(markdown, tag) {
  const rawBase = `https://raw.githubusercontent.com/${project.repo}/${tag}`;
  const blobBase = `https://github.com/${project.repo}/blob/${tag}`;

  function resolveUrl(url, asset) {
    if (/^(https?:|mailto:|#|\/)/.test(url)) return url;
    return `${asset ? rawBase : blobBase}/${url.replace(/^\.\//, "")}`;
  }

  return markdown
    .replace(/<!--([\s\S]*?)-->/g, (_match, comment) => {
      const safeComment = comment.replaceAll("*/", "* /").trim();
      return `{/* ${safeComment} */}`;
    })
    .replace(
      /\bsrc="([^"]+)"/g,
      (_match, url) => `src="${resolveUrl(url, true)}"`,
    )
    .replace(
      /\bhref="([^"]+)"/g,
      (_match, url) => `href="${resolveUrl(url, false)}"`,
    )
    .replace(
      /(!?\[[^\]]*\]\()((?!https?:|mailto:|#|\/)[^) \n]+)(\))/g,
      (_match, prefix, url, suffix) =>
        `${prefix}${resolveUrl(url, prefix.startsWith("!"))}${suffix}`,
    );
}

const release = await fetchJson(
  `https://api.github.com/repos/${project.repo}/releases/latest`,
);
const tag = release.tag_name;
if (typeof tag !== "string" || tag.length === 0) {
  throw new Error(`Latest release for ${project.repo} did not include tag_name`);
}

const readme = await fetchText(
  `https://raw.githubusercontent.com/${project.repo}/${tag}/README.md`,
);
const syncedAt = new Date().toISOString();
const body = absolutizeReadmeLinks(readme.trim(), tag);
const output = `---
title: ${formatFrontmatterValue(project.title)}
description: ${formatFrontmatterValue(project.description)}
project: ${project.id}
author: ${formatFrontmatterValue(project.author)}
draft: false
---

{/* Synced from ${project.repo} README.md at ${tag} (${release.published_at ?? "unknown date"}). Run \`bun run projects:sync-readme\` to refresh. Last synced ${syncedAt}. */}

${body}
`;

const target = path.join(
  process.cwd(),
  "content",
  "projects",
  project.id,
  "index.mdx",
);
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, output);

console.log(`Synced ${project.repo}@${tag} README to ${target}`);
