import {
  notes as notesCollection,
  posts as postsCollection,
  projects as projectsCollection,
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

const filteredProjectDocs = isProd
  ? projectsCollection.docs.filter((page) => !page.draft)
  : projectsCollection.docs;

export const posts = loader({
  source: toFumadocsSource(filteredPosts, []),
  baseUrl: "/posts",
});

export const notes = loader({
  source: toFumadocsSource(filteredNotes, []),
  baseUrl: "/notes",
});

export const projects = loader({
  source: toFumadocsSource(filteredProjectDocs, projectsCollection.meta),
  baseUrl: "/projects",
});
