"""
preprocessing.py - Data Preprocessing Pipeline
Handles: missing values, encoding, scaling, SMOTE
"""
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE
import joblib
import os

# Columns to drop (non-informative or constant in CICIDS2017)
COLS_TO_DROP = [
    " Bwd PSH Flags", " Bwd URG Flags", "Fwd Avg Bytes/Bulk",
    " Fwd Avg Packets/Bulk", " Fwd Avg Bulk Rate", " Bwd Avg Bytes/Bulk",
    " Bwd Avg Packets/Bulk", "Bwd Avg Bulk Rate", "init_win_bytes_backward"
]

# Target column name in CICIDS2017
TARGET_COL = " Label"


def load_and_preprocess(csv_path: str, model_folder: str, sample_size: int = 50000):
    """
    Full preprocessing pipeline for CICIDS2017 dataset.

    Steps:
    1. Load CSV
    2. Drop useless columns
    3. Handle missing & infinite values
    4. Encode labels (attack types → integers)
    5. Scale features with StandardScaler
    6. Apply SMOTE for class balance
    7. Split train/test

    Returns: X_train, X_test, y_train, y_test, feature_names, label_encoder
    """
    print(f"📂 Loading dataset from {csv_path}...")
    df = pd.read_csv(csv_path, encoding="utf-8", low_memory=False)
    print(f"   Shape: {df.shape}")

    # --- Step 1: Sample for faster training in minor project ---
    if len(df) > sample_size:
        df = df.sample(n=sample_size, random_state=42)
        print(f"   Sampled to {sample_size} rows")

    # --- Step 2: Drop irrelevant columns ---
    cols_present = [c for c in COLS_TO_DROP if c in df.columns]
    df.drop(columns=cols_present, inplace=True)

    # --- Step 3: Handle missing & infinite values ---
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(inplace=True)
    print(f"   After cleaning: {df.shape}")

    # --- Step 4: Separate features and target ---
    X = df.drop(columns=[TARGET_COL])
    y_raw = df[TARGET_COL].str.strip()  # Remove whitespace from labels

    # Keep only numeric columns
    X = X.select_dtypes(include=[np.number])
    feature_names = list(X.columns)

    # Label encode: "BENIGN" → 0, "DoS Hulk" → 1, etc.
    le = LabelEncoder()
    y = le.fit_transform(y_raw)
    print(f"   Classes found: {list(le.classes_)}")

    # Save label encoder
    joblib.dump(le, os.path.join(model_folder, "label_encoder.pkl"))

    # --- Step 5: Standard scaling ---
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Save scaler for inference
    joblib.dump(scaler, os.path.join(model_folder, "scaler.pkl"))
    joblib.dump(feature_names, os.path.join(model_folder, "feature_names.pkl"))

    # --- Step 6: SMOTE for class imbalance ---
    print("   Applying SMOTE (this may take a minute)...")
    smote = SMOTE(random_state=42, k_neighbors=3)
    X_balanced, y_balanced = smote.fit_resample(X_scaled, y)
    print(f"   After SMOTE: {X_balanced.shape}")

    # --- Step 7: Train/test split (80/20) ---
    X_train, X_test, y_train, y_test = train_test_split(
        X_balanced, y_balanced, test_size=0.2, random_state=42, stratify=y_balanced
    )
    print(f"   Train: {X_train.shape}, Test: {X_test.shape}")

    return X_train, X_test, y_train, y_test, feature_names, le


def preprocess_single_row(row_dict: dict, model_folder: str):
    """
    Preprocess a single prediction input (dict → scaled numpy array).
    Loads saved scaler and feature_names.
    """
    scaler       = joblib.load(os.path.join(model_folder, "scaler.pkl"))
    feature_names = joblib.load(os.path.join(model_folder, "feature_names.pkl"))

    row_df = pd.DataFrame([row_dict])
    # Fill missing features with 0
    for col in feature_names:
        if col not in row_df.columns:
            row_df[col] = 0

    row_df = row_df[feature_names]
    row_scaled = scaler.transform(row_df)
    return row_scaled, feature_names


def preprocess_uploaded_csv(csv_path: str, model_folder: str):
    """
    Preprocess an uploaded CSV for batch prediction.
    Does NOT apply SMOTE (inference only).
    Returns: X_scaled (numpy), feature_names, raw_df
    """
    df = pd.read_csv(csv_path, low_memory=False)
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.fillna(0, inplace=True)

    # If Label column present, separate it
    label_col = None
    for lc in [" Label", "Label", "label"]:
        if lc in df.columns:
            label_col = lc
            break

    if label_col:
        y_raw = df[label_col].str.strip()
        df.drop(columns=[label_col], inplace=True)
    else:
        y_raw = None

    # Keep only numeric columns
    X = df.select_dtypes(include=[np.number])

    scaler        = joblib.load(os.path.join(model_folder, "scaler.pkl"))
    feature_names = joblib.load(os.path.join(model_folder, "feature_names.pkl"))

    for col in feature_names:
        if col not in X.columns:
            X[col] = 0
    X = X[feature_names]

    X_scaled = scaler.transform(X)
    return X_scaled, feature_names, y_raw
