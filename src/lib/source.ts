import {
  notes as notesCollection,
  posts as postsCollection,
} from "fumadocs-mdx:collections/server";
import { loader } from "fumadocs-core/source";
import { toFumadocsSource } from "fumadocs-mdx/runtime/server";

const isProd = process.env.NODE_ENV === "production";

const filteredPosts = isProd
  ? postsCollection.filter((post) => !post.draft)
  : postsCollection;

const filteredNotes = isProd
  ? notesCollection.filter((note) => !note.draft)
  : notesCollection;

export const posts = loader({
  source: toFumadocsSource(filteredPosts, []),
  baseUrl: "/posts",
});

export const notes = loader({
  source: toFumadocsSource(filteredNotes, []),
  baseUrl: "/notes",
});
