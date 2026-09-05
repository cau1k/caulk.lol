# Illustrated footer

The layout follows the supplied reference's generous spacing and full-width
artwork. Three navigation columns precede the Aristotle mark, with a quiet
colophon over the drawing. Layout, color, and typography use the existing
Tailwind theme and CMU typefaces.

All text uses the same `max-w-2xl px-4` content column as the page. Only the
artwork spans the viewport. The colophon sits at the bottom over the drawing.
Copyright and timings have separate opaque `bg-background` backings for text
contrast, with clear space between them. Each has a soft theme-colored shadow
at 70% opacity, letting the scenery show through its edges. Both adapt to the
active theme.
The footer stays transparent and does not isolate its children in a stacking
context. Only the artwork rises above the shooting-star canvas. A
`bg-background` occlusion mask blocks stars behind engraved surfaces and fills
tiny hatch gaps. A second mask paints the green ink above it. Both leave open
space between columns and vegetation transparent, including enclosed openings
below the skyline. The credits follow the artwork at the same
layer so they remain readable.

The original Roman engraving was generated with the built-in image generation
tool. Its white ink and black sky form a **luminance mask**, so `bg-primary`
supplies the exact green for each theme. Alpha masking would turn this opaque
image into a rectangle. The 16:9 artwork fits without cutting off the stairs or
colonnade. Dark mode reduces only ink opacity; the silhouette stays opaque.
The decorative masks request their assets
within 600px of the viewport; its reserved frame prevents layout shifts.
The empty sky overlaps the introduction by 6vw, proportional to the wide mask.
This brings a small part of the engraving into the homepage's initial desktop
viewport while keeping the visible ink below the links and the credits at the
bottom of the artwork. Shorter viewports still use normal document scrolling.

Final asset: `apps/blog/public/media/roman.webp`, 1672 × 941, 390,398 bytes.
Encoded from the generated PNG with ImageMagick at WebP quality 88; no runtime
image library or new dependency. The supplied portrait remains untouched.

The occlusion mask is `apps/blog/public/media/roman.svg`, 80,411 bytes (18,691
bytes with Brotli compression). It closes narrow hatch gaps with a 3px disk and
fills enclosed gaps smaller than 64 source pixels. Larger openings remain
transparent throughout the image. The generated SVG uses even-odd contours and
relative coordinates, simplified within 0.75 source pixels. Rebuild it after
changing the WebP or algorithm with `node apps/blog/scripts/footer.mjs` (requires
ImageMagick 7). A unit test checks the image and generator SHA-256 hashes stored
in the SVG to prevent stale output.

Shooting stars use document coordinates and elapsed time. The canvas remains
viewport-sized, projecting each position with `pagePosition - scrollOffset`.
Stars continue advancing offscreen and retire only after leaving the document
and fading their trails. Article and manual pauses still freeze motion. Scrolling
while paused changes the view of the frozen positions; resuming excludes the
paused time so stars do not jump ahead.

Meteors use continuous fading light trails and a small luminous head. The glow
stays within 22 CSS pixels of the head; normal alpha compositing keeps overlapping
paths from adding unbounded brightness. Colors come from the active Tailwind
`--foreground` and `--primary` tokens, read only when the theme changes. There are
no bitmap sprites, full-canvas blur filters, or flashing brightness effects.
The browser's reduced-motion preference freezes the animation, including changes
made while the page is open. Static stars still repaint on theme changes and
resize. Browser pixel tests check continuous trails, faint halos, transparency
outside the glow, and brightness limits for three overlapping meteors.

`pnpm test:browser` checks heading clearance at 320, 390, 640, and 1440 pixels in
both themes, horizontal overflow, deferred asset loading, the 16:9 frame,
luminance masking, active-theme ink color, text column alignment, colophon
placement, and at least 4.5:1 contrast for its copyright and timing text.
Two initial-viewport checks at 1314 × 1034 also decode the mask pixels to verify
that actual engraving is visible without scrolling, rather than just its empty
sky. The same pixel measurement checks clearance below the navigation.
Pixel occlusion tests put a bright shooting-star layer behind the artwork and
check that it remains visible in the sky, between columns, and around tree
branches, while solid terrain still blocks it in either theme. A controlled-clock
test follows one star out of view and back in,
then verifies pause, scrolling while paused, and resuming without a jump. Unit
tests also check equal travel at different frame rates and after skipped frames.
The fixture renders the actual footer, router, fonts, and styles outside public
application routes. Browser suites use separate Vite caches and entry scans.

Generation prompt:

```text
Use case: illustration-story
Asset type: 16:9 panoramic decorative footer artwork for a personal website. This is a luminance mask source, NOT a finished colored illustration.
Create an original romantic Roman landscape in the style of a finely detailed antique engraving, with a sweeping winding marble staircase rising from the lower left toward a classical Roman colonnade on the right hillside, tall slim cypress trees, textured cliffs and lush sculpted greenery. One tiny solitary walking figure on the steps for scale. Ancient architecture, dramatic sense of depth, intricate stonework and botanical detail. Similar mood to a surreal classical garden etching.
MANDATORY COLOR ENCODING: ONLY WHITE INK ON SOLID PURE BLACK (#000000). White strokes and sparse stippled crosshatching form ALL the architecture, stairs, foliage and cliffs. Black negative spaces between the WHITE ink strokes, especially open sky. No color whatsoever. No opaque grey fog, no sky gradient, no paper texture, no glow. The website will turn black pixels completely transparent and white pixels into green. Use WHITE linework and hatching for fine texture; do not fill the whole landscape white. All sky MUST be perfectly black.
COMPOSITION: Wide landscape 16:9, 1536 by 864 or larger in the same aspect. Upper 35 percent EMPTY PURE BLACK uninterrupted sky so footer typography can sit above. Entire landscape within lower 65 percent. Higher hill/colonnade in right third, open valley to left of center, curving stairs visible throughout lower half. Scenery bleeds through left, right and bottom edges, no border, no outer margins. Both staircase and full colonnade must fit the wide composition; do NOT crop a portrait. Hills should have a natural varied silhouette into the empty black sky.
Style: engraving / woodcut, clearly drawn crisp lines with delicate dense stippling, elegant architectural illustration, restrained tonal coverage, fine detail visible when reduced to website size. NOT photorealistic, not a 3D render, not a vector icon, not flat color blocks.
No text, typography, logos, watermark, captions, UI, frame, or labels. Opaque RGB white-on-black image; transparency is not necessary.
```
