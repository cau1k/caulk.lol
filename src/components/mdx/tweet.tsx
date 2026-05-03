import { Tweet as ReactTweet, type TweetProps } from "react-tweet";
import "react-tweet/theme.css";

type MdxTweetProps = TweetProps & {
  className?: string;
};

export function Tweet({ className, apiUrl, ...props }: MdxTweetProps) {
  const localApiUrl = props.id ? `/api/tweet/${props.id}` : apiUrl;

  return (
    <div
      className={className}
      style={{
        display: "flex",
        justifyContent: "center",
        marginBlock: "1.75rem",
      }}
    >
      <ReactTweet {...props} apiUrl={localApiUrl} />
    </div>
  );
}
