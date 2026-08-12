# Wax & Static — Random Old Song Player

A free Next.js app that streams random old songs (public-domain 78rpm shellac
recordings) live from the **Internet Archive**. No API key, no database, no
paid service of any kind.

## How it works

- `app/api/random-song/route.js` — server route that queries Internet
  Archive's `advancedsearch.php` for a random item in the `78rpm` collection,
  then resolves a playable `.mp3` URL via `archive.org/metadata/{id}`.
- `app/api/search/route.js` — same idea, but driven by a search term (artist,
  genre, decade, etc).
- `app/page.js` — the UI: a spinning-vinyl player plus a search box, all
  talking to the two routes above.

Both routes proxy Internet Archive server-side, so no CORS issues and no
client-exposed keys (there's nothing to expose — the Archive's API is fully
open).

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy for free

Push this folder to a GitHub repo and import it into **Vercel** (free tier) —
zero config needed, it's a standard Next.js app. Netlify's Next.js runtime
works too.

## Swapping the music source

Everything old-song-specific lives in the two API routes. To pull from a
different free/open collection, just change `COLLECTION_QUERY` in
`app/api/random-song/route.js` — e.g. `collection:(oldtimeradio)` for old
radio shows, or drop the collection filter entirely to search all of Internet
Archive's audio.
