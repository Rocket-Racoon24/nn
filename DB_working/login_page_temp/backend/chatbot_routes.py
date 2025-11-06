# chatbot_routes.py
from flask import Blueprint, request, jsonify, session
import PyPDF2
import json
import re
from utils import get_local_llm_response, LLMConnectionError
from db_operations import DatabaseOperations
from auth_routes import token_required

chatbot_bp = Blueprint('chatbot_bp', __name__)

# --- Helper Functions (specific to chatbot) ---
def extract_text_from_pdf(file_stream):
    # ... (function is unchanged) ...
    try:
        reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        return f"Error reading PDF: {e}"

def create_master_prompt(content_for_summary):
    # ... (function is unchanged) ...
    return f"""
# 答 Expert Summary Generation Protocol
## ROLE
You are an expert **Academic Summarizer and Technical Writer**. Your task is to analyze the provided content (e.g., a textbook chapter, research paper, or technical document) and generate a **comprehensive, high-quality, and highly readable summary**. Your analysis must be deep, extracting core concepts, distinguishing key themes, and noting practical implications.
## GOAL
Produce a summary that is **superior in depth, clarity, and utility** to a basic auto-generated summary. The final output must serve as an excellent study guide, a quick reference for a professional, or a comprehensive overview for an instructor.
## AUDIENCE
The target audience is a **Graduate Student or a Mid-to-Senior Level Professional** in the field (e.g., Data Science, Software Engineering, etc.). Assume they have a foundational understanding but need a concise, detailed, and structured review of the document's most critical information.
## INSTRUCTIONS FOR CONTENT AND TONE
1.  **Prioritize Core Value:** Identify and extract the **most critical, non-obvious concepts** and the fundamental mathematical or algorithmic principles discussed. Do not waste space on overly generic filler text.
2.  **Highlight Structure and Thesis:** The summary must clearly delineate the book's/document's overall **thesis, primary goal, and organizational structure**. Explain *why* the authors structured the material as they did.
3.  **Use Active Synthesis:** Do not merely list section titles. Instead, synthesize the content under key thematic headings. For example, group related algorithms or principles together and explain their collective purpose.
4.  **Define and Apply:** For every major concept (e.g., 'Bayes' Rule', 'Central Limit Theorem'), provide a **concise, technical definition** and a brief, real-world or theoretical **application/significance**.
5.  **Maintain Professional Tone:** The tone should be **authoritative, clear, and objective**. Use technical vocabulary correctly and confidently.
## MANDATORY MARKDOWN OUTPUT FORMAT
Structure the summary using the following specific hierarchy. **Use bolding (`**...**`) judiciously for key terms.**
---
# Summary of "[Document Title or Source]" by [Author(s)]
## 庁 Executive Summary & Document Thesis
* A 2-3 sentence overview covering the document's central argument, scope, and target impact.
## 泊 Core Themes and Structural Blueprint
* A bulleted list explaining the logical flow and main sections/parts of the document.
---
## 溌 In-Depth Analysis: [Major Theme 1 - e.g., Foundations of Machine Learning]
### [Sub-Concept A: The Theory - e.g., Probability Theory]
* **Definition/Principle:** [Technical explanation of the concept.]
* **Significance/Role:** [Why this concept is critical in the domain.]
### [Sub-Concept B: The Application - e.g., Basic Algorithms]
* **Key Algorithms/Methods:** A list of the central algorithms discussed.
    * *Algorithm Name 1:* [Brief explanation and when to use it.]
    * *Algorithm Name 2:* [Brief explanation and when to use it.]
---
## 嶋 Broader Implications and Next Steps
* **Practical Takeaways:** The 2-3 most valuable lessons for a practicing professional.
* **Open Questions/Future Work (if applicable):** Note any limitations or areas the document suggests for future exploration.
---
**End of Summary.**
### CONTENT TO BE SUMMARIZED ###
{content_for_summary}
"""

