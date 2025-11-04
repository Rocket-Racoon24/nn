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
roadmaps_collection = db.roadmaps
chat_history_collection = db.chat_history
notes_collection = db.notes
quizzes_collection = db.quizzes
quiz_attempts_collection = db.quiz_attempts
quiz_status_collection = db.quiz_status
quizzes_collection = db.quizzes
quiz_attempts_collection = db.quiz_attempts

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
        """Deactivate user session on logout"""
        sessions_collection.update_one(
            {"user_email": user_email, "is_active": True},
            {"$set": {"is_active": False}}
        )
    
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
