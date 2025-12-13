import { posts as postsCollection } from "fumadocs-mdx:collections/server";
import { loader } from "fumadocs-core/source";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";

export const posts = loader({
  source: toFumadocsSource(postsCollection, []),
  baseUrl: "/posts",
});