def create_chat_prompt(user_message, is_new_conversation=True, bot_name="Xiao"):
    # ... (function is unchanged) ...
    greeting_instruction = ""
    if is_new_conversation:
        greeting_instruction = f"""* **Initial Greeting:** Use a **short, one-sentence introduction** (e.g., "Hi! I'm {bot_name}, how can I help today?")."""
    else:
        greeting_instruction = f"""* **No Greeting:** This is an ongoing conversation. **Do not** introduce yourself."""

    return f"""
    ### INSTRUCTIONS ###
    You are a **helpful and concise assistant** named {bot_name}.
    **Personality Profile:**
    * **Tone:** **Cheerful, witty, and curious.**
    {greeting_instruction}
    * **Conciseness Rule:** **Be brief and to the point.** Do not offer extra information or elaborate on topics unless explicitly asked by the user. Answer the question asked, and then stop.
    * **Identity:** Always respond naturally as {bot_name}. Do not reveal you are an AI model.
    ### USER MESSAGE ###
    {user_message}
    """

# --- MODIFIED FUNCTION ---
# This prompt now focuses on clarity and structure, not just length.
def create_explanation_prompt(user_message, bot_name="Xiao"):
    """
    Creates a prompt for a detailed, structured, and clear explanation, 
    triggered by 'explain: [...]' from text selection.
    """
    return f"""
    ### INSTRUCTIONS ###
    You are a **knowledgeable, helpful, and clear assistant** named {bot_name}.
    
    **Special Task: In-Depth Explanation**
    The user has selected text and asked for a detailed explanation. Your goal is to provide a comprehensive, structured, and easy-to-understand answer.

    **Personality Profile:**
    * **Tone:** **Helpful, clear, and professional, with a touch of cheerfulness.**
    * **Greeting:** **DO NOT** use any greeting or introduction (e.g., "Hi, I'm Xiao..."). Dive *directly* into the explanation.
    * **Detail Rule:** **Provide a comprehensive, well-structured answer.** Do not just write one line. Use headings (##) and bullet points (*) to organize the information clearly.
    * **Content:**
        1.  Start with a **concise definition** of the term.
        2.  Explain its **primary purpose** (the "why").
        3.  List its **key benefits** (e.g., cost, efficiency, scalability).
        4.  Provide a **clear, practical example**.
    * **Clarity over Length:** Focus on being **clear and understandable**, not just long. Avoid excessive, confusing analogies or conversational fluff.
    * **Identity:** Always respond naturally as {bot_name}. Do not reveal you are an AI model.

    ### USER MESSAGE (Explain this in detail) ###
    {user_message}
    """

# --- Routes ---
@chatbot_bp.route("/ask", methods=["POST"])
@token_required
def ask_ai():
    # ... (rest of the route is unchanged) ...
    user_message = request.form.get("message", "")
    pdf_files = request.files.getlist("files")
    conversation_history_json = request.form.get("conversation_history", "[]")
    user_email = request.user['email']

    if not user_message and not pdf_files:
        return jsonify({"chat_reply": "Please provide a message or file.", "summary_content": None})

    try:
        conversation_history = json.loads(conversation_history_json) if conversation_history_json else []
    except:
        conversation_history = []

    context_text = ""
    is_summarization_task = bool(pdf_files)

    pdf_names = []
    for pdf_file in pdf_files:
        pdf_name = pdf_file.filename
        pdf_names.append(pdf_name)
        pdf_text = extract_text_from_pdf(pdf_file.stream)
        if "Error reading PDF" in pdf_text:
            return jsonify({"chat_reply": pdf_text, "summary_content": None})
        context_text += f"\n\n--- PDF Content ({pdf_name}) ---\n{pdf_text}"

    if is_summarization_task:
        final_prompt = create_master_prompt(f"{user_message}\n{context_text}")
    
    elif user_message.strip().startswith("explain:"):
        # This will now use the new, clearer 'create_explanation_prompt'
        final_prompt = create_explanation_prompt(user_message, bot_name="Xiao")
    
    else:
        is_new_conversation = len(conversation_history) == 0
        history_context = ""
        if conversation_history:
            history_context = "\n\n### CONVERSATION HISTORY ###\n"
            for msg in conversation_history[-5:]:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                history_context += f"{role.capitalize()}: {content}\n"
            history_context += "\n### CURRENT USER MESSAGE ###\n"
        
        final_prompt = create_chat_prompt(
            f"{history_context}{user_message}", 
            is_new_conversation=is_new_conversation, 
            bot_name="Xiao"
        )
    
    try:
        ai_reply = get_local_llm_response(final_prompt)
        
        if is_summarization_task:
            chat_reply = "I've generated a summary of the content you provided."
            summary_content = ai_reply
            
            for pdf_name in pdf_names:
                DatabaseOperations.save_pdf_summary(user_email, pdf_name, summary_content)
        else:
            chat_reply = ai_reply
            summary_content = None
        
        return jsonify({"chat_reply": chat_reply, "summary_content": summary_content})
    except LLMConnectionError as e:
        return jsonify({"chat_reply": "AI is offline. Please start the LLM server on port 8080 and try again.", "summary_content": None}), 503
    except Exception as e:
        return jsonify({"chat_reply": f"An error occurred: {str(e)}", "summary_content": None}), 500

