from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Panne(Base):
    __tablename__ = "pannes"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    titre = Column(String, nullable=False)
    description = Column(Text)
    causes_possibles = Column(JSON, default=[])
    cause_reelle = Column(Text)
    solution = Column(Text)
    protocole_reparation = Column(Text)
    criticite = Column(Integer, default=3)
    temps_moyen_reparation = Column(Integer)
    photos = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    machine = relationship("Machine", back_populates="pannes")
    interventions = relationship("Intervention", back_populates="panne")
    pieces_utilisees = relationship("PannesPieces", back_populates="panne")
