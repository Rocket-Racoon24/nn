#!/usr/bin/env python3
"""
Test script to verify progress collection updates work correctly.
"""
import sys
import os
from datetime import datetime, timezone

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db_operations import DatabaseOperations, progress_collection, sessions_collection

def test_progress_update():
    """Test the progress update functionality"""
    test_email = "test_user@example.com"
    
    print("=" * 60)
    print("Testing Progress Collection Update")
    print("=" * 60)
    
    # Clean up any existing test data
    print(f"\n1. Cleaning up existing test data for {test_email}")
    progress_collection.delete_many({"email": test_email})
    sessions_collection.delete_many({"user_email": test_email})
    
    # Create a test session
    print(f"\n2. Creating test session for {test_email}")
    session_data = {
        'login_time': datetime.now(timezone.utc).isoformat(),
        'user_agent': 'Test Agent',
        'ip_address': '127.0.0.1'
    }
    
    try:
        DatabaseOperations.create_user_session(test_email, session_data)
        print("✓ Test session created successfully")
    except Exception as e:
        print(f"✗ Failed to create test session: {e}")
        return False
    
    # Verify session exists
    session = sessions_collection.find_one({"user_email": test_email, "is_active": True})
    if not session:
        print("✗ Failed to find created session")
        return False
    print(f"✓ Session found: {session.get('_id')}")
    
    # Wait a moment to simulate time passing
    import time
    print("\n3. Waiting 2 seconds to simulate session duration...")
    time.sleep(2)
    
    # Deactivate the session (this should update progress)
    print(f"\n4. Deactivating session and updating progress...")
    try:
        duration = DatabaseOperations.deactivate_session(test_email)
        print(f"✓ Session deactivated. Duration: {duration} minutes")
    except Exception as e:
        print(f"✗ Failed to deactivate session: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Verify session was deactivated
    print(f"\n5. Verifying session deactivation...")
    deactivated_session = sessions_collection.find_one({"user_email": test_email, "is_active": True})
    if deactivated_session:
        print("✗ Session is still active!")
        return False
    else:
        inactive_session = sessions_collection.find_one({"user_email": test_email, "is_active": False})
        if inactive_session:
            print("✓ Session properly deactivated")
        else:
            print("✗ Session not found at all")
            return False
    
    # Verify progress was updated
    print(f"\n6. Verifying progress collection update...")
    progress = progress_collection.find_one({"email": test_email})
    
    if not progress:
        print("✗ Progress document was NOT created!")
        print("Checking all progress documents...")
        all_progress = list(progress_collection.find({}))
        print(f"Found {len(all_progress)} progress documents total")
        for p in all_progress:
            print(f"  - {p.get('email')}: {p.get('total_time_spent', 'N/A')} minutes")
        return False
    
    print(f"✓ Progress document found!")
    print(f"  - Email: {progress.get('email')}")
    print(f"  - Total time spent: {progress.get('total_time_spent')} minutes")
    print(f"  - Last session duration: {progress.get('last_session_duration')} minutes")
    print(f"  - Last logout end: {progress.get('last_logout_end')}")
    print(f"  - Created at: {progress.get('created_at')}")
    
    # Test updating progress again (simulating another logout)
    print(f"\n7. Testing progress update on existing document...")
    
    # Create another session
    session_data2 = {
        'login_time': datetime.now(timezone.utc).isoformat(),
        'user_agent': 'Test Agent 2',
        'ip_address': '127.0.0.1'
    }
    DatabaseOperations.create_user_session(test_email, session_data2)
    time.sleep(1)
    
    # Get current total
    current_total = progress.get('total_time_spent', 0)
    print(f"  Current total: {current_total} minutes")
    
    # Deactivate again
    duration2 = DatabaseOperations.deactivate_session(test_email)
    print(f"  New session duration: {duration2} minutes")
    
    # Verify it was incremented
    updated_progress = progress_collection.find_one({"email": test_email})
    new_total = updated_progress.get('total_time_spent', 0)
    print(f"  New total: {new_total} minutes")
    
    if new_total > current_total:
        print(f"✓ Progress was properly incremented!")
    else:
        print(f"✗ Progress was NOT incremented! ({current_total} -> {new_total})")
        return False
    
    print("\n" + "=" * 60)
    print("✓ All tests passed! Progress collection updates are working correctly.")
    print("=" * 60)
    
    # Cleanup
    print(f"\n8. Cleaning up test data...")
    progress_collection.delete_many({"email": test_email})
    sessions_collection.delete_many({"user_email": test_email})
    print("✓ Cleanup complete")
    
    return True

if __name__ == "__main__":
    success = test_progress_update()
    sys.exit(0 if success else 1)

