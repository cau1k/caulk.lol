import {
  rehypeToc,
  remarkHeading,
  remarkMdxMermaid,
} from "fumadocs-core/mdx-plugins";
import {
  defineCollections,
  defineConfig,
  frontmatterSchema,
} from "fumadocs-mdx/config";
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
