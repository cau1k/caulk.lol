---
name: caulk-writing-style
description: Captures Caulk's blog and essay voice for drafting, rewriting, and editing posts, technical essays, guides, rants, and personal updates. Use when asked to write in Caulk's style, match the author's voice, polish content/posts, or produce caulk.lol copy.
---

# Caulk Writing Style

## Calibration corpus

This skill was calibrated from recent `content/posts/` writing, especially:

- `content/posts/on-neo-oss-and-nietzsche.mdx`
- `content/posts/close-the-loop.mdx`
- `content/posts/my-workflow-for-2026.mdx`
- `content/posts/prompt-caching-sucks.mdx`
- `content/posts/typescript-as-a-scripting-language.mdx`
- `content/posts/guide-writing-opencode-plugins.mdx`
- `content/posts/a-place-to-share-my-thoughts.mdx`

When working inside the blog repo and the task allows it, read 2-4 nearby or recent posts before writing. Use the skill as the baseline, then adapt to the specific draft.

## Core voice

Write like a technically sharp builder with strong taste, personal context, and low tolerance for slop.

- First person is normal. The author says what they tried, liked, hated, changed, and still doubts.
- Be direct and opinionated without turning everything into performative outrage.
- Use contractions. Keep the prose conversational.
- Mix precise technical detail with blunt aside. Example rhythm: explain the system, then land a short verdict.
- Let rough humor through when it fits: "stupidly easy", "don't do dumb shit", "get your shit together", "slop".
- Do not sanitize profanity if the point benefits from it. Do not add profanity just to sound edgy.
- Admit uncertainty plainly: "I'm not sure", "maybe", "I think", "most of the time".
- Prefer practical lived experience over abstract claims. Name the tools, versions, APIs, providers, and failure modes.
- Use rhetorical questions sparingly to pull the reader into the argument.
- Avoid em dashes. Use commas, parentheses, colons, or simple hyphens.

## Shape of a post

Open with a concrete hook, not generic throat-clearing.

Good openings usually do one of these:

1. State the thesis directly.
2. Start with a real workflow problem.
3. Admit a personal change in opinion.
4. Contrast what people think is happening with what is actually happening.

Then move quickly into specifics:

- What happened?
- Why does it matter?
- What broke or annoyed you?
- What did you use instead?
- What tradeoff did you accept?

End with a practical takeaway, a caveat, or a clean handoff. Do not force a grand inspirational ending.

## Paragraph rhythm

- Alternate medium explanatory paragraphs with short punch lines.
- One-line paragraphs are allowed when they earn it.
- Lists are good for workflows, tradeoffs, caveats, tool stacks, and concrete steps.
- Headings should be plain and useful: `The Problem`, `Why Bun?`, `Caveats`, `Agent loops`, `The provider-level alternative`.
- Code snippets should feel like evidence, not decoration.
- Parentheticals and asides are part of the voice, but keep them readable.

## Argument style

The author often argues from systems and incentives:

- Explain what the tool claims to optimize.
- Show the hidden cost or broken assumption.
- Give a concrete scenario.
- Compare the pragmatic option with the theoretically cleaner option.
- Acknowledge when the duct tape is duct tape.

Useful frames:

- "This is good, but only under these conditions."
- "The real problem is not X. It's Y."
- "The ugly choice is..."
- "For subscription users, the incentive changes."
- "This is not infrastructure. It is good enough to get me back to work."

## Technical texture

Keep named technical details. They are part of the authority of the writing.

- Prefer concrete references: `Bun`, `tmux`, `opencode`, `Pi`, `Claude Code`, `Forgejo Actions`, `vLLM`, `SGLang`, `KV cache`, `TTFT`.
- Mention exact workflows when relevant: `rsync`, `ssh`, `tmux capture-pane`, `package.json` scripts, git hooks, CI watchers.
- When explaining a concept, use a plain-language version first, then the deeper technical version.
- If discussing research or infra, keep claims bounded and cite/link the source when possible.

## Blog-specific MDX habits

When editing `content/posts/*.mdx`:

- Preserve frontmatter shape unless asked to change it.
- Keep imports at the top after frontmatter.
- Use existing components when they fit: `Callout`, `Accordions`, `Accordion`, `Tabs`, `Tab`, `Quote`, `Excalidraw`, `Mermaid`, `ImageZoom`.
- Do not add fancy components just to look polished.
- Strikethrough is allowed for self-correction or jokes, but use it sparingly.

## What to avoid

Do not make the writing sound like:

- corporate blog copy
- SEO filler
- generic AI thought leadership
- sterile documentation unless the task is explicitly a guide
- a balanced debate where the author clearly has a view
- engagement-bait Twitter thread prose

Avoid phrases like:

- "in today's fast-paced world"
- "unlock productivity"
- "delve into"
- "seamlessly"
- "robust solution" unless it is actually the clearest phrase
- "game changer" unless used sarcastically

## Editing rules

- Preserve the author's stance. Tighten it, do not sand it down.
- Clean obvious typos in finished drafts, but do not over-polish the voice into generic correctness.
- Keep strong claims strong when they are supported.
- If a claim sounds too broad, narrow it instead of deleting the attitude.
- Prefer short, clear sentences over ornamental prose.
- Do not add TL;DR sections unless the user asks or the draft already uses one.

## Mini examples

Weak:

> Bun provides a useful developer experience for automation tasks.

Caulk-style:

> Bun makes this stupidly easy. It sits in the sweet spot between a bash script that grows out of control and a proper app I do not want to maintain.

Weak:

> Prompt caching has limitations for dynamic agent workflows.

Caulk-style:

> Prompt caching wants static instructions at the beginning and variable stuff at the end. Coding agents produce variable stuff everywhere.

Weak:

> It is important to implement feedback loops for AI agents.

Caulk-style:

> Closing the loop isn't new. But you are. Agents only look magical when the system around them refuses to give them feedback.

