async function getSaavnTracks(query = "Imagine Dragons") {
  // Query ko safely encode karein
  const encodedQuery = encodeURIComponent(query);

  const res = await fetch(
    `https://saavn.sumit.co/api/search?query=${encodedQuery}`,
    {
      // Next.js cache control
      next: { revalidate: 3600 },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch tracks: ${res.status}`);
  }

  const responseData = await res.json();

  // Saavn API response key verification
  return responseData.data?.results || responseData.results || [];
}

export default async function MyPlaylistPage() {
  let tracks = [];
  let error = null;

  try {
    tracks = await getSaavnTracks("Imagine Dragons");
  } catch (err) {
    error = err.message;
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "red", fontFamily: "sans-serif" }}>
        <h2>Error Loading Songs</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <main style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "20px" }}>Saavn Search: Imagine Dragons</h1>

      <h2>Results ({tracks.length})</h2>
      <ol style={{ paddingLeft: "20px" }}>
        {tracks.map((song, index) => {
          // Saavn image resolution handler (highest quality image select kar rahe hain)
          const imageUrl = Array.isArray(song.image)
            ? song.image[song.image.length - 1]?.link ||
              song.image[song.image.length - 1]?.url
            : song.image;

          // Artist name extraction
          const artistNames =
            song.primaryArtists || song.singers || "Unknown Artist";

          return (
            <li
              key={song.id || index}
              style={{
                marginBottom: "16px",
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={song.name || song.title}
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "6px",
                    objectFit: "cover",
                  }}
                />
              )}
              <div>
                <div style={{ fontWeight: "bold" }}>
                  {song.name || song.title}
                </div>
                <div style={{ fontSize: "14px", color: "#555" }}>
                  {artistNames} — {song.album?.name || song.album || "Single"}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
  
}
