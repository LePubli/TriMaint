import qrcode
import io
import base64
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.machine import Machine
from app.models.convoyeur import Convoyeur
from app.schemas.machine import MachineCreate, MachineUpdate, MachineOut
from pydantic import BaseModel
from app.core.security import get_current_user, require_manager_or_admin, require_admin
from app.core.activity import log_activity

router = APIRouter(prefix="/api/machines", tags=["machines"])


def generate_qr(data: str) -> str:
    qr = qrcode.make(data)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


@router.get("/", response_model=list[MachineOut])
def list_machines(
    skip: int = 0,
    limit: int = 500,
    ligne: str | None = None,
    zone: str | None = None,
    etage: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Machine)
    if ligne:
        q = q.filter(Machine.ligne == ligne)
    if zone:
        q = q.filter(Machine.zone == zone)
    if etage is not None:
        q = q.filter(Machine.etage == etage)
    return q.offset(skip).limit(limit).all()


@router.get("/schema-data")
def get_schema_data(
    ligne: str | None = None,
    etage: int | None = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Retourne toutes les données nécessaires pour le schéma interactif :
    machines avec positions, convoyeurs avec chemins, et la liste des zones/étages."""
    # Machines
    q_machines = db.query(Machine)
    if ligne:
        q_machines = q_machines.filter(Machine.ligne == ligne)
    if etage is not None:
        q_machines = q_machines.filter(Machine.etage == etage)
    machines = q_machines.all()

    # Convoyeurs
    q_conv = db.query(Convoyeur)
    if ligne:
        q_conv = q_conv.filter(Convoyeur.ligne == ligne)
    if etage is not None:
        q_conv = q_conv.filter(Convoyeur.etage == etage)
    convoyeurs = q_conv.all()

    # Collect unique zones and etages
    zones = sorted(set(m.zone for m in machines if m.zone))
    etages = sorted(set(m.etage for m in machines if m.etage is not None))
    lignes = sorted(set(m.ligne for m in machines if m.ligne))

    return {
        "machines": [
            {
                "id": m.id,
                "nom": m.nom,
                "code_interne": m.code_interne,
                "statut": m.statut,
                "zone": m.zone,
                "etage": m.etage,
                "ligne": m.ligne,
                "pos_x": m.pos_x,
                "pos_y": m.pos_y,
                "type": "machine",
            }
            for m in machines
        ],
        "convoyeurs": [
            {
                "id": c.id,
                "nom": c.nom,
                "code_interne": c.code_interne,
                "statut": c.statut,
                "zone": c.zone,
                "etage": c.etage,
                "type_convoyeur": c.type_convoyeur,
                "source_machine_id": c.source_machine_id,
                "target_machine_id": c.target_machine_id,
                "path_points": c.path_points or [],
                "type": "convoyeur",
            }
            for c in convoyeurs
        ],
        "zones": zones,
        "etages": etages,
        "lignes": lignes,
    }


@router.get("/meta/lignes")
def list_lignes(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Regroupe les machines par ligne et zone, pour la vue process/schéma."""
    machines = db.query(Machine).filter(Machine.ligne.isnot(None), Machine.ligne != "").all()
    lignes: dict[str, dict] = {}
    for m in machines:
        ligne_data = lignes.setdefault(m.ligne, {"ligne": m.ligne, "site": m.site, "zones": {}, "total": 0, "en_panne": 0})
        ligne_data["total"] += 1
        if m.statut == "en_panne":
            ligne_data["en_panne"] += 1
        zone_key = m.zone or "Sans zone"
        zone_data = ligne_data["zones"].setdefault(zone_key, {"zone": zone_key, "count": 0})
        zone_data["count"] += 1
    result = []
    for l in lignes.values():
        l["zones"] = list(l["zones"].values())
        result.append(l)
    return result


class LigneRenameBody(BaseModel):
    ancien_nom: str
    nouveau_nom: str


class LigneDeleteBody(BaseModel):
    nom: str


@router.post("/meta/lignes")
def rename_ligne(
    body: LigneRenameBody,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    """Renommer une ligne de production (met à jour le champ ligne de toutes les machines concernées)."""
    ancien = body.ancien_nom.strip()
    nouveau = body.nouveau_nom.strip()

    if not ancien:
        return {"ok": True, "affected": 0}

    if ancien == nouveau:
        return {"ok": True, "affected": 0}

    count = (
        db.query(Machine)
        .filter(Machine.ligne == ancien)
        .update({"ligne": nouveau}, synchronize_session="fetch")
    )
    db.commit()
    log_activity(db, current_user, "renommé", "ligne", None, f"{ancien} → {nouveau}")
    return {"ok": True, "affected": count}


@router.delete("/meta/lignes")
def delete_ligne(
    body: LigneDeleteBody,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Supprimer une ligne de production (met ligne à NULL sur toutes les machines concernées)."""
    nom = body.nom.strip()
    if not nom:
        raise HTTPException(status_code=400, detail="Le nom de la ligne est requis")

    count = (
        db.query(Machine)
        .filter(Machine.ligne == nom)
        .update({"ligne": None}, synchronize_session="fetch")
    )
    db.commit()
    log_activity(db, current_user, "supprimé", "ligne", None, nom)
    return {"ok": True, "affected": count}


def _ensure_qr(machine: Machine, db: Session):
    """Generate QR code on-demand if missing."""
    if not machine.qr_code and machine.code_interne:
        machine.qr_code = generate_qr(f"trimaint://equipement/{machine.code_interne}")
        db.commit()
        db.refresh(machine)


@router.get("/lookup/{code}", response_model=MachineOut)
def lookup_by_code(code: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Lookup a machine by its code_interne (used by QR code scanning)."""
    machine = db.query(Machine).filter(Machine.code_interne == code.upper()).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Equipement introuvable")
    _ensure_qr(machine, db)
    return machine


@router.get("/bulk", response_model=list[MachineOut])
def bulk_machines(ids: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Fetch multiple machines by comma-separated IDs for schema."""
    id_list = [int(x.strip()) for x in ids.split(",") if x.strip().isdigit()]
    return db.query(Machine).filter(Machine.id.in_(id_list)).all()


@router.get("/{machine_id}", response_model=MachineOut)
def get_machine(machine_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    _ensure_qr(machine, db)
    return machine


@router.post("/", response_model=MachineOut)
def create_machine(machine_in: MachineCreate, db: Session = Depends(get_db), current_user=Depends(require_manager_or_admin)):
    machine = Machine(**machine_in.model_dump())
    db.add(machine)
    db.flush()
    machine.qr_code = generate_qr(f"trimaint://machine/{machine.id}")
    db.commit()
    db.refresh(machine)
    log_activity(db, current_user, "créé", "machine", machine.id, machine.nom)
    return machine


@router.put("/{machine_id}", response_model=MachineOut)
def update_machine(machine_id: int, machine_in: MachineUpdate, db: Session = Depends(get_db), current_user=Depends(require_manager_or_admin)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    for key, value in machine_in.model_dump(exclude_unset=True).items():
        setattr(machine, key, value)
    db.commit()
    db.refresh(machine)
    log_activity(db, current_user, "modifié", "machine", machine.id, machine.nom)
    return machine


@router.delete("/{machine_id}")
def delete_machine(machine_id: int, db: Session = Depends(get_db), current_user=Depends(require_manager_or_admin)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    label = machine.nom
    db.delete(machine)
    db.commit()
    log_activity(db, current_user, "supprimé", "machine", machine_id, label)
    return {"ok": True}