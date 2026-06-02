import json
import os
import sys


def transcribe_with_faster_whisper(audio_path):
    from faster_whisper import WhisperModel

    model_name = os.environ.get("WHISPER_MODEL", "base")
    speed_mode = os.environ.get("WHISPER_SPEED_MODE", "quality").lower()
    default_beam_size = "3" if speed_mode == "quality" else "1"
    compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
    device = os.environ.get("WHISPER_DEVICE", "cpu")
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        audio_path,
        language=os.environ.get("WHISPER_LANGUAGE", "vi"),
        beam_size=int(os.environ.get("WHISPER_BEAM_SIZE", default_beam_size)),
        best_of=int(os.environ.get("WHISPER_BEST_OF", default_beam_size)),
        temperature=0,
        vad_filter=os.environ.get("WHISPER_VAD_FILTER", "false").lower() == "true",
        condition_on_previous_text=False,
        without_timestamps=True,
    )
    text = " ".join(segment.text.strip() for segment in segments).strip()

    return {
        "engine": "faster-whisper",
        "model": model_name,
        "language": getattr(info, "language", "vi"),
        "transcript": text,
    }


def transcribe_with_openai_whisper(audio_path):
    import whisper

    model_name = os.environ.get("WHISPER_MODEL", "base")
    model = whisper.load_model(model_name)
    result = model.transcribe(
        audio_path,
        language=os.environ.get("WHISPER_LANGUAGE", "vi"),
        fp16=False,
    )

    return {
        "engine": "openai-whisper",
        "model": model_name,
        "language": result.get("language", "vi"),
        "transcript": result.get("text", "").strip(),
    }


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: transcribe-local.py <audio-path>")

    audio_path = sys.argv[1]
    errors = []

    for transcriber in (transcribe_with_faster_whisper, transcribe_with_openai_whisper):
        try:
            print(json.dumps(transcriber(audio_path), ensure_ascii=False))
            return
        except ImportError as error:
            errors.append(str(error))

    raise SystemExit(
        "No local STT engine found. Install one of:\n"
        "  pip install faster-whisper\n"
        "  pip install openai-whisper\n"
        f"Import errors: {' | '.join(errors)}"
    )


if __name__ == "__main__":
    main()
