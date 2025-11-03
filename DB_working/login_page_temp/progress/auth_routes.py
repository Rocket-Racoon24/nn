# auth_routes.py
from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from dotenv import load_dotenv
import os, jwt, datetime, random, threading, time
from datetime import timezone
from db_operations import DatabaseOperations

# ----------------- Load environment variables -----------------
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")

# ----------------- Create Blueprint -----------------
auth_bp = Blueprint('auth_bp', __name__)

# ----------------- MongoDB Connection -----------------
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
users_collection = db.users

# ----------------- Flask-Mail Setup -----------------
mail = Mail()

def init_mail(app):
    app.config['MAIL_SERVER'] = os.getenv("MAIL_SERVER")
    app.config['MAIL_PORT'] = int(os.getenv("MAIL_PORT"))
    app.config['MAIL_USERNAME'] = os.getenv("MAIL_USERNAME")
    app.config['MAIL_PASSWORD'] = os.getenv("MAIL_PASSWORD")
    app.config['MAIL_USE_TLS'] = os.getenv("MAIL_USE_TLS") == "True"
    app.config['MAIL_USE_SSL'] = os.getenv("MAIL_USE_SSL") == "True"
    mail.init_app(app)

# Serializer for password reset tokens
serializer = URLSafeTimedSerializer(SECRET_KEY)

# ----------------- JWT Utility -----------------
def token_required(f):
    def wrapper(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401

        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# ----------------- Email Helpers -----------------
def send_otp_email(email, otp):
    msg = Message(
        "Verify your StudyApp account",
        sender=os.getenv("MAIL_USERNAME"),
        recipients=[email]
    )
    msg.body = f"Your StudyApp verification code is {otp}. It expires in 10 minutes."
    mail.send(msg)

def send_reset_email(email, token):
    reset_url = f"http://localhost:3000/reset-password?token={token}"  # front-end link
    msg = Message(
        "Reset your StudyApp password",
        sender=os.getenv("MAIL_USERNAME"),
        recipients=[email]
    )
    msg.body = f"To reset your password, click the link below:\n\n{reset_url}\n\nThis link expires in 10 minutes."
    mail.send(msg)

def send_final_reminder_email(email):
    msg = Message(
        "Reminder: Verify your StudyApp account soon",
        sender=os.getenv("MAIL_USERNAME"),
        recipients=[email]
    )
    msg.body = (
        "Hello!\n\n"
        "You registered on StudyApp but haven’t verified your email yet.\n"
        "Your account will be deleted automatically in 1 hour unless you verify it.\n\n"
        "If you missed the OTP, please register again or contact support.\n\n"
        "– StudyApp Team"
    )
    mail.send(msg)

# ----------------- ROUTES -----------------

# 1️⃣ Register with OTP
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([name, email, password]):
        return jsonify({'message': 'All fields are required'}), 400

    existing_user = users_collection.find_one({'email': email})
    if existing_user:
        if not existing_user.get("is_verified", False):
            return jsonify({'message': 'Email already registered but not verified. Please verify your account.'}), 400
        return jsonify({'message': 'User already exists'}), 400

    hashed_password = generate_password_hash(password)
    otp = random.randint(100000, 999999)
    otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)

    users_collection.insert_one({
        'name': name,
        'email': email,
        'password': hashed_password,
        'is_verified': False,
        'otp': otp,
        'otp_expiry': otp_expiry,
        'created_at': datetime.datetime.utcnow()
    })

    try:
        send_otp_email(email, otp)
    except Exception as e:
        return jsonify({'message': f'Failed to send OTP: {str(e)}'}), 500

    return jsonify({'message': 'User registered successfully. Please check your email for the OTP.'}), 201


# 2️⃣ Verify OTP
@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    otp = data.get('otp')

    user = users_collection.find_one({'email': email})
    if not user:
        return jsonify({'message': 'User not found'}), 404

    if user.get('is_verified'):
        return jsonify({'message': 'User already verified'}), 400

    if datetime.datetime.utcnow() > user['otp_expiry']:
        return jsonify({'message': 'OTP expired. Please request a new one.'}), 400

    if str(user['otp']) != str(otp):
        return jsonify({'message': 'Invalid OTP'}), 400

    users_collection.update_one(
        {'email': email},
        {'$set': {'is_verified': True}, '$unset': {'otp': "", 'otp_expiry': ""}}
    )
    return jsonify({'message': 'Email verified successfully! You can now log in.'}), 200


# 2️⃣.5 Resend OTP
@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    data = request.get_json()
    email = data.get('email')

    user = users_collection.find_one({'email': email})
    if not user:
        return jsonify({'message': 'User not found'}), 404

    if user.get('is_verified', False):
        return jsonify({'message': 'User already verified'}), 400

    otp = random.randint(100000, 999999)
    otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)

    try:
        send_otp_email(email, otp)
    except Exception as e:
        return jsonify({'message': f'Failed to send OTP: {str(e)}'}), 500

    users_collection.update_one({'email': email}, {'$set': {'otp': otp, 'otp_expiry': otp_expiry}})
    return jsonify({'message': 'New OTP sent successfully.'}), 200


