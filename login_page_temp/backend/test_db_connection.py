# test_db_connection.py
from db_operations import DatabaseOperations
from datetime import datetime, timezone

def test_database_connection():
    """Test database connection and create collections if they don't exist"""
    try:
        # Test connection by creating a test session
        test_email = "test@example.com"
        test_session_data = {
            'login_time': datetime.now(timezone.utc).isoformat(),
            'user_agent': 'Test Agent',
            'ip_address': '127.0.0.1'
        }
        
        # Create test session
        result = DatabaseOperations.create_user_session(test_email, test_session_data)
        print(f"✅ Database connection successful! Session created with ID: {result.inserted_id}")
        
        # Test roadmap creation
        test_roadmap_data = {
            'topics': [{'id': 1, 'title': 'Test Topic', 'description': 'Test Description'}],
            'generated_at': DatabaseOperations.get_current_timestamp()
        }
        
        roadmap_result = DatabaseOperations.save_roadmap(test_email, "Test Topic", test_roadmap_data)
        print(f"✅ Roadmap saved successfully! Roadmap ID: {roadmap_result.inserted_id}")
        
        # Test chat message saving
        chat_result = DatabaseOperations.save_chat_message(
            test_email, 
            "Test message", 
            "Test response", 
            "test"
        )
        print(f"✅ Chat message saved successfully! Chat ID: {chat_result.inserted_id}")
        
        # Test retrieving user data
        user_data = DatabaseOperations.get_user_data(test_email)
        print(f"✅ User data retrieved successfully!")
        print(f"   - Sessions: {len(user_data['session']) if user_data['session'] else 0}")
        print(f"   - Roadmaps: {len(user_data['roadmaps'])}")
        print(f"   - Chat History: {len(user_data['chat_history'])}")
        
        # Clean up test data
        DatabaseOperations.deactivate_session(test_email)
        print("✅ Test data cleaned up successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing database connection...")
    success = test_database_connection()
    if success:
        print("\n🎉 All tests passed! Your database is ready to use.")
    else:
        print("\n💥 Tests failed. Please check your MongoDB connection.")
