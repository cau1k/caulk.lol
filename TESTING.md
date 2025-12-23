# Testing the Mobile Blog Post Feature

## What Was Added

This PR adds the ability to write blog posts from a phone using multiple approaches:

### 1. Admin Interface (Decap CMS)
- Location: `/admin` (public/admin/index.html)
- A mobile-optimized CMS interface loaded from CDN
- Requires OAuth setup for production use
- Works with GitHub to commit posts directly

### 2. GitHub Mobile Interface (Zero Setup)
- Use GitHub's native mobile app or website
- Navigate to `content/posts/`
- Create new `.mdx` files directly
- No additional setup required

### 3. GitHub.dev (Web-based VS Code)
- Press `.` on any GitHub page to open VS Code in browser
- Full editor experience on mobile
- Great for longer posts

## Files Added/Modified

### New Files:
- `public/admin/index.html` - Decap CMS admin interface (loads from CDN)
- `public/admin/config.yml` - CMS configuration for blog posts
- `public/images/uploads/README.md` - Directory for uploaded media
- `ADMIN_SETUP.md` - Comprehensive setup and usage guide
- `TESTING.md` - This file

### Modified Files:
- `README.md` - Updated with blog writing options
- `package.json` - Removed decap-cms-app (using CDN instead)
- `.env.example` - Kept clean (no OAuth vars needed initially)

## How to Test

### Test 1: Verify Admin Interface Exists
1. Build and deploy the site (or run locally)
2. Navigate to `/admin`
3. Should see Decap CMS interface (will show login error without OAuth setup)
4. The interface should be responsive and mobile-friendly

### Test 2: Verify Configuration
1. Check `public/admin/config.yml`
2. Verify it's configured for:
   - GitHub backend (repo: cau1k/caulk.lol)
   - MDX format
   - Correct frontmatter fields (title, description, author, date, draft, tags)
   - Correct folder (content/posts)

### Test 3: GitHub Mobile (Already Works)
1. Open GitHub mobile app or github.com/cau1k/caulk.lol
2. Navigate to content/posts/
3. Create a new file: `test-post.mdx`
4. Add content:
```mdx
---
title: Test Post from Mobile
description: Testing mobile posting
author: Caulk
date: "2024-12-23T15:00:00-05:00"
draft: true
tags: [test]
---

## Test Content

This post was created from a mobile device using GitHub's interface!
```
5. Commit to main branch
6. CI should deploy automatically
7. Post should appear at `/posts/test-post` (marked as draft)

### Test 4: With OAuth Setup (Optional)
If you set up OAuth (see ADMIN_SETUP.md):
1. Navigate to `/admin`
2. Click "Login with GitHub"
3. Authorize the app
4. Should see list of existing posts
5. Click "New Post"
6. Fill in the form
7. Click "Publish"
8. Post should be committed to GitHub
9. CI should deploy automatically

## Expected Behavior

### Without OAuth Setup:
- `/admin` page loads but shows authentication error
- GitHub mobile interface works immediately
- Manual file creation works as before

### With OAuth Setup:
- `/admin` page loads and allows login
- User can browse, create, edit posts through CMS
- Changes are committed directly to GitHub
- Mobile-optimized interface for easy editing

## Mobile UX Considerations

- **Decap CMS**: Touch-optimized interface, visual markdown editor
- **GitHub Mobile App**: Simple file creation, good for quick posts
- **GitHub.dev**: Full VS Code experience, best for complex posts

## Backwards Compatibility

- Existing blog posts continue to work without changes
- Existing build/deploy process unchanged
- No breaking changes to site structure
- Optional feature that doesn't affect existing workflows
