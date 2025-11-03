#!/usr/bin/env python3
"""
Script to verify progress data in MongoDB database.
"""
import sys
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

def verify_progress_data():
    """Verify progress collection data in database"""
    print("=" * 70)
    print("Verifying Progress Collection Data in MongoDB")
    print("=" * 70)
    
    try:
        # Connect to MongoDB
        print(f"\n1. Connecting to MongoDB...")
        print(f"   URI: {MONGO_URI[:50]}...")
        print(f"   Database: {DB_NAME}")
        
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        progress_collection = db.progress
        sessions_collection = db.sessions
        
        # Test connection
        client.admin.command('ping')
        print("   ✓ Connected successfully!")
        
        # Check progress collection
        print(f"\n2. Checking progress collection...")
        progress_count = progress_collection.count_documents({})
        print(f"   Total progress documents: {progress_count}")
        
        if progress_count > 0:
            print(f"\n   Progress Documents:")
            print(f"   {'-' * 68}")
            for doc in progress_collection.find({}).limit(10):
                print(f"   Email: {doc.get('email', 'N/A')}")
                print(f"   Total Time Spent: {doc.get('total_time_spent', 0)} minutes")
                print(f"   Last Session Duration: {doc.get('last_session_duration', 'N/A')} minutes")
                print(f"   Last Logout: {doc.get('last_logout_end', 'N/A')}")
                print(f"   Created At: {doc.get('created_at', 'N/A')}")
                print(f"   {'-' * 68}")
        else:
            print("   ⚠ No progress documents found in database")
        
        # Check sessions collection
        print(f"\n3. Checking sessions collection...")
        active_sessions = sessions_collection.count_documents({"is_active": True})
        inactive_sessions = sessions_collection.count_documents({"is_active": False})
        total_sessions = sessions_collection.count_documents({})
        
        print(f"   Active sessions: {active_sessions}")
        print(f"   Inactive sessions: {inactive_sessions}")
        print(f"   Total sessions: {total_sessions}")
        
        if active_sessions > 0:
            print(f"\n   Active Sessions:")
            print(f"   {'-' * 68}")
            for session in sessions_collection.find({"is_active": True}).limit(5):
                user_email = session.get('user_email', 'N/A')
                session_data = session.get('session_data', {})
                login_time = session_data.get('login_time', 'N/A')
                print(f"   User: {user_email}")
                print(f"   Login Time: {login_time}")
                print(f"   Session ID: {session.get('_id')}")
                print(f"   {'-' * 68}")
        
        # Check if there are users with sessions but no progress
        print(f"\n4. Checking for users with sessions but no progress...")
        all_users_with_sessions = set()
        for session in sessions_collection.find({}, {"user_email": 1}):
            all_users_with_sessions.add(session.get('user_email'))
        
        all_users_with_progress = set()
        for progress in progress_collection.find({}, {"email": 1}):
            all_users_with_progress.add(progress.get('email'))
        
        users_without_progress = all_users_with_sessions - all_users_with_progress
        if users_without_progress:
            print(f"   ⚠ Found {len(users_without_progress)} users with sessions but no progress:")
            for email in list(users_without_progress)[:10]:
                print(f"      - {email}")
        else:
            print(f"   ✓ All users with sessions have progress records")
        
        print("\n" + "=" * 70)
        print("Verification complete!")
        print("=" * 70)
        
        client.close()
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = verify_progress_data()
    sys.exit(0 if success else 1)

