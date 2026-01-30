import os

from tts import generate_audio
from subtitles import burn_subtitles

def main():
    print("=== Starting Video Pipeline ===")
    
    os.makedirs("video_gen/output", exist_ok=True)
    os.makedirs("video_gen/input", exist_ok=True)
    
    try:
        with open("video_gen/input/script.txt", "r") as f:
            script = f.read()
        print(f"Script loaded: {len(script)} chars, {len(script.split())} words")
    except FileNotFoundError:
        print("Error: video_gen/input/script.txt not found")
        return
    
    try:
        generate_audio(script, "video_gen/output/voice.mp3")
    except Exception as e:
        print(f"TTS Error: {e}")
        return
    
    try:
        burn_subtitles(
            "video_gen/assets/base.mp4",
            script,
            "video_gen/output/final.mp4",
            "video_gen/output/voice.mp3"
        )
    except Exception as e:
        print(f"Subtitle/Encoding Error: {e}")
        return
    
    print("=== Pipeline Complete ===")

if __name__ == "__main__":
    main()
