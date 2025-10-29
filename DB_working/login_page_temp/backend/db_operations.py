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
        
        return {
            "session": session,
            "roadmaps": roadmaps,
            "chat_history": chat_history,
            "notes": notes
        }
