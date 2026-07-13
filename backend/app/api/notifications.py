from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.db.database import get_db
from app.models.notification import Notification, NotificationRead
from app.core.security import require_manager_or_admin

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    read_ids = db.query(NotificationRead.notification_id).filter(
        NotificationRead.username == current_user.username
    ).subquery()
    count = db.query(Notification).filter(
        Notification.id.not_in(read_ids)
    ).count()
    return {"count": count}


@router.get("/", response_model=list[NotificationOut])
def list_notifications(
    limit: int = 40,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    read_ids = set(
        r.notification_id
        for r in db.query(NotificationRead).filter(
            NotificationRead.username == current_user.username
        ).all()
    )
    notifs = (
        db.query(Notification)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for n in notifs:
        result.append(NotificationOut(
            id=n.id,
            title=n.title,
            message=n.message,
            type=n.type,
            entity_type=n.entity_type,
            entity_id=n.entity_id,
            created_at=n.created_at,
            is_read=n.id in read_ids,
        ))
    return result


@router.post("/{notification_id}/lire")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    existing = db.query(NotificationRead).filter(
        NotificationRead.notification_id == notification_id,
        NotificationRead.username == current_user.username,
    ).first()
    if not existing:
        db.add(NotificationRead(notification_id=notification_id, username=current_user.username))
        db.commit()
    return {"ok": True}


@router.post("/lire-tout")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    already_read = set(
        r.notification_id
        for r in db.query(NotificationRead).filter(
            NotificationRead.username == current_user.username
        ).all()
    )
    all_notif_ids = [n.id for n in db.query(Notification.id).all()]
    for nid in all_notif_ids:
        if nid not in already_read:
            db.add(NotificationRead(notification_id=nid, username=current_user.username))
    db.commit()
    return {"ok": True}
