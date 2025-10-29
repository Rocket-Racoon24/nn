# Database Integration Features

This document explains the new database integration features that have been added to the StudyApp backend.

## Overview

The backend now stores user sessions, roadmap data, and chat history in MongoDB. This allows users to:
- Maintain their session state across browser refreshes
- Save and retrieve their generated roadmaps
- Access their chat history
- Have a persistent learning experience

## Database Collections

### 1. Sessions Collection (`sessions`)
Stores user session information:
```json
{
  "user_email": "user@example.com",
  "created_at": "2024-01-01T00:00:00.000Z",
  "last_accessed": "2024-01-01T00:00:00.000Z",
  "session_data": {
    "login_time": "2024-01-01T00:00:00.000Z",
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.1"
  },
  "is_active": true
}
```

### 2. Roadmaps Collection (`roadmaps`)
Stores user-generated roadmaps:
```json
{
  "user_email": "user@example.com",
  "topic": "Machine Learning",
  "roadmap_data": {
    "topics": [...],
    "details": [...],
    "sub_details": {...},
    "quiz": {...},
    "generated_at": "2024-01-01T00:00:00.000Z"
  },
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 3. Chat History Collection (`chat_history`)
Stores user chat interactions:
```json
{
  "user_email": "user@example.com",
  "message": "What is machine learning?",
  "response": "Machine learning is...",
  "message_type": "chat",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

## New API Endpoints

### Authentication Routes
- `POST /login` - Now returns user data including sessions, roadmaps, and chat history
- `POST /logout` - Deactivates user session
- `GET /user-data` - Retrieves all user data without full login

### Roadmap Routes
- `GET /get_roadmaps` - Get all user's saved roadmaps
- `GET /get_roadmap/<topic>` - Get specific roadmap by topic
- All existing roadmap generation routes now save data to database

### Chatbot Routes
- `GET /get_chat_history` - Get user's chat history
- All chat interactions are now saved to database

## Key Features

### 1. Session Management
- Users maintain their session state across browser refreshes
- Session data includes login time, user agent, and IP address
- Sessions are automatically deactivated on logout

### 2. Roadmap Persistence
- All generated roadmaps are automatically saved
- Users can retrieve their previously generated roadmaps
- Roadmap data includes topics, details, sub-details, and quizzes
- Updates to existing roadmaps are tracked

### 3. Chat History
- All chat interactions are saved
- Different message types are categorized (chat, summary, etc.)
- Users can access their complete chat history

### 4. Data Retrieval
- On login, users receive all their existing data
- Separate endpoints for refreshing data without full login
- Efficient data fetching with proper indexing

## Usage

### Testing Database Connection
Run the test script to verify your database setup:
```bash
cd backend
python test_db_connection.py
```

### Environment Variables
Make sure your `.env` file contains:
```
MONGO_URI=your_mongodb_connection_string
DB_NAME=your_database_name
SECRET_KEY=your_jwt_secret_key
```

### Running the Application
```bash
cd backend
python call.py
```

## Database Operations

The `DatabaseOperations` class provides methods for:
- Creating and updating user sessions
- Saving and retrieving roadmaps
- Storing and fetching chat history
- Getting complete user data

All operations are designed to be efficient and handle errors gracefully.

## Security Considerations

- All routes require JWT authentication
- User data is isolated by email address
- Sensitive information is excluded from responses
- Sessions are properly managed and deactivated

## Future Enhancements

- Data export functionality
- Advanced search and filtering
- Data analytics and insights
- Backup and restore capabilities
