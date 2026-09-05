import { createRoot } from "react-dom/client";
import { PerformanceComparisonChart } from "@/components/analytics/performance";
import report from "@/generated/performance.json";
import "./tooltip.css";

// The published chart's actual component, data, and styles. This fixture never
// enters the public application routes.

document.documentElement.classList.toggle(
  "dark",
  new URLSearchParams(location.search).get("theme") === "dark",
);
const root = document.getElementById("root");
if (!root) throw new Error("Missing test root");
createRoot(root).render(
  <main className="mx-auto w-full max-w-2xl px-4 py-8">
    <div className="prose min-w-0">
      <PerformanceComparisonChart rows={report.charts.localWarm} />
    </div>
  </main>,
);
