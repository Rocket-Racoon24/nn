from flask import Flask
from flask_cors import CORS
from threading import Thread
from auth_routes import auth_bp, init_mail, cleanup_unverified_users
from chatbot_routes import chatbot_bp
from roadmap_routes import roadmap_bp
from progress_routes import progress_bp

app = Flask(__name__)
CORS(app)

app.secret_key = 'a-strong-and-unique-secret-key-for-sessions'

# Initialize Flask-Mail
init_mail(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(chatbot_bp)
app.register_blueprint(roadmap_bp)
app.register_blueprint(progress_bp)

# Start auto-cleanup background thread
cleanup_thread = Thread(target=cleanup_unverified_users, daemon=True)
cleanup_thread.start()

@app.route('/')
def home():
    return "Combined Flask App is running!"

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
