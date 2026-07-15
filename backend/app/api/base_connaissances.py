from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.models.panne import Panne
from app.core.security import get_current_user

router = APIRouter(prefix="/api/base-connaissances", tags=["base-connaissances"])


@router.get("/")
def search_knowledge(
    q: str = Query("", description="Recherche textuelle"),
    machine_id: Optional[int] = None,
    criticite_min: Optional[int] = None,
    criticite_max: Optional[int] = None,
    avec_solution: bool = Query(False, description="Uniquement les pannes résolues avec solution"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Base de connaissances : recherche dans les pannes résolues pour aider les techniciens."""
    query = db.query(Panne)

    if q:
        pattern = f"%{q}%"
        query = query.filter(
            (Panne.titre.ilike(pattern))
            | (Panne.description.ilike(pattern))
            | (Panne.cause_reelle.ilike(pattern))
            | (Panne.solution.ilike(pattern))
            | (Panne.protocole_reparation.ilike(pattern))
        )

    if machine_id:
        query = query.filter(Panne.machine_id == machine_id)

    if criticite_min is not None:
        query = query.filter(Panne.criticite >= criticite_min)
    if criticite_max is not None:
        query = query.filter(Panne.criticite <= criticite_max)

    if avec_solution:
        query = query.filter(Panne.solution.isnot(None), Panne.solution != "")

    # Trier par criticité décroissante puis date
    pannes = query.order_by(Panne.criticite.desc(), Panne.updated_at.desc().nullslast()).offset(skip).limit(limit).all()

    results = []
    for p in pannes:
        results.append({
            "id": p.id,
            "machine_id": p.machine_id,
            "machine_nom": p.machine.nom if p.machine else None,
            "titre": p.titre,
            "description": p.description,
            "cause_reelle": p.cause_reelle,
            "solution": p.solution,
            "protocole_reparation": p.protocole_reparation,
            "criticite": p.criticite,
            "temps_moyen_reparation": p.temps_moyen_reparation,
            "causes_possibles": p.causes_possibles or [],
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })

    return results