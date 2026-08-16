import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    gender = Column(String, default="female")  # "female", "male", "neutral"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    mannequin = relationship("DigitalMannequin", back_populates="user", uselist=False, cascade="all, delete-orphan")
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    try_on_sessions = relationship("TryOnSession", back_populates="user", cascade="all, delete-orphan")
    feedback_history = relationship("FeedbackLog", back_populates="user", cascade="all, delete-orphan")

class DigitalMannequin(Base):
    __tablename__ = "digital_mannequins"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    base_photo_url = Column(String, nullable=False)
    color_season = Column(String, default="Cool Winter")  # e.g., "Cool Winter", "Warm Autumn", "Cool Summer", "Warm Spring"
    skin_undertone = Column(String, default="Cool")       # "Cool", "Warm", "Neutral"
    skin_tone_hex = Column(String, default="#E8C39E")
    detected_concerns = Column(JSON, default=dict)        # {"rosacea": 42, "acne": 15, "sensitivity": 60}
    color_reasoning = Column(JSON, nullable=True)         # Persisted clinical color reasoning (palette, steps)
    body_type = Column(String, default="Balanced")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="mannequin")

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    allergies = Column(JSON, default=list)                # ["wool", "polyester", "latex", "nickel"]
    preferred_fit = Column(String, default="regular")     # "tight", "regular", "oversized"
    comfort_vs_style_bias = Column(Float, default=0.5)    # 0.0 (Pure Style) to 1.0 (Pure Comfort)
    theme_preference = Column(String, default="system")   # "light", "dark", "system"
    historical_bias = Column(JSON, default=dict)          # Dynamic weight adjustments from returns/keeps

    user = relationship("User", back_populates="preferences")

class TryOnSession(Base):
    __tablename__ = "try_on_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    garment_sku = Column(String, nullable=False)
    garment_name = Column(String, nullable=False)
    garment_material = Column(JSON, nullable=False)       # {"wool": 0.85, "polyamide": 0.15}
    garment_color_hex = Column(String, nullable=False)
    rendered_vto_url = Column(Text, nullable=False)       # primary render base64 or URL
    vto_renders = Column(JSON, default=list)              # all 3 simulated render images
    diff_heatmap_url = Column(Text, nullable=True)        # SSIM difference heatmap visual
    fit_repeatability_score = Column(Float, nullable=False)
    color_harmony_score = Column(Float, nullable=False)
    fabric_safety_score = Column(Float, nullable=False)
    keep_probability_score = Column(Float, nullable=False)
    verdict = Column(String, default="STRONG_BUY")
    diagnostics = Column(JSON, default=dict)
    ai_explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="try_on_sessions")
    feedback = relationship("FeedbackLog", back_populates="session", uselist=False, cascade="all, delete-orphan")

class FeedbackLog(Base):
    __tablename__ = "feedback_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(String, ForeignKey("try_on_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    action_taken = Column(String, nullable=False)         # "KEPT", "RETURNED", "ABANDONED_CART"
    return_reason = Column(String, nullable=True)         # "FIT_TOO_TIGHT", "FABRIC_ITCHY", "COLOR_UNFLATTERING", "POOR_QUALITY"
    user_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="feedback_history")
    session = relationship("TryOnSession", back_populates="feedback")

class GarmentItem(Base):
    __tablename__ = "garment_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    sku = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    brand = Column(String, default="VeraFit Studio")
    price = Column(Float, default=89.0)
    color_hex = Column(String, nullable=False)
    materials = Column(JSON, nullable=False)              # {"merino_wool": 0.85, "polyamide": 0.15}
    image_url = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    formality_index = Column(Float, default=0.5)          # -1.0 (cozy) to 1.0 (structured/formal)
