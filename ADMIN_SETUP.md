# Admin Interface Setup

This site includes a Decap CMS admin interface for managing blog posts from any device, including phones. The CMS is loaded from a CDN (no npm installation required) and provides a mobile-optimized interface.

## Access the Admin

Visit `https://caulk.lol/admin/` to access the content management interface.

## Quick Start Options

### Option 1: Use GitHub's Native Interface (Easiest)

The simplest way to write posts from your phone:

1. Open the GitHub mobile app or https://github.com/cau1k/caulk.lol on your phone
2. Navigate to `content/posts/`
3. Click the "+" button to create a new file
4. Name it `my-post-title.mdx`
5. Write your post with frontmatter (see format below)
6. Commit directly to the `main` branch
7. The site will automatically rebuild and deploy

### Option 2: Use Decap CMS with OAuth (Better UX)

For a user-friendly interface optimized for mobile, set up Decap CMS with GitHub OAuth:

#### Step 1: Choose an OAuth Provider

Since this site runs on Cloudflare Workers, you need an external OAuth provider. Options:

**A. Use a Free OAuth Gateway Service:**
   - [Decap CMS OAuth Provider on Render](https://github.com/StaticJsCMS/static-cms-proxy-server) (recommended)
   - [Cloudflare Workers OAuth Provider](https://github.com/i40west/netlify-cms-cloudflare-pages)
   - Deploy one of these to Vercel/Netlify/Render for free

**B. Set Up Your Own OAuth Gateway:**
   - See [Decap CMS OAuth Documentation](https://decapcms.org/docs/authentication-backends/#github-backend)

#### Step 2: Create a GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: caulk.lol CMS
   - **Homepage URL**: https://caulk.lol
   - **Authorization callback URL**: Use the callback URL from your OAuth provider (e.g., `https://your-oauth-gateway.vercel.app/callback`)
4. Click "Register application"
5. Note your **Client ID** and generate a **Client Secret**

#### Step 3: Configure Your OAuth Provider

Follow the setup instructions for your chosen OAuth provider to configure it with your GitHub OAuth App credentials.

#### Step 4: Update Decap CMS Configuration

Edit `public/admin/config.yml` and update the backend section:

```yaml
backend:
  name: github
  repo: cau1k/caulk.lol
  branch: main
  base_url: https://your-oauth-provider.vercel.app  # Your OAuth gateway URL
  auth_endpoint: /auth                               # Usually /auth or /oauth/authorize
```

#### Step 5: Deploy and Use

1. Commit your changes and push to GitHub
2. Visit https://caulk.lol/admin/ on any device
3. Click "Login with GitHub"
4. Authorize the app
5. Start writing posts with the visual editor!

### Option 3: Use Test Backend (Local Development Only)

For local testing without setting up OAuth:

1. Edit `public/admin/config.yml`
2. Change the backend to:
   ```yaml
   backend:
     name: test-repo
   ```
3. Access http://localhost:3000/admin/ during development
4. Note: This won't save to GitHub, it's for testing the UI only

## Post Format

Posts are MDX files in `content/posts/` with YAML frontmatter:

```mdx
---
title: My Awesome Post
description: A brief description of the post
author: Caulk
date: "2025-12-23T12:00:00-05:00"
draft: false
tags: [tech, programming]
---

## Your Content Here

Write your blog post content in **Markdown** or MDX format.

You can use React components, code blocks, and all MDX features!
```

## Mobile Writing Tips

- **Decap CMS**: Provides a rich text editor with preview, making it easy to write on mobile
- **GitHub Mobile**: Good for quick edits and simple posts
- **GitHub.dev**: Press `.` on any GitHub page to open VS Code in the browser - great for mobile writing!

## Recommended Setup

For the best mobile writing experience, we recommend:
1. Set up Option 2 (Decap CMS with OAuth) for the best UX
2. Use GitHub's mobile app (Option 1) as a backup for quick edits
3. For longer posts, use GitHub.dev for a full editor experience
