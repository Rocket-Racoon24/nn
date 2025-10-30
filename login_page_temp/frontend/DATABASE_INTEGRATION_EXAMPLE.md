# Frontend Database Integration Example

This document shows how to integrate the new database features in your React frontend.

## Updated Login Response

The login endpoint now returns user data along with the token:

```javascript
// Example login response
{
  "message": "Login successful",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "user_data": {
    "session": {
      "user_email": "john@example.com",
      "created_at": "2024-01-01T00:00:00.000Z",
      "last_accessed": "2024-01-01T00:00:00.000Z",
      "session_data": {...},
      "is_active": true
    },
    "roadmaps": [
      {
        "user_email": "john@example.com",
        "topic": "Machine Learning",
        "roadmap_data": {
          "topics": [...],
          "details": [...],
          "sub_details": {...},
          "quiz": {...}
        },
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "chat_history": [
      {
        "user_email": "john@example.com",
        "message": "What is machine learning?",
        "response": "Machine learning is...",
        "message_type": "chat",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

## Frontend Integration Examples

### 1. Updated Login Component

```javascript
// Login.js - Updated to handle user data
const handleLogin = async (email, password) => {
  try {
    const response = await fetch('http://localhost:5000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // Store token
      localStorage.setItem('token', data.token);
      
      // Store user data
      localStorage.setItem('userData', JSON.stringify(data.user_data));
      
      // Navigate to home
      navigate('/home');
    } else {
      setError(data.message);
    }
  } catch (error) {
    setError('Login failed');
  }
};
```

### 2. Home Component with Data Restoration

```javascript
// Home.js - Restore user data on load
import { useEffect, useState } from 'react';

const Home = () => {
  const [userData, setUserData] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    // Load user data from localStorage or fetch from server
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setUserData(data);
      setRoadmaps(data.roadmaps || []);
      setChatHistory(data.chat_history || []);
    } else {
      // Fetch fresh data from server
      fetchUserData();
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/user-data', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data.user_data);
        setRoadmaps(data.user_data.roadmaps || []);
        setChatHistory(data.user_data.chat_history || []);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  return (
    <div>
      <h1>Welcome back!</h1>
      
      {/* Display saved roadmaps */}
      <div>
        <h2>Your Saved Roadmaps</h2>
        {roadmaps.map((roadmap, index) => (
          <div key={index}>
            <h3>{roadmap.topic}</h3>
            <p>Created: {new Date(roadmap.created_at).toLocaleDateString()}</p>
            {/* Display roadmap data */}
          </div>
        ))}
      </div>

      {/* Display chat history */}
      <div>
        <h2>Recent Conversations</h2>
        {chatHistory.slice(0, 5).map((chat, index) => (
          <div key={index}>
            <p><strong>You:</strong> {chat.message}</p>
            <p><strong>AI:</strong> {chat.response}</p>
            <small>{new Date(chat.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3. Roadmap Component with Auto-Save

```javascript
// RoadmapGenerator.js - Auto-save roadmaps
const generateRoadmap = async (topic) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/generate_roadmap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ query: topic }),
    });

    if (response.ok) {
      const data = await response.json();
      setRoadmap(data.topics);
      
      // Refresh user data to get updated roadmaps
      fetchUserData();
    }
  } catch (error) {
    console.error('Failed to generate roadmap:', error);
  }
};

const loadSavedRoadmap = async (topic) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/get_roadmap/${encodeURIComponent(topic)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setRoadmap(data.roadmap.roadmap_data.topics);
      setDetails(data.roadmap.roadmap_data.details);
      setSubDetails(data.roadmap.roadmap_data.sub_details);
      setQuiz(data.roadmap.roadmap_data.quiz);
    }
  } catch (error) {
    console.error('Failed to load roadmap:', error);
  }
};
```

### 4. Chat Component with History

```javascript
// Chat component - Save and load chat history
const sendMessage = async (message) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/ask', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: new FormData().append('message', message),
    });

    if (response.ok) {
      const data = await response.json();
      setMessages(prev => [...prev, 
        { type: 'user', content: message },
        { type: 'ai', content: data.chat_reply }
      ]);
      
      // Refresh chat history
      fetchChatHistory();
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

const fetchChatHistory = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/get_chat_history', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setChatHistory(data.chat_history);
    }
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
  }
};
```

## Key Benefits

1. **Persistent Sessions**: Users don't lose their progress when refreshing the page
2. **Saved Roadmaps**: All generated roadmaps are automatically saved and can be retrieved
3. **Chat History**: Complete conversation history is maintained
4. **Seamless Experience**: Data is restored automatically on login
5. **Offline Capability**: Data can be cached in localStorage for offline access

## API Endpoints Summary

- `POST /login` - Login with user data
- `POST /logout` - Logout and deactivate session
- `GET /user-data` - Get all user data
- `GET /get_roadmaps` - Get all user roadmaps
- `GET /get_roadmap/<topic>` - Get specific roadmap
- `GET /get_chat_history` - Get chat history
- All existing endpoints now save data automatically

## Error Handling

Always include proper error handling for network requests and data parsing:

```javascript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  // Process data
} catch (error) {
  console.error('Request failed:', error);
  // Handle error appropriately
}
```
