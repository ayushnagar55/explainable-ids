"""
ml_model.py - Machine Learning Model Training & Evaluation
Models: Random Forest, XGBoost
Metrics: Accuracy, Precision, Recall, F1
"""
import os
import json
import numpy as np
import joblib
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for server
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report
)
import xgboost as xgb


def train_random_forest(X_train, y_train, n_estimators=100):
    """
    Train a Random Forest classifier.
    n_estimators: number of trees (100 is good for minor project)
    """
    print("🌲 Training Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=15,
        random_state=42,
        n_jobs=-1,          # Use all CPU cores
        class_weight="balanced"
    )
    rf.fit(X_train, y_train)
    print("   ✅ Random Forest trained!")
    return rf


def train_xgboost(X_train, y_train):
    """
    Train an XGBoost classifier.
    """
    print("⚡ Training XGBoost...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        n_jobs=-1,
        eval_metric="mlogloss",
        use_label_encoder=False
    )
    xgb_model.fit(X_train, y_train)
    print("   ✅ XGBoost trained!")
    return xgb_model


def evaluate_model(model, X_test, y_test, model_name: str, label_names: list):
    """
    Evaluate model and return metrics dict.
    Also saves confusion matrix plot.
    """
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)  # Probabilities for confidence

    metrics = {
        "model_name": model_name,
        "accuracy":   round(float(accuracy_score(y_test, y_pred)), 4),
        "precision":  round(float(precision_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "recall":     round(float(recall_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "f1_score":   round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "report":     classification_report(y_test, y_pred,
                          target_names=label_names, output_dict=True, zero_division=0)
    }
    print(f"\n📊 {model_name} Results:")
    print(f"   Accuracy:  {metrics['accuracy']}")
    print(f"   F1 Score:  {metrics['f1_score']}")
    return metrics, y_pred, y_proba


def save_confusion_matrix(y_test, y_pred, label_names, model_name, save_path):
    """
    Save confusion matrix as PNG for display in frontend.
    """
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(max(8, len(label_names)), max(6, len(label_names) - 1)))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=label_names, yticklabels=label_names)
    plt.title(f"Confusion Matrix — {model_name}")
    plt.ylabel("Actual")
    plt.xlabel("Predicted")
    plt.tight_layout()

    fname = f"cm_{model_name.replace(' ', '_').lower()}.png"
    fpath = os.path.join(save_path, fname)
    plt.savefig(fpath, dpi=100, bbox_inches="tight")
    plt.close()
    print(f"   💾 Confusion matrix saved: {fpath}")
    return fname


def save_feature_importance(model, feature_names, model_name, save_path, top_n=20):
    """
    Save feature importance bar chart as PNG.
    Works for both RandomForest and XGBoost.
    """
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    else:
        return None

    # Get top N features
    indices = np.argsort(importances)[::-1][:top_n]
    top_features = [feature_names[i] for i in indices]
    top_scores   = importances[indices]

    plt.figure(figsize=(10, 6))
    bars = plt.barh(top_features[::-1], top_scores[::-1], color="steelblue")
    plt.xlabel("Feature Importance Score")
    plt.title(f"Top {top_n} Features — {model_name}")
    plt.tight_layout()

    fname = f"fi_{model_name.replace(' ', '_').lower()}.png"
    fpath = os.path.join(save_path, fname)
    plt.savefig(fpath, dpi=100, bbox_inches="tight")
    plt.close()
    print(f"   💾 Feature importance saved: {fpath}")

    # Also return as JSON for React recharts
    fi_json = [{"feature": top_features[i], "importance": round(float(top_scores[i]), 5)}
               for i in range(len(top_features))]
    return fname, fi_json


def save_model(model, model_name: str, model_folder: str):
    """Save model with joblib."""
    clean_name = model_name.replace(" ", "_").lower()
    path = os.path.join(model_folder, f"{clean_name}.pkl")
    joblib.dump(model, path)
    print(f"   💾 Model saved: {path}")
    return path


def load_model(model_name: str, model_folder: str):
    """Load a saved model."""
    clean_name = model_name.replace(" ", "_").lower()
    path = os.path.join(model_folder, f"{clean_name}.pkl")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model not found: {path}. Train first!")
    return joblib.load(path)
