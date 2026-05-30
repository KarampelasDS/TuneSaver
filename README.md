# TuneSaver

<p align="center">
  <img src="assets/logo.svg" alt="TuneSaver logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Match your Spotify playlists to Beat Saber custom maps and download them automatically.</strong>
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-42-47848F?style=for-the-badge&logo=electron&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=111827" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
</p>

<p align="center">
  <a href="#premise"><img alt="Premise" src="https://img.shields.io/badge/Premise-1a1a1d?style=for-the-badge" /></a>
  <a href="#required-beat-saber-mods"><img alt="Required Mods" src="https://img.shields.io/badge/Required_Mods-1a1a1d?style=for-the-badge" /></a>
  <a href="#using-a-release-build"><img alt="Release Build" src="https://img.shields.io/badge/Release_Build-1a1a1d?style=for-the-badge" /></a>
  <a href="#local-setup"><img alt="Local Setup" src="https://img.shields.io/badge/Local_Setup-1a1a1d?style=for-the-badge" /></a>
  <a href="#how-it-works--end-to-end"><img alt="How It Works" src="https://img.shields.io/badge/How_It_Works-1a1a1d?style=for-the-badge" /></a>
  <a href="#settings"><img alt="Settings" src="https://img.shields.io/badge/Settings-1a1a1d?style=for-the-badge" /></a>
  <a href="#app-structure"><img alt="App Structure" src="https://img.shields.io/badge/App_Structure-1a1a1d?style=for-the-badge" /></a>
  <a href="#ownership"><img alt="Ownership" src="https://img.shields.io/badge/Ownership-1a1a1d?style=for-the-badge" /></a>
</p>

---

## Premise

