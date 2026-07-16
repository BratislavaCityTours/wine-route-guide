# =============================================================
#  AUDIO COMPRESSOR - Small Carpathian Wine Route Audio Guide
#
#  Your mp3 files are 128 kbps STEREO - that is music quality
#  for one person speaking. This re-encodes them to 64 kbps MONO,
#  which sounds the same through phone speakers and earbuds
#  but is about HALF the size.
#
#  This does NOT use any ElevenLabs credits. Nothing is
#  re-generated - it only re-packages the files you already have.
#
#  Your original files are MOVED to  audio-original\en  and kept
#  safe. Nothing is deleted.
#
#  HOW TO USE (Windows):
#    1. python -m pip install imageio-ffmpeg
#    2. python tools\compress_audio.py en
#
#  Safe to run again - already-compressed files are skipped.
# =============================================================

import shutil
import subprocess
import sys
from pathlib import Path

BITRATE = "64k"     # speech quality. 48k also fine. 128k = original.
CHANNELS = "1"      # 1 = mono

try:
    import imageio_ffmpeg
except ImportError:
    print("Missing library. Run this first:")
    print("    python -m pip install imageio-ffmpeg")
    sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("Usage: python tools\\compress_audio.py <en|es|fr|it|de>")
        return

    lang = sys.argv[1]
    root = Path(__file__).resolve().parent.parent
    audio_dir = root / "audio" / lang
    backup_dir = root / "audio-original" / lang

    if not audio_dir.exists():
        print(f"ERROR: {audio_dir} not found.")
        return

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    backup_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(audio_dir.glob("*.mp3"))
    if not files:
        print(f"No mp3 files found in {audio_dir}")
        return

    print(f"Found {len(files)} file(s). Compressing to {BITRATE} mono...")
    print(f"Originals will be kept in: {backup_dir}\n")

    before = after = 0
    done = skipped = 0

    for i, f in enumerate(files, 1):
        backup = backup_dir / f.name
        if backup.exists():
            print(f"[{i}/{len(files)}] SKIP (already done): {f.name}")
            skipped += 1
            continue

        size_in = f.stat().st_size
        # move the original out of the way, then encode back into place
        shutil.move(str(f), str(backup))
        try:
            subprocess.run(
                [ffmpeg, "-y", "-loglevel", "error", "-i", str(backup),
                 "-ac", CHANNELS, "-b:a", BITRATE, "-ar", "44100", str(f)],
                check=True,
            )
        except subprocess.CalledProcessError as e:
            shutil.move(str(backup), str(f))   # put it back on failure
            print(f"[{i}/{len(files)}] FAILED, original restored: {f.name} ({e})")
            continue

        size_out = f.stat().st_size
        before += size_in
        after += size_out
        done += 1
        print(f"[{i}/{len(files)}] {f.name}   "
              f"{size_in/1024:,.0f} KB -> {size_out/1024:,.0f} KB")

    print(f"\nCompressed: {done}   Skipped: {skipped}")
    if before:
        print(f"Total: {before/1024/1024:,.1f} MB -> {after/1024/1024:,.1f} MB "
              f"({100 - after/before*100:,.0f}% smaller)")
    print(f"\nOriginals safe in: {backup_dir}")
    print("Do NOT upload the audio-original folder to GitHub.")
    print("\nNow run:  python tools\\update_durations.py " + lang)


if __name__ == "__main__":
    main()
