# db_operations.py
from pymongo import MongoClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Collections
sessions_collection = db.sessions
progress_collection = db.progress
roadmaps_collection = db.roadmaps
chat_history_collection = db.chat_history
notes_collection = db.notes
quizzes_collection = db.quizzes
quiz_attempts_collection = db.quiz_attempts
quiz_status_collection = db.quiz_status
pdf_summary_collection = db.pdf_summary

class DatabaseOperations:
    @staticmethod
    def get_current_timestamp():
        """Get current timestamp as ISO string"""
        return datetime.now(timezone.utc).isoformat()
    
    @staticmethod
    def create_user_session(user_email, session_data):
        """Create a new session for a user"""
        session_doc = {
            "user_email": user_email,
            "created_at": datetime.now(timezone.utc),
            "last_accessed": datetime.now(timezone.utc),
            "session_data": session_data,
            "is_active": True
        }
        return sessions_collection.insert_one(session_doc)
    
    @staticmethod
    def update_session(user_email, session_data):
        """Update existing session data"""
        sessions_collection.update_one(
            {"user_email": user_email, "is_active": True},
            {
                "$set": {
                    "session_data": session_data,
                    "last_accessed": datetime.now(timezone.utc)
                }
            }
        )
    
    @staticmethod
    def get_user_session(user_email):
        """Get user's current session"""
        return sessions_collection.find_one(
            {"user_email": user_email, "is_active": True},
            {"_id": 0}
        )
    
    @staticmethod
    def deactivate_session(user_email):
        """Deactivate user session on logout and update total time spent."""
        from datetime import timezone as _tz
        now = datetime.now(_tz.utc)

        # 1) Get active session
        session = sessions_collection.find_one({"user_email": user_email, "is_active": True})
        if not session:
            return None

        # 2) Calculate duration from login_time in session_data
        login_time_str = session.get("session_data", {}).get("login_time")
        if not login_time_str:
            duration_minutes = 0
        else:
            try:
                if 'Z' in login_time_str or '+' in login_time_str or login_time_str.endswith('+00:00'):
                    login_time = datetime.fromisoformat(login_time_str.replace('Z', '+00:00'))
                else:
                    login_time = datetime.fromisoformat(login_time_str)
                if login_time.tzinfo is None:
                    login_time = login_time.replace(tzinfo=_tz.utc)
            except Exception:
                login_time = session.get("created_at", now)
                if isinstance(login_time, str):
                    login_time = datetime.fromisoformat(login_time.replace('Z', '+00:00'))
                if login_time.tzinfo is None:
                    login_time = login_time.replace(tzinfo=_tz.utc)

            duration_minutes = (now - login_time).total_seconds() / 60
            if duration_minutes < 0:
                duration_minutes = 0

        # 3) Mark session inactive
        sessions_collection.update_one(
            {"_id": session["_id"]},
            {"$set": {"is_active": False, "last_accessed": now}}
        )

        # 4) Update progress totals
        existing_progress = progress_collection.find_one({"email": user_email})
        if not existing_progress:
            progress_collection.insert_one({
                "email": user_email,
                "total_time_spent": duration_minutes,
                "last_logout_end": now.isoformat(),
                "last_session_duration": round(duration_minutes, 2),
                "created_at": now.isoformat()
            })
        else:
            progress_collection.update_one(
                {"email": user_email},
                {"$inc": {"total_time_spent": duration_minutes},
                 "$set": {"last_logout_end": now.isoformat(), "last_session_duration": round(duration_minutes, 2)}}
            )

        return round(duration_minutes, 2)
    
    @staticmethod
    def save_roadmap(user_email, topic, roadmap_data):
        """Save roadmap data for a user"""
        roadmap_doc = {
            "user_email": user_email,
            "topic": topic,
            "roadmap_data": roadmap_data,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        return roadmaps_collection.insert_one(roadmap_doc)
    
    @staticmethod
    def update_roadmap(user_email, topic, roadmap_data):
        """Update existing roadmap data"""
        roadmaps_collection.update_one(
            {"user_email": user_email, "topic": topic},
            {
                "$set": {
                    "roadmap_data": roadmap_data,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
    
    @staticmethod
    def get_user_roadmaps(user_email):
        """Get all roadmaps for a user"""
        return list(roadmaps_collection.find(
            {"user_email": user_email},
            {"_id": 0}
        ).sort("created_at", -1))
    
    @staticmethod
    def get_roadmap_by_topic(user_email, topic):
        """Get specific roadmap by topic"""
        return roadmaps_collection.find_one(
            {"user_email": user_email, "topic": topic},
            {"_id": 0}
        )
    
    @staticmethod
    def save_chat_message(user_email, message, response, message_type="chat"):
        """Save chat message and response"""
        chat_doc = {
            "user_email": user_email,
            "message": message,
            "response": response,
            "message_type": message_type,  # "chat", "summary", "roadmap", etc.
            "created_at": datetime.now(timezone.utc)
        }
        return chat_history_collection.insert_one(chat_doc)
    
    @staticmethod
    def get_user_chat_history(user_email, limit=50):
        """Get user's chat history"""
        return list(chat_history_collection.find(
            {"user_email": user_email},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit))
    
    @staticmethod
    def save_note(user_email, topic, note_type, content, metadata=None):
        """Save a note (study material, details, sub-details, quiz)"""
        note_doc = {
            "user_email": user_email,
            "topic": topic,
            "note_type": note_type,  # "details", "sub_details", "quiz", "summary"
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        return notes_collection.insert_one(note_doc)
    
    @staticmethod
    def get_user_notes(user_email, topic=None, note_type=None):
        """Get user's notes, optionally filtered by topic or note_type"""
        query = {"user_email": user_email}
        if topic:
            query["topic"] = topic
        if note_type:
            query["note_type"] = note_type
            
        return list(notes_collection.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1))
    
    @staticmethod
    def update_note(user_email, topic, note_type, content, metadata=None):
        """Update existing note or create if doesn't exist"""
        query = {
            "user_email": user_email,
            "topic": topic,
            "note_type": note_type
        }
        
        update_data = {
            "$set": {
                "content": content,
                "metadata": metadata or {},
                "updated_at": datetime.now(timezone.utc)
            }
        }
        
        result = notes_collection.update_one(query, update_data, upsert=True)
        return result
    
    @staticmethod
    def get_user_data(user_email):
        """Get all user data including sessions, roadmaps, chat history, and notes"""
        session = DatabaseOperations.get_user_session(user_email)
        roadmaps = DatabaseOperations.get_user_roadmaps(user_email)
        chat_history = DatabaseOperations.get_user_chat_history(user_email)
        notes = DatabaseOperations.get_user_notes(user_email)
        quizzes = DatabaseOperations.get_user_quizzes(user_email)
        attempts = DatabaseOperations.get_quiz_attempts(user_email)
        status = DatabaseOperations.get_quiz_status(user_email)
        
        return {
            "session": session,
            "roadmaps": roadmaps,
            "chat_history": chat_history,
            "notes": notes,
            "quizzes": quizzes,
            "quiz_attempts": attempts,
            "quiz_status": status
        }

    # --- Quizzes (Definitions) ---
    @staticmethod
    def save_quiz(user_email, topic, quiz_type, num_questions, questions, metadata=None):
        """Save or update a quiz definition for a user/topic/quiz_type."""
        doc = {
            "user_email": user_email,
            "topic": topic,
            "quiz_type": quiz_type,
            "num_questions": num_questions,
            "questions": questions,
            "metadata": metadata or {},
            "updated_at": datetime.now(timezone.utc)
        }
        quizzes_collection.update_one(
            {"user_email": user_email, "topic": topic, "quiz_type": quiz_type},
            {"$set": doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True
        )

    @staticmethod
    def get_user_quizzes(user_email, topic=None, quiz_type=None):
        query = {"user_email": user_email}
        if topic:
            query["topic"] = topic
        if quiz_type:
            query["quiz_type"] = quiz_type
        return list(quizzes_collection.find(query, {"_id": 0}).sort("updated_at", -1))

    # --- Quiz Attempts (Submissions) ---
    @staticmethod
    def save_quiz_attempt(user_email, topic, quiz_type, questions_snapshot, user_answers, scores, passed, practice=False):
        """Store a user's quiz attempt with necessary data for evaluation/review."""
        attempt_doc = {
            "user_email": user_email,
            "topic": topic,
            "quiz_type": quiz_type,
            "practice": practice,
            "questions_snapshot": questions_snapshot,  # store the exact questions used
            "user_answers": user_answers,              # array aligned with questions
            "scores": scores,                          # {mcqScore, mcqTotal, descriptiveScore, descriptiveTotal, finalScore, finalTotal}
            "passed": passed,
            "created_at": datetime.now(timezone.utc)
        }
        return quiz_attempts_collection.insert_one(attempt_doc)

    @staticmethod
    def get_quiz_attempts(user_email, topic=None, quiz_type=None, limit=50):
        query = {"user_email": user_email}
        if topic:
            query["topic"] = topic
        if quiz_type:
            query["quiz_type"] = quiz_type
        return list(quiz_attempts_collection.find(query, {"_id": 0}).sort("created_at", -1).limit(limit))

    # --- Quiz Status (Progress) ---
    @staticmethod
    def set_quiz_status(user_email, topic, quiz_type, passed):
        """Save pass/fail status for mandatory quizzes. quiz_type: "MCQ" or "Descriptive"""
        field = "mcqPassed" if quiz_type.upper() == "MCQ" else "descriptivePassed"
        quiz_status_collection.update_one(
            {"user_email": user_email, "topic": topic},
            {"$set": {field: bool(passed), "updated_at": datetime.now(timezone.utc)}, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
            upsert=True
        )

    @staticmethod
    def get_quiz_status(user_email, topic=None):
        query = {"user_email": user_email}
        if topic:
            query["topic"] = topic
        return list(quiz_status_collection.find(query, {"_id": 0}).sort("updated_at", -1))
    
    # --- PDF Summaries ---
    @staticmethod
    def save_pdf_summary(user_email, pdf_name, summary_content):
        """Save PDF summary for a user"""
        pdf_summary_doc = {
            "user_email": user_email,
            "pdf_name": pdf_name,
            "summary_content": summary_content,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        return pdf_summary_collection.insert_one(pdf_summary_doc)
    
    @staticmethod
    def get_user_pdf_summaries(user_email, include_content=False):
        """Get all PDF summaries for a user. If include_content is False, only returns metadata."""
        projection = {"_id": 0, "user_email": 1, "pdf_name": 1, "created_at": 1, "updated_at": 1}
        if include_content:
            projection["summary_content"] = 1
        return list(pdf_summary_collection.find(
            {"user_email": user_email},
            projection
        ).sort("created_at", -1))
    
    @staticmethod
    def get_pdf_summary_by_name(user_email, pdf_name):
        """Get specific PDF summary by PDF name"""
        return pdf_summary_collection.find_one(
            {"user_email": user_email, "pdf_name": pdf_name},
            {"_id": 0}
        )
    
    @staticmethod
    def delete_pdf_summary(user_email, pdf_name):
        """Delete a PDF summary for a user"""
        result = pdf_summary_collection.delete_one(
            {"user_email": user_email, "pdf_name": pdf_name}
        )
        return result.deleted_count > 0
