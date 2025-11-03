#!/usr/bin/env python3
"""
Test logout for the specific user mentioned in the issue.
"""
import sys
import os
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_operations import DatabaseOperations, sessions_collection, progress_collection
from bson import ObjectId

def test_user_logout():
    """Test logout for juliatthomaz@gmail.com"""
    user_email = "juliatthomaz@gmail.com"
    
    print("=" * 70)
    print(f"Testing Logout for: {user_email}")
    print("=" * 70)
    
    # Check current session state
    print(f"\n1. Checking current session state...")
    session = sessions_collection.find_one({"user_email": user_email, "is_active": True})
    
    if not session:
        print("   ⚠ No active session found")
        # Check for inactive sessions
        inactive = sessions_collection.find_one({"user_email": user_email, "is_active": False})
        if inactive:
            print(f"   Found inactive session from: {inactive.get('last_accessed')}")
        return False
    
    print(f"   ✓ Found active session:")
    print(f"     - Session ID: {session.get('_id')}")
    print(f"     - Is Active: {session.get('is_active')}")
    print(f"     - Login Time: {session.get('session_data', {}).get('login_time')}")
    print(f"     - Last Accessed: {session.get('last_accessed')}")
    
    # Check current progress
    print(f"\n2. Checking current progress...")
    progress = progress_collection.find_one({"email": user_email})
    if progress:
        print(f"   Current total_time_spent: {progress.get('total_time_spent', 0)} minutes")
    else:
        print(f"   ⚠ No progress document found (will be created on logout)")
    
    # Call deactivate_session
    print(f"\n3. Calling deactivate_session...")
    try:
        duration = DatabaseOperations.deactivate_session(user_email)
        print(f"   ✓ deactivate_session completed")
        print(f"   Duration: {duration} minutes")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Verify session was deactivated
    print(f"\n4. Verifying session deactivation...")
    updated_session = sessions_collection.find_one({"_id": session["_id"]})
    if updated_session:
        is_active = updated_session.get("is_active")
        print(f"   Session is_active: {is_active}")
        if is_active:
            print(f"   ✗ Session is still ACTIVE - UPDATE FAILED!")
            return False
        else:
            print(f"   ✓ Session successfully deactivated")
    else:
        print(f"   ✗ Session not found")
        return False
    
    # Verify progress was created/updated
    print(f"\n5. Verifying progress update...")
    updated_progress = progress_collection.find_one({"email": user_email})
    if updated_progress:
        print(f"   ✓ Progress document found:")
        print(f"     - Total time spent: {updated_progress.get('total_time_spent', 0)} minutes")
        print(f"     - Last session duration: {updated_progress.get('last_session_duration', 'N/A')} minutes")
        print(f"     - Last logout end: {updated_progress.get('last_logout_end', 'N/A')}")
    else:
        print(f"   ✗ Progress document was NOT created/updated!")
        return False
    
    print("\n" + "=" * 70)
    print("✓ All checks passed! Logout is working correctly.")
    print("=" * 70)
    
    return True

if __name__ == "__main__":
    success = test_user_logout()
    sys.exit(0 if success else 1)

