import { createFileRoute } from "@tanstack/react-router";
import { getLLMText } from "@/lib/get-llm-text";
import { posts } from "@/lib/source";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () => {
        const scan = posts.getPages().map(getLLMText);
        const scanned = await Promise.all(scan);
        return new Response(scanned.join("\n\n"), {
          headers: {
            "Content-Type": "text/plain",
          },
        });
      },
    },
  },
});
