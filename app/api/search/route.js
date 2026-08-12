import { NextResponse } from "next/server";

const SEARCH_URL = "https://archive.org/advancedsearch.php";
const METADATA_URL = "https://archive.org/metadata";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      q: `collection:(78rpm) AND mediatype:(audio) AND (${q})`,
      "fl[]": "identifier,title,creator,year",
      rows: "12",
      output: "json",
    });

    const res = await fetch(`${SEARCH_URL}?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);

    const data = await res.json();
    const docs = data?.response?.docs ?? [];

    // Resolve a playable file for each result (in parallel).
    const results = await Promise.all(
      docs.map(async (doc) => {
        try {
          const metaRes = await fetch(`${METADATA_URL}/${doc.identifier}`, { cache: "no-store" });
          const meta = await metaRes.json();
          const files = meta?.files ?? [];
          const audioFile =
            files.find((f) => f.name?.toLowerCase().endsWith(".mp3")) ||
            files.find((f) => f.name?.toLowerCase().endsWith(".ogg"));

          if (!audioFile) return null;

          return {
            identifier: doc.identifier,
            title: meta.metadata?.title || doc.title || "Untitled",
            creator: meta.metadata?.creator || doc.creator || "Unknown artist",
            year: meta.metadata?.year || doc.year || null,
            streamUrl: `https://archive.org/download/${doc.identifier}/${encodeURIComponent(audioFile.name)}`,
            archiveUrl: `https://archive.org/details/${doc.identifier}`,
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({ results: results.filter(Boolean) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
