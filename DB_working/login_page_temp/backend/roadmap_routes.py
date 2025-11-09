# roadmap_routes.py
from flask import Blueprint, request, jsonify
import json
import re
from utils import get_local_llm_response, LLMConnectionError # <-- Import from our new utils file
from db_operations import (
    DatabaseOperations, roadmaps_collection, notes_collection, quizzes_collection,
    quiz_attempts_collection, quiz_status_collection, progress_collection
)
from auth_routes import token_required

roadmap_bp = Blueprint('roadmap_bp', __name__)

# --- Prompt Creation Functions ---
def create_roadmap_prompt(topic):
    return f"""
### INSTRUCTIONS ###
You are an expert curriculum designer. Output ONLY a valid JSON array of objects for the topic. Each object must have "id", "title", and "description". Do not add any extra text. The response must start with '[' and end with ']'.

Also, at the end of your response (after the JSON array), add a line with the corrected/proper topic name in this format:
###CORRECTED_TOPIC###: [proper topic name]

For example, if user types "clud computing", you should output:
[{{...JSON array...}}]
###CORRECTED_TOPIC###: Cloud Computing

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

The value MUST be an array of EXACTLY {num_questions} objects. Do NOT generate more or fewer.

You must generate:

- {num_mcq} Multiple Choice (MCQ) questions.

- {num_descriptive} Descriptive questions.

Rules:
- MCQ must include exactly 4 options and one correct answer.
- Descriptive must include an "ideal_answer" rubric.
- Do NOT include any commentary or markdown, only JSON.

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

    # Early-exit if the roadmap for this topic already exists (by original or corrected later)
    try:
        # First check with the provided topic directly
        existing_roadmap = DatabaseOperations.get_roadmap_by_topic(user_email, topic)
        if existing_roadmap:
            return jsonify({
                "message": "Roadmap for this topic already exists.",
                "exists": True,
                "topic": existing_roadmap.get('topic', topic)
            }), 409

        # If not found by direct topic, we still need LLM to possibly correct the topic name.
        prompt = create_roadmap_prompt(topic)
        response_str = get_local_llm_response(prompt)

        match = re.search(r'\[.*\]', response_str, re.DOTALL)
        if not match:
            raise ValueError("Could not find valid JSON array in LLM response")
        roadmap = json.loads(match.group(0))

        # Extract corrected topic name from the response
        corrected_topic = topic  # Default to original
        corrected_match = re.search(r'###CORRECTED_TOPIC###:\s*(.+)', response_str, re.IGNORECASE)
        if corrected_match:
            corrected_topic = corrected_match.group(1).strip()
        elif roadmap and len(roadmap) > 0:
            # Fallback: try to infer from first topic title
            first_title = roadmap[0].get('title', '')
            if first_title and len(first_title) < 50:  # Reasonable topic name length
                corrected_topic = first_title

        # Re-check existence with corrected topic name
        existing_corrected = DatabaseOperations.get_roadmap_by_topic(user_email, corrected_topic)
        if existing_corrected:
            return jsonify({
                "message": "Roadmap for this topic already exists.",
                "exists": True,
                "topic": corrected_topic
            }), 409

        # Save roadmap to database with corrected topic name
        roadmap_data = {
            'topics': roadmap,
            'generated_at': DatabaseOperations.get_current_timestamp()
        }
        DatabaseOperations.save_roadmap(user_email, corrected_topic, roadmap_data)

        return jsonify({"topics": roadmap, "topic": corrected_topic, "exists": False}), 200
    except LLMConnectionError as e:
        return jsonify({"error": str(e)}), 503
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
        if not match:
            raise ValueError("Could not find valid JSON array in LLM response")
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
    except LLMConnectionError as e:
        return jsonify({"error": str(e)}), 503
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

        # Clean the HTML response
        sub_details = sub_details.strip()
        if sub_details.startswith("```html"):
            sub_details = sub_details[7:]
        if sub_details.endswith("```"):
            sub_details = sub_details[:-3]
        sub_details = sub_details.strip()

        # Save sub_details to notes collection (only if not an error)
        DatabaseOperations.save_note(
            user_email, 
            context, 
            "sub_details", 
            sub_details,
            {"term": term, "generated_at": DatabaseOperations.get_current_timestamp()}
        )

        return jsonify({"sub_details": sub_details})
    except LLMConnectionError as e:
        return jsonify({"error": str(e)}), 503
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
        
        # Clean the response - remove markdown code blocks if present
        response_str = response_str.strip()
        if response_str.startswith("```json"):
            response_str = response_str[7:]
        elif response_str.startswith("```"):
            response_str = response_str[3:]
        if response_str.endswith("```"):
            response_str = response_str[:-3]
        response_str = response_str.strip()
        
        # Try to find JSON object
        match = re.search(r'\{.*\}', response_str, re.DOTALL)
        if match:
            quiz_data = json.loads(match.group(0))
        else:
            # If no match, try parsing the whole response
            try:
                quiz_data = json.loads(response_str)
            except json.JSONDecodeError:
                # Last resort: try to extract content between first { and last }
                start_idx = response_str.find('{')
                end_idx = response_str.rfind('}')
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    quiz_data = json.loads(response_str[start_idx:end_idx+1])
                else:
                    raise ValueError(f"Could not find valid JSON in LLM response. Response preview: {response_str[:500]}")
        
        # Validate that quiz_data has the expected structure
        if not isinstance(quiz_data, dict) or 'questions' not in quiz_data:
            raise ValueError("Quiz response missing 'questions' key")
        
        if not isinstance(quiz_data['questions'], list):
            raise ValueError("'questions' must be an array")
        
        questions = quiz_data['questions']
        # Ensure exact number of questions by trimming or topping up
        def normalize_q_list(qs):
            out = []
            for q in qs:
                t = (q.get('type') or 'mcq').lower()
                if t == 'mcq':
                    out.append({
                        'type': 'mcq',
                        'question': q.get('question', ''),
                        'options': (q.get('options') or [])[:4],
                        'answer': q.get('answer')
                    })
                else:
                    out.append({
                        'type': 'descriptive',
                        'question': q.get('question', ''),
                        'ideal_answer': q.get('ideal_answer', '')
                    })
            return out
        questions = normalize_q_list(questions)

        # Trim if too many
        if len(questions) > num_questions:
            questions = questions[:num_questions]

        # Top-up if too few (attempt one supplemental generation)
        if len(questions) < num_questions:
            missing = num_questions - len(questions)
            supplement_prompt = create_quiz_prompt(topic, missing, quiz_type)
            supplement_response = get_local_llm_response(supplement_prompt)
            m2 = re.search(r'\{.*\}', supplement_response, re.DOTALL)
            more = []
            try:
                parsed = json.loads(m2.group(0)) if m2 else json.loads(supplement_response)
                more = normalize_q_list(parsed.get('questions', []))
            except Exception:
                more = []
            questions.extend(more[:missing])

        # As final guard, if still short, duplicate last with minor marker
        while len(questions) < num_questions and questions:
            clone = dict(questions[-1])
            clone['question'] = clone.get('question', '') + ' (variant)'
            questions.append(clone)

        # Re-index ids
        normalized_questions = []
        for idx, q in enumerate(questions):
            nq = {
                'id': idx + 1,
                'type': q.get('type', 'mcq'),
                'question': q.get('question', ''),
                'options': q.get('options') if q.get('type') == 'mcq' else None,
                'answer': q.get('answer') if q.get('type') == 'mcq' else None,
                'ideal_answer': q.get('ideal_answer') if q.get('type') == 'descriptive' else None,
            }
            normalized_questions.append(nq)

        # Save quiz to notes collection (raw)
        DatabaseOperations.save_note(
            user_email,
            topic,
            "quiz",
            quiz_data,
            {"generated_at": DatabaseOperations.get_current_timestamp(), "quiz_type": quiz_type, "num_questions": num_questions}
        )

        # Save/Upsert normalized quiz to dedicated collection for evaluation reuse
        DatabaseOperations.save_quiz(
            user_email=user_email,
            topic=topic,
            quiz_type=quiz_type,
            num_questions=num_questions,
            questions=normalized_questions,
            metadata={"generated_at": DatabaseOperations.get_current_timestamp()}
        )
        
        return jsonify(quiz_data)
    except LLMConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except json.JSONDecodeError as e:
        response_preview = response_str[:500] if 'response_str' in locals() else "Response not available"
        return jsonify({"error": f"Failed to parse JSON from LLM response: {str(e)}. Response preview: {response_preview}"}), 500
    except Exception as e:
        return jsonify({"error": f"An error occurred while parsing the quiz: {str(e)}"}), 500

@roadmap_bp.route("/explain_quiz", methods=["POST"])
@token_required
def explain_quiz():
    data = request.get_json()
    q_type = data.get('type')  # 'mcq' or 'descriptive'
    question = data.get('question')
    correct_answer = data.get('correct_answer')  # for mcq
    ideal_answer = data.get('ideal_answer')      # for descriptive
    user_answer = data.get('user_answer')

    if not question or q_type not in ('mcq', 'descriptive'):
        return jsonify({"error": "Invalid payload"}), 400

    try:
        if q_type == 'mcq':
            prompt = f"""
