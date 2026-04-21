# Project Context: Radio Streamer & Transcoder

## 🛠 Tech Stack
- **Runtime:** Node.js (v22+)
- **Framework:** Express.js
- **Processing:** FFmpeg (via fluent-ffmpeg)
- **Security:** Express-Basic-Auth
- **Infrastructure:** Docker & GitLab CI/CD

## 📂 Project Structure
- All source code resides in the `src/` directory.
- `src/server.js`: The entry point for the API and transcoder.
- `src/public/images/`: Storage for radio station logos.
- `Dockerfile`: Configured to install system-level `ffmpeg`.

## 🎙 Domain Rules
1. **Streaming Logic:** When adding new stations, determine if the source is HLS (`.m3u8`) or a direct stream (AAC/MP3). 
2. **Transcoding:** If HLS needs to be played on generic HTML5 players, use the `/stream.aac` proxy route which pipes FFmpeg output to the response.
3. **Paths:** Always use `path.join(__dirname, ...)` relative to the `src/` directory to avoid static asset breakages.
4. **Security:** All `/api/*` and `/stream.aac` routes must be protected by Basic Auth.

## 🤖 Coding Preferences
- Use **ES6+ syntax** (const/let, arrow functions, async/await).
- Maintain **minimalist dependencies**; prefer built-in Node.js modules (fs, path) when possible.
- Ensure all new API endpoints are documented in the `README.md`.
- When generating code, follow the existing pattern of piping FFmpeg directly to the Express `res` object to save memory.
