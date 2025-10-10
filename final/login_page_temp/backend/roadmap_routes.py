# roadmap_routes.py
from flask import Blueprint, request, jsonify
import json
import re
from utils import get_local_llm_response # <-- Import from our new utils file

roadmap_bp = Blueprint('roadmap_bp', __name__)

# --- Prompt Creation Functions ---
def create_roadmap_prompt(topic):
    return f"""
### INSTRUCTIONS ###
You are an expert curriculum designer. Output ONLY a valid JSON array of objects for the topic. Each object must have "id", "title", and "description". Do not add any extra text. The response must start with '[' and end with ']'.
### TASK ###
**Topic:** "{topic}"
"""

def create_details_prompt(topic_title):
    return f"""
### INSTRUCTIONS ###
You are an expert tutor. Create a study guide for the topic below.
IMPORTANT: Format your response as a valid JSON array. Each object should have "section_title" (string) and "section_items" (an array of objects with "term" and "definition").
### TASK ###
Generate a JSON study guide for the topic: **"{topic_title}"**
"""

def create_sub_details_prompt(term, context):
    return f"""
### INSTRUCTIONS ###
You are a world-class expert. Provide a detailed explanation for the term below.
IMPORTANT: Format your entire response as a single block of simple HTML. Use tags like <h3>, <p>, <ul>, <li>, and <strong>. Do not include <html> or <body> tags.
### CONTEXT ###
The term is part of a study guide on the topic: "{context}"
### TASK ###
Provide a deep-dive HTML explanation for the term: **"{term}"**
"""

def create_quiz_prompt(topic):
    return f"""
### INSTRUCTIONS ###
You are an expert quiz designer. Create a quiz with 20 multiple-choice questions.
Format your response as a single valid JSON object with one key: "questions".
The value should be an array of 20 objects, each with "question", "options" (an array of 4), and "answer".
### TASK ###
Generate a 20-question quiz for the topic: **"{topic}"**
"""

# --- Routes ---
@roadmap_bp.route("/generate_roadmap", methods=["POST"])
def generate_roadmap():
    data = request.get_json()
    topic = data.get('query')
    try:
        prompt = create_roadmap_prompt(topic)
        response_str = get_local_llm_response(prompt)
        match = re.search(r'\[.*\]', response_str, re.DOTALL)
        roadmap = json.loads(match.group(0))
        return jsonify({"topics": roadmap})
    except Exception as e:
        return jsonify({"error": f"An error occurred while parsing the roadmap: {str(e)}"}), 500

@roadmap_bp.route("/generate_details", methods=["POST"])
def generate_details():
    data = request.get_json()
    title = data.get('title')
    try:
        prompt = create_details_prompt(title)
        response_str = get_local_llm_response(prompt)
        match = re.search(r'\[.*\]', response_str, re.DOTALL)
        details = json.loads(match.group(0))
        return jsonify({"details": details})
    except Exception as e:
        return jsonify({"error": f"An error occurred while parsing details: {str(e)}"}), 500

@roadmap_bp.route("/generate_sub_details", methods=["POST"])
def generate_sub_details():
    data = request.get_json()
    term = data.get('term')
    context = data.get('context')
    try:
        prompt = create_sub_details_prompt(term, context)
        sub_details = get_local_llm_response(prompt)

        # --- ADD THIS CLEANING LOGIC ---
        sub_details = sub_details.strip()
        if sub_details.startswith("```html"):
            sub_details = sub_details[7:]
        if sub_details.endswith("```"):
            sub_details = sub_details[:-3]
        sub_details = sub_details.strip()
        # -----------------------------

        return jsonify({"sub_details": sub_details})
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@roadmap_bp.route("/generate_quiz", methods=["POST"])
def generate_quiz():
    data = request.get_json()
    topic = data.get('topic')
    try:
        prompt = create_quiz_prompt(topic)
        response_str = get_local_llm_response(prompt)
        match = re.search(r'\{.*\}', response_str, re.DOTALL)
        quiz_data = json.loads(match.group(0))
        return jsonify(quiz_data)
    except Exception as e:
        return jsonify({"error": f"An error occurred while parsing the quiz: {str(e)}"}), 500