Beat Saber has a thriving custom map community on [BeatSaver](https://beatsaver.com), but finding maps for every song in your Spotify library is tedious, you have to search for each track one by one, evaluate matches, and manually download and extract each ZIP.

TuneSaver automates the entire pipeline. You log in with your Spotify account, select one or more of your playlists (or cherry-pick individual tracks), and TuneSaver searches BeatSaver for the closest matching custom map for every song. It scores each result by comparing the song title and artist name, lets you swap in alternative maps if the top result is wrong, and then batch-downloads everything directly into Beat Saber's `CustomLevels` folder. For full playlists it also writes a `.bplist` playlist file so the collection appears as a named playlist inside the game with the original Spotify cover image.

The app is self-contained: it runs locally on your machine, talks directly to the Spotify and BeatSaver APIs from the renderer process, and uses Electron's main process only for file I/O and the OAuth callback.

---

## Required Beat Saber Mods

TuneSaver writes files that Beat Saber reads through its modding layer. You need the following mods installed before downloaded maps and playlists will appear in-game:

| Mod                 | Purpose                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **BSIPA**           | The mod loader. Required for all other mods to function.                                                                                 |
| **SongCore**        | Loads custom levels from the `CustomLevels` folder at startup and makes them playable. Without it, downloaded maps won't appear.         |
| **PlaylistManager** | Reads `.bplist` files from the `Playlists` folder and shows them as in-game playlists. Required for TuneSaver's playlist export feature. |

All three are available through [BSManager](https://www.bsmanager.io/). Install BSManager first, then tick SongCore and PlaylistManager.

---

## Using a Release Build

If you've downloaded a pre-built release, you don't need Node.js or any build tools. You just need a Spotify developer app and one file edit.

### Step 1 — Create a Spotify App

TuneSaver connects to Spotify through your own developer app. Spotify's development mode limits an app to **5 whitelisted users**, so this app cannot be publicly distributed — everyone who wants to use it must create their own app or be added to someone else's allowlist.

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **Create app**.
3. Fill in any name and description (e.g. "TuneSaver").
4. Under **Redirect URIs**, click **Add** and enter exactly:
   ```
   tunesaver://callback
   ```
5. Under **APIs used**, tick **Web API**.
6. Save the app.
7. On the app dashboard, copy your **Client ID** — the 32-character alphanumeric string shown under the app name.

---

### Step 2 — Whitelist Users (Including Yourself)

Because the app is in development mode, Spotify only allows explicitly whitelisted accounts to authenticate. **You must add your own Spotify account to this list or you will not be able to log in.**

1. In your app's dashboard, go to **Settings → User Management**.
2. Add the Spotify email address for every account that will use TuneSaver — **starting with your own**.
3. Up to 5 users can be added. Anyone not on the list will get an authentication error when logging in.

---

### Step 3 — Set Your Client ID

Extract the release ZIP. Inside the folder you'll find `config.json` sitting next to `TuneSaver.exe`:

```json
{
  "spotifyClientId": "YOUR_SPOTIFY_CLIENT_ID_HERE"
}
```

Open it in any text editor, replace `YOUR_SPOTIFY_CLIENT_ID_HERE` with the Client ID from Step 1, and save. If the value is missing or invalid, TuneSaver will show an error on launch and exit.

---

### Step 4 — Run

Double-click `TuneSaver.exe`. The app opens — click **Connect Spotify** and log in with any whitelisted account.

---

## Local Setup

### Prerequisites

- **Node.js 18+** and **npm**
- **Beat Saber** installed with **BSIPA**, **SongCore**, and **PlaylistManager** (see mod requirements above)
- A **Spotify account** (free or premium)

---

### Step 1 — Create a Spotify App

Follow the same steps as in [Using a Release Build → Step 1](#step-1--create-a-spotify-app) above to create a Spotify developer app and copy your Client ID.

---

### Step 2 — Whitelist Users (Including Yourself)

Follow [Using a Release Build → Step 2](#step-2--whitelist-users-including-yourself) above. Don't forget to add your own Spotify account.

---

### Step 3 — Clone and Configure

```bash
git clone https://github.com/your-username/TuneSaver.git
cd TuneSaver
npm install
```

Open `config.json` at the project root (it's already there with a placeholder):

```json
{
  "spotifyClientId": "YOUR_SPOTIFY_CLIENT_ID_HERE"
}
```

Replace the placeholder with your Client ID from Step 1. The app reads this file at startup in both dev and packaged mode — no rebuild is needed when changing the value.

---

### Step 4 — Run

```bash
npm start
```

This starts Vite's dev server for the renderer and launches Electron. The app window opens and you can log in with any whitelisted Spotify account.

---

### Step 5 — Build a Distributable (Optional)

```bash
npm run make
```

Electron Forge packages the app and automatically copies `config.json` from the project root into the output folder next to the `.exe`. The resulting release ZIP is self-contained — recipients follow the [Using a Release Build](#using-a-release-build) steps above.

---

## How It Works — End to End

### 1. Authentication (Spotify PKCE OAuth)

TuneSaver uses Spotify's PKCE (Proof Key for Code Exchange) OAuth flow — no client secret is required. When you click **Connect Spotify**:

1. The main process generates a random 32-byte code verifier, hashes it with SHA-256 to produce a code challenge, and opens the Spotify authorization URL in your system browser.
2. Spotify redirects to `tunesaver://callback?code=...` after you approve.
3. Because TuneSaver registers itself as the handler for the `tunesaver://` protocol at startup, the OS hands the callback URL back to the Electron app.
4. On Windows the callback is received via `app.on("second-instance")` (single-instance lock); on macOS via `app.on("open-url")`.
5. The main process exchanges the authorization code + code verifier for an access token via a POST to `https://accounts.spotify.com/api/token` and forwards the token to the renderer via IPC (`auth-success` event).

The token is held in memory in the renderer for the lifetime of the session. There is no refresh token flow — if the token expires (after 1 hour) you need to re-authenticate.

**Scopes requested:** `user-read-private`, `user-read-email`, `playlist-read-private`, `playlist-read-collaborative`

---

### 2. Fetching Playlists

After login the renderer calls `GET /v1/me` to resolve the user's Spotify ID, then paginates through `GET /v1/me/playlists` (20 per page) to collect all playlists the user owns or collaborates on. Playlists owned by other users are filtered out — Spotify's API returns 403 for those.

The Music Selection screen shows the first 6 playlists by default. A **Show All** button fetches the complete list. Clicking any playlist card opens a detail view that fetches all tracks from `GET /v1/playlists/{id}/items` (paginated, 100 per page) so you can preview the tracks before selecting.

When a playlist is added to the selection, TuneSaver fires a lightweight background request to `GET /v1/playlists/{id}/items?limit=1` to retrieve the accurate track count (the simplified playlist object returned by `/me/playlists` sometimes omits this) and updates the count in the UI.

You can mix and match: select whole playlists (all tracks are fetched and tagged with the playlist ID for later bplist creation) and individual tracks (fetched from the detail view, tagged without a playlist ID and downloaded as standalone maps).

---

### 3. BeatSaver Search and Matching

Once you click **Find Beat Saber Maps**, TuneSaver enters the matching phase:

**Track collection:** For each selected playlist, it fetches all tracks from `GET /v1/playlists/{id}/items` with pagination. Individual tracks are added as-is. Duplicate tracks across multiple playlists are deduplicated by Spotify track ID.

**Installed map scan:** Before searching, TuneSaver calls into the main process via IPC to scan the `CustomLevels` folder. Folder names in `CustomLevels` follow the pattern `{id or hash} (Song Name - Author)`. The scanner extracts the hex prefix from each folder name and returns those IDs/hashes. Any BeatSaver map whose short ID or version hash matches an entry in this set is marked as **Already Installed** and skipped during download.

**BeatSaver search:** Requests are sent **5 at a time** with a 500 ms pause between batches to stay within BeatSaver's rate limits. BeatSaver's search uses Apache Solr under the hood, which handles partial matches and fuzzy text reasonably well — but raw Spotify titles are often too noisy to query directly. Before searching, TuneSaver normalises the track name through several passes:

- **Parentheticals and feature tags** are stripped — `"Can't Stop (feat. Someone)"` becomes `"Can't Stop"`.
- **Version suffixes** are removed — `"This Fffire - New Version"` becomes `"This Fffire"`.
- **Repeated letters are collapsed** — `"Fffire"` becomes `"Fire"`, handling tracks with intentionally doubled letters whose BeatSaver maps use standard spelling.
- **Typographic apostrophes and quotes** (`'`, `'`, `"`, `"`, etc.) are normalised to ASCII equivalents so Solr tokenises them correctly.

Rather than firing a single query, TuneSaver tries progressively simpler formulations — raw title + artist, cleaned title + artist, core title + artist, core title alone, deduplicated title, and finally a second-page sweep for common titles — stopping as soon as any candidate reaches a title similarity of 0.85 or above. Most tracks match on the first query; harder cases accumulate up to ~60 candidates across all steps.

The candidate pool is sorted by `title_similarity × 0.65 + artist_similarity × 0.35` — the same weighted formula used for final scoring — so that when many maps share a title, the one by the correct artist ranks first. The top 5 results are kept per track.

**Match scoring:** Because BeatSaver doesn't return a relevance score, TuneSaver computes its own. Each candidate map is scored against the Spotify track using a hybrid similarity function:

- **String normalisation:** both strings are lowercased and stripped of all non-alphanumeric characters before comparison.
- **Word overlap (fast path):** if the two strings share at least half their words, the score is `0.5 + (overlap_ratio × 0.5)`. This rewards maps where the key words match even if minor words differ.
- **Levenshtein distance (fallback):** when word overlap is below 50%, the score is `1 - (edit_distance / max_length)`, giving a continuous measure of character-level similarity.
- **Title comparison:** the title similarity function also tries the Spotify core title (pre-dash) and handles the common BeatSaver convention of titling maps as `"Artist - Song"` by comparing against each part separately.
- **Weighted combination:** `final_score = title_similarity × 0.65 + artist_similarity × 0.35`
- **Difficulty bonus:** if the map includes your preferred difficulty (Expert+, Expert, etc.), the score gets a +2% bonus, capped at 100%.

The top result becomes the selected match. Results below the match threshold set in Settings (default 80%) are shown as "No match found".

**Alternatives:** Every match card has an **Alternatives** accordion showing the other candidates with their cover art, mapper name, and available difficulties. For "No match found" cards where the search still returned below-threshold results, the accordion is labelled **Candidates** and shown by default so you can manually pick the closest result. Selecting any alternative marks the track as `manuallySelected`, which bypasses the threshold check entirely — that map will always be downloaded and included in the bplist regardless of score.

**Rejecting tracks:** Each match card has a skip (✕) button. Rejected tracks are counted in the header, excluded from downloads, and excluded from the bplist. They can be restored individually before downloading.

---

### 4. Downloading Maps

Clicking **Download N Maps** starts the download phase:

1. Every track with `matchScore >= threshold` (or `manuallySelected`) that is not already installed is queued.
2. All downloads run **concurrently** via `Promise.allSettled`. Each calls `window.electron.downloadMap(...)` which invokes the main process handler via IPC.
3. In the main process, the download handler:
   - Fetches the ZIP from BeatSaver's CDN using Node's `https`/`http` modules, following HTTP 301/302 redirects.
   - Reports download progress back to the renderer as byte chunks arrive (the `content-length` header is used to compute percentage; IPC event `download-progress`).
   - Writes the ZIP to a temp file in the OS temp directory.
   - Extracts it with `adm-zip` into `{beatSaberPath}/Beat Saber_Data/CustomLevels/{mapId} ({songName} - {artistName})/`.
   - Deletes the temp ZIP.
4. Per-map progress bars update live. On completion each card shows a green ✓ or a red error message.

---

### 5. Beat Saber Playlist Creation (`.bplist`)

After all downloads finish, TuneSaver creates one `.bplist` file per selected full playlist (individual tracks are skipped). A `.bplist` is a JSON file that PlaylistManager reads. The format:

```json
{
  "playlistTitle": "My Playlist",
  "playlistAuthor": "TuneSaver",
  "image": "data:image/jpeg;base64,...",
  "songs": [
    { "hash": "df9d72d5626c5a4d2e94e...", "songName": "Bones" },
    { "hash": "a3f1c9e2b7d04512c8...", "songName": "Levitating" }
  ]
}
```

Only songs that were either successfully downloaded in this session or were already installed are included — half-matched or failed downloads are omitted so the in-game playlist stays accurate.

The Spotify playlist cover image is fetched from Spotify's CDN and converted to a base64 data URI (via `FileReader.readAsDataURL`). If the fetch fails or times out (8 second hard limit), the playlist is still written without an image.

Files are written to `{beatSaberPath}/Playlists/TuneSaver - {playlistName}.bplist`. PlaylistManager picks them up automatically on the next game launch.

---

## Settings

| Setting              | Default | Effect                                                                                                |
| -------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| Beat Saber Path      | *(blank — must be set before searching)* | Root install directory used for CustomLevels scanning, map extraction, and bplist writing. |
| Match Threshold      | 80%     | Maps scoring below this are shown as "No match" and excluded from downloads unless manually selected. |
| Preferred Difficulty | Expert+ | Maps that include this difficulty receive a small score bonus.                                        |

Settings are persisted to `localStorage` and loaded on every launch.

---

## App Structure

```text
src/
  main.ts              Electron main process — auth IPC, file download, ZIP extraction, bplist writing
  preload.ts           Context bridge that safely exposes IPC channels to the renderer
  renderer.tsx         App root — all Spotify/BeatSaver fetching, matching logic, React state
  types.ts             Shared TypeScript types (Spotify, BeatSaver, app state)
  index.css            Global styles

  components/
    AppHeader.tsx            Top bar (back button, settings icon)
    LoginScreen.tsx          Spotify connect prompt
    MusicSelectionScreen.tsx Playlist sidebar + selection dashboard
    PlaylistGrid.tsx         Scrollable playlist grid
    PlaylistCard.tsx         Individual playlist card with artwork
    PlaylistDetailScreen.tsx Track list for a single playlist
    SelectedPlaylists.tsx    Selection summary panel and Find Maps button
    MatchResultsScreen.tsx   Match results, alternatives accordion, download progress
    SettingsScreen.tsx       Settings card (path, threshold, difficulty)
```

---

## Ownership

TuneSaver is a personal project by **Dimitrios Spyridon Karampelas**.

Third-party packages, services, icons, and platform tools remain the property of their respective owners and are used under their own licenses or terms. This project is not affiliated with Spotify, Beat Saber, or BeatSaver.
