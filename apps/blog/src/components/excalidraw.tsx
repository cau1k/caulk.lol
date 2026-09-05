import manifest from "../generated/diagrams/manifest.json";

type ExcalidrawProps = {
  src: string;
  alt?: string;
  subtitle?: string;
  className?: string;
};

// Only checked-in local exports enter this map. Never inject downloaded SVG here.
const exports = import.meta.glob<string>("../generated/diagrams/**/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});
const diagrams = new Map(
  manifest.scenes.map((scene) => {
    const svg = exports[`../generated/diagrams/${scene.file}`];
    if (!svg) throw new Error(`Missing generated diagram: ${scene.source}`);
    return [
      scene.source,
      {
        ...scene,
        // React owns the root SVG so its accessible name comes from the MDX props.
        content: svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>")),
      },
    ] as const;
  }),
);

export function Excalidraw({ src, alt, subtitle, className }: ExcalidrawProps) {
  const diagram = diagrams.get(src);
  if (!diagram) throw new Error(`Generate the local Excalidraw scene before publishing: ${src}`);

  return (
    <figure className={className}>
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          className="excalidraw-diagram"
          role="img"
          aria-label={alt}
          viewBox={diagram.viewBox}
          width={diagram.width}
          height={diagram.height}
          style={{ width: "100%", height: "auto" }}
          dangerouslySetInnerHTML={{ __html: diagram.content }}
        />
      </div>
      {subtitle && (
        <figcaption className="text-muted-foreground mt-2 text-center text-sm">
          {subtitle}
        </figcaption>
      )}
    </figure>
  );
}
