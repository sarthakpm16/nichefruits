# Video Generation API - Serverless Implementation

This API replicates the Python `video_gen` pipeline in TypeScript, optimized for serverless hosting on Vercel/Netlify.

## Overview

The original Python implementation uses:
- **ElevenLabs** for TTS audio generation
- **MoviePy** for video processing and subtitle burning

The serverless TypeScript implementation provides:
- ✅ **TTS Generation** via ElevenLabs API (same as Python)
- ✅ **Subtitle Generation** in SRT and WebVTT formats
- ✅ **Client-side video processing** using Web APIs (Canvas, MediaRecorder)
- ✅ **External service integration** options (Cloudinary, Remotion, etc.)

## Why Not MoviePy/FFmpeg in Serverless?

**Challenges with traditional video processing in serverless:**
- FFmpeg binaries are large (100MB+) and slow to cold-start
- Video processing is memory and CPU intensive
- Serverless functions have time limits (10-60s typically)
- No persistent file system
- Cold starts make real-time processing impractical

**Our Solutions:**

### 1. Client-Side Processing (Recommended for small files)
Use the `VideoGenerator` component to process videos in the browser using:
- HTML5 Canvas API for rendering
- MediaRecorder API for video capture
- Web Audio API for audio mixing

**Pros:**
- No server costs for video processing
- No time limits
- Scalable (offloads to client)

**Cons:**
- Requires modern browser
- Limited by client hardware
- Cannot process large files efficiently

### 2. External Service Integration
Use cloud video processing services:
- **Cloudinary**: Video transformations API
- **Mux**: Video encoding and streaming
- **Remotion**: Programmatic video generation
- **AWS MediaConvert**: Professional video processing

**Pros:**
- Professional quality
- Fast and reliable
- Built for scale

**Cons:**
- Additional service costs
- API integration required

## API Endpoints

### POST `/api/video_gen`

Generate TTS audio and subtitle data from script text.

**Request Body:**
```json
{
  "script": "Your video script text here",
  "elevenlabsApiKey": "sk_...", // Optional if set in env
  "voiceId": "pNInz6obpgDQGcFmaJgB", // Optional, defaults to Adam
  "videoProcessingMode": "url-only" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "audio": {
    "dataUrl": "data:audio/mpeg;base64,...",
    "size": 123456,
    "format": "mp3"
  },
  "subtitles": {
    "segments": [
      {
        "text": "Hello world this is",
        "startTime": 0,
        "endTime": 0.8
      }
    ],
    "srt": "1\n00:00:00,000 --> 00:00:00,800\nHello world this is\n\n...",
    "webvtt": "WEBVTT\n\n1\n00:00:00.000 --> 00:00:00.800\nHello world this is\n\n..."
  },
  "metadata": {
    "wordCount": 150,
    "estimatedDuration": 60,
    "characterCount": 750
  },
  "videoConfig": {
    "subtitleStyle": {
      "fontSize": 60,
      "fontColor": "white",
      "strokeColor": "black",
      "strokeWidth": 3,
      "fontFamily": "Arial-Bold"
    }
  }
}
```

### GET `/api/video_gen`

Get API information and available endpoints.

## Environment Variables

Create a `.env.local` file in the `nichedotfiles` directory:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

Get your API key from: https://elevenlabs.io/

## Usage Examples

### 1. Using the React Component

```tsx
import VideoGenerator from '@/app/components/VideoGenerator';

export default function Page() {
  return <VideoGenerator />;
}
```

### 2. Direct API Call

```typescript
const response = await fetch('/api/video_gen', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'Your video script here',
  }),
});

const data = await response.json();

// Download audio
const a = document.createElement('a');
a.href = data.audio.dataUrl;
a.download = 'audio.mp3';
a.click();

// Use subtitles
console.log(data.subtitles.srt);
```

### 3. Server-Side with External Service

```typescript
// Example: Using Cloudinary for video processing
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload base video and audio
const videoUpload = await cloudinary.uploader.upload('base.mp4', {
  resource_type: 'video',
});

const audioUpload = await cloudinary.uploader.upload(audioDataUrl, {
  resource_type: 'video',
});

// Apply transformations (subtitles via Cloudinary)
const result = await cloudinary.video('video_id', {
  transformation: [
    { overlay: 'subtitles:subtitles.srt' },
    { audio_codec: 'aac' },
  ],
});
```

## Client-Side Video Processing Details

The `VideoGenerator` component uses modern Web APIs:

1. **Canvas API**: Draws video frames and overlays subtitles
2. **MediaRecorder**: Captures canvas stream as video
3. **Web Audio API**: Mixes generated audio with video
4. **Blob API**: Creates downloadable video file

**Browser Support:**
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Partial (may need polyfills)

## Migration from Python

| Python Component | TypeScript Equivalent |
|-----------------|----------------------|
| `elevenlabs.ElevenLabs()` | `fetch()` to ElevenLabs API |
| `generate_audio()` | `generateTTS()` function |
| `moviepy.VideoFileClip` | HTML5 `<video>` element |
| `TextClip()` | Canvas `fillText()` / `strokeText()` |
| `burn_subtitles()` | `renderVideoWithSubtitles()` |
| File I/O | In-memory buffers / Blob API |

## Performance Considerations

### Serverless Cold Starts
- First request: ~2-5s (cold start)
- Subsequent requests: ~500ms (warm)
- Keep functions warm with periodic pings

### Audio Generation
- ElevenLabs API: ~2-5s per request
- File size: ~100KB per 60s of audio

### Video Processing
- Client-side: 1x real-time (60s video = ~60s processing)
- External service: 0.5-2x real-time depending on service

## Cost Estimates

**ElevenLabs:**
- Free tier: 10,000 characters/month
- Paid: $5/month for 30,000 characters

**Vercel/Netlify:**
- Free tier: 100GB bandwidth/month
- Function executions: Usually sufficient for small projects

**Cloudinary (if used):**
- Free tier: 25 credits/month
- Video processing: ~0.05 credits per second

## Deployment

### Vercel
```bash
cd nichedotfiles
npm install
vercel
```

### Netlify
```bash
cd nichedotfiles
npm install
netlify deploy --prod
```

### Environment Variables
Set in your platform dashboard:
- `ELEVENLABS_API_KEY`

## Troubleshooting

**Issue: "ElevenLabs API key required"**
- Solution: Set `ELEVENLABS_API_KEY` environment variable or pass in request

**Issue: Video processing timeout**
- Solution: Use client-side processing or external service instead

**Issue: Audio file too large**
- Solution: Shorten script or use audio compression

**Issue: Subtitles out of sync**
- Solution: Adjust `wordsPerSecond` parameter (default: 2.5)

## Future Enhancements

- [ ] Add support for multiple voices
- [ ] Implement background music mixing
- [ ] Add video filters and effects
- [ ] Support for multiple video formats
- [ ] Real-time progress updates via WebSockets
- [ ] Batch processing support
- [ ] Cloud storage integration (S3, GCS)
- [ ] Video thumbnail generation

## License

Same as parent project.
