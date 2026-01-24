const WORDS_PER_MINUTE = 200;

/**
 * Calculate reading time from text content
 * Strips MDX/Markdown syntax before counting words
 */
export function calculateReadingTime(content: string): number {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "");

  // Remove code blocks
  const withoutCode = withoutFrontmatter.replace(/```[\s\S]*?```/g, "");

  // Remove inline code
  const withoutInlineCode = withoutCode.replace(/`[^`]*`/g, "");

  // Remove JSX/MDX components
  const withoutJsx = withoutInlineCode.replace(/<[^>]+>/g, "");

  // Remove markdown links but keep text
  const withoutLinks = withoutJsx.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove images
  const withoutImages = withoutLinks.replace(/!\[[^\]]*\]\([^)]+\)/g, "");

  // Remove markdown formatting characters
  const plainText = withoutImages
    .replace(/[#*_~`]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  // Count words
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  // Calculate minutes, minimum 1
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}
