import { NextResponse } from "next/server";

// Internet Archive's "78rpm" collection is a huge, free, legally streamable
// archive of digitized old shellac records (mostly pre-1950s).
// Docs: https://archive.org/details/78rpm
const COLLECTION_QUERY = 'collection:(78rpm) AND mediatype:(audio)';
const SEARCH_URL = "https://archive.org/advancedsearch.php";
const METADATA_URL = "https://archive.org/metadata";

async function fetchRandomIdentifier() {
  // Internet Archive's search index is large; pull a random page of results
  // by jumping to a random "page" number, then pick a random row from it.
  const page = Math.floor(Math.random() * 200) + 1;

  const params = new URLSearchParams({
    q: COLLECTION_QUERY,
    "fl[]": "identifier,title,creator,year",
    rows: "50",
    page: String(page),
    output: "json",
  });

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    // Internet Archive responses change slowly; still avoid caching stale errors.
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Archive search failed: ${res.status}`);

  const data = await res.json();
  const docs = data?.response?.docs ?? [];
  if (docs.length === 0) return null;

  return docs[Math.floor(Math.random() * docs.length)];
}

async function fetchPlayableFile(identifier) {
  const res = await fetch(`${METADATA_URL}/${identifier}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Metadata fetch failed: ${res.status}`);

  const data = await res.json();
  const files = data?.files ?? [];

  // Prefer mp3 (widest browser support); fall back to ogg.
  const audioFile =
    files.find((f) => f.name?.toLowerCase().endsWith(".mp3")) ||
    files.find((f) => f.name?.toLowerCase().endsWith(".ogg"));

  if (!audioFile) return null;

  return {
    url: `https://archive.org/download/${identifier}/${encodeURIComponent(audioFile.name)}`,
    length: audioFile.length ? Number(audioFile.length) : null,
    metadata: data.metadata || {},
  };
}

export async function GET() {
  try {
    // Try a few times in case a random pick has no usable audio file.
    for (let attempt = 0; attempt < 5; attempt++) {
      const doc = await fetchRandomIdentifier();
      if (!doc) continue;

      const file = await fetchPlayableFile(doc.identifier);
      if (!file) continue;

      return NextResponse.json({
        identifier: doc.identifier,
        title: file.metadata.title || doc.title || "Untitled",
        creator: file.metadata.creator || doc.creator || "Unknown artist",
        year: file.metadata.year || doc.year || null,
        duration: file.length,
        streamUrl: file.url,
        archiveUrl: `https://archive.org/details/${doc.identifier}`,
      });
    }

    return NextResponse.json(
      { error: "Couldn't find a playable track, try again." },
      { status: 502 }
    );
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
