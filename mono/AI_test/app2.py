import subprocess
import os
import re
import requests # +++ ADDED +++
import json     # +++ ADDED +++
from flask import Flask, request, jsonify, render_template, session
from urllib.parse import urlparse, parse_qs

# import google.generativeai as genai --- REMOVED ---
import PyPDF2
from youtube_transcript_api import YouTubeTranscriptApi

# --- App Configuration ---
app = Flask(__name__)
app.secret_key = '5a6602a8e817bc27572a3859ff87457cd262791ea6a92c9d9f5a7673cbcc6597'

# --- API and Model Configuration ---
# --- REMOVED Gemini API Key and Model Setup ---
LLAMA_CPP_URL = "http://127.0.0.1:8080/v1/chat/completions" # +++ ADDED +++

# --- Helper Functions ---

# +++ ADDED: New function to call the local LLM server +++
# +++ UPDATED: Function to automatically add /no-think +++
def get_local_llm_response(prompt_text):
    """Sends a prompt to the local llama.cpp server and gets a response."""
    
    # Automatically append the command to suppress the <think> block
    prompt_text += " /no-think"

    headers = {
        "Content-Type": "application/json",
    }
    # The payload should be in OpenAI's chat completions format
    data = {
        "model": "local-model", # This can be any string for llama.cpp server
        "messages": [
            {"role": "user", "content": prompt_text}
        ],
        "temperature": 0.7,
    }
    try:
        response = requests.post(LLAMA_CPP_URL, headers=headers, data=json.dumps(data))
        response.raise_for_status()  # Raise an exception for bad status codes
        response_json = response.json()
        content = response_json['choices'][0]['message']['content']
        return content.strip()
    except requests.exceptions.RequestException as e:
        # Return the error message as a string to be displayed to the user
        return f"Error connecting to local LLM server: {e}"

def extract_text_from_pdf(file_stream):
    """Safely extracts text from a PDF file stream."""
    try:
        reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        return f"Error reading PDF: {e}"

def get_video_id_from_url(url):
    """Extracts the YouTube video ID from various URL formats."""
    parsed_url = urlparse(url)
    if parsed_url.hostname == 'youtu.be':
        return parsed_url.path[1:]
    if parsed_url.hostname in ('www.youtube.com', 'youtube.com'):
        if parsed_url.path == '/watch':
            p = parse_qs(parsed_url.query)
            return p.get('v', [None])[0]
    return None

