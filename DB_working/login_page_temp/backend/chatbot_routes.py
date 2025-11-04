# chatbot_routes.py
from flask import Blueprint, request, jsonify, session
import PyPDF2
from utils import get_local_llm_response, LLMConnectionError
from db_operations import DatabaseOperations
from auth_routes import token_required

chatbot_bp = Blueprint('chatbot_bp', __name__)

# --- Helper Functions (specific to chatbot) ---
def extract_text_from_pdf(file_stream):
    try:
        reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        return f"Error reading PDF: {e}"

def create_master_prompt(content_for_summary):
    """
    Creates an advanced, detailed prompt for a local AI to generate a high-quality, 
    structured, and academically-focused summary from provided content.
    """
    
    # The advanced prompt provides a role, goal, audience, specific content instructions,
    # and a mandatory markdown format, which leads to superior results.
    return f"""
# 📚 Expert Summary Generation Protocol

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

## 💡 Executive Summary & Document Thesis
* A 2-3 sentence overview covering the document's central argument, scope, and target impact.

## 🔑 Core Themes and Structural Blueprint
* A bulleted list explaining the logical flow and main sections/parts of the document.

---

## 🔬 In-Depth Analysis: [Major Theme 1 - e.g., Foundations of Machine Learning]
### [Sub-Concept A: The Theory - e.g., Probability Theory]
* **Definition/Principle:** [Technical explanation of the concept.]
* **Significance/Role:** [Why this concept is critical in the domain.]

### [Sub-Concept B: The Application - e.g., Basic Algorithms]
* **Key Algorithms/Methods:** A list of the central algorithms discussed.
    * *Algorithm Name 1:* [Brief explanation and when to use it.]
    * *Algorithm Name 2:* [Brief explanation and when to use it.]

---

## 📈 Broader Implications and Next Steps
* **Practical Takeaways:** The 2-3 most valuable lessons for a practicing professional.
* **Open Questions/Future Work (if applicable):** Note any limitations or areas the document suggests for future exploration.

---

**End of Summary.**

### CONTENT TO BE SUMMARIZED ###
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
@token_required
def ask_ai():
    user_message = request.form.get("message", "")
    pdf_files = request.files.getlist("files")
    user_email = request.user['email']

    if not user_message and not pdf_files:
        return jsonify({"chat_reply": "Please provide a message or file.", "summary_content": None})

    context_text = ""
    is_summarization_task = bool(pdf_files)

    # Process PDF files
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
    else:
        # Use our new function to give the bot its name and personality
        final_prompt = create_chat_prompt(user_message, bot_name="Xiao")
    
    try:
        ai_reply = get_local_llm_response(final_prompt)
        
        if is_summarization_task:
            chat_reply = "I've generated a summary of the content you provided."
            summary_content = ai_reply
            
            # Save PDF summaries to database
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

@chatbot_bp.route("/clear", methods=["POST"])
@token_required
def clear_chat():
    user_email = request.user['email']
    # Clear chat history from database
    # Note: This would require a new method in DatabaseOperations to clear chat history
    session.pop('chat_history', None)
    return jsonify({"status": "Chat history cleared"})

# New route to get chat history
@chatbot_bp.route("/get_chat_history", methods=["GET"])
@token_required
def get_chat_history():
    user_email = request.user['email']
    chat_history = DatabaseOperations.get_user_chat_history(user_email)
    return jsonify({"chat_history": chat_history}), 200

# Route to get all PDF summaries for a user
@chatbot_bp.route("/get_pdf_summaries", methods=["GET"])
@token_required
def get_pdf_summaries():
    user_email = request.user['email']
    pdf_summaries = DatabaseOperations.get_user_pdf_summaries(user_email)
    return jsonify({"pdf_summaries": pdf_summaries}), 200

# Route to get a specific PDF summary by PDF name
@chatbot_bp.route("/get_pdf_summary/<pdf_name>", methods=["GET"])
@token_required
def get_pdf_summary(pdf_name):
    user_email = request.user['email']
    pdf_summary = DatabaseOperations.get_pdf_summary_by_name(user_email, pdf_name)
    if pdf_summary:
        return jsonify({"pdf_summary": pdf_summary}), 200
    else:
        return jsonify({"error": "PDF summary not found"}), 404

# Route to delete a PDF summary
@chatbot_bp.route("/delete_pdf_summary/<pdf_name>", methods=["DELETE"])
@token_required
def delete_pdf_summary(pdf_name):
    user_email = request.user['email']
    success = DatabaseOperations.delete_pdf_summary(user_email, pdf_name)
    if success:
        return jsonify({"status": "PDF summary deleted successfully"}), 200
    else:
        return jsonify({"error": "PDF summary not found"}), 404