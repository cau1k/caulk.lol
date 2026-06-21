import { posts } from "@/lib/source";
import type { Graph } from "../components/graph-view";

export function buildGraph(): Graph {
  const pages = posts.getPages();
  const graph: Graph = { links: [], nodes: [] };

  for (const page of pages) {
    graph.nodes.push({
      id: page.url,
      url: page.url,
      text: page.data.title,
      description: page.data.description,
    });
  }

  return graph;
}
