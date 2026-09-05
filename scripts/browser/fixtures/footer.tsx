import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { BackgroundStars } from "@/components/background-stars";
import { BackgroundStarsProvider, useBackgroundStars } from "@/components/background-stars-context";
import { Footer } from "@/components/footer";
import "./tooltip.css";

// The real footer and router. The short page matches the homepage's ~600px
// content height; the long page exercises deferred image loading.
const shortPage = new URLSearchParams(location.search).has("short");
document.documentElement.classList.toggle(
  "dark",
  new URLSearchParams(location.search).get("theme") === "dark",
);
const rootRoute = createRootRoute({
  component: () => (
    <BackgroundStarsProvider>
      <BackgroundStars />
      <main className="mx-auto w-full max-w-2xl px-4" style={{ minHeight: shortPage ? 600 : 4000 }}>
        <h1>Footer layout</h1>
        <PauseStars />
      </main>
      <Footer />
    </BackgroundStarsProvider>
  ),
});

function PauseStars() {
  const { paused, setPaused } = useBackgroundStars();
  return <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "Resume stars" : "Pause stars"}</button>;
}
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" });
const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const root = document.getElementById("root");
if (!root) throw new Error("Missing test root");
createRoot(root).render(<RouterProvider router={router} />);
