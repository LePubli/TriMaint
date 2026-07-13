from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    panne_id = Column(Integer, ForeignKey("pannes.id"), nullable=True)
    technicien = Column(String, nullable=False)
    duree = Column(Integer)
    commentaire = Column(Text)
    photos_avant = Column(JSON, default=[])
    photos_apres = Column(JSON, default=[])
    validee = Column(Boolean, default=False)
    validee_par = Column(String)
    date_intervention = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    machine = relationship("Machine", back_populates="interventions")
    panne = relationship("Panne", back_populates="interventions")
