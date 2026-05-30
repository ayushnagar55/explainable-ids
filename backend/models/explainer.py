"""
explainer.py - SHAP & LIME Explainability Module
SHAP  → Global feature importance (why model behaves overall)
LIME  → Local explanation (why THIS specific prediction was made)
"""
import os
import numpy as np
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import shap
import lime
import lime.lime_tabular


def get_shap_explanation(model, X_sample: np.ndarray, feature_names: list,
                          model_folder: str, max_samples: int = 100):
    """
    Compute SHAP values for a sample of data.
    Returns: shap_values, base_values, and saves summary plot PNG.

    Uses TreeExplainer (works for RF & XGBoost efficiently).
    """
    print("🔍 Computing SHAP values...")

    # Limit samples for speed
    if len(X_sample) > max_samples:
        X_sample = X_sample[:max_samples]

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_sample)

    # --- For multi-class: shap_values is a list of arrays ---
    # We take class 0 (benign) vs rest for global importance
    if isinstance(shap_values, list):
        # Mean absolute SHAP across all classes
        mean_shap = np.mean([np.abs(sv) for sv in shap_values], axis=0)
        shap_for_plot = shap_values  # Keep full list for beeswarm
    else:
        mean_shap = np.abs(shap_values)
        shap_for_plot = shap_values

    # --- Feature importance from SHAP ---
    mean_importance = np.mean(mean_shap, axis=0)
    top_indices = np.argsort(mean_importance)[::-1][:20]
    fi_json = [
        {"feature": feature_names[i], "shap_importance": round(float(mean_importance[i]), 6)}
        for i in top_indices
    ]

    # --- Save SHAP summary bar plot ---
    plt.figure(figsize=(10, 6))
    if isinstance(shap_for_plot, list):
        shap.summary_plot(shap_for_plot, X_sample,
                          feature_names=feature_names,
                          plot_type="bar", show=False, max_display=15)
    else:
        shap.summary_plot(shap_for_plot, X_sample,
                          feature_names=feature_names,
                          plot_type="bar", show=False, max_display=15)
    plt.tight_layout()
    bar_path = os.path.join(model_folder, "shap_summary_bar.png")
    plt.savefig(bar_path, dpi=100, bbox_inches="tight")
    plt.close()
    print(f"   💾 SHAP bar plot saved")

    # --- Save SHAP beeswarm (dot) plot ---
    plt.figure(figsize=(10, 6))
    if isinstance(shap_for_plot, list):
        # For multi-class, show class 1 (first attack class)
        shap.summary_plot(shap_for_plot[1] if len(shap_for_plot) > 1 else shap_for_plot[0],
                          X_sample, feature_names=feature_names,
                          show=False, max_display=15)
    else:
        shap.summary_plot(shap_for_plot, X_sample,
                          feature_names=feature_names, show=False, max_display=15)
    plt.tight_layout()
    dot_path = os.path.join(model_folder, "shap_summary_dot.png")
    plt.savefig(dot_path, dpi=100, bbox_inches="tight")
    plt.close()
    print(f"   💾 SHAP dot plot saved")

    return {
        "feature_importances": fi_json,
        "bar_plot":  "shap_summary_bar.png",
        "dot_plot":  "shap_summary_dot.png",
        "num_samples_explained": len(X_sample)
    }


def get_lime_explanation(model, X_train: np.ndarray, X_instance: np.ndarray,
                          feature_names: list, label_names: list,
                          model_folder: str):
    """
    LIME local explanation for a SINGLE prediction instance.
    Answers: "Why did the model predict THIS row as attack/benign?"

    Returns: dict with top features and their contribution weights.
    """
    print("🍋 Computing LIME explanation...")

    # Create LIME explainer using training data distribution
    lime_explainer = lime.lime_tabular.LimeTabularExplainer(
        training_data=X_train,
        feature_names=feature_names,
        class_names=label_names,
        mode="classification",
        random_state=42,
        discretize_continuous=True
    )

    # Explain the single instance
    # num_features: top features to show (15 is good for readability)
    explanation = lime_explainer.explain_instance(
        data_row=X_instance.flatten(),
        predict_fn=model.predict_proba,
        num_features=15,
        num_samples=500  # Lower for speed; increase for accuracy
    )

    # --- Extract features and weights ---
    exp_list = explanation.as_list()
    lime_features = [{"condition": cond, "weight": round(float(w), 5)}
                     for cond, w in exp_list]

    # Separate positive (towards attack) and negative (towards benign)
    positive = [f for f in lime_features if f["weight"] > 0]
    negative = [f for f in lime_features if f["weight"] <= 0]

    # --- Save LIME explanation plot ---
    fig = explanation.as_pyplot_figure()
    plt.tight_layout()
    lime_path = os.path.join(model_folder, "lime_explanation.png")
    fig.savefig(lime_path, dpi=100, bbox_inches="tight")
    plt.close(fig)
    print(f"   💾 LIME plot saved")

    # Get prediction probabilities for the instance
    proba = model.predict_proba(X_instance.reshape(1, -1))[0]
    pred_class = int(np.argmax(proba))

    return {
        "predicted_class": label_names[pred_class] if pred_class < len(label_names) else str(pred_class),
        "confidence":      round(float(np.max(proba)), 4),
        "all_probabilities": {label_names[i]: round(float(p), 4)
                               for i, p in enumerate(proba) if i < len(label_names)},
        "explanation":     lime_features,
        "supporting_features":   positive,   # Push TOWARDS this prediction
        "contradicting_features": negative,  # Push AGAINST this prediction
        "lime_plot": "lime_explanation.png"
    }
