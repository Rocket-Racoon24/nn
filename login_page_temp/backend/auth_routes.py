# auth_routes.py
from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from config import MONGO_URI, DB_NAME

# Create a Blueprint for authentication routes
auth_bp = Blueprint('auth_bp', __name__)

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_collection = db.users

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

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = users_collection.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'message': 'Invalid credentials'}), 401

    return jsonify({'message': 'Login successful',
                    'user': {'name': user['name'], 'email': user['email']}}), 200
