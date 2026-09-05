/** Shared with the local production benchmark so routing matches deployment. */
export const blogAssets = {
  // The public Worker reads exact prerendered /index.html paths without an
  // extra trailing-slash redirect. It also records the existing site metrics.
  html_handling: "none" as const,
  run_worker_first: ["/*", "!/assets/*", "!/fonts/*", "!/media/*", "!/cdn-cgi/*"],
};