# ... (Rest of your routes are unchanged) ...

@chatbot_bp.route("/clear", methods=["POST"])
@token_required
def clear_chat():
    user_email = request.user['email']
    session.pop('chat_history', None)
    return jsonify({"status": "Chat history cleared"})

@chatbot_bp.route("/get_chat_history", methods=["GET"])
@token_required
def get_chat_history():
    user_email = request.user['email']
    chat_history = DatabaseOperations.get_user_chat_history(user_email)
    return jsonify({"chat_history": chat_history}), 200

@chatbot_bp.route("/get_pdf_summaries", methods=["GET"])
@token_required
def get_pdf_summaries():
    user_email = request.user['email']
    pdf_summaries = DatabaseOperations.get_user_pdf_summaries(user_email)
    return jsonify({"pdf_summaries": pdf_summaries}), 200

@chatbot_bp.route("/get_pdf_summary/<pdf_name>", methods=["GET"])
@token_required
def get_pdf_summary(pdf_name):
    user_email = request.user['email']
    pdf_summary = DatabaseOperations.get_pdf_summary_by_name(user_email, pdf_name)
    if pdf_summary:
        return jsonify({"pdf_summary": pdf_summary}), 200
    else:
        return jsonify({"error": "PDF summary not found"}), 404

@chatbot_bp.route("/delete_pdf_summary/<pdf_name>", methods=["DELETE"])
@token_required
def delete_pdf_summary(pdf_name):
    user_email = request.user['email']
    success = DatabaseOperations.delete_pdf_summary(user_email, pdf_name)
    if success:
        return jsonify({"status": "PDF summary deleted successfully"}), 200
    else:
        return jsonify({"error": "PDF summary not found"}), 404

@chatbot_bp.route("/generate_flashcards/<pdf_name>", methods=["POST"])
@token_required
def generate_flashcards(pdf_name):
    user_email = request.user['email']
    
    try:
        pdf_summary = DatabaseOperations.get_pdf_summary_by_name(user_email, pdf_name)
        if not pdf_summary:
            return jsonify({"error": "PDF summary not found"}), 404
        
        summary_content = pdf_summary.get("summary_content", "")
        if not summary_content:
            return jsonify({"error": "No summary content available"}), 400
        
        flashcard_prompt = f"""
### INSTRUCTIONS ###
You are an expert educator. Create flashcards from the provided summary content.
Generate flashcards in JSON format. Each flashcard should have a "question" and "answer" field.
The questions should test understanding of key concepts, definitions, and important information.
The answers should be concise but informative.
Output ONLY a valid JSON array. Example format:
[
  {{"question": "What is the main concept?", "answer": "The main concept is..."}},
  {{"question": "Define term X", "answer": "Term X is defined as..."}}
]
Generate 10-15 flashcards based on the importance of the content.
### SUMMARY CONTENT ###
{summary_content}
"""
        
        response_str = get_local_llm_response(flashcard_prompt)
        
        match = re.search(r'\[.*\]', response_str, re.DOTALL)
        if not match:
            return jsonify({"error": "Could not parse flashcards from AI response"}), 500
        
        flashcards = json.loads(match.group(0))
        
        if not isinstance(flashcards, list):
            return jsonify({"error": "Invalid flashcards format"}), 500
        
        DatabaseOperations.save_flashcards(user_email, pdf_name, flashcards)
        
        return jsonify({"flashcards": flashcards}), 200
    except LLMConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except json.JSONDecodeError as e:
        return jsonify({"error": f"Failed to parse flashcards: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@chatbot_bp.route("/get_flashcards/<pdf_name>", methods=["GET"])
@token_required
def get_flashcards(pdf_name):
    user_email = request.user['email']
    flashcards = DatabaseOperations.get_flashcards(user_email, pdf_name)
    return jsonify({"flashcards": flashcards}), 200