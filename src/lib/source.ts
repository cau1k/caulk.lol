import { loader } from "fumadocs-core/source";
import { posts as postsCollection } from "fumadocs-mdx:collections/server";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";

export const posts = loader({
  source: toFumadocsSource(postsCollection, []),
  baseUrl: "/posts",
});
