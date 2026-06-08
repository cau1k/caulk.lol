#!/usr/bin/env node

type Args = {
  url?: string;
  reason?: string;
  title?: string;
  tags: string[];
  source: "cli";
};

const args = parseArgs(process.argv.slice(2));
const apiKey = process.env.CAULK_LINKS_API_KEY;
const baseUrl = process.env.CAULK_LINKS_URL ?? "https://caulk.lol";

if (!args.url || !args.reason || !apiKey) {
  console.error(
    "usage: CAULK_LINKS_API_KEY=... pnpm links:add <url> --reason <text> [--title <text>] [--tags a,b]",
  );
  process.exit(1);
}

const response = await fetch(new URL("/api/links", baseUrl), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  },
  body: JSON.stringify(args),
});

const text = await response.text();
if (!response.ok) {
  console.error(text);
  process.exit(1);
}

console.log(text);

function parseArgs(values: string[]): Args {
  const parsed: Args = { tags: [], source: "cli" };
  const [url, ...rest] = values;
  parsed.url = url;

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    const next = rest[index + 1];

    if (value === "--reason" && next) {
      parsed.reason = next;
      index += 1;
      continue;
    }

    if (value === "--title" && next) {
      parsed.title = next;
      index += 1;
      continue;
    }

    if (value === "--tags" && next) {
      parsed.tags = next
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      index += 1;
    }
  }

  return parsed;
}

export {};
