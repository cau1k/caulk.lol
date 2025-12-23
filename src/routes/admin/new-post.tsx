import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSessionFromRequest, isAuthorizedUser } from "@/lib/auth";
import { Octokit } from "octokit";
import { useState } from "react";

type LoaderData = {
  user: {
    login: string;
    name: string;
    avatar_url: string;
  };
};

type CreatePRInput = {
  title: string;
  description: string;
  content: string;
  slug: string;
  tags: string[];
  draft: boolean;
};

type CreatePRResult = {
  prUrl?: string;
  prNumber?: number;
  commitUrl?: string;
  isDraft: boolean;
};

const checkAuth = createServerFn({ method: "GET" }).handler(
  async ({ request }): Promise<LoaderData> => {
    const session = getSessionFromRequest(request);

    if (!session || !isAuthorizedUser(session)) {
      return Response.redirect("/admin/login") as never;
    }

    return { user: session.user };
  }
);

const createPR = createServerFn({ method: "POST" })
  .inputValidator((data: CreatePRInput) => data)
  .handler(async ({ data, request }): Promise<CreatePRResult> => {
    const session = getSessionFromRequest(request);

    if (!session || !isAuthorizedUser(session)) {
      throw new Error("Unauthorized");
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const repo = {
      owner: process.env.GITHUB_REPO_OWNER || "cau1k",
      repo: process.env.GITHUB_REPO_NAME || "caulk.lol",
    };

    // Get the default branch
    const { data: repoData } = await octokit.rest.repos.get(repo);
    const baseBranch = repoData.default_branch;

    // Create the MDX file content
    const now = new Date().toISOString();
    const mdxContent = `---
title: ${data.title}
description: ${data.description}
author: ${session.user.name}
date: "${now}"
draft: ${data.draft}
tags: [${data.tags.join(", ")}]
---

${data.content}
`;

    // If draft is true, commit directly to main
    if (data.draft) {
      const { data: commit } = await octokit.rest.repos.createOrUpdateFileContents({
        ...repo,
        path: `content/posts/${data.slug}.mdx`,
        message: `Add draft post: ${data.title}`,
        content: Buffer.from(mdxContent).toString("base64"),
        branch: baseBranch,
      });

      return {
        commitUrl: commit.commit.html_url,
        isDraft: true,
      };
    }

    // Otherwise, create a PR for non-draft posts
    // Get the latest commit SHA from main
    const { data: refData } = await octokit.rest.git.getRef({
      ...repo,
      ref: `heads/${baseBranch}`,
    });

    const baseSha = refData.object.sha;

    // Create a new branch
    const branchName = `post/${data.slug}-${Date.now()}`;
    await octokit.rest.git.createRef({
      ...repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    // Create the file
    await octokit.rest.repos.createOrUpdateFileContents({
      ...repo,
      path: `content/posts/${data.slug}.mdx`,
      message: `Add new post: ${data.title}`,
      content: Buffer.from(mdxContent).toString("base64"),
      branch: branchName,
    });

    // Create a pull request
    const { data: pr } = await octokit.rest.pulls.create({
      ...repo,
      title: `New post: ${data.title}`,
      head: branchName,
      base: baseBranch,
      body: `## New Blog Post

**Title:** ${data.title}
**Description:** ${data.description}
**Tags:** ${data.tags.join(", ")}

This PR was created automatically from the admin interface.`,
    });

    return { 
      prUrl: pr.html_url, 
      prNumber: pr.number,
      isDraft: false,
    };
  });

export const Route = createFileRoute("/admin/new-post")({
  loader: () => checkAuth(),
  component: NewPostPage,
});

function NewPostPage() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [draft, setDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate slug from title
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(newTitle));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const result = await createPR({
        data: {
          title,
          description,
          content,
          slug,
          tags: tagsArray,
          draft,
        },
      });

      if (result.isDraft) {
        alert(
          `Draft post committed directly to main!\n\nCommit: ${result.commitUrl}\n\nYour draft post is now live on the site.`
        );
      } else {
        alert(
          `Pull request created successfully! PR #${result.prNumber}\n\n${result.prUrl}\n\nReview and merge the PR to publish your post.`
        );
      }
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create New Post</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Write your post and create a PR to merge it into main
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {data.user.name} (@{data.user.login})
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
              placeholder="My Awesome Post"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-2">
              Slug *
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
              placeholder="my-awesome-post"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The URL path for this post: /posts/{slug || "your-slug"}
            </p>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-2"
            >
              Description *
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
              placeholder="A brief description of your post"
            />
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium mb-2">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
              placeholder="tech, programming, ai (comma-separated)"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <input
                id="draft"
                type="checkbox"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
                className="rounded border border-border"
              />
              <label htmlFor="draft" className="text-sm font-medium">
                Save as draft
              </label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Draft posts commit directly to main (no PR). Non-draft posts create a PR for review.
            </p>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium mb-2">
              Content *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={20}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 font-mono text-sm"
              placeholder="## Your First Heading

Write your post content here using Markdown...

You can use:
- **Bold text**
- *Italic text*
- [Links](https://example.com)
- Code blocks
- And more!"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Write in Markdown format. Supports MDX features.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting 
                ? (draft ? "Committing..." : "Creating PR...") 
                : (draft ? "Commit to Main" : "Create Pull Request")}
            </button>
            <Link
              to="/admin"
              className="rounded-lg border border-border px-6 py-2 font-semibold transition-colors hover:bg-accent inline-block"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

