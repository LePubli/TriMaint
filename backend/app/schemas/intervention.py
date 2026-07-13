from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InterventionBase(BaseModel):
    machine_id: int
    panne_id: Optional[int] = None
    technicien: str
    duree: Optional[int] = None
    commentaire: Optional[str] = None
    photos_avant: Optional[List[str]] = []
    photos_apres: Optional[List[str]] = []
    date_intervention: Optional[datetime] = None


class InterventionCreate(InterventionBase):
    pass


class InterventionUpdate(BaseModel):
    technicien: Optional[str] = None
    duree: Optional[int] = None
    commentaire: Optional[str] = None
    photos_avant: Optional[List[str]] = None
    photos_apres: Optional[List[str]] = None
    validee: Optional[bool] = None
    validee_par: Optional[str] = None


class InterventionOut(InterventionBase):
    id: int
    validee: bool
    validee_par: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
