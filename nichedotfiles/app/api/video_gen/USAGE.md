# Video Generation API - Quick Start

## Installation

```bash
cd nichedotfiles
npm install
```

This installs `fluent-ffmpeg` and `ffmpeg-static` for video processing.

## Setup

1. Get your ElevenLabs API key from: https://elevenlabs.io/
2. Create `.env.local`:

```env
ELEVENLABS_API_KEY=your_api_key_here
```

3. Make sure `base.mp4` exists at: `video_gen/assets/base.mp4`

## Usage

### Call the API

```bash
curl -X POST http://localhost:3000/api/video_gen \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Your video script here. This will be converted to speech and added as subtitles."
  }' \
  --output video.mp4
```

### Response

- **Success**: Returns a complete MP4 video file with:
  - Original base video
  - Generated TTS audio from your script
  - Burned-in subtitles synced to the audio

- **Fallback**: If FFmpeg processing fails, returns JSON with:
  - Audio file (base64)
  - SRT subtitle file
  - Instructions for manual combining

## Example with JavaScript

```javascript
const response = await fetch('/api/video_gen', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'Hello world! This is my video script.',
  }),
});

// Download the video
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'video.mp4';
a.click();
```

## Testing

1. Start dev server:
```bash
npm run dev
```

2. Run example:
```bash
node app/api/video_gen/example.js
```

## Parameters

```typescript
{
  script: string;              // Required: Your video script
  elevenlabsApiKey?: string;   // Optional: API key (uses env if not provided)
  voiceId?: string;            // Optional: ElevenLabs voice ID (defaults to Adam)
}
```

## How It Works

1. **TTS Generation**: Converts your script to MP3 audio using ElevenLabs
2. **Subtitle Creation**: Generates SRT subtitles with ~2.5 words/second timing
3. **Video Processing**: Uses FFmpeg to:
   - Replace base video audio with generated TTS
   - Burn subtitles onto the video
   - Output final MP4

## Timing

- TTS generation: ~2-5 seconds
- Video processing: ~5-15 seconds (depends on video length)
- Total: ~7-20 seconds per video

## Serverless Deployment

### Vercel

The route works on Vercel with these settings in `vercel.json`:

```json
{
  "functions": {
    "app/api/video_gen/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

### Netlify

Add to `netlify.toml`:

```toml
[functions]
  included_files = ["node_modules/ffmpeg-static/**"]

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

## Troubleshooting

**"Base video not found"**
- Check that `video_gen/assets/base.mp4` exists
- Update `baseVideoPath` in route.ts if needed

**"FFmpeg dependencies not installed"**
- Run: `npm install fluent-ffmpeg ffmpeg-static`

**"ElevenLabs API key is required"**
- Set `ELEVENLABS_API_KEY` in `.env.local`
- Or pass `elevenlabsApiKey` in request body

**Timeout on serverless**
- Reduce video length or use fallback mode
- Process video client-side or use external service

## Output Format

- **Container**: MP4
- **Video Codec**: H.264
- **Audio Codec**: AAC
- **Subtitles**: Burned in (not separate track)
- **Resolution**: Same as base video
- **FPS**: Same as base video

## What's Different from Python Version

| Python | TypeScript |
|--------|-----------|
| MoviePy | fluent-ffmpeg |
| Local files | Temp directory |
| Manual font config | FFmpeg subtitle filter |
| Direct file I/O | Buffer-based |

Both produce the same result: video with TTS audio and burned subtitles.
