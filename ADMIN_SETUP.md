# Admin Interface Setup

This site includes a Decap CMS admin interface for managing blog posts from any device, including phones.

## Access the Admin

Visit `/admin` or `/admin/index.html` to access the content management interface.

## Setup Required

To use the admin interface, you need to set up GitHub OAuth:

### 1. Create a GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: caulk.lol CMS
   - **Homepage URL**: https://caulk.lol
   - **Authorization callback URL**: https://caulk.lol/api/auth/callback
4. Click "Register application"
5. Note your **Client ID** and generate a **Client Secret**

### 2. Configure Environment Variables

Add the following to your `.env` file (or Cloudflare Workers secrets):

```bash
GITHUB_OAUTH_CLIENT_ID=your_client_id_here
GITHUB_OAUTH_CLIENT_SECRET=your_client_secret_here
```

For Cloudflare Workers, set these as secrets:

```bash
npx wrangler secret put GITHUB_OAUTH_CLIENT_ID
npx wrangler secret put GITHUB_OAUTH_CLIENT_SECRET
```

### 3. Deploy

After setting up the OAuth app and environment variables, deploy your site. The admin interface will be available at `/admin`.

## Writing Posts from Your Phone

1. Open https://caulk.lol/admin on your phone's browser
2. Click "Login with GitHub"
3. Authorize the app
4. You'll see a list of your blog posts
5. Click "New Post" to create a new post
6. Fill in the title, description, tags, and content
7. Click "Publish" to commit the new post directly to GitHub
8. The site will automatically rebuild and deploy your new post

## Post Format

Posts are stored as MDX files in `content/posts/` with the following frontmatter:

```yaml
---
title: Post Title
description: A brief description
author: Caulk
date: "2025-12-23T12:00:00-05:00"
draft: false
tags: [tag1, tag2]
---
```

## Alternative: GitHub Mobile

If you prefer not to set up OAuth, you can also write posts directly using:
- GitHub's mobile website (github.com)
- GitHub's mobile app
- Navigate to `content/posts/` and create a new `.mdx` file
