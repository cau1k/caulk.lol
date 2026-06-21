import type { ShikiTransformer } from "@shikijs/types";
import {
  rehypeCodeDefaultOptions,
  rehypeToc,
  remarkHeading,
  remarkMdxMermaid,
} from "fumadocs-core/mdx-plugins";
import {
  applyMdxPreset,
  defineCollections,
  defineConfig,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import { transformerTwoslash } from "fumadocs-twoslash";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { z } from "zod";
import { monoGlowLightTheme, monoGlowTheme } from "./src/lib/monoglow-theme";
import { rehypeExternalRef } from "./src/lib/rehype-external-ref";

const codeLanguageTransformer = {
  name: "code-language-attribute",
  pre(hast) {
    const language = this.options.lang;
    if (!language) return;

    hast.properties["data-language"] = language;
  },
} satisfies ShikiTransformer;

const sharedMdxOptions = applyMdxPreset({
  remarkPlugins: [remarkMath, remarkMdxMermaid, remarkHeading],
  rehypePlugins: [
    rehypeKatex,
    [rehypeToc, { exportToc: true }],
    [rehypeExternalRef, { exclude: ["caulk.lol", "localhost", "github.com"] }],
  ],
  rehypeCodeOptions: {
    ...rehypeCodeDefaultOptions,
    themes: {
      light: monoGlowLightTheme,
      dark: monoGlowTheme,
    },
    transformers: [
      codeLanguageTransformer,
      ...(rehypeCodeDefaultOptions.transformers ?? []),
      transformerTwoslash({
        typesCache: createFileSystemTypesCache(),
      }),
    ],
  },
});

export const posts = defineCollections({
  type: "doc",
  dir: "content/posts",
  schema: frontmatterSchema.extend({
    author: z.string().optional(),
    date: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
    draft: z.boolean(),
    tags: z.array(z.string().trim()).default([]),
  }),
  postprocess: {
    includeProcessedMarkdown: true,
  },
  mdxOptions: sharedMdxOptions,
});

export default defineConfig();
