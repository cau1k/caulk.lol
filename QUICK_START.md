# Quick Start Guide: Writing Blog Posts from Your Phone

## 🚀 Three Ways to Write Posts

### Option 1: GitHub Mobile App (Easiest - No Setup!)

1. **Open the GitHub app** on your phone (or go to github.com)
2. **Navigate to your repository**: cau1k/caulk.lol
3. **Go to** `content/posts/`
4. **Tap the + button** to create a new file
5. **Name your file**: `my-awesome-post.mdx`
6. **Write your post**:

```mdx
---
title: My Awesome Post
description: This is a post I wrote from my phone!
author: Caulk
date: "2025-12-23T15:30:00-05:00"
draft: false
tags: [mobile, writing]
---

## Hello from my phone!

I can write **markdown** and it becomes a beautiful blog post.

### Features I can use:
- Lists
- **Bold** and *italic*
- Code blocks
- And more!
```

7. **Scroll down** and tap "Commit new file"
8. **Done!** Your post will automatically deploy

---

### Option 2: Decap CMS Admin (Best Interface)

#### First-Time Setup (One-time)
Follow the instructions in [ADMIN_SETUP.md](./ADMIN_SETUP.md) to set up OAuth.

#### Once Set Up:
1. **Open your browser** on your phone
2. **Go to** `https://caulk.lol/admin`
3. **Log in with GitHub**
4. **Tap "New Post"**
5. **Fill in the form:**
   - Title: Your post title
   - Description: Brief summary
   - Author: Your name
   - Date: Pick from calendar
   - Tags: Add tags
   - Body: Write your content (with preview!)
6. **Tap "Publish"**
7. **Done!** Post is committed and deployed

**Benefits:**
- ✅ Visual editor with preview
- ✅ Form-based frontmatter (no YAML syntax needed)
- ✅ Image uploads
- ✅ Mobile-optimized interface

---

### Option 3: GitHub.dev (Full Editor)

1. **Open GitHub** in your mobile browser
2. **Navigate to** cau1k/caulk.lol
3. **Press the `.` (period) key** on your keyboard
4. **VS Code opens in your browser!**
5. **Navigate to** `content/posts/`
6. **Create new file** or edit existing one
7. **Write your post** with full IDE features
8. **Commit and push** using the source control panel

**Benefits:**
- ✅ Full VS Code experience
- ✅ Syntax highlighting
- ✅ Git integration
- ✅ Extensions support

---

## 📝 Post Format Template

All posts use this MDX format:

```mdx
---
title: Your Post Title
description: A brief description (appears in post list)
author: Your Name (optional, defaults to "Caulk")
date: "YYYY-MM-DDTHH:mm:ssZ"
draft: false (set to true to hide from production)
tags: [tag1, tag2, tag3]
---

## Your First Heading

Your content goes here. You can use:

### Markdown Features
- **Bold text**
- *Italic text*
- [Links](https://example.com)
- Lists
- Images: ![alt text](/images/photo.jpg)

### Code Blocks
```javascript
const hello = "world";
console.log(hello);
```

### And More!
- Tables
- Blockquotes
- Math (with KaTeX)
- Mermaid diagrams
- MDX components
```

---

## 💡 Tips for Mobile Writing

### GitHub Mobile Tips:
- Use the "Preview" tab to see how it looks
- Draft in a notes app first if writing long posts
- Commit directly to `main` for instant publishing

### Decap CMS Tips:
- Save drafts frequently
- Use the preview pane
- Upload images directly through the interface
- Use the rich text toolbar for formatting

### GitHub.dev Tips:
- Use landscape mode for more screen space
- Split editor and preview side-by-side
- Use command palette (Cmd/Ctrl+Shift+P) for quick actions
- Commit messages: Use the source control icon

---

## 🎯 Which Method Should I Use?

| Method | Best For | Setup | Mobile-Friendly |
|--------|----------|-------|-----------------|
| **GitHub Mobile** | Quick posts, simple edits | None | ⭐⭐⭐⭐⭐ |
| **Decap CMS** | Regular writing, best UX | One-time OAuth | ⭐⭐⭐⭐⭐ |
| **GitHub.dev** | Complex posts, power users | None | ⭐⭐⭐⭐ |

**Recommendation:**
- **Just starting?** Use GitHub Mobile
- **Want best experience?** Set up Decap CMS (worth it!)
- **Need advanced features?** Use GitHub.dev

---

## 🔧 Troubleshooting

### GitHub Mobile
- **Problem:** Can't find the + button
- **Solution:** Make sure you're in the `content/posts/` folder

### Decap CMS
- **Problem:** "OAuth not configured" error
- **Solution:** See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for setup instructions

### GitHub.dev
- **Problem:** Keyboard doesn't have period key
- **Solution:** Use the URL: `github.dev/cau1k/caulk.lol`

---

## 📚 More Information

- **Full Setup Guide:** [ADMIN_SETUP.md](./ADMIN_SETUP.md)
- **Testing Guide:** [TESTING.md](./TESTING.md)
- **Implementation Details:** [SUMMARY.md](./SUMMARY.md)

---

## ✨ Start Writing!

You're all set! Choose your preferred method and start writing posts from anywhere. Your blog is now truly mobile! 📱✍️
