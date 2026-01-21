import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "@takumi-rs/image-response";
import { getOgFonts } from "@/lib/og/fonts";
import { PostImage } from "@/lib/og/post-image";
import { posts } from "@/lib/source";

const cacheControlValue = "public, max-age=31536000, s-maxage=31536000";

function getSlugFromParams(params: { _splat?: string }) {
  const segments = params._splat?.split("/").filter(Boolean) ?? [];
  if (segments.length === 0) {
    return null;
  }

  const imageSegment = segments.at(-1);
  if (imageSegment !== "image.webp") {
    return null;
  }

  const slug = segments.slice(0, -1).join("/");
  return slug.length > 0 ? slug : null;
}

export const Route = createFileRoute("/og/posts/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const slug = getSlugFromParams(params);
        if (!slug) {
          return new Response("Not found", { status: 404 });
        }

        const page = posts.getPage([slug]);
        if (!page) {
          return new Response("Not found", { status: 404 });
        }

        const fonts = await getOgFonts(new URL(request.url));
        const image = new ImageResponse(
          <PostImage
            title={page.data.title}
            description={page.data.description}
          />,
          {
            width: 1200,
            height: 630,
            format: "webp",
            fonts,
          },
        );

        image.headers.set("Cache-Control", cacheControlValue);
        return image;
      },
    },
  },
});
