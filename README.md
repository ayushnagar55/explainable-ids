# XAI-IDS: Explainable AI-based Intrusion Detection System

## Project Overview
This project uses Machine Learning (Random Forest + XGBoost) with SHAP & LIME explainability
to detect network intrusions on the CICIDS2017 dataset.

## Folder Structure
```
xai-ids/
├── backend/
│   ├── app.py                  # Flask main app
│   ├── config.py               # DB & app config
│   ├── requirements.txt
│   ├── routes/
│   │   ├── predict.py          # /predict API
│   │   ├── train.py            # /train-model API
│   │   ├── explain.py          # /get-explanation API
│   │   ├── upload.py           # /upload-csv API
│   │   └── auth.py             # login/signup
│   ├── models/
│   │   ├── ml_model.py         # ML training logic
│   │   ├── explainer.py        # SHAP + LIME logic
│   │   └── db_models.py        # SQLAlchemy ORM models
│   └── utils/
│       ├── preprocessing.py    # SMOTE, scaling, encoding
│       └── helpers.py          # Utility functions
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Upload.jsx
│   │   │   ├── Predict.jsx
│   │   │   ├── Explain.jsx
│   │   │   ├── Performance.jsx
│   │   │   └── Login.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ConfusionMatrix.jsx
│   │   │   ├── FeatureImportance.jsx
│   │   │   └── AttackPieChart.jsx
│   │   └── utils/
│   │       └── api.js
├── dataset/
│   └── sample_data.csv
└── docs/
    └── schema.sql
```

## Quick Setup

### 1. Dataset
Download CICIDS2017 from: https://www.unb.ca/cic/datasets/ids-2017.html
Place CSV file in dataset/ folder.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 3. Database Setup
```bash
mysql -u root -p < ../docs/schema.sql
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 5. Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
