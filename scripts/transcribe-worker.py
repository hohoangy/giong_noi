import json
import os
import sys
import time
import traceback


def load_engine():
    model_name = os.environ.get("WHISPER_MODEL", "base")
    language = os.environ.get("WHISPER_LANGUAGE", "vi")

    try:
        from faster_whisper import WhisperModel

        compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
        device = os.environ.get("WHISPER_DEVICE", "cpu")
        model = WhisperModel(model_name, device=device, compute_type=compute_type)

        def transcribe(audio_path):
            segments, info = model.transcribe(
                audio_path,
                language=language,
                beam_size=int(os.environ.get("WHISPER_BEAM_SIZE", "1")),
                vad_filter=os.environ.get("WHISPER_VAD_FILTER", "true").lower() != "false",
                condition_on_previous_text=False,
            )
            text = " ".join(segment.text.strip() for segment in segments).strip()

            return {
                "engine": "faster-whisper",
                "model": model_name,
                "language": getattr(info, "language", language),
                "transcript": text,
            }

        return transcribe
    except ImportError as faster_whisper_error:
        try:
            import whisper

            model = whisper.load_model(model_name)

            def transcribe(audio_path):
                result = model.transcribe(
                    audio_path,
                    language=language,
                    fp16=False,
                    condition_on_previous_text=False,
                )

                return {
                    "engine": "openai-whisper",
                    "model": model_name,
                    "language": result.get("language", language),
                    "transcript": result.get("text", "").strip(),
                }

            return transcribe
        except ImportError as openai_whisper_error:
            raise RuntimeError(
                "No local STT engine found. Install faster-whisper or openai-whisper. "
                f"Import errors: {faster_whisper_error} | {openai_whisper_error}"
            )


def write_message(payload):
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def main():
    try:
        started_at = time.perf_counter()
        transcribe = load_engine()
        write_message({"type": "ready", "model_load_ms": round((time.perf_counter() - started_at) * 1000)})
    except Exception as error:
        write_message({"type": "error", "error": str(error)})
        return

    for line in sys.stdin:
        try:
            request = json.loads(line)
            request_id = request.get("id")
            audio_path = request.get("audioPath")

            if not audio_path:
                raise ValueError("audioPath is required.")

            result = transcribe(audio_path)
            write_message({"type": "result", "id": request_id, "result": result})
        except Exception as error:
            write_message({
                "type": "result",
                "id": request.get("id") if "request" in locals() else None,
                "error": str(error),
                "trace": traceback.format_exc(),
            })


if __name__ == "__main__":
    main()
