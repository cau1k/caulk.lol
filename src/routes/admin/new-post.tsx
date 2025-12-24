import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@/lib/auth-client";
import { Octokit } from "octokit";
import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { z } from "zod";

// Zod validation schema
const CreatePostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  content: z.string().min(1, "Content is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  tags: z.array(z.string()),
  draft: z.boolean(),
});

type CreatePostInput = z.infer<typeof CreatePostSchema>;

type CreatePostResult = {
  prUrl?: string;
  prNumber?: number;
  commitUrl?: string;
  isDraft: boolean;
};

const createPost = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return CreatePostSchema.parse(data);
  })
  .handler(async ({ data }): Promise<CreatePostResult> => {
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
author: ${process.env.ALLOWED_GITHUB_USERNAME || "cau1k"}
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
  component: NewPostPage,
  beforeLoad: async ({ context }) => {
    const session = (context as any).session;
    if (!session) {
      throw redirect({ to: "/admin/login" });
    }
  },
});

function NewPostPage() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [tags, setTags] = useState("");
  const [draft, setDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [rawContent, setRawContent] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write your post content here...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4",
      },
    },
    onUpdate: ({ editor }) => {
      if (!showRaw) {
        setRawContent(editor.storage.markdown?.getMarkdown?.() || editor.getText());
      }
    },
  });

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

  const toggleEditor = () => {
    if (!editor) return;
    
    if (showRaw) {
      // Switching from raw to WYSIWYG
      editor.commands.setContent(rawContent);
    } else {
      // Switching from WYSIWYG to raw
      setRawContent(editor.getHTML());
    }
    setShowRaw(!showRaw);
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

      const content = showRaw ? rawContent : (editor?.getHTML() || "");

      const result = await createPost({
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
      if (err instanceof z.ZodError) {
        setError(err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", "));
      } else {
        setError(err instanceof Error ? err.message : "Failed to create post");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create New Post</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Write your post and create a PR or commit directly to main
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {session.user.name}
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
            <div className="flex items-center gap-2 mb-2">
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
            <p className="text-xs text-muted-foreground">
              Draft posts commit directly to main (no PR). Non-draft posts create a PR for review.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">
                Content *
              </label>
              <button
                type="button"
                onClick={toggleEditor}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {showRaw ? "Switch to WYSIWYG" : "Switch to Raw MDX"}
              </button>
            </div>
            
            {showRaw ? (
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                required
                rows={20}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 font-mono text-sm"
                placeholder="Write in raw Markdown/MDX format..."
              />
            ) : (
              <div className="rounded-lg border border-border bg-background">
                <div className="border-b border-border p-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`px-3 py-1 rounded text-sm ${editor?.isActive("bold") ? "bg-accent" : ""}`}
                  >
                    Bold
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`px-3 py-1 rounded text-sm ${editor?.isActive("italic") ? "bg-accent" : ""}`}
                  >
                    Italic
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`px-3 py-1 rounded text-sm ${editor?.isActive("heading", { level: 2 }) ? "bg-accent" : ""}`}
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`px-3 py-1 rounded text-sm ${editor?.isActive("bulletList") ? "bg-accent" : ""}`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    className={`px-3 py-1 rounded text-sm ${editor?.isActive("codeBlock") ? "bg-accent" : ""}`}
                  >
                    Code
                  </button>
                </div>
                <EditorContent editor={editor} />
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Use the WYSIWYG editor or switch to raw Markdown/MDX format.
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
            <button
              type="button"
              onClick={() => navigate({ to: "/admin" })}
              className="rounded-lg border border-border px-6 py-2 font-semibold transition-colors hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
