# auth_routes.py
from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os, jwt, datetime

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")

# Create a Blueprint for authentication routes
auth_bp = Blueprint('auth_bp', __name__)

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_collection = db.users

# ----------------- JWT Utility -----------------
def token_required(f):
    def wrapper(*args, **kwargs):
        token = None

        # Token should be sent in headers: Authorization: Bearer <token>
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user = decoded  # attach user info to request
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401

        return f(*args, **kwargs)

    wrapper.__name__ = f.__name__
    return wrapper

# ----------------- Routes -----------------

# Register new user
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if users_collection.find_one({'email': email}):
        return jsonify({'message': 'User already exists'}), 400

    hashed_password = generate_password_hash(password)
    users_collection.insert_one({
        'name': name,
        'email': email,
        'password': hashed_password
    })
    return jsonify({'message': 'User registered successfully'}), 201


# Login user
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = users_collection.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'message': 'Invalid credentials'}), 401

    # Generate JWT token (valid for 1 hour)
    token = jwt.encode(
        {
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        },
        SECRET_KEY,
        algorithm="HS256"
    )

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': {'name': user['name'], 'email': user['email']}
    }), 200


# Protected route - only logged-in users can access
@auth_bp.route('/home-data', methods=['GET'])
@token_required
def home_data():
    user_email = request.user['email']
    user = users_collection.find_one(
        {'email': user_email},
        {"_id": 0, "password": 0}  # hide _id and password
    )

    return jsonify({
        'message': f'Welcome {user["name"]}!',
        'user': user
    }), 200
