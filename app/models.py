from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Numeric, Boolean
from sqlalchemy.sql import func
from app.database import Base


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    # Kept for future use - may be needed for querying claims by policy number
    policy_number = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Kept for standard audit pattern - automatically updated by SQLAlchemy on record updates
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class DamageAssessment(Base):
    __tablename__ = "damage_assessments"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, nullable=True)
    assessment_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RepairEstimate(Base):
    __tablename__ = "repair_estimates"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, nullable=True)
    damage_assessment_id = Column(Integer, nullable=True)
    estimate_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SeniorReview(Base):
    """Database model for Claim Approval & Authorization reviews."""
    __tablename__ = "senior_reviews"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, nullable=True)
    repair_estimate_id = Column(Integer, nullable=True)
    review_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_type = Column(String, nullable=False)
    log_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DamageCostReference(Base):
    __tablename__ = "damage_cost_reference"

    id = Column(Integer, primary_key=True, index=True)
    damage_type = Column(String, nullable=False)  # scratches, dents, structural_damage
    damage_severity = Column(String, nullable=False)  # minor, major
    base_cost = Column(Integer, nullable=False)
    parts_cost = Column(Integer, nullable=False)
    labor_hours = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text, nullable=True)


class RepairShop(Base):
    __tablename__ = "repair_shops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_approved = Column(Boolean, nullable=False, default=False)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

