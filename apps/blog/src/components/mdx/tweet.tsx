import type { TweetEmbedProps } from "@caulk.lol/ui/components/tweet-embed";
import { lazy, Suspense } from "react";

type MdxTweetProps = TweetEmbedProps;

const TweetEmbed = lazy(() =>
  import("@caulk.lol/ui/components/tweet-embed").then((module) => ({
    default: module.TweetEmbed,
  })),
);

export function Tweet({ apiUrl, ...props }: MdxTweetProps) {
  const localApiUrl = props.id ? `/api/tweet/${props.id}` : apiUrl;
  return (
    <Suspense fallback={null}>
      <TweetEmbed {...props} apiUrl={localApiUrl} />
    </Suspense>
  );
}
