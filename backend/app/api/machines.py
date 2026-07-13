import qrcode
import io
import base64
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.machine import Machine
from app.schemas.machine import MachineCreate, MachineUpdate, MachineOut
from app.core.security import get_current_user, require_manager_or_admin
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
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Machine)
    if ligne:
        q = q.filter(Machine.ligne == ligne)
    if zone:
        q = q.filter(Machine.zone == zone)
    return q.offset(skip).limit(limit).all()


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


@router.get("/{machine_id}", response_model=MachineOut)
def get_machine(machine_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
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
