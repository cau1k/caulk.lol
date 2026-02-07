const WORDS_PER_MINUTE = 200;

/**
 * Calculate reading time from text content
 * Strips MDX/Markdown syntax before counting words
 */
export function calculateReadingTime(content: string): number {
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/, "");

  const codeBlocks: string[] = [];

  // Remove fenced code blocks from prose; we count them separately.
  const proseSource = withoutFrontmatter.replace(
    /```[^\n]*\n([\s\S]*?)```/g,
    (_match, code: string) => {
      codeBlocks.push(code);
      return "\n";
    },
  );

  // Keep inline code content, drop backticks.
  const proseWithInlineCode = proseSource.replace(/`([^`]*)`/g, "$1");

  // Preserve autolinks like <https://example.com>
  const proseWithAutolinks = proseWithInlineCode.replace(
    /<((?:https?:\/\/|mailto:)[^>\s]+)>/g,
    "$1",
  );

  // Strip HTML/JSX/MDX tags but keep inner text.
  const proseWithoutTags = proseWithAutolinks.replace(/<\/?[A-Za-z][^>]*>/g, " ");

  // Remove markdown links but keep link text.
  const proseWithoutLinks = proseWithoutTags.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Replace images with their alt text (if any).
  const proseWithoutImages = proseWithoutLinks.replace(
    /!\[([^\]]*)\]\([^)]+\)/g,
    "$1",
  );

  const plainText = proseWithoutImages
    .replace(/[#*_~>|{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const wordMatches = plainText.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g);
  const proseWordCount = wordMatches?.length ?? 0;

  const codeWordCount = codeBlocks.reduce((sum, code) => {
    const matches = code.match(/[A-Za-z0-9_]+/g);
    return sum + (matches?.length ?? 0);
  }, 0);

  const totalWordCount = proseWordCount + codeWordCount;

  const minutes = Math.ceil(totalWordCount / WORDS_PER_MINUTE);

  return Math.max(1, minutes);
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}
