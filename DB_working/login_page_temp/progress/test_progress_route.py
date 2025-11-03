#!/usr/bin/env python3
"""
Test script for the progress routes.
"""
import sys
import os
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

def test_progress_data():
    """Test that progress data exists and can be retrieved"""
    print("=" * 70)
    print("Testing Progress Route Data")
    print("=" * 70)
    
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    progress_collection = db.progress
    
    # Check for existing progress data
    print("\n1. Checking progress collection...")
    all_progress = list(progress_collection.find({}))
    print(f"   Total progress documents: {len(all_progress)}")
    
    if all_progress:
        print("\n   Progress Documents:")
        print("   " + "-" * 66)
        for doc in all_progress[:5]:  # Show first 5
            email = doc.get('email', 'N/A')
            total_time = doc.get('total_time_spent', 0)
            last_duration = doc.get('last_session_duration', 0)
            print(f"   Email: {email}")
            print(f"   Total Time: {total_time:.2f} minutes ({total_time/60:.2f} hours)")
            print(f"   Last Session: {last_duration:.2f} minutes")
            print(f"   " + "-" * 66)
    
    # Test specific user
    test_email = "juliatthomaz@gmail.com"
    print(f"\n2. Testing for specific user: {test_email}")
    progress = progress_collection.find_one({"email": test_email})
    
    if progress:
        print(f"   ✓ Progress found:")
        print(f"     - Total time: {progress.get('total_time_spent', 0):.2f} minutes")
        print(f"     - Last session: {progress.get('last_session_duration', 0):.2f} minutes")
        print(f"     - Last logout: {progress.get('last_logout_end', 'N/A')}")
    else:
        print(f"   ⚠ No progress found for this user")
    
    print("\n" + "=" * 70)
    print("Test complete!")
    print("=" * 70)
    print("\nAPI Endpoints:")
    print("  GET /get_total_time - Get total time spent for authenticated user")
    print("  GET /get_progress - Get complete progress data for authenticated user")
    print("\nBoth endpoints require authentication (Bearer token)")
    
    client.close()

if __name__ == "__main__":
    test_progress_data()

