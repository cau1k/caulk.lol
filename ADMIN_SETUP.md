# Admin Interface Setup Guide

This guide explains how to set up the admin interface for creating blog posts with GitHub OAuth authentication.

## Overview

The admin interface (`/admin`) provides a simple web-based editor for creating blog posts. When you submit a post, it automatically creates a pull request to merge the new post into the main branch.

## Features

- **GitHub OAuth Authentication**: Only authorized users can access the admin panel
- **Database-less**: Uses better-auth with memory/cookie-based sessions (no database required)
- **Simple Editor**: Plain text editor for writing Markdown/MDX content
- **Automatic PR Creation**: Creates a pull request with your new post
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
# GitHub OAuth
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
   - **Title**: The title of your post
   - **Slug**: URL-friendly identifier (auto-generated from title)
   - **Description**: Brief summary of the post
   - **Tags**: Comma-separated list of tags
   - **Draft**: Check to mark as draft
   - **Content**: Write your post in Markdown format
3. Submit:
   - **If draft is checked**: Post commits directly to main branch (immediate publish)
   - **If draft is unchecked**: Creates a pull request for review
4. For PRs: Review and merge the PR on GitHub to publish

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

### Post Format

The editor accepts Markdown/MDX content. Your post will be saved with this frontmatter:

```yaml
---
title: Your Title
description: Your description
author: Your GitHub username
date: "2025-12-23T17:00:00.000Z"
draft: true  # or false
tags: [tag1, tag2]
---
```

## Security

- Only users with the GitHub username specified in `ALLOWED_GITHUB_USERNAME` can access the admin panel
- Authentication is handled via GitHub OAuth
- Sessions are stored in memory/cookies (database-less)
- Draft posts commit directly to main; published posts go through pull requests

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

The admin interface is mobile-friendly. You can:
1. Open `https://caulk.lol/admin` on your phone browser
2. Sign in with GitHub
3. Write posts using the mobile interface
4. Create PRs from your phone

The editor is a simple textarea, making it easy to type on mobile keyboards.
