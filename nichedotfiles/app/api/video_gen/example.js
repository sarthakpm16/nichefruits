// Example usage of the video generation API
// Run with: node example.js

const fs = require('fs');

async function generateVideo() {
  const script = `
    Welcome to this amazing tutorial! Today we're going to explore 
    the fascinating world of automated video generation. This technology 
    combines artificial intelligence with video processing to create 
    engaging content automatically. Let's dive in and see what's possible!
  `.trim();

  console.log('Calling video generation API...');
  
  const response = await fetch('http://localhost:3000/api/video_gen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: script,
      // elevenlabsApiKey: 'your_key_here', // Optional if set in env
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Error:', error);
    return;
  }

  // Check if response is JSON (fallback mode) or video
  const contentType = response.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    // Fallback mode - got audio and subtitles separately
    const data = await response.json();
    console.log('Received fallback data:', data);
    
    // Save audio
    if (data.audio?.base64) {
      const audioBuffer = Buffer.from(data.audio.base64, 'base64');
      fs.writeFileSync('output-audio.mp3', audioBuffer);
      console.log('Audio saved to: output-audio.mp3');
    }
    
    // Save subtitles
    if (data.subtitles?.srt) {
      fs.writeFileSync('output-subtitles.srt', data.subtitles.srt);
      console.log('Subtitles saved to: output-subtitles.srt');
    }
    
    console.log('\nNext steps:');
    console.log('1. Install FFmpeg dependencies: npm install');
    console.log('2. Or manually combine with: ffmpeg -i base.mp4 -i output-audio.mp3 -vf subtitles=output-subtitles.srt output.mp4');
    
  } else {
    // Success - got complete video
    const videoBuffer = await response.arrayBuffer();
    const filename = `output-${Date.now()}.mp4`;
    fs.writeFileSync(filename, Buffer.from(videoBuffer));
    console.log(`Video saved to: ${filename}`);
    console.log(`Size: ${(videoBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
  }
}

generateVideo().catch(console.error);
