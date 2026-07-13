from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    site = Column(String)
    ligne = Column(String)
    zone = Column(String)
    fabricant = Column(String)
    modele = Column(String)
    code_interne = Column(String, unique=True, index=True)
    statut = Column(String, default="operationnel")
    qr_code = Column(Text)
    notes = Column(Text)
    pos_x = Column(Float, nullable=True)
    pos_y = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    pannes = relationship("Panne", back_populates="machine")
    interventions = relationship("Intervention", back_populates="machine")
