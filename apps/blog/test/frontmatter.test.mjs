import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { parse } from "yaml";

test("every post explicitly declares its publication state", async () => {
  const directory = new URL("../content/posts/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".mdx"));
  await Promise.all(
    files.map(async (name) => {
      const source = await readFile(new URL(name, directory), "utf8");
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      assert.ok(frontmatter, `${name}: missing frontmatter`);
      assert.equal(
        typeof parse(frontmatter[1]).draft,
        "boolean",
        `${name}: draft must be explicit`,
      );
    }),
  );
});
