"""
routes/predict.py - Prediction API
POST /api/predict         → single row prediction
POST /api/predict-batch   → batch prediction from upload_id
GET  /api/predictions     → list all saved predictions
"""
import os
import numpy as np
import joblib
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from models.db_models import Prediction, Upload
from models.ml_model import load_model
from utils.preprocessing import preprocess_single_row, preprocess_uploaded_csv

predict_bp = Blueprint("predict", __name__)


def _get_label_names(model_folder):
    """Helper: load label encoder class names."""
    le_path = os.path.join(model_folder, "label_encoder.pkl")
    if os.path.exists(le_path):
        le = joblib.load(le_path)
        return list(le.classes_)
    return []


@predict_bp.route("/predict", methods=["POST"])
@jwt_required()
def predict():
    """
    Single-row prediction.
    Body JSON: { "features": {col: value, ...}, "model": "random_forest" }
    """
    data = request.get_json() or {}
    features   = data.get("features", {})
    model_name = data.get("model", "random_forest")  # or "xgboost"

    if not features:
        return jsonify({"error": "No features provided"}), 400

    model_folder = current_app.config["MODEL_FOLDER"]

    try:
        model = load_model(model_name, model_folder)
        X_scaled, feature_names = preprocess_single_row(features, model_folder)
        label_names = _get_label_names(model_folder)

        # Predict class and probabilities
        pred_class = int(model.predict(X_scaled)[0])
        proba      = model.predict_proba(X_scaled)[0]
        confidence = float(np.max(proba))
        label      = label_names[pred_class] if pred_class < len(label_names) else str(pred_class)

        # Determine if it's an attack or benign
        is_attack = (label.upper() != "BENIGN")

        # Build probability distribution for chart
        prob_dist = {label_names[i]: round(float(p), 4)
                     for i, p in enumerate(proba) if i < len(label_names)}

        # Save to DB
        user_id = int(get_jwt_identity())
        pred_record = Prediction(
            row_index=0,
            feature_data=features,
            prediction=label,
            confidence=confidence,
            model_used=model_name
        )
        db.session.add(pred_record)
        db.session.commit()

        return jsonify({
            "prediction":    label,
            "is_attack":     is_attack,
            "confidence":    round(confidence, 4),
            "model_used":    model_name,
            "probabilities": prob_dist,
            "pred_id":       pred_record.id
        }), 200

    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@predict_bp.route("/predict-batch", methods=["POST"])
@jwt_required()
def predict_batch():
    """
    Batch predict on an uploaded CSV file.
    Body JSON: { "upload_id": 1, "model": "random_forest" }
    """
    data = request.get_json() or {}
    upload_id  = data.get("upload_id")
    model_name = data.get("model", "random_forest")

    if not upload_id:
        return jsonify({"error": "upload_id required"}), 400

    upload = Upload.query.get(upload_id)
    if not upload:
        return jsonify({"error": "Upload not found"}), 404

    model_folder  = current_app.config["MODEL_FOLDER"]
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    csv_path      = os.path.join(upload_folder, upload.filename)

    try:
        model       = load_model(model_name, model_folder)
        label_names = _get_label_names(model_folder)
        X_scaled, feature_names, y_raw = preprocess_uploaded_csv(csv_path, model_folder)

        predictions  = model.predict(X_scaled)
        probabilities = model.predict_proba(X_scaled)

        results = []
        attack_counts = {}

        for i, (pred, proba) in enumerate(zip(predictions, probabilities)):
            label      = label_names[pred] if pred < len(label_names) else str(pred)
            confidence = float(np.max(proba))
            is_attack  = (label.upper() != "BENIGN")

            attack_counts[label] = attack_counts.get(label, 0) + 1

            # Save every row to DB (limit to 500 to avoid overload)
            if i < 500:
                rec = Prediction(
                    upload_id=upload_id,
                    row_index=i,
                    prediction=label,
                    confidence=confidence,
                    model_used=model_name
                )
                db.session.add(rec)

            results.append({
                "row": i,
                "prediction": label,
                "is_attack": is_attack,
                "confidence": round(confidence, 4)
            })

        upload.status = "processed"
        db.session.commit()

        return jsonify({
            "message":        f"Batch prediction done on {len(results)} rows",
            "attack_summary": attack_counts,
            "total_rows":     len(results),
            "total_attacks":  sum(v for k, v in attack_counts.items() if k.upper() != "BENIGN"),
            "results":        results[:100]  # Return first 100 for display
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@predict_bp.route("/predictions", methods=["GET"])
@jwt_required()
def get_predictions():
    """Get last 50 predictions from DB."""
    preds = Prediction.query.order_by(Prediction.predicted_at.desc()).limit(50).all()
    return jsonify({"predictions": [p.to_dict() for p in preds]}), 200


@predict_bp.route("/dashboard-stats", methods=["GET"])
@jwt_required()
def dashboard_stats():
    """Aggregate stats for dashboard: attack distribution, total counts."""
    from sqlalchemy import func
    stats = db.session.query(
        Prediction.prediction,
        func.count(Prediction.id).label("count")
    ).group_by(Prediction.prediction).all()

    distribution = [{"label": s.prediction, "count": s.count} for s in stats]
    total = sum(s["count"] for s in distribution)
    attacks = sum(s["count"] for s in distribution if s["label"].upper() != "BENIGN")

    return jsonify({
        "distribution": distribution,
        "total_predictions": total,
        "total_attacks": attacks,
        "total_benign": total - attacks
    }), 200
