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

/**
 * The gallery for a landmark, newest schema first.
 *
 * `landmark_images` is the gallery table; `landmarks.image_url` is the single
 * hero shot that predates it. While the image-sourcing pass is only part done,
 * most places have one and some have none, so this normalises both shapes into
 * one list the UI can just map over.
 *
 * Returns `[{ url, caption_en, caption_ar, attribution_text }, ...]`.
 */
export function gallery(landmark) {
  if (!landmark) return [];
  const rows = landmark.images ?? [];
  if (rows.length) {
    return rows.map((image) => ({
      url: image.url,
      caption_en: image.caption_en,
      caption_ar: image.caption_ar,
      attribution_text: image.attribution_text,
    }));
  }
  // Fall back to the hero column for places the gallery pass has not reached.
  if (landmark.image_url) {
    return [
      {
        url: landmark.image_url,
        caption_en: null,
        caption_ar: null,
        attribution_text: landmark.image_attribution,
      },
    ];
  }
  return [];
}

/** The one image a card or timeline row should show. */
export function heroImage(landmark) {
  return gallery(landmark)[0] ?? null;
}
