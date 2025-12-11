import { loader } from "fumadocs-core/source";
import { blog as blogPosts } from "fumadocs-mdx:collections/server";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";

export const blog = loader({
  source: toFumadocsSource(blogPosts, []),
  baseUrl: "/blog",
});
