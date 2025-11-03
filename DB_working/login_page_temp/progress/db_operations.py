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
    
  

# Assuming these are defined somewhere


    @staticmethod
    def deactivate_session(user_email):
        """Deactivate user session on logout and update total time spent."""
        print(f"[deactivate_session] Starting deactivation for user: {user_email}")
        now = datetime.now(timezone.utc)
        try:
            # 1️⃣ Get the user's active session
            session = sessions_collection.find_one({"user_email": user_email, "is_active": True})
            if not session:
                print(f"[deactivate_session] No active session found for user: {user_email}")
                return None  # No active session found
            print(f"[deactivate_session] Found active session for user: {user_email}, session_id: {session.get('_id')}")

            # 2️⃣ Calculate time difference - handle both naive and timezone-aware datetimes
            login_time_str = session["session_data"]["login_time"]
            print(f"[deactivate_session] Login time string: {login_time_str}")
            
            # Handle different datetime formats
            try:
                # Try parsing with timezone info
                if 'Z' in login_time_str or '+' in login_time_str or login_time_str.endswith('+00:00'):
                    login_time = datetime.fromisoformat(login_time_str.replace('Z', '+00:00'))
                else:
                    # Parse as naive datetime and assume UTC
                    login_time = datetime.fromisoformat(login_time_str)
                    
                # Ensure both datetimes are timezone-aware for proper calculation
                if login_time.tzinfo is None:
                    # If stored as naive, assume it's UTC
                    login_time = login_time.replace(tzinfo=timezone.utc)
            except ValueError as ve:
                # Fallback: try parsing as string with different formats
                print(f"[deactivate_session] Warning: ISO format parsing failed, trying alternative: {ve}")
                try:
                    # Try parsing without microseconds if present
                    login_time_str_clean = login_time_str.split('.')[0] if '.' in login_time_str else login_time_str
                    login_time = datetime.fromisoformat(login_time_str_clean)
                    if login_time.tzinfo is None:
                        login_time = login_time.replace(tzinfo=timezone.utc)
                except:
                    # Last resort: use created_at from session as fallback
                    print(f"[deactivate_session] Using session created_at as fallback")
                    login_time = session.get("created_at", now)
                    if isinstance(login_time, str):
                        login_time = datetime.fromisoformat(login_time.replace('Z', '+00:00'))
                    if login_time.tzinfo is None:
                        login_time = login_time.replace(tzinfo=timezone.utc)
            
            duration_minutes = (now - login_time).total_seconds() / 60
            print(f"[deactivate_session] Calculated duration: {duration_minutes} minutes (login: {login_time}, now: {now})")
            
            # Ensure duration is not negative (safety check)
            if duration_minutes < 0:
                print(f"[deactivate_session] Warning: Negative duration detected, setting to 0")
                duration_minutes = 0

            # 3️⃣ Mark the session inactive and update last_accessed
            print(f"[deactivate_session] Updating session {session['_id']} - setting is_active to False")
            session_update_result = sessions_collection.update_one(
                {"_id": session["_id"]},
                {"$set": {"is_active": False, "last_accessed": now}}
            )
            
            print(f"[deactivate_session] Session update result - matched: {session_update_result.matched_count}, modified: {session_update_result.modified_count}")
            
            if session_update_result.matched_count == 0:
                raise Exception(f"Session update failed: session not found for user {user_email}")
            if session_update_result.modified_count == 0:
                print(f"[deactivate_session] Warning: Session matched but not modified (may already be inactive)")
                # Verify the current state
                updated_session = sessions_collection.find_one({"_id": session["_id"]})
                if updated_session and updated_session.get("is_active") == True:
                    # Try again with explicit False
                    print(f"[deactivate_session] Retrying session update with explicit False")
                    sessions_collection.update_one(
                        {"_id": session["_id"]},
                        {"$set": {"is_active": False}}
                    )
                else:
                    print(f"[deactivate_session] Session is already inactive, continuing...")
            
            # Verify the update
            verify_session = sessions_collection.find_one({"_id": session["_id"]})
            if verify_session and verify_session.get("is_active") == True:
                raise Exception(f"Session is still active after update attempt for user {user_email}")
            print(f"[deactivate_session] ✓ Session successfully deactivated")

            # 4️⃣ Update total time in the `progress` collection
            # Check if progress document exists first
            print(f"Checking progress collection for user: {user_email}")
            existing_progress = progress_collection.find_one({"email": user_email})
            
            if not existing_progress:
                # Document doesn't exist, create it with initial values
                print(f"Creating new progress document for user: {user_email} with duration: {duration_minutes} minutes")
                progress_doc = {
                    "email": user_email,
                    "total_time_spent": duration_minutes,
                    "last_logout_end": now.isoformat(),
                    "last_session_duration": round(duration_minutes, 2),
                    "created_at": now.isoformat()
                }
                progress_result = progress_collection.insert_one(progress_doc)
                if not progress_result.inserted_id:
                    raise Exception(f"Failed to create progress document for user {user_email}")
                print(f"Successfully created progress document for user: {user_email}, inserted_id: {progress_result.inserted_id}")
            else:
                # Document exists, update it
                print(f"Updating existing progress document for user: {user_email}, current total: {existing_progress.get('total_time_spent', 0)}, adding: {duration_minutes} minutes")
                progress_result = progress_collection.update_one(
                    {"email": user_email},
                    {
                        "$inc": {"total_time_spent": duration_minutes},
                        "$set": {
                            "last_logout_end": now.isoformat(),
                            "last_session_duration": round(duration_minutes, 2)
                        }
                    }
                )
                print(f"Progress update result - matched: {progress_result.matched_count}, modified: {progress_result.modified_count}")
                if progress_result.matched_count == 0:
                    raise Exception(f"Progress update failed: document not found for user {user_email}")
                if progress_result.modified_count == 0:
                    print(f"Warning: Progress update matched but didn't modify for user {user_email} (values may be unchanged)")
                else:
                    # Verify the update
                    updated_progress = progress_collection.find_one({"email": user_email})
                    print(f"Verified update - new total_time_spent: {updated_progress.get('total_time_spent', 'N/A')}")

            return round(duration_minutes, 2)  # return session duration

        except KeyError as e:
            error_msg = f"Missing required field in session data: {str(e)}"
            print(f"Error during session deactivation: {error_msg}")
            raise Exception(error_msg)
        except ValueError as e:
            error_msg = f"Invalid datetime format: {str(e)}"
            print(f"Error during session deactivation: {error_msg}")
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Error during session deactivation: {str(e)}"
            print(f"Error during session deactivation: {error_msg}")
            raise Exception(error_msg)


# ---------------- Logout Route ----------------


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
