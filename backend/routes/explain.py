"""
routes/explain.py - Explainability APIs
POST /api/get-explanation  → LIME for a single prediction
GET  /api/shap-global      → SHAP global feature importance
GET  /api/plots/<filename> → Serve saved PNG plots
"""
import os
import numpy as np
import joblib
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required

from models.ml_model import load_model
from models.explainer import get_shap_explanation, get_lime_explanation
from utils.preprocessing import preprocess_single_row

explain_bp = Blueprint("explain", __name__)


def _load_artifacts(model_folder, model_name):
    """Helper: load model, scaler, label names, feature names."""
    model         = load_model(model_name, model_folder)
    le_path       = os.path.join(model_folder, "label_encoder.pkl")
    fn_path       = os.path.join(model_folder, "feature_names.pkl")
    label_names   = list(joblib.load(le_path).classes_) if os.path.exists(le_path) else []
    feature_names = list(joblib.load(fn_path)) if os.path.exists(fn_path) else []
    return model, label_names, feature_names


@explain_bp.route("/get-explanation", methods=["POST"])
@jwt_required()
def get_explanation():
    """
    LIME local explanation for a single data row.
    Body JSON:
    {
        "features": { col: value, ... },
        "model": "random_forest"   (or "xgboost")
    }
    """
    data       = request.get_json() or {}
    features   = data.get("features", {})
    model_name = data.get("model", "random_forest")

    if not features:
        return jsonify({"error": "No features provided"}), 400

    model_folder = current_app.config["MODEL_FOLDER"]

    # Check if training data sample exists (needed for LIME)
    train_path = os.path.join(model_folder, "X_train_sample.pkl")
    if not os.path.exists(train_path):
        return jsonify({
            "error": "Training sample not found. Run /train-model first!"
        }), 404

    try:
        model, label_names, feature_names = _load_artifacts(model_folder, model_name)
        X_instance, _ = preprocess_single_row(features, model_folder)
        X_train_sample = joblib.load(train_path)

        result = get_lime_explanation(
            model=model,
            X_train=X_train_sample,
            X_instance=X_instance,
            feature_names=feature_names,
            label_names=label_names,
            model_folder=model_folder
        )
        return jsonify(result), 200

    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@explain_bp.route("/shap-global", methods=["GET"])
@jwt_required()
def shap_global():
    """
    Compute SHAP global feature importance.
    Query params: ?model=random_forest&samples=100
    """
    model_name = request.args.get("model", "random_forest")
    n_samples  = int(request.args.get("samples", 100))

    model_folder = current_app.config["MODEL_FOLDER"]
    test_path    = os.path.join(model_folder, "X_test_sample.pkl")

    if not os.path.exists(test_path):
        return jsonify({
            "error": "Test sample not found. Run /train-model first!"
        }), 404

    try:
        model, label_names, feature_names = _load_artifacts(model_folder, model_name)
        X_sample = joblib.load(test_path)

        result = get_shap_explanation(
            model=model,
            X_sample=X_sample[:n_samples],
            feature_names=feature_names,
            model_folder=model_folder
        )
        return jsonify(result), 200

    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@explain_bp.route("/plots/<filename>", methods=["GET"])
def serve_plot(filename):
    """
    Serve saved PNG plot images to frontend.
    Example: GET /api/plots/shap_summary_bar.png
    """
    model_folder = current_app.config["MODEL_FOLDER"]
    file_path    = os.path.join(model_folder, filename)

    if not os.path.exists(file_path):
        return jsonify({"error": f"Plot not found: {filename}"}), 404

    return send_file(file_path, mimetype="image/png")
