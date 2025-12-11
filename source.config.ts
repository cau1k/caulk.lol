import {
  defineConfig,
  defineCollections,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import { z } from "zod";

export const blog = defineCollections({
  type: "doc",
  dir: "content/blog",
  schema: frontmatterSchema.extend({
    author: z.string().optional(),
    date: z.string().date().or(z.date()).optional(),
  }),
});

export default defineConfig();
