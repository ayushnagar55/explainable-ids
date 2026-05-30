"""
db_models.py - SQLAlchemy ORM Models
Maps Python classes to MySQL tables
"""
from datetime import datetime
from app import db


class User(db.Model):
    __tablename__ = "users"

    id         = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(50), unique=True, nullable=False)
    email      = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role       = db.Column(db.String(20), default="analyst")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "username": self.username,
                "email": self.email, "role": self.role}


class Upload(db.Model):
    __tablename__ = "uploads"

    id          = db.Column(db.Integer, primary_key=True)
    filename    = db.Column(db.String(255), nullable=False)
    rows_count  = db.Column(db.Integer)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    upload_time = db.Column(db.DateTime, default=datetime.utcnow)
    status      = db.Column(db.String(20), default="pending")

    def to_dict(self):
        return {"id": self.id, "filename": self.filename,
                "rows_count": self.rows_count,
                "upload_time": str(self.upload_time),
                "status": self.status}


class Prediction(db.Model):
    __tablename__ = "predictions"

    id           = db.Column(db.Integer, primary_key=True)
    upload_id    = db.Column(db.Integer, db.ForeignKey("uploads.id"))
    row_index    = db.Column(db.Integer)
    feature_data = db.Column(db.JSON)
    prediction   = db.Column(db.String(100))
    confidence   = db.Column(db.Float)
    model_used   = db.Column(db.String(50))
    predicted_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "prediction": self.prediction,
                "confidence": round(self.confidence, 4),
                "model_used": self.model_used,
                "predicted_at": str(self.predicted_at)}


class TrainingLog(db.Model):
    __tablename__ = "training_logs"

    id              = db.Column(db.Integer, primary_key=True)
    model_name      = db.Column(db.String(100))
    accuracy        = db.Column(db.Float)
    precision_score = db.Column(db.Float)
    recall_score    = db.Column(db.Float)
    f1_score        = db.Column(db.Float)
    dataset_rows    = db.Column(db.Integer)
    trained_at      = db.Column(db.DateTime, default=datetime.utcnow)
    notes           = db.Column(db.Text)

    def to_dict(self):
        return {"id": self.id, "model_name": self.model_name,
                "accuracy": self.accuracy, "f1_score": self.f1_score,
                "precision_score": self.precision_score,
                "recall_score": self.recall_score,
                "dataset_rows": self.dataset_rows,
                "trained_at": str(self.trained_at)}
