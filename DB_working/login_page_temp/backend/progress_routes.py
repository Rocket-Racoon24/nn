from flask import Blueprint, request, jsonify
from db_operations import DatabaseOperations, progress_collection
from auth_routes import token_required

progress_bp = Blueprint('progress_bp', __name__)

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


