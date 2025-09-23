# app.py
from flask import Flask
from flask_cors import CORS
from auth_routes import auth_bp  # import our routes from auth_routes.py

app = Flask(__name__)
CORS(app)

# Register the blueprint
app.register_blueprint(auth_bp)

@app.route('/')
def home():
    return "Flask app running"

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