# 3️⃣ Forgot Password
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    user = users_collection.find_one({'email': email})
    if not user:
        return jsonify({'message': 'User not found'}), 404

    if not user.get('is_verified', False):
        return jsonify({'message': 'Please verify your email before resetting password.'}), 403

    token = serializer.dumps(email, salt='password-reset')
    try:
        send_reset_email(email, token)
    except Exception as e:
        return jsonify({'message': f'Failed to send reset email: {str(e)}'}), 500

    return jsonify({'message': 'Password reset email sent successfully.'}), 200


# 3️⃣.5 Reset Password
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')

    try:
        email = serializer.loads(token, salt='password-reset', max_age=600)
    except SignatureExpired:
        return jsonify({'message': 'Reset token expired'}), 400
    except BadSignature:
        return jsonify({'message': 'Invalid reset token'}), 400

    hashed_password = generate_password_hash(new_password)
    users_collection.update_one({'email': email}, {'$set': {'password': hashed_password}})
    return jsonify({'message': 'Password reset successfully!'}), 200


# 4️⃣ Login
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = users_collection.find_one({'email': email})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'message': 'Invalid credentials'}), 401

    if not user.get('is_verified', False):
        return jsonify({'message': 'Please verify your email before logging in.'}), 403

    token = jwt.encode(
        {'email': email, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
        SECRET_KEY,
        algorithm="HS256"
    )

    session_data = {
        'login_time': datetime.datetime.now(timezone.utc).isoformat(),
        'user_agent': request.headers.get('User-Agent', ''),
        'ip_address': request.remote_addr
    }

    existing_session = DatabaseOperations.get_user_session(email)
    if existing_session:
        DatabaseOperations.update_session(email, session_data)
    else:
        DatabaseOperations.create_user_session(email, session_data)

    user_data = DatabaseOperations.get_user_data(email)
    return jsonify({'message': 'Login successful', 'token': token, 'user': {'name': user['name'], 'email': email}, 'user_data': user_data}), 200


# 5️⃣ Protected route
@auth_bp.route('/home-data', methods=['GET'])
@token_required
def home_data():
    email = request.user['email']
    user = users_collection.find_one({'email': email}, {"_id": 0, "password": 0})
    user_data = DatabaseOperations.get_user_data(email)
    return jsonify({'message': f'Welcome {user["name"]}!', 'user': user, 'user_data': user_data}), 200


# 6️⃣ Logout
@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout():
    email = request.user['email']
    print(f"[logout] Starting logout process for user: {email}")
    try:
        duration = DatabaseOperations.deactivate_session(email)
        if duration is None:
            print(f"[logout] Warning: No active session found for {email} during logout")
            # Still try to update progress with 0 duration if session doesn't exist
            # This handles edge cases where session might have been cleared
            return jsonify({'message': 'Logout successful (no active session found)', 'session_duration': None}), 200
        else:
            print(f"[logout] Successfully deactivated session for {email}, duration: {duration} minutes")
            return jsonify({'message': 'Logout successful', 'session_duration': duration}), 200
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[logout] Error during logout for {email}: {str(e)}")
        print(f"[logout] Traceback: {error_trace}")
        # Still return success to allow logout, but log the error for debugging
        return jsonify({'message': 'Logout completed with warnings', 'error': str(e)}), 200


# ----------------- AUTO CLEANUP THREAD -----------------
def cleanup_unverified_users():
    """Deletes unverified users after 24 hours, with 1-hour reminder."""
    while True:
        try:
            now = datetime.datetime.utcnow()
            reminder_threshold = now - datetime.timedelta(hours=23)
            delete_threshold = now - datetime.timedelta(hours=24)

            # Send reminder emails
            unverified_users = users_collection.find({
                "is_verified": False,
                "created_at": {"$lt": reminder_threshold, "$gte": delete_threshold}
            })
            for user in unverified_users:
                try:
                    send_final_reminder_email(user["email"])
                    print(f"[REMINDER] Sent final email to {user['email']}")
                except Exception as e:
                    print(f"[REMINDER ERROR] {e}")

            # Delete old unverified accounts
            result = users_collection.delete_many({
                "is_verified": False,
                "created_at": {"$lt": delete_threshold}
            })
            if result.deleted_count > 0:
                print(f"[CLEANUP] Deleted {result.deleted_count} unverified users.")
        except Exception as e:
            print(f"[CLEANUP ERROR] {e}")

        time.sleep(3600)  # Run every hour
