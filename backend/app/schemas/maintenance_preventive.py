from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MaintenancePreventiveBase(BaseModel):
    machine_id: int
    titre: str
    description: Optional[str] = None
    frequence_jours: int
    responsable: Optional[str] = None
    alert_jours: Optional[int] = 7
    actif: Optional[bool] = True


class MaintenancePreventiveCreate(MaintenancePreventiveBase):
    pass


class MaintenancePreventiveUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    frequence_jours: Optional[int] = None
    responsable: Optional[str] = None
    alert_jours: Optional[int] = None
    actif: Optional[bool] = None


class MaintenancePreventiveOut(MaintenancePreventiveBase):
    id: int
    derniere_execution: Optional[datetime] = None
    created_at: datetime
    machine_nom: Optional[str] = None
    prochaine_echeance: Optional[datetime] = None
    statut: Optional[str] = None
    jours_restants: Optional[int] = None

    class Config:
        from_attributes = True
