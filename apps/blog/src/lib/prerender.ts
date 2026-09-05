/** Read a known build artifact through the Worker asset binding, retaining public URLs. */
export async function readPrerenderedPage(
  request: Request,
  fetchAsset: (request: Request) => Promise<Response>,
): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/index.html`;
  const response = await fetchAsset(new Request(url, request));
  if (response.status !== 200 && response.status !== 304) {
    throw new Error(`Missing prerendered page: ${url.pathname} (${response.status})`);
  }
  const headers = new Headers(response.headers);
  // Content deploys with the Worker. Brief browser freshness removes repeat
  // navigation round trips while keeping new publications visible promptly.
  headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return new Response(response.body, { status: response.status, headers });
}
