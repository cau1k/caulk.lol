import type { ReactNode } from "react";

type QuoteProps = {
  children: ReactNode;
  author?: string;
};

export function Quote({ children, author }: QuoteProps) {
  return (
    <figure>
      <blockquote className="[&_p]:inline [&_p]:before:content-['\201C'] [&_p]:after:content-['\201D']">
        {children}
      </blockquote>
      {author && (
        <figcaption className="!mt-0 pl-4 text-sm italic text-fd-muted-foreground">
          — {author}
        </figcaption>
      )}
    </figure>
  );
}
