import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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

// Generate SRT subtitle file
function generateSRT(script: string, wordsPerSecond: number = 2.5): string {
  const words = script.split(/\s+/);
  let srt = '';
  let index = 1;
  
  for (let i = 0; i < words.length; i++) {
    const startTime = i / wordsPerSecond;
    const endTime = startTime + 0.8;
    const endIdx = Math.min(i + 5, words.length);
    const text = words.slice(i, endIdx).join(' ');
    
    srt += `${index}\n`;
    srt += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
    srt += `${text}\n\n`;
    index++;
  }
  
  return srt;
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Process video with FFmpeg
async function processVideo(
  baseVideoPath: string,
  audioBuffer: Buffer,
  srtContent: string,
  outputPath: string
): Promise<void> {
  const tempDir = tmpdir();
  const audioPath = join(tempDir, `audio-${Date.now()}.mp3`);
  const srtPath = join(tempDir, `subtitles-${Date.now()}.srt`);
  
  try {
    // Write temporary files
    await writeFile(audioPath, audioBuffer);
    await writeFile(srtPath, srtContent);
    
    // Try to use fluent-ffmpeg if available, otherwise use exec
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegStatic = require('ffmpeg-static');
      
      ffmpeg.setFfmpegPath(ffmpegStatic);
      
      return new Promise((resolve, reject) => {
        ffmpeg(baseVideoPath)
          .input(audioPath)
          .outputOptions([
            '-map', '0:v',
            '-map', '1:a',
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-vf', `subtitles=${srtPath.replace(/\\/g, '/')}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=2,Alignment=2'`,
            '-preset', 'ultrafast',
            '-y'
          ])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      });
    } catch (e) {
      throw new Error('FFmpeg dependencies not installed. Run: npm install fluent-ffmpeg ffmpeg-static');
    }
  } finally {
    // Cleanup temp files
    try {
      await unlink(audioPath);
      await unlink(srtPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: VideoGenRequest = await request.json();
    const { script, elevenlabsApiKey, voiceId } = body;

    if (!script || script.trim().length === 0) {
      return NextResponse.json(
        { error: 'Script text is required' },
        { status: 400 }
      );
    }

    const apiKey = elevenlabsApiKey || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key is required' },
        { status: 400 }
      );
    }

    console.log('Step 1: Generating TTS audio...');
    const audioBuffer = await generateTTS(script, apiKey, voiceId);
    
    console.log('Step 2: Generating subtitles...');
    const srtContent = generateSRT(script);
    
    console.log('Step 3: Processing video...');
    
    // Path to base video - adjust based on your setup
    const baseVideoPath = join(process.cwd(), '..', 'video_gen', 'assets', 'base.mp4');
    
    if (!existsSync(baseVideoPath)) {
      return NextResponse.json(
        { 
          error: 'Base video not found',
          path: baseVideoPath,
          message: 'Upload base.mp4 or provide base video URL'
        },
        { status: 404 }
      );
    }
    
    const tempDir = tmpdir();
    const outputPath = join(tempDir, `final-${Date.now()}.mp4`);
    
    try {
      await processVideo(baseVideoPath, audioBuffer, srtContent, outputPath);
      
      console.log('Step 4: Reading final video...');
      const videoBuffer = await readFile(outputPath);
      
      // Clean up output file
      await unlink(outputPath);
      
      console.log('Step 5: Complete!');
      
      // Return video as downloadable response
      return new NextResponse(videoBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="video-${Date.now()}.mp4"`,
          'Content-Length': videoBuffer.length.toString(),
        },
      });
      
    } catch (videoError) {
      // If video processing fails, return audio and subtitles separately
      console.error('Video processing failed:', videoError);
      
      return NextResponse.json({
        warning: 'Video processing failed, returning audio and subtitles separately',
        error: videoError instanceof Error ? videoError.message : 'Unknown error',
        audio: {
          base64: audioBuffer.toString('base64'),
          size: audioBuffer.length,
        },
        subtitles: {
          srt: srtContent,
        },
        instructions: 'Use a video editor or online tool to combine base.mp4 with the audio and subtitles',
      });
    }

  } catch (error) {
    console.error('Error in video generation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate video',
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
    description: 'Generate video with TTS audio and burned subtitles',
    body: {
      script: 'Your video script text',
      elevenlabsApiKey: 'Optional, uses env var if not provided',
      voiceId: 'Optional, defaults to Adam voice',
    },
    response: 'video/mp4 file download',
    requirements: [
      'npm install fluent-ffmpeg ffmpeg-static',
      'ELEVENLABS_API_KEY environment variable',
      'base.mp4 file in video_gen/assets/',
    ],
  });
}