You are a tutor. Explain succinctly why the correct answer is correct and others are not.
Question: {question}
Correct Answer: {correct_answer}
User Answer: {user_answer}
Return a short paragraph followed by 2-3 bullet points.
"""
        else:
            prompt = f"""
You are a tutor. Compare the user's answer to the ideal answer and explain key gaps.
Question: {question}
Ideal Answer: {ideal_answer}
User Answer: {user_answer}
Return a short paragraph followed by 2-3 bullet points.
"""
        explanation = get_local_llm_response(prompt)
        return jsonify({"explanation": explanation}), 200
    except LLMConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Failed to generate explanation: {str(e)}"}), 500

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

# --- Save quiz attempt (client-side evaluated) ---
@roadmap_bp.route("/save_quiz_attempt", methods=["POST"])
@token_required
def save_quiz_attempt():
    data = request.get_json()
    user_email = request.user['email']

    topic = data.get('topic')
    quiz_type = data.get('quiz_type')  # "MCQ", "Descriptive", or "Both"
    practice = bool(data.get('practice', False))
    questions_snapshot = data.get('questions')  # exact questions shown to user
    user_answers = data.get('user_answers')    # array of answers aligned with questions
    scores = data.get('scores')                # {mcqScore, mcqTotal, descriptiveScore, descriptiveTotal, finalScore, finalTotal}
    passed = bool(data.get('passed', False))
    is_final = bool(data.get('final_quiz', False))

    if not topic or not quiz_type or not isinstance(questions_snapshot, list) or not isinstance(user_answers, list) or not isinstance(scores, dict):
        return jsonify({"error": "Invalid payload"}), 400

    try:
        # Skip saving attempts for practice quizzes
        if practice:
            return jsonify({"message": "Practice attempt ignored"}), 200

        # Save attempt
        DatabaseOperations.save_quiz_attempt(
            user_email=user_email,
            topic=topic,
            quiz_type=quiz_type,
            questions_snapshot=questions_snapshot,
            user_answers=user_answers,
            scores=scores,
            passed=passed,
            practice=False,
        )

        # Update status for mandatory quizzes
        if quiz_type in ("MCQ", "Descriptive"):
            DatabaseOperations.set_quiz_status(user_email, topic, quiz_type, passed)

        # Award XP on passed attempts
        if passed:
            try:
                delta = 100 if is_final else 40
                DatabaseOperations.add_xp(user_email, delta)
            except Exception:
                pass

        return jsonify({"message": "Quiz attempt saved"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to save quiz attempt: {str(e)}"}), 500

# --- Get quizzes saved for the user ---
@roadmap_bp.route("/get_quizzes", methods=["GET"])
@token_required
def get_quizzes():
    user_email = request.user['email']
    topic = request.args.get('topic')
    quiz_type = request.args.get('quiz_type')
    quizzes = DatabaseOperations.get_user_quizzes(user_email, topic, quiz_type)
    return jsonify({"quizzes": quizzes}), 200

# --- Get quiz attempts ---
@roadmap_bp.route("/get_quiz_attempts", methods=["GET"])
@token_required
def get_quiz_attempts():
    user_email = request.user['email']
    topic = request.args.get('topic')
    quiz_type = request.args.get('quiz_type')
    attempts = DatabaseOperations.get_quiz_attempts(user_email, topic, quiz_type)
    return jsonify({"attempts": attempts}), 200

# --- Quiz status APIs ---
@roadmap_bp.route("/set_quiz_status", methods=["POST"])
@token_required
def set_quiz_status():
    data = request.get_json()
    user_email = request.user['email']
    topic = data.get('topic')
    quiz_type = data.get('quiz_type')
    passed = data.get('passed')
    if not topic or quiz_type not in ("MCQ", "Descriptive") or passed is None:
        return jsonify({"error": "Invalid payload"}), 400
    try:
        DatabaseOperations.set_quiz_status(user_email, topic, quiz_type, bool(passed))
        return jsonify({"message": "Status saved"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to save status: {str(e)}"}), 500

@roadmap_bp.route("/get_quiz_status", methods=["GET"])
@token_required
def get_quiz_status():
    user_email = request.user['email']
    topic = request.args.get('topic')
    try:
        status = DatabaseOperations.get_quiz_status(user_email, topic)
        return jsonify({"status": status}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get status: {str(e)}"}), 500

@roadmap_bp.route("/delete_roadmap", methods=["DELETE"])
@token_required
def delete_roadmap():
    data = request.get_json() or {}
    topic = data.get('topic')
    user_email = request.user['email']
    if not topic:
        return jsonify({"error": "Missing topic"}), 400
    try:
        # Find roadmap to collect main topics
        rm = roadmaps_collection.find_one({"user_email": user_email, "topic": topic})
        main_titles = []
        if rm:
            topics_array = rm.get("roadmap_data", {}).get("topics") if isinstance(rm.get("roadmap_data"), dict) else rm.get("topics")
            if isinstance(topics_array, list):
                for item in topics_array:
                    if isinstance(item, dict) and item.get("title"):
                        main_titles.append(item.get("title"))
                    elif isinstance(item, str):
                        main_titles.append(item)
        topics_to_delete = [topic] + main_titles

        # Delete roadmap
        roadmaps_collection.delete_many({"user_email": user_email, "topic": topic})

        # Delete related notes (details, sub_details, quiz, summary)
        notes_collection.delete_many({"user_email": user_email, "topic": {"$in": topics_to_delete}})

        # Delete quizzes (definitions)
        quizzes_collection.delete_many({"user_email": user_email, "topic": {"$in": topics_to_delete}})

        # Delete quiz attempts
        quiz_attempts_collection.delete_many({"user_email": user_email, "topic": {"$in": topics_to_delete}})

        # Delete quiz status
        quiz_status_collection.delete_many({"user_email": user_email, "topic": {"$in": topics_to_delete}})

        # Remove from progress.topic_progress array
        progress_collection.update_one(
            {"email": user_email},
            {"$pull": {"topic_progress": {"topic": topic}}}
        )

        return jsonify({"message": "Roadmap deleted"}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to delete roadmap: {str(e)}"}), 500

# Route to get topic count for the authenticated user
@roadmap_bp.route("/get_topic_count", methods=["GET"])
@token_required
def get_topic_count():
    user_email = request.user['email']
    try:
        count = roadmaps_collection.count_documents({"user_email": user_email})
        return jsonify({
            "user_email": user_email,
            "topic_count": count
        }), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

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
        
        # Check if the response is an error message from the LLM server
        if response_str.startswith("Error connecting to local LLM server"):
            return jsonify({
                "error": "Local LLM server is not running. Please start the LLM server on port 8080 and try again."
            }), 503
        
        # Find the JSON array
        match = re.search(r'\[.*\]', response_str, re.DOTALL)
        if not match:
            raise Exception("No valid JSON array found in LLM response.")
            
        graded_results = json.loads(match.group(0))
        return jsonify({"graded_answers": graded_results})
    except Exception as e:
        return jsonify({"error": f"An error occurred while analyzing answers: {str(e)}"}), 500

# --- Flashcard Generation Endpoint ---
@roadmap_bp.route("/generate_flashcards_for_note", methods=["POST"])
@token_required
def generate_flashcards_for_note():
    """Generate flashcards from sub-details notes. Fetch from DB if already exists."""
    data = request.get_json()
    topic = data.get('topic')  # main topic/context
    term = data.get('term')    # sub-heading term
    user_email = request.user['email']
    
    if not topic or not term:
        return jsonify({"error": "Missing topic or term"}), 400
    
    try:
        # 1. Check if flashcards already exist in database
        existing_notes = DatabaseOperations.get_user_notes(user_email, topic=topic, note_type='flashcards')
        for note in existing_notes:
            if note.get('metadata', {}).get('term') == term:
                # Return cached flashcards
                return jsonify({"flashcards": note.get('content', []), "cached": True}), 200
        
        # 2. Fetch sub_details note content to generate flashcards from
        notes = DatabaseOperations.get_user_notes(user_email, topic=topic, note_type='sub_details')
        note = None
        for n in notes:
            if n.get('metadata', {}).get('term') == term:
                note = n
                break
        
        if not note:
            return jsonify({"error": "No sub-details found for this term. Generate details first."}), 404
        
        content_html = note.get('content', '')
        # Strip simple HTML tags to improve flashcard generation
        text = re.sub('<[^<]+?>', ' ', content_html)
        text = re.sub('\\s+', ' ', text).strip()
        
        # 3. Generate flashcards using AI
        prompt = f"""
