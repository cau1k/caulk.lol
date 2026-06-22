import { Tweet as ReactTweet, type TweetProps } from "react-tweet";
import "react-tweet/theme.css";

export type TweetEmbedProps = TweetProps & {
  className?: string;
};

export function TweetEmbed({ className, ...props }: TweetEmbedProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        justifyContent: "center",
        marginBlock: "1.75rem",
        width: "100%",
      }}
    >
      <ReactTweet {...props} />
    </div>
  );
}
