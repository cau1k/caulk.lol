const siteBaseUrl = "https://caulk.lol";

export function getPostOgImagePath(slug: string) {
  return `/og/posts/${slug}/image.webp`;
}

export function getPostOgImageUrl(slug: string) {
  return `${siteBaseUrl}${getPostOgImagePath(slug)}`;
}
