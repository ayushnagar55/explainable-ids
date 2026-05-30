"""
routes/upload.py - CSV File Upload API
POST /api/upload-csv  → upload dataset, store log in DB
GET  /api/uploads     → list all uploads
"""
import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from app import db
from models.db_models import Upload

upload_bp = Blueprint("upload", __name__)

ALLOWED_EXTENSIONS = {"csv"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route("/upload-csv", methods=["POST"])
@jwt_required()
def upload_csv():
    """
    Upload a CSV file for batch prediction.
    Form-data key: 'file'
    """
    if "file" not in request.files:
        return jsonify({"error": "No file in request. Use key 'file'"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only CSV files are allowed"}), 400

    filename = secure_filename(file.filename)
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    save_path     = os.path.join(upload_folder, filename)

    try:
        file.save(save_path)

        # Count rows in CSV (quick peek)
        import pandas as pd
        df = pd.read_csv(save_path, nrows=1)   # Read 1 row to get columns
        total_rows = sum(1 for _ in open(save_path)) - 1  # count lines - header

        user_id = int(get_jwt_identity())
        upload = Upload(
            filename=filename,
            rows_count=total_rows,
            uploaded_by=user_id,
            status="pending"
        )
        db.session.add(upload)
        db.session.commit()

        return jsonify({
            "message":   f"File '{filename}' uploaded successfully",
            "upload_id": upload.id,
            "rows":      total_rows,
            "filename":  filename
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@upload_bp.route("/uploads", methods=["GET"])
@jwt_required()
def list_uploads():
    """Return list of all uploaded files."""
    uploads = Upload.query.order_by(Upload.upload_time.desc()).all()
    return jsonify({"uploads": [u.to_dict() for u in uploads]}), 200


@upload_bp.route("/training-logs", methods=["GET"])
@jwt_required()
def training_logs():
    """Return all model training logs for Performance page."""
    from models.db_models import TrainingLog
    logs = TrainingLog.query.order_by(TrainingLog.trained_at.desc()).all()
    return jsonify({"logs": [l.to_dict() for l in logs]}), 200
