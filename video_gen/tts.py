import os
from dotenv import load_dotenv
import elevenlabs

load_dotenv("video_gen/.env.local")

def generate_audio(script_text: str, output_path: str = "video_gen/output/voice.mp3"):
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise ValueError("ELEVENLABS_API_KEY environment variable not set")
    
    client = elevenlabs.ElevenLabs(api_key=api_key)
    
    # Adam voice with settings for more expressive/emphatic delivery
    voice_id = "pNInz6obpgDQGcFmaJgB"  # Adam
    
    audio_bytes = b"".join(
        client.text_to_speech.convert(
            voice_id=voice_id,
            text=script_text,
            voice_settings={
                "stability": 0.3,
                "similarity_boost": 0.8,
            }
        )
    )
    
    with open(output_path, "wb") as f:
        f.write(audio_bytes)
    
    print(f"Audio saved to {output_path}")
