# MetaMesh Plugin: Anime Detector

A MetaMesh plugin that detects anime content based on keywords, Japanese text, and audio tracks.

## Description

This plugin analyzes video files to determine if they are anime content. Detection is based on:

- **Fansub group keywords**: `[HorribleSubs]`, `[SubsPlease]`, `[Erai-raws]`, etc.
- **Japanese text detection**: Uses `wanakana` library for kana/kanji detection
- **Audio track language**: Checks for Japanese audio streams
- **File path**: Checks if "anime" is in the path

## Metadata Fields

| Field | Description |
|-------|-------------|
| `anime` | Boolean indicating if content is anime |
| `titles/jpn` | Japanese title (if detected) |
| `titles/rom` | Romanized title |
| `genres` | Adds "Anime" to genres set |

## Dependencies

- Requires `file-info`, `ffmpeg`, and `filename-parser` plugins to run first

## Configuration

No configuration required.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/manifest` | GET | Plugin manifest |
| `/configure` | POST | Update configuration |
| `/process` | POST | Process a file |

## Running Locally

```bash
npm install
npm run build
npm start
```

## Docker

```bash
docker build -t metamesh-plugin-anime-detector .
docker run -p 8080:8080 metamesh-plugin-anime-detector
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `HOST` | `0.0.0.0` | HTTP server host |

## License

MIT
