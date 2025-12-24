# caulk.lol

This is a Tanstack Start application generated with
[Create Fumadocs](https://github.com/fuma-nama/fumadocs).

## Development

Run development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

## Writing Blog Posts

### Option 1: Admin Interface (Recommended)

Access the admin interface at `/admin`:

1. Sign in with your GitHub account (uses better-auth OAuth)
2. Click "Create New Post"
3. Use the WYSIWYG editor or switch to raw MDX
4. Fill in title, description, tags, and content
5. Choose workflow:
   - **Draft posts** (`draft: true`): Commit directly to main branch
   - **Published posts** (`draft: false`): Create a pull request for review
6. Submit to create PR or commit directly

**Requirements:**
- GitHub OAuth app (client ID and secret)
- GitHub personal access token with repo permissions
- Set environment variables (see `.env.example`)

**Features:**
- Better-auth 1.4 database-less OAuth (secure session handling)
- Tiptap WYSIWYG editor with toggle to raw MDX
- Zod validation for input
- Draft mode: commits directly to main
- Published mode: creates PR for review

### Option 2: GitHub Mobile

You can also write blog posts from your phone using GitHub's mobile interface:

1. Open the GitHub mobile app or visit github.com on your phone
2. Navigate to this repository: `cau1k/caulk.lol`
3. Go to the `content/posts/` directory
4. Tap the `+` button to create a new file
5. Name your file `post-title.mdx`
6. Write your post in MDX format with frontmatter:

```mdx
---
title: Post Title
description: Post description
author: Caulk
date: "2025-12-23T15:00:00-05:00"
draft: false
tags: [tag1, tag2]
---

## Your Content

Write your post content here using Markdown.
```

7. Commit directly to the `main` branch
8. Your post will be automatically deployed via CI

## Architecture

The site uses Server-Side Rendering (SSR) with Tanstack Start, so posts are rendered dynamically from the git-tracked content in `content/posts/`.

Authentication is handled by better-auth 1.4 with GitHub OAuth in database-less/stateless mode using secure cookie-based sessions.
