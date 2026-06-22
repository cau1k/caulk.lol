import { TweetEmbed, type TweetEmbedProps } from "@caulk.lol/ui/components/tweet-embed";

type MdxTweetProps = TweetEmbedProps;

export function Tweet({ apiUrl, ...props }: MdxTweetProps) {
  const localApiUrl = props.id ? `/api/tweet/${props.id}` : apiUrl;
  return <TweetEmbed {...props} apiUrl={localApiUrl} />;
}
