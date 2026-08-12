"use client";

import { useRef, useState, useEffect, useCallback } from "react";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function Home() {
  const audioRef = useRef(null);
  const [track, setTrack] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const playTrack = useCallback((newTrack) => {
    setTrack(newTrack);
    setError(null);
    // Wait a tick for the <audio> src to update, then play.
    requestAnimationFrame(() => {
      audioRef.current?.play().catch(() => {
        // Autoplay can be blocked; user can hit play manually.
      });
    });
  }, []);

  const fetchRandom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/random-song");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      playTrack(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [playTrack]);

  const runSearch = useCallback(async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }, [query]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setProgress(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [track]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  };

  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <main className="page">
      <p className="eyebrow">Free · Public Domain · Streamed Live</p>
      <h1 className="title">Wax &amp; Static</h1>
      <p className="subtitle">
        Every record here is pulled live from the Internet Archive&apos;s 78rpm shellac
        collection — thousands of songs, all free to stream, no account or key required.
      </p>

      <div className="turntable" data-playing={playing ? "true" : "false"}>
        <div className="platter">
          <div className="label">
            <span className="label-text">
              {track ? track.title : "No record loaded"}
            </span>
          </div>
          <div className="spindle" />
        </div>
        <div className="tonearm">
          <div className="tonearm-body">
            <div className="tonearm-head" />
          </div>
        </div>
      </div>

      <div className="controls">
        <button className="play-button" onClick={fetchRandom} disabled={loading}>
          {loading ? "Cueing up…" : "Spin a random record"}
        </button>
        {track && (
          <button className="play-button secondary" onClick={togglePlay}>
            {playing ? "Pause" : "Resume"}
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {track && (
        <div className="now-playing">
          <div className="np-row">
            <p className="np-title">{track.title}</p>
            {track.year && <span className="np-year">{track.year}</span>}
          </div>
          <p className="np-creator">{track.creator}</p>

          <div className="vu-track">
            <div className="vu-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="np-times">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <a
            className="archive-link"
            href={track.archiveUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Internet Archive ↗
          </a>
        </div>
      )}

      <audio ref={audioRef} src={track?.streamUrl} preload="metadata" />

      <div className="catalog">
        <p className="catalog-label">Or search the catalog</p>
        <form className="search-row" onSubmit={runSearch}>
          <input
            className="search-input"
            type="text"
            placeholder="Try “jazz”, “waltz”, “Ellington”, 1920s…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-button" type="submit" disabled={searching}>
            {searching ? "…" : "Search"}
          </button>
        </form>

        {results.length > 0 ? (
          <ul className="results-list">
            {results.map((r) => (
              <li
                key={r.identifier}
                className="result-item"
                data-active={track?.identifier === r.identifier ? "true" : "false"}
                onClick={() => playTrack(r)}
              >
                <div className="result-main">
                  <div className="result-title">{r.title}</div>
                  <div className="result-creator">{r.creator}</div>
                </div>
                {r.year && <span className="result-catno">{r.year}</span>}
              </li>
            ))}
          </ul>
        ) : (
          !searching && query === "" && (
            <p className="empty-state">Search results will appear here.</p>
          )
        )}
      </div>

      <footer className="credit">
        Audio courtesy of the{" "}
        <a href="https://archive.org/details/78rpm" target="_blank" rel="noopener noreferrer">
          Internet Archive 78rpm collection
        </a>
        . Public domain / free-to-stream recordings only.
      </footer>
    </main>
  );
}