### INSTRUCTIONS ###
You are an expert educator. Create flashcards from the provided note text.
Return ONLY a valid JSON array. Each item must be an object with fields: "question" and "answer".
Generate as many cards as needed to cover key points (typically 8-20 based on content importance).
Avoid duplicates; make questions concise and answers clear.

### NOTE TEXT ###
{text}
"""
        response_str = get_local_llm_response(prompt)
        
        # Check for LLM connection error
        if response_str.startswith("Error connecting to local LLM server"):
            return jsonify({"error": "AI is offline. Please start the LLM server on port 8080 and try again."}), 503
        
        # Parse JSON array from response
        match = re.search(r'\\[.*\\]', response_str, re.DOTALL)
        if not match:
            try:
                flashcards = json.loads(response_str)
            except Exception:
                return jsonify({"error": "Could not parse flashcards from AI response"}), 500
        else:
            flashcards = json.loads(match.group(0))
        
        if not isinstance(flashcards, list):
            return jsonify({"error": "Invalid flashcards format"}), 500
        
        # 4. Save flashcards to database for future use
        DatabaseOperations.save_note(
            user_email, 
            topic, 
            'flashcards', 
            flashcards, 
            {"term": term, "source": "sub_details"}
        )
        
        return jsonify({"flashcards": flashcards, "cached": False}), 200
        
    except LLMConnectionError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Failed to generate flashcards: {str(e)}"}), 500