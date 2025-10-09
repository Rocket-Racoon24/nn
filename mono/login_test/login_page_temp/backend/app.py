# app.py
from flask import Flask
from flask_cors import CORS
from auth_routes import auth_bp  # import our routes from auth_routes.py
from chatbot_routes import chatbot_bp  # import our routes from chatbot_routes.py

app = Flask(__name__)
CORS(app)
app.secret_key = '5a6602a8e817bc27572a3859ff87457cd262791ea6a92c9d9f5a7673cbcc659743'



# Register the blueprint
app.register_blueprint(auth_bp)
app.register_blueprint(chatbot_bp) 

@app.route('/')
def home():
    return "Flask app running"

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
