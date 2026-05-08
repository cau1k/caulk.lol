import { useId, useState } from "react";

type YouTubeProps = {
  id: string;
  title?: string;
  start?: number;
};

function getEmbedUrl(id: string, start?: number) {
  const params = new URLSearchParams({
    autoplay: "1",
    modestbranding: "1",
    rel: "0",
  });

  if (typeof start === "number") {
    params.set("start", String(Math.max(0, Math.floor(start))));
  }

  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

function getThumbnailUrl(id: string) {
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
}

export function YouTube({ id, title = "YouTube video", start }: YouTubeProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const titleId = useId();

  return (
    <figure className="not-prose my-8 overflow-hidden rounded-xl border border-transparent bg-background transition-colors duration-150 hover:border-primary">
      <div className="relative aspect-video bg-muted">
        {isLoaded ? (
          <iframe
            src={getEmbedUrl(id, start)}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className="group relative block h-full w-full overflow-hidden text-left"
            aria-labelledby={titleId}
            onClick={() => setIsLoaded(true)}
          >
            <img
              src={getThumbnailUrl(id)}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
            <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-20 items-center justify-center rounded-xl bg-background/90 text-foreground shadow-sm transition-transform duration-150 group-hover:scale-105">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="ml-1 size-7 fill-current"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            <span id={titleId} className="sr-only">
              Play {title}
            </span>
          </button>
        )}
      </div>
    </figure>
  );
}
