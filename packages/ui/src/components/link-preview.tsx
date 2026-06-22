import type { LinkPreviewResponse } from "@caulk.lol/api/link-preview";
import { ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@caulk.lol/ui/lib/utils";

import { TweetEmbed } from "./tweet-embed";
import { YouTubeEmbed } from "./youtube-embed";

export type LinkPreviewCardProps = {
  preview: LinkPreviewResponse;
  className?: string;
  tweetApiUrl?: (tweetId: string) => string;
};

export type LinkCardData = {
  url: string;
  title?: string;
  reason?: string | null;
  tags?: string[];
  dateLabel?: string;
  dateTitle?: string;
};

export type LinkCardProps = {
  link: LinkCardData;
  preview?: LinkPreviewResponse;
  previewError?: string;
  className?: string;
  tweetApiUrl?: (tweetId: string) => string;
};

export function LinkCard({ className, link, preview, previewError, tweetApiUrl }: LinkCardProps) {
  const title = displayTitle(link, preview);

  return (
    <article className={cn("py-5", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <a
          href={link.url}
          className="inline-flex min-w-0 items-center gap-1 font-medium transition-colors hover:text-primary"
          target="_blank"
          rel="noreferrer"
        >
          <span className="truncate">{title}</span>
          <ExternalLinkIcon className="size-3 shrink-0" />
        </a>
        {link.dateLabel && (
          <time className="shrink-0 text-sm text-muted-foreground" title={link.dateTitle}>
            {link.dateLabel}
          </time>
        )}
      </div>
      {link.reason && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{link.reason}</p>
      )}
      {link.tags && link.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {link.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}
      {preview ? (
        <LinkPreviewCard preview={preview} tweetApiUrl={tweetApiUrl} className="mt-4" />
      ) : previewError ? (
        <p className="mt-3 border border-dashed p-3 text-xs text-muted-foreground">
          Preview unavailable: {previewError}
        </p>
      ) : null}
    </article>
  );
}

export function LinkPreviewCard({ className, preview, tweetApiUrl }: LinkPreviewCardProps) {
  if (preview.preview.kind === "tweet") {
    if (tweetApiUrl) {
      return (
        <TweetEmbed
          id={preview.preview.tweetId}
          apiUrl={tweetApiUrl(preview.preview.tweetId)}
          className={cn("my-3", className)}
        />
      );
    }

    return (
      <PreviewShell className={className} href={preview.preview.url} label="Tweet">
        <p className="text-sm font-medium">Tweet</p>
        <p className="text-xs text-muted-foreground">x.com status {preview.preview.tweetId}</p>
      </PreviewShell>
    );
  }

  if (preview.preview.kind === "youtube") {
    return (
      <div className={className}>
        <YouTubeEmbed
          id={preview.preview.videoId}
          title={preview.preview.title}
          thumbnailUrl={preview.preview.thumbnailUrl}
        />
        {preview.preview.authorName && (
          <p className="mt-2 text-xs text-muted-foreground">{preview.preview.authorName}</p>
        )}
      </div>
    );
  }

  if (preview.preview.kind === "generic") {
    return (
      <PreviewShell className={className} href={preview.preview.url} label={preview.preview.title}>
        <div className="flex gap-3">
          {preview.preview.imageUrl && (
            <img
              src={preview.preview.imageUrl}
              alt=""
              loading="lazy"
              className="mt-0.5 size-16 shrink-0 object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{preview.preview.title}</p>
            {preview.preview.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {preview.preview.description}
              </p>
            )}
            {preview.preview.siteName && (
              <p className="mt-2 text-xs text-muted-foreground">{preview.preview.siteName}</p>
            )}
          </div>
        </div>
      </PreviewShell>
    );
  }

  return (
    <div className={cn("border border-dashed p-3 text-xs text-muted-foreground", className)}>
      <p className="font-medium text-foreground">Preview unavailable</p>
      <p className="mt-1">{preview.preview.message}</p>
    </div>
  );
}

function displayTitle(link: LinkCardData, preview: LinkPreviewResponse | undefined) {
  if (link.title) return link.title;
  if (!preview) return link.url;
  if (preview.preview.kind === "youtube") return preview.preview.title;
  if (preview.preview.kind === "generic") return preview.preview.title;
  if (preview.preview.kind === "tweet") return `Tweet ${preview.preview.tweetId}`;
  return link.url;
}

function PreviewShell({
  children,
  className,
  href,
  label,
}: {
  children: ReactNode;
  className?: string;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={cn(
        "block border bg-background p-3 transition-colors hover:border-primary",
        className,
      )}
    >
      {children}
    </a>
  );
}
