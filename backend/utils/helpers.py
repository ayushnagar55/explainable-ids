"""
utils/helpers.py - General utility functions
"""
import os
import json
import numpy as np


class NumpyEncoder(json.JSONEncoder):
    """
    Custom JSON encoder to handle numpy types.
    Flask's jsonify can't handle numpy floats/ints natively.
    """
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


def ensure_dir(path: str):
    """Create directory if it doesn't exist."""
    os.makedirs(path, exist_ok=True)


def model_exists(model_name: str, model_folder: str) -> bool:
    """Check if a trained model file exists."""
    clean = model_name.replace(" ", "_").lower()
    path  = os.path.join(model_folder, f"{clean}.pkl")
    return os.path.exists(path)


def format_metrics(metrics: dict) -> dict:
    """Round all float values in a metrics dict to 4 decimal places."""
    return {k: round(float(v), 4) if isinstance(v, (float, np.floating)) else v
            for k, v in metrics.items()}
