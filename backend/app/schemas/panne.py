from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PanneBase(BaseModel):
    machine_id: int
    titre: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    causes_possibles: Optional[List[str]] = []
    cause_reelle: Optional[str] = Field(None, max_length=2000)
    solution: Optional[str] = Field(None, max_length=5000)
    criticite: Optional[int] = Field(3, ge=1, le=5, description="Criticité de 1 (très faible) à 5 (critique)")
    temps_moyen_reparation: Optional[int] = Field(None, ge=0, le=100000)
    photos: Optional[List[str]] = []


class PanneCreate(PanneBase):
    pass


class PanneUpdate(BaseModel):
    titre: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    causes_possibles: Optional[List[str]] = None
    cause_reelle: Optional[str] = Field(None, max_length=2000)
    solution: Optional[str] = Field(None, max_length=5000)
    protocole_reparation: Optional[str] = Field(None, max_length=20000)
    criticite: Optional[int] = Field(None, ge=1, le=5)
    temps_moyen_reparation: Optional[int] = Field(None, ge=0, le=100000)
    photos: Optional[List[str]] = None


class PanneOut(PanneBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
