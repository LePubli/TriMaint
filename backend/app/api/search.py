from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.database import get_db
from app.models.machine import Machine
from app.models.panne import Panne
from app.models.intervention import Intervention
from app.core.security import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/")
def search(q: str = Query(..., min_length=1), db: Session = Depends(get_db), _=Depends(get_current_user)):
    results = {"machines": [], "pannes": [], "interventions": []}
    term = f"%{q}%"

    machines = db.query(Machine).filter(
        or_(
            Machine.nom.ilike(term),
            Machine.code_interne.ilike(term),
            Machine.fabricant.ilike(term),
            Machine.modele.ilike(term),
            Machine.site.ilike(term),
            Machine.ligne.ilike(term),
            Machine.zone.ilike(term),
        )
    ).limit(15).all()
    results["machines"] = [
        {"id": m.id, "nom": m.nom, "code_interne": m.code_interne, "statut": m.statut, "ligne": m.ligne, "zone": m.zone, "type": "machine"}
        for m in machines
    ]

    ligne_rows = db.query(Machine.ligne).filter(Machine.ligne.ilike(term)).distinct().all()
    results["lignes"] = sorted({row[0] for row in ligne_rows if row[0]})

    pannes = db.query(Panne).filter(
        or_(
            Panne.titre.ilike(term),
            Panne.description.ilike(term),
            Panne.cause_reelle.ilike(term),
            Panne.solution.ilike(term),
        )
    ).limit(10).all()
    results["pannes"] = [{"id": p.id, "titre": p.titre, "criticite": p.criticite, "machine_id": p.machine_id, "type": "panne"} for p in pannes]

    interventions = db.query(Intervention).filter(
        or_(
            Intervention.technicien.ilike(term),
            Intervention.commentaire.ilike(term),
        )
    ).limit(10).all()
    results["interventions"] = [{"id": i.id, "technicien": i.technicien, "machine_id": i.machine_id, "type": "intervention"} for i in interventions]

    return results
