import os
from flask import Flask, request, jsonify, render_template, session
from urllib.parse import urlparse, parse_qs

import google.generativeai as genai
import PyPDF2
from youtube_transcript_api import YouTubeTranscriptApi
# --- App Configuration ---
app = Flask(__name__)
app.secret_key = 'your_very_secret_and_complex_key_here'

# --- API and Model Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

# --- Helper Functions ---

def extract_text_from_pdf(file_stream):
    """Safely extracts text from a PDF file stream."""
    try:
        reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""  # Added fallback for empty pages
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
    Robustly fetches a YouTube transcript using the updated library's features.
    """
    try:
        video_id = get_video_id_from_url(video_url)
        if not video_id:
            return "Error: Invalid YouTube URL."

        # CORRECT USAGE: Call list_transcripts directly on the class
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Find an English transcript (manual or auto-generated)
        transcript = None
        for tx in transcript_list:
            if 'en' in tx.language_code:
                transcript = tx
                break
        
        if not transcript:
            return "Error: No English transcript found for this video."

        # Fetch the full transcript data and format it
        transcript_data = transcript.fetch()
        transcript_text = " ".join([item['text'] for item in transcript_data])
        return transcript_text

    except Exception as e:
        return f"Error: Could not retrieve transcript. Details: {e}"

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
    
    context_text = ""
    is_summarization_task = bool(pdf_file or youtube_url)

    if pdf_file:
        pdf_text = extract_text_from_pdf(pdf_file.stream)
        context_text += f"\n\n---\n\nContent from PDF:\n{pdf_text}"
    
    if youtube_url:
        # FIXED: Calling the correct get_transcript function
        transcript = get_transcript(youtube_url)
        if "Error:" in transcript:
            return jsonify({"chat_reply": transcript, "summary_content": None})
        context_text += f"\n\n---\n\nTranscript from YouTube video:\n{transcript}"

    if is_summarization_task:
        final_prompt = f"Please provide a detailed, well-structured summary of the following content. Use markdown for formatting like bullet points and bolding for key terms. The user also asked: '{user_message}'.\n\n{context_text}"
    else:
        chat_history = session.get('chat_history', [])
        final_prompt = "\n".join(chat_history) + f"\n\nUser: {user_message}"

    try:
        response = model.generate_content(final_prompt)
        ai_reply = response.text
        
        if is_summarization_task:
            chat_reply = "I've generated a summary of the content you provided."
            summary_content = ai_reply
        else:
            chat_reply = ai_reply
            summary_content = None
            
        chat_history = session.get('chat_history', [])
        if user_message: # Only add user message to history if it exists
            chat_history.append(f"User: {user_message}")
        chat_history.append(f"Bot: {chat_reply}")
        session['chat_history'] = chat_history
        
    except Exception as e:
        chat_reply = f"Error from AI model: {str(e)}"
        summary_content = None
        
    return jsonify({"chat_reply": chat_reply, "summary_content": summary_content})

@app.route("/clear", methods=["POST"])
def clear_chat():
    session.pop('chat_history', None)
    return jsonify({"status": "Chat history cleared"})

if __name__ == "__main__":
    app.run(debug=True)