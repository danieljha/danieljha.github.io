import { DomUtils, parseDocument } from "htmlparser2";

const FEED_URL = "https://letterboxd.com/daniehas/rss/";

export interface Film {
  title: string;
  year: string;
  rating: number | null;
  watchedDate: string;
  link: string;
  poster: string | null;
  liked: boolean;
  rewatch: boolean;
}

export const PROFILE_URL = "https://letterboxd.com/daniehas/";

function text(item: Parameters<typeof DomUtils.getElementsByTagName>[1], tag: string) {
  const el = DomUtils.getElementsByTagName(tag, item, true, 1)[0];
  return el ? DomUtils.textContent(el).trim() : "";
}

/** The most recently logged films, or null if the feed could not be fetched. */
export async function getRecentFilms(count = 5): Promise<Film[] | null> {
  try {
    const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const doc = parseDocument(await res.text(), { xmlMode: true });
    return DomUtils.getElementsByTagName("item", doc, true)
      .map((item) => {
        const rating = parseFloat(text(item, "letterboxd:memberRating"));
        const link = text(item, "link");
        // the poster is the first image in the description html
        const poster = text(item, "description").match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null;
        return {
          poster: poster?.startsWith("https://a.ltrbxd.com/") ? poster : null,
          liked: text(item, "letterboxd:memberLike") === "Yes",
          rewatch: text(item, "letterboxd:rewatch") === "Yes",
          title: text(item, "letterboxd:filmTitle"),
          year: text(item, "letterboxd:filmYear"),
          rating: Number.isFinite(rating) ? rating : null,
          watchedDate: text(item, "letterboxd:watchedDate"),
          link: link.startsWith("https://letterboxd.com/") ? link : FEED_URL,
        };
      })
      // the feed also contains lists; only diary entries have a film title
      .filter((film) => film.title)
      .slice(0, count);
  } catch {
    return null;
  }
}

export function stars(rating: number) {
  return "★".repeat(Math.floor(rating)) + (rating % 1 ? "½" : "");
}
