"""
config.py - Application configuration
Uses .env file for sensitive values
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask secret key
    SECRET_KEY = os.getenv("SECRET_KEY", "xai-ids-secret-2024")

    # MySQL Database URI
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost/xai_ids"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-xai-2024")
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours

    # File upload settings
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "../dataset/uploads")
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size

    # Saved model paths
    MODEL_FOLDER = os.path.join(os.path.dirname(__file__), "../dataset/models")


class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
