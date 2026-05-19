import os
import sys
import asyncio

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai_client import ai_client

async def main():
    if ai_client.disabled or not ai_client.client:
        print("AI Client is disabled!")
        return

    print("Groq API Key length:", len(ai_client.api_key))
    print("Client initialized:", ai_client.client)

    # Let's test transcription with a non-existent or empty file,
    # or write a dummy 1-second silent audio file and try to transcribe it.
    # To write a dummy silent wave file:
    import wave
    dummy_path = "dummy_silent.wav"
    with wave.open(dummy_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(8000)
        # 8000 frames = 1 second of silence
        w.writeframes(b"\x00" * 16000)

    try:
        print("Testing with open file directly...")
        with open(dummy_path, "rb") as audio_file:
            transcript = await ai_client.client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3",
                response_format="json",
                language="en",
                temperature=0.0
            )
            print("Direct file transcript output:", transcript)
    except Exception as e:
        print("Direct file failed:", e)

    try:
        print("\nTesting with tuple (filename, file_object)...")
        with open(dummy_path, "rb") as audio_file:
            transcript = await ai_client.client.audio.transcriptions.create(
                file=("dummy_silent.wav", audio_file),
                model="whisper-large-v3",
                response_format="json",
                language="en",
                temperature=0.0
            )
            print("Tuple file transcript output:", transcript)
    except Exception as e:
        print("Tuple file failed:", e)

    if os.path.exists(dummy_path):
        os.remove(dummy_path)

if __name__ == "__main__":
    asyncio.run(main())
