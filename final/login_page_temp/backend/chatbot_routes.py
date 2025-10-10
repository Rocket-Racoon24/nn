# chatbot_routes.py
from flask import Blueprint, request, jsonify, session
import subprocess
import os
import re
from urllib.parse import urlparse
import PyPDF2
from utils import get_local_llm_response # <-- Import from our new utils file

chatbot_bp = Blueprint('chatbot_bp', __name__)

# --- Helper Functions (specific to chatbot) ---
def extract_text_from_pdf(file_stream):
    # ... (this function remains the same)
    try:
        reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        return f"Error reading PDF: {e}"

def get_transcript(video_url):
    # ... (this function remains the same, but simplified for clarity)
    try:
        command = ["yt-dlp", "--write-auto-sub", "--sub-lang", "en", "--skip-download", "-o", "temp_transcript", video_url]
        subprocess.run(command, check=True, capture_output=True, text=True, encoding='utf-8')
        
        transcript_filepath = None
        for file in os.listdir('.'):
            if file.startswith("temp_transcript") and file.endswith(".vtt"):
                transcript_filepath = file
                break
        
        if not transcript_filepath:
            return "Error: Transcript file not found."

        with open(transcript_filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        os.remove(transcript_filepath) # Clean up

        clean_lines = [re.sub(r'<[^>]+>', '', line).strip() for line in lines if not re.match(r'^\s*$', line) and '-->' not in line and 'WEBVTT' not in line]
        return " ".join(dict.fromkeys(clean_lines))

    except Exception as e:
        return f"An error occurred with yt-dlp: {e}"

def create_master_prompt(content_for_summary):
    # ... (this function remains the same)
    return f"""
### INSTRUCTIONS ###
You are a knowledgeable expert. Take the provided content and create a detailed, readable summary using markdown.
### TASK ###
Create a detailed summary from the following content:
{content_for_summary}
"""

def create_chat_prompt(user_message, bot_name="Xiao"):
    """
    Creates a prompt that gives the AI a name and personality.
    """
    return f"""
    ### INSTRUCTIONS ###
    You are a helpful and friendly assistant named {bot_name}.
    Your personality is curious, cheerful, witty and has a touch of humor.
    Always respond as {bot_name}. Do not reveal you are an AI model.

    ### USER MESSAGE ###
    {user_message}
    """

# --- Routes ---
@chatbot_bp.route("/ask", methods=["POST"])
def ask_ai():
    user_message = request.form.get("message", "")
    pdf_file = request.files.getlist("file")
    youtube_url = request.form.get("youtube_url")

    if not user_message and not pdf_file and not youtube_url:
        return jsonify({"chat_reply": "Please provide a message, file, or URL.", "summary_content": None})

    context_text = ""
    is_summarization_task = bool(pdf_file or youtube_url)

    for pdf_file in pdf_file:
        context_text += f"\n\n--- PDF Content ---\n{extract_text_from_pdf(pdf_file.stream)}"
    if youtube_url:
        transcript = get_transcript(youtube_url)
        if "Error:" in transcript:
            return jsonify({"chat_reply": transcript, "summary_content": None})
        context_text += f"\n\n--- YouTube Transcript ---\n{transcript}"

    if is_summarization_task:
        final_prompt = create_master_prompt(f"{user_message}\n{context_text}")
    else:
        # Use our new function to give the bot its name and personality
        final_prompt = create_chat_prompt(user_message, bot_name="Xiao")
    
    try:
        ai_reply = get_local_llm_response(final_prompt)
        
        if is_summarization_task:
            chat_reply = "I've generated a summary of the content you provided."
            summary_content = ai_reply
        else:
            chat_reply = ai_reply
            summary_content = None
        
        return jsonify({"chat_reply": chat_reply, "summary_content": summary_content})
    except Exception as e:
        return jsonify({"chat_reply": f"An error occurred: {str(e)}", "summary_content": None})

@chatbot_bp.route("/clear", methods=["POST"])
def clear_chat():
    session.pop('chat_history', None)
    return jsonify({"status": "Chat history cleared"})