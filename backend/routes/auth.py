"""
routes/auth.py - Login & Signup APIs
POST /api/auth/signup  → create new user
POST /api/auth/login   → returns JWT token
GET  /api/auth/me      → get current user info
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash

from app import db
from models.db_models import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Register a new user."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    username = data.get("username", "").strip()
    email    = data.get("email", "").strip()
    password = data.get("password", "")

    if not all([username, email, password]):
        return jsonify({"error": "Username, email, and password required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    # Hash password (never store plain text!)
    hashed = generate_password_hash(password, method="pbkdf2:sha256")

    new_user = User(username=username, email=email, password_hash=hashed)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "Account created successfully!",
        "user": new_user.to_dict()
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Login and return JWT access token."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    username = data.get("username", "").strip()
    password = data.get("password", "")

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid username or password"}), 401

    # Create JWT token with user id as identity
    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "access_token": token,
        "user": user.to_dict()
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Return current logged-in user info."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200
