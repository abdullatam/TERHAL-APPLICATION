/**
 * Wikimedia's Special:FilePath serves the *original* upload — often several
 * megabytes of full-resolution photograph. On a phone over conference wifi that
 * is the difference between a deck that flicks and a deck that stalls, so ask
 * the thumbnailer for a screen-sized copy instead.
 */
export function sizedImage(url, width = 800) {
  if (!url) return null;
  if (url.includes("commons.wikimedia.org/wiki/Special:FilePath/")) {
    return `${url}${url.includes("?") ? "&" : "?"}width=${width}`;
  }
  return url;
}
