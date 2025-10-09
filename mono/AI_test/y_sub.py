import yt_dlp
import os

# Paste the YouTube video URL here
video_url = input("Enter the YouTube video URL: ")

# --- Options for yt-dlp ---
# This dictionary tells yt-dlp what to do.
ydl_opts = {
    # 1. We want the auto-generated subtitles (captions)
    'writeautomaticsub': True,
    
    # Use 'writesubtitles': True, if you want manually uploaded subtitles instead
    'writesubtitles': True, 

    # 2. We only want the subtitle, not the video or audio
    'skip_download': True,
    
    # 3. Specify the language of the subtitles you want (e.g., 'en' for English)
    'subtitleslangs': ['en'],
    
    # 4. Give the subtitle file a simple, predictable name
    'outtmpl': 'subtitle_file_temp',
    
    # 5. Suppress yt-dlp's own console output to keep things clean
    'quiet': True,
}

subtitle_file_path = None
try:
    # --- Downloading the subtitle ---
    print("\nFetching subtitles...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([video_url])

    # Find the downloaded subtitle file (it's usually a .vtt file)
    # The actual filename will be something like 'subtitle_file_temp.en.vtt'
    lang = ydl_opts['subtitleslangs'][0]
    expected_filename = f"subtitle_file_temp.{lang}.vtt"

    if os.path.exists(expected_filename):
        subtitle_file_path = expected_filename
        # --- Reading and Printing the Subtitle Content ---
        with open(subtitle_file_path, 'r', encoding='utf-8') as f:
            print("\n--- SUBTITLES START ---\n")
            print(f.read())
            print("\n--- SUBTITLES END ---\n")
    else:
        print(f"\nCould not find subtitles for the language '{lang}'.")
        print("The video may not have subtitles or they might be in a different format.")

finally:
    # --- Cleaning up the downloaded file ---
    # This part runs whether the script succeeds or fails.
    if subtitle_file_path and os.path.exists(subtitle_file_path):
        os.remove(subtitle_file_path)
        print(f"Cleaned up temporary file: {subtitle_file_path}")