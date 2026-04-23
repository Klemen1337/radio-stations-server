# Radio Streamer API & Transcoder

A Node.js powered service that manages a list of radio stations, serves images, and provides an HLS-to-AAC transcoding proxy for seamless integration with HTML5 audio players.

## Features

- **Station Management**: JSON API with station names, descriptions, and images.
- **HLS Transcoding**: Convert `.m3u8` streams to live `.aac` on the fly using FFmpeg.
- **Security**: Basic Auth protection on all API endpoints.
- **Dockerized**: Ready for deployment via container.

## Getting Started

### Prerequisites

- Node.js (v18+)
- FFmpeg (installed on host if running without Docker)

### Installation

1. Clone the repository.
2. Install dependencies:

```bash
npm install
npm run serve
```

```bash
docker build . --file Dockerfile --tag radio-stations-server
docker compose up -d
```
