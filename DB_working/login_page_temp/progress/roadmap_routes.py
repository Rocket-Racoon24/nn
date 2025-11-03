# roadmap_routes.py
from flask import Blueprint, request, jsonify
import json
import re
from utils import get_local_llm_response # <-- Import from our new utils file
from db_operations import DatabaseOperations, roadmaps_collection
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
    user_email = request.user['email']
    
    try:
        prompt = create_quiz_prompt(topic)
        response_str = get_local_llm_response(prompt)
        match = re.search(r'\{.*\}', response_str, re.DOTALL)
        quiz_data = json.loads(match.group(0))
        
        # Save quiz to notes collection
        DatabaseOperations.save_note(
            user_email, 
            topic, 
            "quiz", 
            quiz_data,
            {"generated_at": DatabaseOperations.get_current_timestamp()}
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

# Route to get topic count for the authenticated user
@roadmap_bp.route("/get_topic_count", methods=["GET"])
@token_required
def get_topic_count():
    """Get the count of topics for the authenticated user"""
    user_email = request.user['email']
    try:
        count = roadmaps_collection.count_documents({"user_email": user_email})
        return jsonify({
            "user_email": user_email,
            "topic_count": count
        }), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Route to get topic counts for all users (admin/stats endpoint)
@roadmap_bp.route("/get_all_users_topic_counts", methods=["GET"])
@token_required
def get_all_users_topic_counts():
    """Get the count of topics for each user (identified by unique email)"""
    try:
        # Use MongoDB aggregation to count topics per user
        pipeline = [
            {
                "$group": {
                    "_id": "$user_email",
                    "topic_count": {"$sum": 1}
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "user_email": "$_id",
                    "topic_count": 1
                }
            },
            {
                "$sort": {"topic_count": -1}  # Sort by count descending
            }
        ]
        
        results = list(roadmaps_collection.aggregate(pipeline))
        return jsonify({
            "users": results,
            "total_users": len(results)
        }), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500