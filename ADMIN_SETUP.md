# Admin Interface Setup Guide

This guide explains how to set up the admin interface for creating blog posts with better-auth GitHub OAuth authentication.

## Overview

The admin interface (`/admin`) provides a WYSIWYG editor (Tiptap) for creating blog posts. Authentication is handled by better-auth 1.4 in database-less mode with secure cookie-based sessions.

## Features

- **Better-auth 1.4**: Secure, database-less OAuth with GitHub
- **WYSIWYG Editor**: Tiptap editor with toggle to raw MDX
- **Zod Validation**: Proper input validation
- **Draft Mode**: Commits directly to main
- **Published Mode**: Creates PR for review
- **Mobile-Friendly**: Works on phone browsers

## Setup Steps

### 1. Create a GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: caulk.lol Admin
   - **Homepage URL**: `https://caulk.lol` (or `http://localhost:3000` for development)
   - **Authorization callback URL**: `https://caulk.lol/api/auth/callback/github` (or `http://localhost:3000/api/auth/callback/github`)
4. Click "Register application"
5. Note your **Client ID** and generate a **Client Secret**

### 2. Create a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "caulk.lol Admin"
4. Select scopes:
   - `repo` (Full control of private repositories)
5. Generate and copy the token

### 3. Configure Environment Variables

Create a `.env` file (or set environment variables in your deployment platform):

```bash
# GitHub OAuth (better-auth)
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here

# GitHub API
GITHUB_TOKEN=your_personal_access_token_here
GITHUB_REPO_OWNER=cau1k
GITHUB_REPO_NAME=caulk.lol

# Admin authentication
ALLOWED_GITHUB_USERNAME=cau1k

# Existing variables
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
ALCHEMY_STATE_TOKEN=...
STAGE=prod
```

### 4. Deploy

Deploy your site with the new environment variables configured.

## Usage

### Accessing the Admin Interface

1. Navigate to `https://caulk.lol/admin` (or `http://localhost:3000/admin` for development)
2. Click "Sign in with GitHub"
3. Authorize the OAuth app
4. You'll be redirected to the admin dashboard

### Creating a New Post

1. Click "Create New Post" from the admin dashboard
2. Fill in the form:
   - **Title**: The title of your post (auto-generates slug)
   - **Slug**: URL-friendly identifier
   - **Description**: Brief summary of the post
   - **Tags**: Comma-separated list of tags
   - **Draft**: Check to mark as draft
   - **Content**: Use WYSIWYG editor or toggle to raw MDX
3. Submit:
   - **If draft is checked**: Post commits directly to main branch (immediate publish)
   - **If draft is unchecked**: Creates a pull request for review
4. For PRs: Review and merge the PR on GitHub to publish

### Using the WYSIWYG Editor

The Tiptap editor provides:
- Rich text formatting (Bold, Italic, Headings)
- Lists (bullet and numbered)
- Code blocks
- Toggle to raw Markdown/MDX for advanced editing

Use the toolbar buttons to format your content, or click "Switch to Raw MDX" to edit the markdown directly.

### Draft vs. Published Posts

- **Draft posts** (`draft: true`): 
  - Commit directly to main branch
  - No PR created
  - Immediately available on the site
  - Useful for quick posts or work-in-progress content
  
- **Published posts** (`draft: false`):
  - Creates a pull request
  - Allows for review before publishing
  - Merge PR to publish the post
  - Recommended for finalized content

## Security

- **Better-auth 1.4**: Industry-standard OAuth implementation with CSRF protection
- **Secure Sessions**: Cookie-based sessions with proper signing (not base64!)
- **User Authorization**: Only the specified GitHub user can access admin panel
- **Input Validation**: Zod schemas validate all user input
- **Draft/PR Workflow**: Control over what commits directly vs. needs review

## Troubleshooting

### "Unauthorized" Error

Make sure your GitHub username matches the `ALLOWED_GITHUB_USERNAME` environment variable.

### OAuth Callback Fails

Check that your OAuth app callback URL matches your deployment URL:
- Development: `http://localhost:3000/api/auth/callback/github`
- Production: `https://caulk.lol/api/auth/callback/github`

### PR Creation Fails

Verify that:
- Your `GITHUB_TOKEN` has `repo` permissions
- The repository owner and name are correct in environment variables
- The token hasn't expired

## Mobile Usage

The admin interface is fully mobile-optimized:
1. Open `https://caulk.lol/admin` on your phone browser
2. Sign in with GitHub
3. Use the WYSIWYG editor (works great on mobile)
4. Create posts and PRs from your phone

The Tiptap editor is touch-friendly and the interface is responsive for mobile screens.
