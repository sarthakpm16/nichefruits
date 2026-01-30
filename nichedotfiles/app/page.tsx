'use client';

import MacBookScreen from './components/MacBookScreen';
import Image from 'next/image';
import { useState } from 'react';

interface PipelineStep {
  name: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  result?: string;
  error?: string;
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoDownloadUrl, setVideoDownloadUrl] = useState<string | null>(null);
  
  const [steps, setSteps] = useState<PipelineStep[]>([
    { name: 'Scanning repository for vulnerabilities', status: 'pending' },
    { name: 'Generating summary from findings', status: 'pending' },
    { name: 'Creating video with TTS and subtitles', status: 'pending' },
  ]);

  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const day = now.getDate();
  const year = now.getFullYear();
  const time = now.toLocaleString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  
  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  const formattedDate = `Modified ${month} ${getOrdinal(day)}, ${year} at ${time}`;

  const updateStep = (index: number, updates: Partial<PipelineStep>) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setIsProcessing(true);
    setVideoDownloadUrl(null);

    // Reset steps
    setSteps([
      { name: 'Scanning repository for vulnerabilities', status: 'pending' },
      { name: 'Generating summary from findings', status: 'pending' },
      { name: 'Creating video with TTS and subtitles', status: 'pending' },
    ]);

    try {
      // Step 1: Vulnfinder
      updateStep(0, { status: 'loading' });
      console.log('Step 1: Calling vulnfinder...');
      
      const vulnResponse = await fetch('/api/vulnfinder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      if (!vulnResponse.ok) {
        const error = await vulnResponse.json();
        throw new Error(`Vulnfinder: ${error.error || 'Failed to scan repository'}`);
      }

      const vulnData = await vulnResponse.json();
      const markdown = vulnData.markdown;
      
      updateStep(0, { 
        status: 'complete', 
        result: `Found ${vulnData.vulnerabilities?.length || 0} vulnerabilities in ${vulnData.filesScanned} files`
      });

      // Step 2: Summarizer
      updateStep(1, { status: 'loading' });
      console.log('Step 2: Calling summarizer...');
      
      const summaryResponse = await fetch('/api/summarizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdownContent: markdown }),
      });

      if (!summaryResponse.ok) {
        const error = await summaryResponse.json();
        throw new Error(`Summarizer: ${error.error || 'Failed to generate summary'}`);
      }

      const summaryData = await summaryResponse.json();
      const summary = summaryData.script; // API returns 'script' not 'summary'
      
      updateStep(1, { 
        status: 'complete', 
        result: `Generated ${summaryData.wordCount || 0} word script`
      });

      // Step 3: Video Generator (TTS + Client-side merge)
      updateStep(2, { status: 'loading' });
      console.log('Step 3: Generating TTS audio...');
      
      const videoResponse = await fetch('/api/video_gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: summary }),
      });

      if (!videoResponse.ok) {
        const error = await videoResponse.json();
        throw new Error(`Video Gen: ${error.error || 'Failed to generate audio'}`);
      }

      const data = await videoResponse.json();
      
      if (!data.audio?.base64) {
        throw new Error('No audio returned from API');
      }

      // Convert base64 to blobs
      const audioBytes = Uint8Array.from(atob(data.audio.base64), c => c.charCodeAt(0));
      
      if (data.baseVideo?.base64) {
        // Try client-side video processing with ffmpeg.wasm
        try {
          console.log('Loading ffmpeg.wasm for client-side processing...');
          
          const { FFmpeg } = await import('@ffmpeg/ffmpeg');
          const { toBlobURL } = await import('@ffmpeg/util');
          
          const ffmpeg = new FFmpeg();
          
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          
          console.log('ffmpeg.wasm loaded, processing...');
          
          const videoBytes = Uint8Array.from(atob(data.baseVideo.base64), c => c.charCodeAt(0));
          
          await ffmpeg.writeFile('input.mp4', videoBytes);
          await ffmpeg.writeFile('audio.mp3', audioBytes);
          
          await ffmpeg.exec([
            '-i', 'input.mp4',
            '-i', 'audio.mp3',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-shortest',
            '-y',
            'output.mp4'
          ]);
          
          const outputData = await ffmpeg.readFile('output.mp4');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const videoBlob = new Blob([outputData as any], { type: 'video/mp4' });
          const url = URL.createObjectURL(videoBlob);
          setVideoDownloadUrl(url);
          
          updateStep(2, { 
            status: 'complete', 
            result: `Video created (${(videoBlob.size / 1024 / 1024).toFixed(2)} MB)`
          });
          
        } catch (ffmpegError) {
          console.error('Client-side video processing failed:', ffmpegError);
          // Fallback to audio only
          const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(audioBlob);
          setVideoDownloadUrl(url);
          
          updateStep(2, { 
            status: 'complete', 
            result: 'Audio only (video processing failed in browser)'
          });
        }
      } else {
        // No base video, just return audio
        const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(audioBlob);
        setVideoDownloadUrl(url);
        
        updateStep(2, { 
          status: 'complete', 
          result: 'Audio generated (no base video available)'
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Pipeline error:', errorMessage);
      
      // Find which step failed and mark it
      const failedStepIndex = steps.findIndex(s => s.status === 'loading');
      if (failedStepIndex >= 0) {
        updateStep(failedStepIndex, { 
          status: 'error', 
          error: errorMessage 
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setVideoDownloadUrl(null);
    setSteps([
      { name: 'Scanning repository for vulnerabilities', status: 'pending' },
      { name: 'Generating summary from findings', status: 'pending' },
      { name: 'Creating video with TTS and subtitles', status: 'pending' },
    ]);
  };

  const allStepsComplete = steps.every(s => s.status === 'complete');
  const hasError = steps.some(s => s.status === 'error');

  return (
    <MacBookScreen className={`${isProcessing || videoDownloadUrl ? 'h-[70vh] w-3/4' : 'h-[50vh] w-2/3'} max-w-6xl mx-auto transition-all duration-300`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-200">
          <Image 
            src="/file-icon.png" 
            alt="File icon" 
            width={48} 
            height={48}
          />
          <div className="flex-1">
            <h1 className="text-3xl">
              <span className="font-medium" style={{ fontFamily: 'var(--font-rethink-sans)' }}>
                niche
              </span>
              <span className="font-bold" style={{ fontFamily: 'var(--font-rethink-sans)' }}>
                .files
              </span>
            </h1>
            <p className="text-xs text-zinc-600" style={{ fontFamily: 'var(--font-inter)' }}>
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Input form */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-zinc-900">
                Security Video Generator
              </h2>
              <p className="text-sm text-zinc-600">
                Automatically scan a GitHub repo, summarize vulnerabilities, and generate an explanatory video
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                />
              </div>

              <button
                type="submit"
                disabled={!repoUrl || isProcessing}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 text-white font-semibold rounded-lg transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Generate Security Video'}
              </button>
            </form>

            {/* Pipeline steps */}
            {(isProcessing || videoDownloadUrl || hasError) && (
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-semibold text-zinc-700">Pipeline Status</h3>
                
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {step.status === 'pending' && (
                        <div className="w-5 h-5 rounded-full border-2 border-zinc-300"></div>
                      )}
                      {step.status === 'loading' && (
                        <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                      )}
                      {step.status === 'complete' && (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {step.status === 'error' && (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{step.name}</p>
                      {step.result && (
                        <p className="text-xs text-green-700 mt-1">{step.result}</p>
                      )}
                      {step.error && (
                        <p className="text-xs text-red-700 mt-1">{step.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Download button */}
            {videoDownloadUrl && allStepsComplete && (
              <div className="space-y-3 pt-2">
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <h3 className="font-bold text-green-900 mb-2">✅ Video Ready!</h3>
                  <p className="text-sm text-green-800 mb-4">
                    Your security analysis video has been generated successfully.
                  </p>
                  <a
                    href={videoDownloadUrl}
                    download={`security-video-${Date.now()}.mp4`}
                    className="block w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-center"
                  >
                    Download Video
                  </a>
                </div>

                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  Generate Another Video
                </button>
              </div>
            )}

            {/* Error state with retry */}
            {hasError && (
              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                >
                  Reset and Try Again
                </button>
              </div>
            )}

           
          </div>
        </div>
      </div>
    </MacBookScreen>
  );
}
