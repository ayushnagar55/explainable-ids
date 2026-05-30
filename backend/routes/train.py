"""
routes/train.py - Model Training API
POST /api/train-model  → train RF + XGBoost, save metrics & plots
"""
import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required

from extensions import db   
from models.db_models import TrainingLog
from models.ml_model import (train_random_forest, train_xgboost,
                               evaluate_model, save_model,
                               save_confusion_matrix, save_feature_importance)
from utils.preprocessing import load_and_preprocess

import joblib

train_bp = Blueprint("train", __name__)


@train_bp.route("/train-model", methods=["POST"])
@jwt_required()
def train_model():
    """
    Train Random Forest + XGBoost on CICIDS2017 dataset.
    Body JSON: { "dataset_path": "path/to/dataset.csv", "sample_size": 50000 }
    """
    data = request.get_json() or {}
    dataset_path = data.get("dataset_path", "")
    sample_size  = data.get("sample_size", 50000)

    # Default: look in dataset folder
    if not dataset_path:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        dataset_path = os.path.join(base_dir, "..", "dataset",
                                    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv")

    if not os.path.exists(dataset_path):
        return jsonify({
            "error": f"Dataset not found at: {dataset_path}",
            "hint": "Place a CICIDS2017 CSV in the dataset/ folder and pass its path"
        }), 404

    model_folder = current_app.config["MODEL_FOLDER"]

    try:
        # -------- PREPROCESSING --------
        X_train, X_test, y_train, y_test, feature_names, le = load_and_preprocess(
            dataset_path, model_folder, sample_size=int(sample_size)
        )
        label_names = list(le.classes_)
        results = []

        # -------- RANDOM FOREST --------
        rf_model = train_random_forest(X_train, y_train)
        rf_metrics, rf_preds, _ = evaluate_model(
            rf_model, X_test, y_test, "Random Forest", label_names)
        save_model(rf_model, "random_forest", model_folder)
        rf_cm  = save_confusion_matrix(y_test, rf_preds, label_names,
                                        "Random Forest", model_folder)
        _, rf_fi = save_feature_importance(rf_model, feature_names,
                                            "Random Forest", model_folder)

        # Save metrics to DB
        rf_log = TrainingLog(
            model_name="Random Forest",
            accuracy=rf_metrics["accuracy"],
            precision_score=rf_metrics["precision"],
            recall_score=rf_metrics["recall"],
            f1_score=rf_metrics["f1_score"],
            dataset_rows=len(X_train) + len(X_test),
            notes=f"Features: {len(feature_names)}, Classes: {len(label_names)}"
        )
        db.session.add(rf_log)

        results.append({
            **rf_metrics,
            "confusion_matrix_img": rf_cm,
            "feature_importances": rf_fi[:10]
        })

        # -------- XGBOOST --------
        xgb_model = train_xgboost(X_train, y_train)
        xgb_metrics, xgb_preds, _ = evaluate_model(
            xgb_model, X_test, y_test, "XGBoost", label_names)
        save_model(xgb_model, "xgboost", model_folder)
        xgb_cm  = save_confusion_matrix(y_test, xgb_preds, label_names,
                                         "XGBoost", model_folder)
        _, xgb_fi = save_feature_importance(xgb_model, feature_names,
                                             "XGBoost", model_folder)

        xgb_log = TrainingLog(
            model_name="XGBoost",
            accuracy=xgb_metrics["accuracy"],
            precision_score=xgb_metrics["precision"],
            recall_score=xgb_metrics["recall"],
            f1_score=xgb_metrics["f1_score"],
            dataset_rows=len(X_train) + len(X_test),
            notes=f"Features: {len(feature_names)}, Classes: {len(label_names)}"
        )
        db.session.add(xgb_log)

        results.append({
            **xgb_metrics,
            "confusion_matrix_img": xgb_cm,
            "feature_importances": xgb_fi[:10]
        })

        # Save X_test for later SHAP explanations
        joblib.dump(X_test[:200], os.path.join(model_folder, "X_test_sample.pkl"))
        joblib.dump(X_train[:500], os.path.join(model_folder, "X_train_sample.pkl"))

        db.session.commit()

        return jsonify({
            "message": "✅ Training complete!",
            "models_trained": ["Random Forest", "XGBoost"],
            "label_names": label_names,
            "feature_count": len(feature_names),
            "results": results
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
