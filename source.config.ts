import {
  defineConfig,
  defineCollections,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import {
  remarkMdxMermaid,
  remarkHeading,
  rehypeToc,
} from "fumadocs-core/mdx-plugins";
import { z } from "zod";

export const posts = defineCollections({
  type: "doc",
  dir: "content/posts",
  schema: frontmatterSchema.extend({
    author: z.string().optional(),
    date: z.coerce.date().optional(),
    tags: z.array(z.string().trim().toLowerCase()).default([]),
  }),
  postprocess: {
    includeProcessedMarkdown: true,
  },
  mdxOptions: {
    remarkPlugins: [remarkMdxMermaid, remarkHeading],
    rehypePlugins: [[rehypeToc, { exportToc: true }]],
  },
});

export default defineConfig();
