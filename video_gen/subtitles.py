import os
import moviepy.config as mp_config
from moviepy.editor import VideoFileClip, AudioFileClip, TextClip, CompositeVideoClip

# Configure ImageMagick path for MoviePy
mp_config.IMAGEMAGICK_BINARY = r"C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe"

def burn_subtitles(video_path: str, script_text: str, output_path: str, audio_path: str = None):
    video = VideoFileClip(video_path)
    duration = video.duration
    
    words = script_text.split()
    num_words = len(words)
    words_per_sec = 2.5
    
    subtitle_clips = []
    
    for i in range(num_words):
        start_time = i / words_per_sec
        end_time = start_time + 0.8
        
        if start_time >= duration:
            break
        
        # Get words for context
        end_idx = min(i + 5, num_words)
        text = " ".join(words[i:end_idx])
        
        try:
            txt = (TextClip(
                text,
                fontsize=60,
                color='white',
                stroke_color='black',
                stroke_width=3,
                font='Arial-Bold',
                size=(video.w - 100, None),
                method='label'
            )
            .with_position(('center', video.h // 2))
            .with_start(start_time)
            .with_end(end_time))
            
            subtitle_clips.append(txt)
        except Exception as e:
            print(f"Warning: Could not create subtitle clip: {e}")
    
    # Combine video with subtitles
    final_video = CompositeVideoClip([video] + subtitle_clips)
    
    # Add audio if provided
    if audio_path and os.path.exists(audio_path):
        try:
            audio = AudioFileClip(audio_path)
            final_video = final_video.set_audio(audio)
        except Exception as e:
            print(f"Warning: Could not load audio: {e}")
    
    # Write final video
    final_video.write_videofile(
        output_path,
        codec='libx264',
        audio_codec='aac',
        fps=24,
        logger=None
    )
    
    video.close()
    for clip in subtitle_clips:
        clip.close()
    
    print(f"Final video saved to {output_path}")
