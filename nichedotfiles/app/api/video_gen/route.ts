import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

interface VideoGenRequest {
  script: string;
  elevenlabsApiKey?: string;
  voiceId?: string;
}

// Generate TTS audio using ElevenLabs API
async function generateTTS(
  script: string,
  apiKey: string,
  voiceId: string = 'pNInz6obpgDQGcFmaJgB'
): Promise<Buffer> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.3,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const body: VideoGenRequest = await request.json();
    const { script, elevenlabsApiKey, voiceId } = body;

    console.log('=== Video Gen API ===');
    console.log('Script length:', script?.length, 'chars');

    if (!script || script.trim().length === 0) {
      return NextResponse.json(
        { error: 'Script text is required' },
        { status: 400 }
      );
    }

    const apiKey = elevenlabsApiKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key is required. Set ELEVENLABS_API_KEY in .env.local' },
        { status: 400 }
      );
    }

    // Generate TTS audio
    console.log('Generating TTS audio...');
    const audioBuffer = await generateTTS(script, apiKey, voiceId);
    console.log(`Audio generated: ${(audioBuffer.length / 1024).toFixed(2)} KB`);

    // Check for base video
    const possiblePaths = [
      join(process.cwd(), 'app', 'base.mp4'),
      join(process.cwd(), 'public', 'base.mp4'),
      join(process.cwd(), '..', 'video_gen', 'assets', 'base.mp4'),
    ];
    
    const baseVideoPath = possiblePaths.find(p => existsSync(p));
    let baseVideoBase64: string | null = null;
    
    if (baseVideoPath) {
      console.log('Loading base video:', baseVideoPath);
      const baseVideoBuffer = await readFile(baseVideoPath);
      baseVideoBase64 = baseVideoBuffer.toString('base64');
      console.log(`Base video loaded: ${(baseVideoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    }

    console.log('=== Complete ===');

    // Return audio (and optionally base video) for client-side processing
    return NextResponse.json({
      success: true,
      audio: {
        base64: audioBuffer.toString('base64'),
        mimeType: 'audio/mpeg',
        size: audioBuffer.length,
      },
      baseVideo: baseVideoBase64 ? {
        base64: baseVideoBase64,
        mimeType: 'video/mp4',
      } : null,
      message: 'Use ffmpeg.wasm in browser to merge audio with video',
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/video_gen',
    method: 'POST',
    body: {
      script: 'Your video script text (required)',
      elevenlabsApiKey: 'Optional if ELEVENLABS_API_KEY env var is set',
    },
    response: {
      audio: 'Base64 encoded MP3 audio',
      baseVideo: 'Base64 encoded MP4 video (if available)',
    },
    note: 'Video processing happens client-side using ffmpeg.wasm in browser',
  });
}
