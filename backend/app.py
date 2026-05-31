"""
app.py - Main Flask Application Entry Point
XAI-based Intrusion Detection System
"""

import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from extensions import db
from config import DevelopmentConfig

jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object(DevelopmentConfig)

    # Create required folders
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["MODEL_FOLDER"], exist_ok=True)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)

    # ✅ CORS (Production + Vercel + Local)
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "https://explainable-ids.vercel.app"
                ]
            }
        },
        supports_credentials=True
    )

    # ✅ Root route (health check)
    @app.route("/")
    def home():
        return {"message": "XAI-IDS Backend is Live 🚀"}

    # Register routes
    from routes.auth import auth_bp
    from routes.upload import upload_bp
    from routes.train import train_bp
    from routes.predict import predict_bp
    from routes.explain import explain_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(upload_bp, url_prefix="/api")
    app.register_blueprint(train_bp, url_prefix="/api")
    app.register_blueprint(predict_bp, url_prefix="/api")
    app.register_blueprint(explain_bp, url_prefix="/api")

    # ✅ FIX: Avoid multiple workers DB conflict (IMPORTANT)
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not os.environ.get("GUNICORN_CMD_ARGS"):
        with app.app_context():
            try:
                db.create_all()
                print("✅ Database tables created/verified")
            except Exception as e:
                print("❌ DB Error:", e)

    return app


if __name__ == "__main__":
    app = create_app()
    print("🚀 XAI-IDS Backend running on http://localhost:5000")
    app.run(debug=True, port=5000, host="0.0.0.0")
