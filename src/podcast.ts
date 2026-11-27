import { DomUtils, parseDocument } from "htmlparser2";

const FEED_URL = "https://feeds.simplecast.com/xuFuL2sh";
export const SHOW_URL = "https://podcasts.apple.com/no/podcast/nerding-med-netlife/id1721343602";

export interface Episode {
  title: string;
  pubDate: Date | null;
  duration: string;
  number: string;
  image: string | null;
  audio: string | null;
}

type Node = Parameters<typeof DomUtils.getElementsByTagName>[1];

function el(item: Node, tag: string) {
  return DomUtils.getElementsByTagName(tag, item, true, 1)[0];
}

function text(item: Node, tag: string) {
  const found = el(item, tag);
  return found ? DomUtils.textContent(found).trim() : "";
}

/** "00:45:21" -> "45 min", "01:05:00" -> "1 t 5 min" */
function formatDuration(raw: string) {
  const parts = raw.split(":").map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return "";
  const seconds = parts.reduce((total, n) => total * 60 + n, 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} t ${minutes} min` : `${minutes} min`;
}

/** The newest episodes, or null if the feed could not be fetched. */
export async function getRecentEpisodes(count = 3): Promise<Episode[] | null> {
  try {
    const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const doc = parseDocument(await res.text(), { xmlMode: true });
    return DomUtils.getElementsByTagName("item", doc, true)
      .slice(0, count)
      .map((item) => {
        const image = el(item, "itunes:image")?.attribs.href ?? "";
        const audio = el(item, "enclosure")?.attribs.url ?? "";
        const date = new Date(text(item, "pubDate"));
        return {
          title: text(item, "title"),
          pubDate: Number.isNaN(date.getTime()) ? null : date,
          duration: formatDuration(text(item, "itunes:duration")),
          number: text(item, "itunes:episode"),
          // the feed links 3000px covers; ask the image server for a small one
          image: image.startsWith("https://image.simplecastcdn.com/")
            ? image.replace("/3000x3000/", "/200x200/")
            : null,
          audio: audio.startsWith("https://") ? audio : null,
        };
      });
  } catch {
    return null;
  }
}
