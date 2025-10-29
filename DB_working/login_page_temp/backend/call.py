# call.py
from flask import Flask
from flask_cors import CORS

# --- Make sure these imports are correct ---
from auth_routes import auth_bp
from chatbot_routes import chatbot_bp
from roadmap_routes import roadmap_bp

app = Flask(__name__)
CORS(app) # Handles CORS permissions

# A secret key is required for session management
app.secret_key = 'a-strong-and-unique-secret-key-for-sessions'

# --- This line is likely missing or incorrect ---
# It tells Flask to use the routes from auth_routes.py (like /login)
app.register_blueprint(auth_bp)

# --- Make sure your other blueprints are also registered ---
app.register_blueprint(chatbot_bp)
app.register_blueprint(roadmap_bp)

@app.route('/')
def home():
    return "Combined Flask App is running!"

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)