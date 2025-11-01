# roadmap_routes.py
from flask import Blueprint, request, jsonify
import json
import re
from utils import get_local_llm_response # <-- Import from our new utils file
from db_operations import DatabaseOperations
from auth_routes import token_required

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

Format your response as a valid JSON array. Each object should have "section_title" (string) and "section_items" (an array of objects with "term" and "definition").

IMPORTANT: The "definition" is for a side-menu. It MUST be extremely concise.

- GOOD: "Core model for cloud services."

- BAD: "A model for delivering computing services over the internet, allowing users to store, process, and manage data."

The "definition" MUST be a 5-10 word summary. DO NOT write a full sentence.

### TASK ###

Generate a JSON study guide for the topic: **"{topic_title}"**

"""

def create_sub_details_prompt(term, context):
    return f"""
### INSTRUCTIONS ###

You are a world-class university professor and expert. Provide a comprehensive, detailed, and in-depth explanation for the term below.

Your explanation must be thorough and cover:

1.  A clear, foundational definition.

2.  Key components or core concepts.

3.  Practical examples or analogies to help a beginner understand.

4.  Its importance and applications in the context of the main topic.

IMPORTANT: Format your entire response as a single block of simple HTML. Use tags like <h2>, <h3>, <p>, <ul>, <li>, and <strong>. Do not include <html> or <body> tags. Be detailed and write at length.

### CONTEXT ###

The term is part of a study guide on the topic: "{context}"

### TASK ###

Provide a comprehensive, deep-dive HTML explanation for the term: **"{term}"**

"""

def create_quiz_prompt(topic, num_questions, quiz_type):
    # Calculate question distribution
    num_mcq = 0
    num_descriptive = 0
    if quiz_type == "MCQ":
        num_mcq = num_questions
    elif quiz_type == "Descriptive":
        num_descriptive = num_questions
    elif quiz_type == "Both":
        num_descriptive = int(num_questions * 0.3) # 30% descriptive
        num_mcq = num_questions - num_descriptive
    
    # Build the prompt instructions
    instructions = f"""
### INSTRUCTIONS ###

You are an expert quiz designer. Create a quiz for the topic: "{topic}".

Your response must be a single valid JSON object with one key: "questions".

The value should be an array of {num_questions} objects.

You must generate:

- {num_mcq} Multiple Choice (MCQ) questions.

- {num_descriptive} Descriptive questions.

Format MCQ questions as:

{{"type": "mcq", "question": "...", "options": ["A", "B", "C", "D"], "answer": "..."}}

Format Descriptive questions as:

{{"type": "descriptive", "question": "...", "ideal_answer": "A detailed rubric or ideal answer for grading."}}

Mix the questions together in the array.

