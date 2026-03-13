import whisper
import sys

def transcribe(audio_path):
    print(f"Loading Whisper model (tiny.en)...")
    model = whisper.load_model("tiny.en")
    print(f"Transcribing {audio_path}...")
    result = model.transcribe(audio_path)
    print("TRANSCRIPTION_RESULT:\n")
    print(result["text"])

if __name__ == "__main__":
    if len(sys.argv) > 1:
        transcribe(sys.argv[1])
    else:
        print("Please provide the path to the audio file.")
