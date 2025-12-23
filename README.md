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

## Writing Blog Posts from Mobile

You can write blog posts from your phone using GitHub's mobile interface:

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

The site uses Server-Side Rendering (SSR) with Tanstack Start, so posts are rendered dynamically from the git-tracked content in `content/posts/`.
