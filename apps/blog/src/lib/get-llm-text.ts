import type { InferPageType } from "fumadocs-core/source";
import type { posts } from "./source";

export async function getLLMText(page: InferPageType<typeof posts>) {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title} (${page.url})

${processed}`;
}