"""
    return instructions

# --- Routes ---
@roadmap_bp.route("/generate_roadmap", methods=["POST"])
@token_required
def generate_roadmap():
    data = request.get_json()
    topic = data.get('query')
    user_email = request.user['email']
    
    try:
        prompt = create_roadmap_prompt(topic)
        response_str = get_local_llm_response(prompt)
        match = re.search(r'\[.*\]', response_str, re.DOTALL)
        roadmap = json.loads(match.group(0))
        
        # Save roadmap to database
        roadmap_data = {
            'topics': roadmap,
            'generated_at': DatabaseOperations.get_current_timestamp()
        }
        
        # Check if roadmap already exists for this topic
        existing_roadmap = DatabaseOperations.get_roadmap_by_topic(user_email, topic)
        if existing_roadmap:
            DatabaseOperations.update_roadmap(user_email, topic, roadmap_data)
        else:
            DatabaseOperations.save_roadmap(user_email, topic, roadmap_data)
        
        return jsonify({"topics": roadmap})
    except Exception as e:
        return jsonify({"error": f"An error occurred while parsing the roadmap: {str(e)}"}), 500

@roadmap_bp.route("/generate_details", methods=["POST"])
@token_required
def generate_details():
    data = request.get_json()
    title = data.get('title')
    user_email = request.user['email']
    
    try:
        prompt = create_details_prompt(title)
        response_str = get_local_llm_response(prompt)
        match = re.search(r'\[.*\]', response_str, re.DOTALL)
        details = json.loads(match.group(0))
        
        # Save details to notes collection
        DatabaseOperations.save_note(
            user_email, 
            title, 
            "details", 
            details,
            {"generated_at": DatabaseOperations.get_current_timestamp()}
        )
        
        return jsonify({"details": details})
    except Exception as e:
        return jsonify({"error": f"An error occurred while parsing details: {str(e)}"}), 500

@roadmap_bp.route("/generate_sub_details", methods=["POST"])
@token_required
def generate_sub_details():
    data = request.get_json()
    term = data.get('term')
    context = data.get('context')
    user_email = request.user['email']
    
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

        # Save sub_details to notes collection
        DatabaseOperations.save_note(
            user_email, 
            context, 
            "sub_details", 
            sub_details,
            {"term": term, "generated_at": DatabaseOperations.get_current_timestamp()}
        )

        return jsonify({"sub_details": sub_details})
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@roadmap_bp.route("/generate_quiz", methods=["POST"])
@token_required
def generate_quiz():
    data = request.get_json()
    topic = data.get('topic')
    num_questions = data.get('num_questions', 10) 
    quiz_type = data.get('quiz_type', 'MCQ') # Get the new quiz type
    user_email = request.user['email']
    
    if not topic:
        return jsonify({"error": "Missing topic"}), 400
        
    try:
        # Pass all three arguments to the prompt function
        prompt = create_quiz_prompt(topic, num_questions, quiz_type)
        response_str = get_local_llm_response(prompt)
        match = re.search(r'\{.*\}', response_str, re.DOTALL)
        quiz_data = json.loads(match.group(0))
        
        # Save quiz to notes collection
        DatabaseOperations.save_note(
            user_email, 
            topic, 
            "quiz", 
            quiz_data,
            {"generated_at": DatabaseOperations.get_current_timestamp(), "quiz_type": quiz_type, "num_questions": num_questions}
        )
        
        return jsonify(quiz_data)
    except Exception as e:
        return jsonify({"error": f"An error occurred while parsing the quiz: {str(e)}"}), 500

# New route to get user's saved roadmaps
@roadmap_bp.route("/get_roadmaps", methods=["GET"])
@token_required
def get_roadmaps():
    user_email = request.user['email']
    roadmaps = DatabaseOperations.get_user_roadmaps(user_email)
    return jsonify({"roadmaps": roadmaps}), 200

# New route to get specific roadmap
@roadmap_bp.route("/get_roadmap/<topic>", methods=["GET"])
@token_required
def get_roadmap(topic):
    user_email = request.user['email']
    roadmap = DatabaseOperations.get_roadmap_by_topic(user_email, topic)
    if roadmap:
        return jsonify({"roadmap": roadmap}), 200
    else:
        return jsonify({"error": "Roadmap not found"}), 404

# New route to get user's notes
@roadmap_bp.route("/get_notes", methods=["GET"])
@token_required
def get_notes():
    user_email = request.user['email']
    topic = request.args.get('topic')
    note_type = request.args.get('note_type')
    
    notes = DatabaseOperations.get_user_notes(user_email, topic, note_type)
    return jsonify({"notes": notes}), 200

def create_analysis_prompt(answers_to_grade):
    # Convert the list of answers into a string for the prompt
    answers_str = json.dumps(answers_to_grade, indent=2)
    return f"""
### INSTRUCTIONS ###

You are an expert Teaching Assistant. Your job is to grade a student's descriptive answers.

For each question, compare the "user_answer" to the "ideal_answer" rubric.

Provide a "score" (1 for a correct/good-effort answer, 0 for a wrong/missing answer) and concise "feedback".

IMPORTANT: Respond ONLY with a valid JSON array of objects, one for each question.

Example response: [{{"score": 1, "feedback": "Correct!"}}, {{"score": 0, "feedback": "This is incorrect..."}}]

### TASK ###

Grade the following answers:

{answers_str}

"""

@roadmap_bp.route("/analyze_answers", methods=["POST"])
@token_required
def analyze_answers():
    data = request.get_json()
    answers_to_grade = data.get('answers')
    if not answers_to_grade:
        return jsonify({"error": "No answers provided"}), 400
    
    try:
        prompt = create_analysis_prompt(answers_to_grade)
        response_str = get_local_llm_response(prompt)
        
        # Find the JSON array
        match = re.search(r'\[.*\]', response_str, re.DOTALL)
        if not match:
            raise Exception("No valid JSON array found in LLM response.")
            
        graded_results = json.loads(match.group(0))
        return jsonify({"graded_answers": graded_results})
    except Exception as e:
        return jsonify({"error": f"An error occurred while analyzing answers: {str(e)}"}), 500