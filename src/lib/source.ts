import { loader } from "fumadocs-core/source";
import { blog as blogPosts, docs } from "fumadocs-mdx:collections/server";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: "/docs",
  plugins: [lucideIconsPlugin()],
});

export const blog = loader({
  source: toFumadocsSource(blogPosts, []),
  baseUrl: "/blog",
});