def get_transcript(video_url):
    """
    Fetches a YouTube transcript using yt-dlp.
    """
    temp_filename = "temp_transcript"
    transcript_text = ""
    error_message = None
    transcript_filepath = None

    try:
        # 1. Construct the yt-dlp command
        command = [
            "yt-dlp",
            "--write-auto-sub",  # Get auto-generated subtitles if originals aren't available
            "--sub-lang", "en",      # Specify English
            "--skip-download",     # Don't download the video
            "-o", temp_filename,     # Set the output filename
            video_url
        ]

        # 2. Run the command
        result = subprocess.run(command, check=True, capture_output=True, text=True, encoding='utf-8')

        # 3. Find the downloaded subtitle file (yt-dlp adds extensions)
        for file in os.listdir('.'):
            if file.startswith(temp_filename) and file.endswith(".vtt"):
                transcript_filepath = file
                break
        
        if not transcript_filepath:
            raise FileNotFoundError("Transcript file was not created by yt-dlp.")

        # 4. Read and parse the VTT file to extract only text
        with open(transcript_filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # This regex removes timestamps, formatting tags, and headers
        clean_lines = []
        for line in lines:
            line = re.sub(r'<\d{2}:\d{2}:\d{2}.\d{3}> --> <\d{2}:\d{2}:\d{2}.\d{3}>.*', '', line)
            line = re.sub(r'<[^>]+>', '', line)
            if not line.strip() or line.strip() == 'WEBVTT':
                continue
            clean_lines.append(line.strip())
        
        # Join unique lines to form the final transcript
        transcript_text = " ".join(dict.fromkeys(clean_lines))

    except subprocess.CalledProcessError as e:
        error_message = f"Error: yt-dlp failed. Details: {e.stderr}"
    except FileNotFoundError:
        error_message = "Error: Could not find the downloaded transcript file."
    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
    finally:
        # 5. Clean up the temporary file
        if transcript_filepath and os.path.exists(transcript_filepath):
            os.remove(transcript_filepath)

    return error_message if error_message else transcript_text

def create_master_prompt(content_for_summary):
    """
    Creates a detailed, universal prompt for summarization tasks.
    """
    # This is the universal template we designed above
    prompt_template = f"""
### INSTRUCTIONS ###
You are a knowledgeable expert and skilled writer. Your task is to take the provided content or outline and expand it into a detailed and readable summary.

Use your own knowledge to enrich the content where appropriate. For every point, provide a clear and concise explanation. The final output must be well-structured, accurate, and easy to understand, using markdown for formatting.

### EXAMPLE ###

**Input Template:**
Making a Cup of Tea
- 1. Preparation:
  - Gather ingredients
  - Boil water
- 2. Brewing:
  - Steep the tea bag

**Required Output:**
### Summary of Making a Cup of Tea
- 1. Preparation:
  - Gather ingredients: You will need a teacup, a tea bag of your choice (like black or green tea), and fresh, cold water. Optional ingredients include sugar, milk, lemon, or honey.
  - Boil water: Fill a kettle with the cold water and heat it until it reaches a rolling boil. Using freshly boiled water ensures the best flavor extraction from the tea leaves.
- 2. Brewing:
  - Steep the tea bag: Place the tea bag in your cup and pour the boiling water over it. Allow it to steep for 3-5 minutes, depending on your desired strength, before removing the bag.

### TASK ###
Now, using the instructions and example above, create a detailed summary from the following content:

{content_for_summary}
"""
    return prompt_template

# --- Flask Routes ---

@app.route("/")
def home():
    if 'chat_history' not in session:
        session['chat_history'] = []
    return render_template("index.html", chat_history=session['chat_history'])

@app.route("/ask", methods=["POST"])
def ask_ai():
    user_message = request.form.get("message", "")
    pdf_file = request.files.get("file")
    youtube_url = request.form.get("youtube_url")
    
    # +++ ADD THIS VALIDATION BLOCK +++
    if not user_message and not pdf_file and not youtube_url:
        return jsonify({
            "chat_reply": "Please type a message, upload a file, or provide a YouTube URL.", 
            "summary_content": None
        })
    # +++ END OF BLOCK +++

    context_text = ""
    is_summarization_task = bool(pdf_file or youtube_url)

    # ... the rest of your function continues as before ...

    if pdf_file:
        pdf_text = extract_text_from_pdf(pdf_file.stream)
        context_text += f"\n\n---\n\nContent from PDF:\n{pdf_text}"
    
    if youtube_url:
        transcript = get_transcript(youtube_url)
        if "Error:" in transcript:
            return jsonify({"chat_reply": transcript, "summary_content": None})
        context_text += f"\n\n---\n\nTranscript from YouTube video:\n{transcript}"

    if is_summarization_task:
        # --- MODIFIED ---
        # Combine the user's message and the context from files/URLs
        full_content = f"{user_message}\n\n{context_text}"
        # Call our new function to build the powerful, structured prompt
        final_prompt = create_master_prompt(full_content)
    else:
        # For a conversational model, sending history is important
        chat_history = session.get('chat_history', [])
        # We can create a simple string of history, but the new helper expects a single prompt
        # So we'll combine history and the new message into one big prompt
        history_string = "\n".join(chat_history)
        final_prompt = f"Continue this conversation:\n{history_string}\n\nUser: {user_message}"

    try:
        # --- MODIFIED: Call the local LLM instead of Gemini ---
        ai_reply = get_local_llm_response(final_prompt)

        # Check if the helper function returned an error message
        if ai_reply.startswith("Error connecting to local LLM server:"):
            raise Exception(ai_reply) # Let the main error handler catch it
        
        if is_summarization_task:
            chat_reply = "I've generated a summary of the content you provided."
            summary_content = ai_reply
        else:
            chat_reply = ai_reply
            summary_content = None
            
        chat_history = session.get('chat_history', [])
        if user_message:
            chat_history.append(f"User: {user_message}")
        chat_history.append(f"Bot: {chat_reply}")
        session['chat_history'] = chat_history
        
    except Exception as e:
        chat_reply = f"An error occurred: {str(e)}"
        summary_content = None
        
    return jsonify({"chat_reply": chat_reply, "summary_content": summary_content})

@app.route("/clear", methods=["POST"])
def clear_chat():
    session.pop('chat_history', None)
    return jsonify({"status": "Chat history cleared"})

if __name__ == "__main__":
    app.run(debug=True, port=5000) # Use port 5000 to avoid conflict with llama-server