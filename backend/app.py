"""
app.py - Main Flask Application Entry Point
XAI-based Intrusion Detection System
"""
import os
from flask import Flask
from flask_cors import CORS

from flask_jwt_extended import JWTManager
from extensions import db, jwt
from config import DevelopmentConfig

# Initialize extensions (shared across modules)

jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(DevelopmentConfig)

    # Create upload/model folders if not exist
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["MODEL_FOLDER"], exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)

    # Allow React frontend (localhost:5173) to call this API
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173",
                                                  "http://localhost:3000"]}},
         supports_credentials=True)

    # Register all route blueprints
    from routes.auth    import auth_bp
    from routes.upload  import upload_bp
    from routes.train   import train_bp
    from routes.predict import predict_bp
    from routes.explain import explain_bp

    app.register_blueprint(auth_bp,    url_prefix="/api/auth")
    app.register_blueprint(upload_bp,  url_prefix="/api")
    app.register_blueprint(train_bp,   url_prefix="/api")
    app.register_blueprint(predict_bp, url_prefix="/api")
    app.register_blueprint(explain_bp, url_prefix="/api")

    # Create database tables on first run
    with app.app_context():
        db.create_all()
        print("✅ Database tables created/verified")

    return app


if __name__ == "__main__":
    app = create_app()
    print("🚀 XAI-IDS Backend running on http://localhost:5000")
    app.run(debug=True, port=5000, host="0.0.0.0")
