import type { ReactNode } from "react";

type QuoteProps = {
  children: ReactNode;
  author?: string;
};

export function Quote({ children, author }: QuoteProps) {
  return (
    <figure>
      <blockquote className="bg-fd-muted/50 rounded-sm py-2 pr-3 [&_p]:inline [&_p]:before:content-['\201C'] [&_p]:after:content-['\201D']">
        {children}
      </blockquote>
      {author && (
        <figcaption className="mt-2 pl-4 text-sm italic text-fd-muted-foreground">
          — {author}
        </figcaption>
      )}
    </figure>
  );
}
