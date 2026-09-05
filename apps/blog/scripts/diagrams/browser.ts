import { exportToSvg } from "@excalidraw/excalidraw";
import { transformSvgStyles } from "./styles";

/** Run only during regeneration: Excalidraw's exporter needs a real browser DOM. */
export async function render(scene: Parameters<typeof exportToSvg>[0]) {
  const svg = await exportToSvg({
    elements: scene.elements,
    files: scene.files,
    appState: { exportBackground: false, ...scene.appState },
    // The site replaces all Excalidraw fonts with its own serif font.
    // See @excalidraw/excalidraw's exportToSvg options in utils/export.d.ts.
    skipInliningFonts: true,
  });
  transformSvgStyles(svg);
  const viewBox = svg.getAttribute("viewBox");
  const width = svg.getAttribute("width");
  const height = svg.getAttribute("height");
  if (!viewBox || !width || !height) throw new Error("Exported diagram has no dimensions");
  return { svg: `${svg.outerHTML}\n`, viewBox, width, height };
}
