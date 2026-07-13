from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog


def log_activity(
    db: Session,
    user,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    entity_label: str | None = None,
):
    try:
        entry = ActivityLog(
            username=user.username,
            user_role=user.role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=entity_label,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()
