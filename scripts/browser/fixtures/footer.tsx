import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { Footer } from "@/components/footer";
import "./tooltip.css";

// The real footer and router; the long page also exercises deferred image loading.
document.documentElement.classList.toggle(
  "dark",
  new URLSearchParams(location.search).get("theme") === "dark",
);
const rootRoute = createRootRoute({
  component: () => (
    <>
      <main style={{ minHeight: 4000 }}>
        <h1>Footer layout</h1>
      </main>
      <Footer />
    </>
  ),
});
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" });
const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
  history: createMemoryHistory({ initialEntries: ["/"] }),
});
const root = document.getElementById("root");
if (!root) throw new Error("Missing test root");
createRoot(root).render(<RouterProvider router={router} />);
