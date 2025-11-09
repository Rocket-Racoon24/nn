from flask import Blueprint, request, jsonify
from db_operations import DatabaseOperations, progress_collection, quiz_status_collection, roadmaps_collection
from auth_routes import token_required

progress_bp = Blueprint('progress_bp', __name__)

# --- Helpers ---
LEVELS = [100, 250, 500, 750, 1000]
BADGES = ["Rookie", "Learner", "Scholar", "Expert", "Master"]

def compute_level_badge(xp: int):
    level = 1
    cap = LEVELS[0]
    badge = BADGES[0]
    for i, threshold in enumerate(LEVELS):
        cap = threshold
        badge = BADGES[i] if i < len(BADGES) else BADGES[-1]
        if xp < threshold:
            level = i + 1
            break
        level = i + 1
    # progress within current level
    prev_cap = 0 if level == 1 else LEVELS[level-2]
    next_cap = LEVELS[level-1] if level-1 < len(LEVELS) else LEVELS[-1]
    span = max(1, next_cap - prev_cap)
    progress = int(round(((xp - prev_cap) / span) * 100)) if xp >= prev_cap else 0
    if progress > 100:
        progress = 100
    return level, badge, next_cap, max(0, progress)

@progress_bp.route("/get_total_time", methods=["GET"])
@token_required
def get_total_time():
    user_email = request.user['email']
    try:
        progress = progress_collection.find_one({"email": user_email})
        if not progress:
            return jsonify({
                "email": user_email,
                "total_time_spent": 0,
                "last_session_duration": 0,
                "last_logout_end": None,
                "message": "No progress data found"
            }), 200
        return jsonify({
            "email": progress.get("email"),
            "total_time_spent": progress.get("total_time_spent", 0),
            "last_session_duration": progress.get("last_session_duration", 0),
            "last_logout_end": progress.get("last_logout_end"),
            "created_at": progress.get("created_at")
        }), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@progress_bp.route("/get_progress", methods=["GET"])
@token_required
def get_progress():
    user_email = request.user['email']
    try:
        progress = progress_collection.find_one({"email": user_email})
        if not progress:
            return jsonify({
                "email": user_email,
                "total_time_spent": 0,
                "last_session_duration": 0,
                "last_logout_end": None,
                "created_at": None,
                "message": "No progress data found"
            }), 200
        result = {
            "email": progress.get("email"),
            "total_time_spent": progress.get("total_time_spent", 0),
            "last_session_duration": progress.get("last_session_duration", 0),
            "last_logout_end": progress.get("last_logout_end"),
            "created_at": progress.get("created_at"),
            "last_login_start": progress.get("last_login_start")
        }
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@progress_bp.route("/get_xp", methods=["GET"])
@token_required
def get_xp():
    user_email = request.user['email']
    try:
        xp = DatabaseOperations.get_xp(user_email)
        level, badge, next_cap, progress = compute_level_badge(xp)
        return jsonify({
            "xp": xp,
            "level": level,
            "badge": badge,
            "next_level_cap": next_cap,
            "progress_percent": progress
        }), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@progress_bp.route("/get_topic_progress", methods=["GET"])
@token_required
def get_topic_progress():
    """Compute per-topic progress based on mandatory quiz statuses, persist, and return."""
    user_email = request.user['email']
    try:
        # For each roadmap (project topic), compute progress from per-main-topic quizzes + final quizzes
        user_roadmaps = list(roadmaps_collection.find(
            {"user_email": user_email}, {"_id": 0, "topic": 1, "roadmap_data.topics": 1}
        ))

        # Fetch all quiz status docs for user once
        status_docs = list(quiz_status_collection.find({"user_email": user_email}, {"_id": 0}))

        def _norm(t):
            return t.strip() if isinstance(t, str) else t

        # Index statuses by normalized topic
        status_by_topic = {}
        for doc in status_docs:
            t = _norm(doc.get("topic"))
            if t:
                status_by_topic[t] = doc

        progress_list = []

        for rm in user_roadmaps:
            roadmap_title = _norm(rm.get("topic"))
            topics_array = rm.get("roadmap_data", {}).get("topics") if isinstance(rm.get("roadmap_data"), dict) else rm.get("topics")
            # topics_array may be a list of objects with title
            main_titles = []
            if isinstance(topics_array, list):
                for item in topics_array:
                    title = None
                    if isinstance(item, dict):
                        title = item.get("title")
                    elif isinstance(item, str):
                        title = item
                    title = _norm(title)
                    if title:
                        main_titles.append(title)

            # Total required quizzes: 2 per main topic + 2 final (MCQ + Descriptive)
            total_required = 2 * len(main_titles) + 2 if len(main_titles) > 0 else 2

            # Count passes across all main topics + final (using roadmap title)
            passed = 0
            # Main topics
            for mt in main_titles:
                st = status_by_topic.get(mt, {})
                if st.get("mcqPassed"):
                    passed += 1
                if st.get("descriptivePassed"):
                    passed += 1
            # Final quiz status is stored under roadmap title
            final_st = status_by_topic.get(roadmap_title, {})
            if final_st.get("mcqPassed"):
                passed += 1
            if final_st.get("descriptivePassed"):
                passed += 1

            percent = int(round((passed / total_required) * 100)) if total_required > 0 else 0

            progress_list.append({
                "topic": roadmap_title,
                "progressPercent": max(0, min(100, percent)),
                "quizzesPassed": passed,
                "quizzesRequired": total_required
            })

        # NOTE: We intentionally exclude standalone main-topic entries from quiz status.
        # Only roadmap-level progress is returned.

        # Persist into progress collection under topic_progress
        DatabaseOperations.get_current_timestamp()  # for consistency if needed later
        progress_collection.update_one(
            {"email": user_email},
            {"$set": {"topic_progress": progress_list}},
            upsert=True
        )

        return jsonify({"topic_progress": progress_list}), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


