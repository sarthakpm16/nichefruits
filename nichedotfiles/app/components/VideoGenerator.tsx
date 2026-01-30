'use client';

import { useState, useRef } from 'react';

interface SubtitleSegment {
  text: string;
  startTime: number;
  endTime: number;
}

interface VideoGenResponse {
  success: boolean;
  audio: {
    dataUrl: string;
    size: number;
    format: string;
  };
  subtitles: {
    segments: SubtitleSegment[];
    srt: string;
    webvtt: string;
  };
  metadata: {
    wordCount: number;
    estimatedDuration: number;
    characterCount: number;
  };
  videoConfig: {
    subtitleStyle: {
      fontSize: number;
      fontColor: string;
      strokeColor: string;
      strokeWidth: number;
      fontFamily: string;
    };
  };
}

export default function VideoGenerator() {
  const [script, setScript] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<VideoGenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseVideoRef = useRef<HTMLVideoElement>(null);

  const handleGenerate = async () => {
    if (!script.trim()) {
      setError('Please enter a script');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/video_gen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: script.trim(),
          elevenlabsApiKey: apiKey || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate audio');
      }

      const data: VideoGenResponse = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const renderVideoWithSubtitles = async () => {
    if (!response || !baseVideoRef.current || !canvasRef.current) {
      setError('Missing required data or elements');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const video = baseVideoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Wait for video to load
      await new Promise((resolve) => {
        if (video.readyState >= 3) {
          resolve(null);
        } else {
          video.addEventListener('loadeddata', resolve, { once: true });
        }
      });

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const { segments } = response.subtitles;
      const { subtitleStyle } = response.videoConfig;

      // Setup MediaRecorder to capture canvas
      const stream = canvas.captureStream(30); // 30 FPS
      
      // Add audio track
      const audioContext = new AudioContext();
      const audioElement = new Audio(response.audio.dataUrl);
      const audioSource = audioContext.createMediaElementSource(audioElement);
      const destination = audioContext.createMediaStreamDestination();
      audioSource.connect(destination);
      audioSource.connect(audioContext.destination);
      
      stream.addTrack(destination.stream.getAudioTracks()[0]);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-${Date.now()}.webm`;
        a.click();
        
        setProcessing(false);
      };

      // Start recording
      mediaRecorder.start();
      video.play();
      audioElement.play();

      // Render loop
      const renderFrame = () => {
        const currentTime = video.currentTime;
        
        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Find current subtitle
        const currentSegment = segments.find(
          (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime
        );
        
        // Draw subtitle if exists
        if (currentSegment) {
          ctx.save();
          
          // Setup text style
          ctx.font = `bold ${subtitleStyle.fontSize}px ${subtitleStyle.fontFamily}`;
          ctx.fillStyle = subtitleStyle.fontColor;
          ctx.strokeStyle = subtitleStyle.strokeColor;
          ctx.lineWidth = subtitleStyle.strokeWidth;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw text with stroke
          const x = canvas.width / 2;
          const y = canvas.height / 2;
          
          ctx.strokeText(currentSegment.text, x, y);
          ctx.fillText(currentSegment.text, x, y);
          
          ctx.restore();
        }
        
        // Continue if video is playing
        if (!video.paused && !video.ended) {
          requestAnimationFrame(renderFrame);
        } else {
          mediaRecorder.stop();
          video.pause();
          audioElement.pause();
        }
      };

      renderFrame();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process video');
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Video Generator</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Script Text
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter your video script here..."
              className="w-full h-32 p-3 border rounded-lg resize-none"
              disabled={loading || processing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              ElevenLabs API Key (optional if set in env)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_..."
              className="w-full p-3 border rounded-lg"
              disabled={loading || processing}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || processing || !script.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            {loading ? 'Generating Audio...' : 'Generate Audio & Subtitles'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {response && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Success!</h3>
              <p className="text-sm text-green-700">
                Generated audio: {(response.audio.size / 1024).toFixed(2)} KB
                <br />
                Words: {response.metadata.wordCount} | Duration: ~{response.metadata.estimatedDuration}s
                <br />
                Subtitle segments: {response.subtitles.segments.length}
              </p>
            </div>

            <div className="space-y-2">
              <audio controls className="w-full">
                <source src={response.audio.dataUrl} type="audio/mpeg" />
              </audio>

              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = response.audio.dataUrl;
                  a.download = `audio-${Date.now()}.mp3`;
                  a.click();
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Download Audio (MP3)
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([response.subtitles.srt], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `subtitles-${Date.now()}.srt`;
                  a.click();
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Download Subtitles (SRT)
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([response.subtitles.webvtt], { type: 'text/vtt' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `subtitles-${Date.now()}.vtt`;
                  a.click();
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                Download Subtitles (WebVTT)
              </button>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Client-Side Video Processing</h3>
              <p className="text-sm text-gray-600 mb-3">
                Upload your base video to render with generated audio and subtitles:
              </p>
              
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && baseVideoRef.current) {
                    const url = URL.createObjectURL(file);
                    baseVideoRef.current.src = url;
                  }
                }}
                className="w-full mb-3 p-2 border rounded"
              />

              <button
                onClick={renderVideoWithSubtitles}
                disabled={processing}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                {processing ? 'Processing Video...' : 'Render Video with Subtitles'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden elements for video processing */}
      <div className="hidden">
        <video ref={baseVideoRef} crossOrigin="anonymous" />
        <video ref={videoRef} />
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
